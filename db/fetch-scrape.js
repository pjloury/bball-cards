/**
 * fetch-scrape.js — Multi-site action photo scraper (ESPN, Yahoo Sports, NBA.com)
 *
 * Key technique: images are fetched FROM WITHIN the browser context via
 * page.evaluate() so hotlink protection and CORS restrictions are bypassed.
 * Falls back to element.screenshot() when fetch-within-page fails.
 *
 * Sources added:
 *   espn-hero      — ESPN player page hero image (large, in-game)
 *   yahoo-action   — Yahoo Sports player profile photo
 *   nba-hero       — NBA.com player page hero (different from og:image)
 *
 * Usage:
 *   node db/fetch-scrape.js
 *   node db/fetch-scrape.js --player=2544
 *   node db/fetch-scrape.js --refresh
 *   node db/fetch-scrape.js --site=espn
 *   node db/fetch-scrape.js --site=yahoo
 *   node db/fetch-scrape.js --site=nba
 */

const Database = require('better-sqlite3');
const path     = require('path');

let puppeteer;
try { puppeteer = require('puppeteer'); }
catch { console.error('Run: npm install puppeteer'); process.exit(1); }

const DB_PATH = path.join(__dirname, 'hoops.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS player_photos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id   INTEGER NOT NULL,
    nba_id      INTEGER NOT NULL,
    source      TEXT    NOT NULL,
    original_url TEXT,
    data        BLOB    NOT NULL,
    mime_type   TEXT    DEFAULT 'image/jpeg',
    width       INTEGER DEFAULT 0,
    height      INTEGER DEFAULT 0,
    file_size   INTEGER DEFAULT 0,
    quality     INTEGER DEFAULT 50,
    fetched_at  TEXT    DEFAULT (datetime('now')),
    UNIQUE(nba_id, source)
  );
  CREATE INDEX IF NOT EXISTS idx_photos_nba_id ON player_photos(nba_id);
`);

const upsertPhoto = db.prepare(`
  INSERT INTO player_photos (player_id, nba_id, source, original_url, data, mime_type, width, height, file_size, quality)
  VALUES (@playerId, @nbaId, @source, @url, @data, @mime, @width, @height, @size, @quality)
  ON CONFLICT(nba_id, source) DO UPDATE SET
    data=excluded.data, original_url=excluded.original_url,
    width=excluded.width, height=excluded.height,
    file_size=excluded.file_size, fetched_at=datetime('now')
`);

const args    = process.argv.slice(2);
const REFRESH = args.includes('--refresh');
const SINGLE  = (args.find(a => a.startsWith('--player=')) || '').replace('--player=', '');
const SITE    = (args.find(a => a.startsWith('--site='))   || '').replace('--site=', '');
const delay   = ms => new Promise(r => setTimeout(r, ms));

function alreadyHave(nbaId, source) {
  if (REFRESH) return false;
  return !!db.prepare('SELECT id FROM player_photos WHERE nba_id=? AND source=?').get(nbaId, source);
}

function storePhoto({ playerId, nbaId, source, url, buf, mime, width = 0, height = 0, quality = 82 }) {
  upsertPhoto.run({ playerId, nbaId, source, url, data: buf, mime, width, height, size: buf.length, quality });
}

// ── Download image THROUGH the browser (bypasses hotlink/CORS) ───────────────
// Returns Buffer or null. Uses page.evaluate so the request comes from the
// browser with full session cookies / same-origin context.
async function fetchImageViaPage(page, imageUrl) {
  try {
    const result = await page.evaluate(async (url) => {
      try {
        const res = await fetch(url, { credentials: 'include', mode: 'no-cors' });
        // no-cors gives opaque response — try same-origin first
        const res2 = await fetch(url, { credentials: 'include' });
        if (!res2.ok) return null;
        const buf = await res2.arrayBuffer();
        if (buf.byteLength < 15000) return null;
        // Convert to base64
        const bytes = new Uint8Array(buf);
        let bin = '';
        bytes.forEach(b => bin += String.fromCharCode(b));
        return { data: btoa(bin), ct: res2.headers.get('content-type') || 'image/jpeg' };
      } catch {
        // Same-origin failed, try blob approach
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
          canvas.getContext('2d').drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          const base64 = dataUrl.split(',')[1];
          if (!base64 || base64.length < 10000) return null;
          return { data: base64, ct: 'image/jpeg' };
        } catch { return null; }
      }
    }, imageUrl);

    if (!result) return null;
    const buf = Buffer.from(result.data, 'base64');
    if (buf.length < 15000) return null;
    return { buf, mime: result.ct.split(';')[0].trim() };
  } catch { return null; }
}

// ── Screenshot an element on the page ────────────────────────────────────────
async function screenshotElement(page, selector) {
  try {
    const el = await page.$(selector);
    if (!el) return null;
    const box = await el.boundingBox();
    if (!box || box.width < 200 || box.height < 200) return null;
    const buf = await el.screenshot({ type: 'jpeg', quality: 88 });
    if (!buf || buf.length < 15000) return null;
    return { buf, mime: 'image/jpeg', width: Math.round(box.width), height: Math.round(box.height) };
  } catch { return null; }
}

// ── Puppeteer browser page ────────────────────────────────────────────────────
async function newPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  // Only block heavy resources — keep images
  await page.setRequestInterception(true);
  page.on('request', req => {
    const rt = req.resourceType();
    const u  = req.url();
    if (rt === 'media' || rt === 'font') { req.abort(); return; }
    if (u.includes('doubleclick.net') || u.includes('google-analytics') || u.includes('googletag') || u.includes('scorecardresearch')) { req.abort(); return; }
    req.continue();
  });
  return page;
}

// ── Find the best large image on a page (not the standard headshot CDN) ───────
async function findBestPlayerImage(page, minPx = 220) {
  return page.evaluate((minPx) => {
    const SKIP = ['/headshots/nba/latest/', 'logo', 'icon', 'badge', 'score', 'ad', 'pixel', 'tracking'];
    const isSkip = url => !url || SKIP.some(s => url.toLowerCase().includes(s));

    // Gather <img> elements
    const imgs = Array.from(document.querySelectorAll('img'))
      .map(el => ({ el, url: el.src || el.currentSrc || el.dataset.src || '' }))
      .filter(({ url }) => !isSkip(url))
      .map(({ el, url }) => ({ url, w: el.naturalWidth || el.offsetWidth || 0, h: el.naturalHeight || el.offsetHeight || 0 }))
      .filter(i => i.w >= minPx && i.h >= minPx)
      .sort((a, b) => b.w * b.h - a.w * a.h);

    // Also check CSS background-image on hero/header/banner elements
    const bgs = [];
    document.querySelectorAll('[class*="hero" i],[class*="banner" i],[class*="player" i],[class*="athlete" i],[class*="header" i],[class*="profile" i]').forEach(el => {
      const bg = window.getComputedStyle(el).backgroundImage;
      const m = bg?.match(/url\(["']?([^"')]+)["']?\)/);
      if (m && !isSkip(m[1]) && !m[1].startsWith('data:') && el.offsetWidth >= minPx) {
        bgs.push({ url: m[1], w: el.offsetWidth, h: el.offsetHeight });
      }
    });

    const all = [...imgs, ...bgs].sort((a, b) => b.w * b.h - a.w * a.h);
    return all[0] || null;
  }, minPx);
}

// ── ESPN ──────────────────────────────────────────────────────────────────────
async function scrapeEspn(browser, player) {
  if (alreadyHave(player.nba_id, 'espn-hero')) return 'cached';

  // Get ESPN ID
  let espnId;
  try {
    const r = await fetch(`https://site.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(player.name)}&limit=5&type=player&sport=basketball&league=nba`);
    const j = await r.json();
    espnId = (j?.items || []).find(i => i.type === 'player')?.id;
  } catch {}
  if (!espnId) return 'no-espn-id';

  let page;
  try {
    page = await newPage(browser);
    await page.goto(`https://www.espn.com/nba/player/_/id/${espnId}`, { waitUntil: 'domcontentloaded', timeout: 22000 });
    await delay(2500);

    const img = await findBestPlayerImage(page, 220);
    if (!img?.url) {
      // Fallback: screenshot the player header area
      const ss = await screenshotElement(page, '.PlayerHeader__Image, .AthleteImage, [class*="PlayerHeader"] figure, [class*="player-image"]');
      if (ss && ss.buf.length > 20000) {
        storePhoto({ playerId: player.id, nbaId: player.nba_id, source: 'espn-hero', url: `espn-pptr-${espnId}`, ...ss, quality: 82 });
        return `screenshot-${Math.round(ss.buf.length/1024)}KB`;
      }
      return 'no-image';
    }

    // Try fetching through the page to avoid hotlink blocks
    const dl = await fetchImageViaPage(page, img.url);
    if (dl && dl.buf.length > 15000) {
      storePhoto({ playerId: player.id, nbaId: player.nba_id, source: 'espn-hero', url: img.url, ...dl, width: img.w, height: img.h, quality: 83 });
      return `ok-${Math.round(dl.buf.length/1024)}KB`;
    }

    // Final fallback: screenshot the whole hero section
    const ss = await screenshotElement(page, `img[src="${img.url}"], [class*="PlayerHeader"] img, [class*="hero"] img`);
    if (ss && ss.buf.length > 20000) {
      storePhoto({ playerId: player.id, nbaId: player.nba_id, source: 'espn-hero', url: img.url, ...ss, quality: 82 });
      return `screenshot-${Math.round(ss.buf.length/1024)}KB`;
    }

    return 'blocked';
  } catch (e) {
    return `err(${e.message.slice(0,40)})`;
  } finally { if (page) await page.close().catch(() => {}); }
}

// ── Yahoo Sports ──────────────────────────────────────────────────────────────
async function scrapeYahoo(browser, player) {
  if (alreadyHave(player.nba_id, 'yahoo-action')) return 'cached';

  let page;
  try {
    page = await newPage(browser);
    // Use Yahoo Sports search page to find the player URL
    const searchUrl = `https://sports.yahoo.com/search/?q=${encodeURIComponent(player.name + ' NBA')}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await delay(2000);

    // Find player profile link
    const profileUrl = await page.evaluate((name) => {
      const links = Array.from(document.querySelectorAll('a[href*="/nba/players/"]'));
      if (links.length) return links[0].href;
      // Also check search result links
      const all = Array.from(document.querySelectorAll('a[href]'))
        .map(a => a.href)
        .filter(h => h.includes('sports.yahoo.com/nba/players/') || h.includes('sports.yahoo.com/nba/players'));
      return all[0] || null;
    }, player.name);

    if (!profileUrl) return 'no-url';

    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await delay(2500);

    const img = await findBestPlayerImage(page, 200);
    if (!img?.url) {
      // Screenshot the player card area
      const ss = await screenshotElement(page, '[class*="player-photo"], [class*="PlayerProfile"] img, [class*="athlete"] img');
      if (ss && ss.buf.length > 20000) {
        storePhoto({ playerId: player.id, nbaId: player.nba_id, source: 'yahoo-action', url: profileUrl, ...ss, quality: 80 });
        return `screenshot-${Math.round(ss.buf.length/1024)}KB`;
      }
      return 'no-image';
    }

    const dl = await fetchImageViaPage(page, img.url);
    if (dl && dl.buf.length > 15000) {
      storePhoto({ playerId: player.id, nbaId: player.nba_id, source: 'yahoo-action', url: img.url, ...dl, width: img.w, height: img.h, quality: 80 });
      return `ok-${Math.round(dl.buf.length/1024)}KB`;
    }

    const ss = await screenshotElement(page, `img[src="${img.url}"]`);
    if (ss && ss.buf.length > 20000) {
      storePhoto({ playerId: player.id, nbaId: player.nba_id, source: 'yahoo-action', url: img.url, ...ss, quality: 79 });
      return `screenshot-${Math.round(ss.buf.length/1024)}KB`;
    }

    return 'blocked';
  } catch (e) {
    return `err(${e.message.slice(0,40)})`;
  } finally { if (page) await page.close().catch(() => {}); }
}

// ── NBA.com ───────────────────────────────────────────────────────────────────
async function scrapeNba(browser, player) {
  if (alreadyHave(player.nba_id, 'nba-hero')) return 'cached';

  let page;
  try {
    page = await newPage(browser);
    await page.goto(`https://www.nba.com/player/${player.nba_id}`, { waitUntil: 'domcontentloaded', timeout: 22000 });
    await delay(3000);

    // Check for og:image first — NBA.com pages vary
    const ogImg = await page.evaluate(() => {
      const og = document.querySelector('meta[property="og:image"]');
      return og?.content || null;
    });

    // Check if this og:image is different from what we already stored
    const existingOg = db.prepare(
      "SELECT original_url FROM player_photos WHERE nba_id=? AND source='nba-page-og'"
    ).get(player.nba_id);

    let targetUrl;
    if (ogImg && ogImg !== existingOg?.original_url && !ogImg.includes('/headshots/nba/latest/')) {
      targetUrl = ogImg;
    } else {
      // Look for a large hero image that's not the headshot CDN
      const img = await findBestPlayerImage(page, 300);
      if (img?.url && !img.url.includes('/headshots/nba/latest/') && img.url !== existingOg?.original_url) {
        targetUrl = img.url;
      }
    }

    if (!targetUrl) return 'no-new-image';

    const dl = await fetchImageViaPage(page, targetUrl);
    if (dl && dl.buf.length > 15000) {
      storePhoto({ playerId: player.id, nbaId: player.nba_id, source: 'nba-hero', url: targetUrl, ...dl, quality: 84 });
      return `ok-${Math.round(dl.buf.length/1024)}KB`;
    }

    // Screenshot the player image area
    const ss = await screenshotElement(page, '[class*="PlayerImage"] img, [class*="hero"] img, [class*="HeroImage"] img');
    if (ss && ss.buf.length > 20000) {
      storePhoto({ playerId: player.id, nbaId: player.nba_id, source: 'nba-hero', url: targetUrl || `nba-pptr-${player.nba_id}`, ...ss, quality: 83 });
      return `screenshot-${Math.round(ss.buf.length/1024)}KB`;
    }

    return 'blocked';
  } catch (e) {
    return `err(${e.message.slice(0,40)})`;
  } finally { if (page) await page.close().catch(() => {}); }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const players = db.prepare('SELECT id, nba_id, name FROM players ORDER BY id').all()
    .filter(p => !SINGLE || String(p.nba_id) === SINGLE);

  const sites = SITE ? [SITE] : ['espn', 'yahoo', 'nba'];
  console.log(`\n🏀 Multi-site action photo scraper`);
  console.log(`   Players : ${players.length}  |  Sites: ${sites.join(', ')}`);
  console.log(`   REFRESH : ${REFRESH}\n`);

  const BROWSER_RESTART_EVERY = 15; // restart Chromium every N players to avoid memory bloat

  function launchBrowser() {
    return puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--disable-gpu', '--no-first-run', '--no-zygote',
        '--disable-background-networking', '--disable-extensions',
        '--memory-pressure-off',
        '--js-flags=--max-old-space-size=512',  // cap JS heap at 512MB
      ],
    });
  }

  let browser = await launchBrowser();
  const counts = {};
  sites.forEach(s => counts[s] = { ok: 0, cached: 0, skip: 0 });

  for (let i = 0; i < players.length; i++) {
    // Restart browser periodically to release memory
    if (i > 0 && i % BROWSER_RESTART_EVERY === 0) {
      console.log(`\n🔄 Restarting browser (memory management, player ${i+1})...`);
      await browser.close().catch(() => {});
      await delay(2000);
      browser = await launchBrowser();
    }

    const p = players[i];
    process.stdout.write(`\n▶ [${i+1}/${players.length}] ${p.name}\n`);

    for (const site of sites) {
      let status;
      try {
        if (site === 'espn')  status = await scrapeEspn(browser, p);
        if (site === 'yahoo') status = await scrapeYahoo(browser, p);
        if (site === 'nba')   status = await scrapeNba(browser, p);
      } catch (e) {
        status = `fatal(${e.message.slice(0,30)})`;
      }

      const ok = /^(ok|screenshot|api-ok|pptr-ok|cdn-ok)/.test(status);
      process.stdout.write(`  ${ok ? '✓' : status === 'cached' ? '○' : '─'} ${site.padEnd(6)}: ${status}\n`);
      if (ok)                     counts[site].ok++;
      else if (status === 'cached') counts[site].cached++;
      else                          counts[site].skip++;

      await delay(500);
    }
    if (i < players.length - 1) await delay(600);
  }

  await browser.close().catch(() => {});

  console.log('\n── Results ─────────────────────────────────────────────────');
  for (const [site, c] of Object.entries(counts)) {
    console.log(`  ${site.padEnd(8)} new: ${c.ok}  cached: ${c.cached}  skipped: ${c.skip}`);
  }
  const total = db.prepare('SELECT COUNT(*) as n, SUM(file_size) as sz FROM player_photos').get();
  console.log(`  Total: ${total.n} photos, ${Math.round((total.sz||0)/1024/1024*10)/10} MB`);

  // Auto-update recommendations after fetching new photos
  console.log('\n🔄 Updating photo recommendations...');
  db.close();
  require('child_process').execSync('node db/recommend-photos.js', { stdio: 'inherit', cwd: __dirname + '/..' });
}

main().catch(e => { console.error('Fatal:', e); db.close(); process.exit(1); });
