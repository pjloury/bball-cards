/**
 * fetch-scrape.js — Multi-site action photo scraper (ESPN, Yahoo Sports, NBA.com)
 *
 * Uses Puppeteer to visit player pages on multiple sports sites and extract
 * the largest available action/hero image (not the standard headshot CDN).
 *
 * Sources added:
 *   espn-hero      — ESPN player page hero/background image
 *   yahoo-action   — Yahoo Sports player profile photo
 *   nba-hero       — NBA.com player page hero (different from og:image)
 *
 * Usage:
 *   node db/fetch-scrape.js
 *   node db/fetch-scrape.js --player=2544
 *   node db/fetch-scrape.js --refresh
 *   node db/fetch-scrape.js --site=espn      (only run ESPN)
 *   node db/fetch-scrape.js --site=yahoo
 *   node db/fetch-scrape.js --site=nba
 */

const Database  = require('better-sqlite3');
const path      = require('path');

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

// ── Download image from URL ───────────────────────────────────────────────────
async function downloadImage(url, referer = 'https://www.google.com/') {
  if (!url || url.startsWith('data:')) return null;
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept':     'image/webp,image/png,image/jpeg,image/*,*/*',
        'Referer':    referer,
      },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const ct  = res.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 15000) return null; // skip placeholders / tiny images
    return { buf, mime: ct.split(';')[0].trim() };
  } catch { return null; }
}

function storePhoto({ playerId, nbaId, source, url, buf, mime, width = 0, height = 0, quality = 82 }) {
  upsertPhoto.run({ playerId, nbaId, source, url, data: buf, mime, width, height, size: buf.length, quality });
}

// ── Puppeteer page setup ──────────────────────────────────────────────────────
async function newPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36');
  await page.setRequestInterception(true);
  page.on('request', req => {
    const rt = req.resourceType();
    const u  = req.url();
    if (rt === 'media' || rt === 'font') { req.abort(); return; }
    if (u.includes('doubleclick') || u.includes('google-analytics') || u.includes('googletag')) { req.abort(); return; }
    req.continue();
  });
  return page;
}

// ── Extract best image from page ──────────────────────────────────────────────
// Returns { url, width, height } of the best candidate image
async function extractBestImage(page, { excludePattern, minWidth = 250, minHeight = 250 } = {}) {
  return page.evaluate(({ excludePattern, minWidth, minHeight }) => {
    // Helper: check if URL looks like a headshot CDN we already have
    function isExcluded(src) {
      if (!src) return true;
      if (src.includes('/headshots/nba/latest/')) return true;  // NBA CDN headshot
      if (excludePattern && new RegExp(excludePattern).test(src)) return true;
      return false;
    }

    // Collect all img elements with natural size
    const imgs = Array.from(document.querySelectorAll('img[src]'))
      .map(img => ({
        url:    img.src || img.currentSrc || img.dataset.src || '',
        width:  img.naturalWidth  || img.width  || 0,
        height: img.naturalHeight || img.height || 0,
      }))
      .filter(i => !isExcluded(i.url) && i.width >= minWidth && i.height >= minHeight)
      .sort((a, b) => (b.width * b.height) - (a.width * a.height));

    // Also check background-image CSS on key elements
    const bgImgs = [];
    const checkBg = sel => {
      document.querySelectorAll(sel).forEach(el => {
        const bg = window.getComputedStyle(el).backgroundImage;
        const m  = bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (m && !isExcluded(m[1]) && !m[1].startsWith('data:')) {
          bgImgs.push({ url: m[1], width: el.offsetWidth || 400, height: el.offsetHeight || 300 });
        }
      });
    };
    [
      '[class*="Hero"]', '[class*="hero"]',
      '[class*="Banner"]', '[class*="banner"]',
      '[class*="Header"]', '[class*="header"]',
      '[class*="Player"]', '[class*="Athlete"]',
      '[class*="profile"]', '[class*="Profile"]',
    ].forEach(checkBg);

    const all = [...imgs, ...bgImgs]
      .filter(i => !isExcluded(i.url))
      .sort((a, b) => (b.width * b.height) - (a.width * a.height));

    return all[0] || null;
  }, { excludePattern, minWidth, minHeight });
}

// ── ESPN scraper ──────────────────────────────────────────────────────────────
async function scrapeEspn(browser, player) {
  if (alreadyHave(player.nba_id, 'espn-hero')) return 'cached';

  // First get ESPN player ID via ESPN search API
  let espnId;
  try {
    const r = await fetch(
      `https://site.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(player.name)}&limit=5&type=player&sport=basketball&league=nba`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const j = await r.json();
    const hit = (j?.items || []).find(i => i.type === 'player');
    espnId = hit?.id;
  } catch {}
  if (!espnId) return 'no-espn-id';

  // Try ESPN athlete API for multiple image types
  try {
    const r = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/athletes/${espnId}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const j = await r.json();
    const athlete = j?.athlete;

    // Check all image fields in the API response
    const candidateUrls = [];
    if (athlete?.images) athlete.images.forEach(img => { if (img.href) candidateUrls.push({ url: img.href, width: img.width || 0, height: img.height || 0 }); });

    // Filter out standard headshots
    const actionCandidates = candidateUrls.filter(c =>
      !c.url.includes('/headshots/nba/players/full/') &&
      !c.url.includes('/combiner/i?img=/i/headshots/')
    );

    for (const c of actionCandidates.sort((a, b) => (b.width * b.height) - (a.width * a.height))) {
      const dl = await downloadImage(c.url, 'https://www.espn.com/');
      if (dl) {
        storePhoto({ playerId: player.id, nbaId: player.nba_id, source: 'espn-hero', url: c.url, ...dl, width: c.width, height: c.height, quality: 83 });
        return `api-ok-${Math.round(dl.buf.length / 1024)}KB`;
      }
    }
  } catch {}

  // Fall back to puppeteer page scrape
  let page;
  try {
    page = await newPage(browser);
    const url = `https://www.espn.com/nba/player/_/id/${espnId}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await delay(2000);

    const img = await extractBestImage(page, {
      excludePattern: '/headshots/nba/players/full/',
      minWidth: 200,
    });
    if (!img?.url) return 'no-image';

    const dl = await downloadImage(img.url, 'https://www.espn.com/');
    if (!dl) return 'download-failed';

    storePhoto({ playerId: player.id, nbaId: player.nba_id, source: 'espn-hero', url: img.url, ...dl, width: img.width, height: img.height, quality: 83 });
    return `pptr-ok-${Math.round(dl.buf.length / 1024)}KB`;
  } catch (e) {
    return `error(${e.message.slice(0, 40)})`;
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

// ── Yahoo Sports scraper ──────────────────────────────────────────────────────
async function scrapeYahoo(browser, player) {
  if (alreadyHave(player.nba_id, 'yahoo-action')) return 'cached';

  // Yahoo Sports search to find player page URL
  let yahooUrl;
  try {
    const searchUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(player.name + ' NBA site:sports.yahoo.com/nba/players')}&ei=UTF-8`;
    const r = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    const html = await r.text();
    // Extract first Yahoo Sports player URL
    const m = html.match(/https?:\/\/sports\.yahoo\.com\/nba\/players\/(\d+)/);
    if (m) yahooUrl = m[0];
  } catch {}

  if (!yahooUrl) {
    // Try direct Yahoo Sports search API
    try {
      const r = await fetch(
        `https://sports.yahoo.com/_xhr/search?query=${encodeURIComponent(player.name)}&lang=en-US&region=US&site=sports&type=players`,
        { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
      );
      const j = await r.json();
      const hit = (j?.data?.items || []).find(i => i.sport === 'basketball' || i.league === 'nba');
      if (hit?.url) yahooUrl = hit.url.startsWith('http') ? hit.url : `https://sports.yahoo.com${hit.url}`;
    } catch {}
  }

  if (!yahooUrl) return 'no-yahoo-url';

  let page;
  try {
    page = await newPage(browser);
    await page.goto(yahooUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await delay(2500);

    const img = await extractBestImage(page, {
      excludePattern: '/headshots/nba/latest/',
      minWidth: 200,
    });
    if (!img?.url) return 'no-image';
    if (img.url.includes('s.yimg.com/uu/api/res') || img.url.includes('sports.yahoo.com')) {
      const dl = await downloadImage(img.url, 'https://sports.yahoo.com/');
      if (!dl) return 'download-failed';
      storePhoto({ playerId: player.id, nbaId: player.nba_id, source: 'yahoo-action', url: img.url, ...dl, width: img.width, height: img.height, quality: 80 });
      return `ok-${Math.round(dl.buf.length / 1024)}KB`;
    }
    return 'non-yahoo-image';
  } catch (e) {
    return `error(${e.message.slice(0, 40)})`;
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

// ── NBA.com hero scraper (different from nba-page-og) ────────────────────────
async function scrapeNba(browser, player) {
  if (alreadyHave(player.nba_id, 'nba-hero')) return 'cached';

  // Try direct CDN patterns for NBA.com action media (not the headshot CDN)
  // NBA.com stores player promo images in various CDN paths
  const cdnCandidates = [
    `https://cdn.nba.com/manage/2024/10/GettyImages-${player.nba_id}.jpg`,
    `https://ak-static.cms.nba.com/wp-content/uploads/sites/4/2024/10/${player.nba_id}.jpg`,
  ];
  for (const url of cdnCandidates) {
    const dl = await downloadImage(url, 'https://www.nba.com/');
    if (dl) {
      storePhoto({ playerId: player.id, nbaId: player.nba_id, source: 'nba-hero', url, ...dl, quality: 85 });
      return `cdn-ok-${Math.round(dl.buf.length / 1024)}KB`;
    }
  }

  let page;
  try {
    page = await newPage(browser);
    await page.goto(`https://www.nba.com/player/${player.nba_id}`, { waitUntil: 'domcontentloaded', timeout: 22000 });
    await delay(3000);

    // Look for hero images specifically — NBA.com lazy-loads the hero
    const img = await page.evaluate(() => {
      // NBA.com stores hero images in data-src or as background-image
      const hero = document.querySelector('[class*="Hero"] img, [class*="PlayerImage"] img, [class*="player-image"] img');
      if (hero) {
        const src = hero.src || hero.dataset.src || '';
        if (src && !src.includes('/headshots/nba/latest/') && hero.naturalWidth > 300) {
          return { url: src, width: hero.naturalWidth, height: hero.naturalHeight };
        }
      }

      // Check og:image (might be different from what we already have)
      const og = document.querySelector('meta[property="og:image"]');
      if (og?.content && !og.content.includes('/headshots/nba/latest/')) {
        return { url: og.content, width: 0, height: 0 };
      }

      // Last: largest non-headshot image
      const all = Array.from(document.querySelectorAll('img[src]'))
        .filter(i => i.src && !i.src.includes('/headshots/nba/latest/') && i.naturalWidth > 300)
        .sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight));
      if (all.length) return { url: all[0].src, width: all[0].naturalWidth, height: all[0].naturalHeight };
      return null;
    });

    if (!img?.url) return 'no-image';

    // Don't duplicate what we already have from nba-page-og / nba-page-action
    const existing = db.prepare(
      "SELECT original_url FROM player_photos WHERE nba_id=? AND source IN ('nba-page-og','nba-page-action')"
    ).all(player.nba_id).map(r => r.original_url);
    if (existing.includes(img.url)) return 'duplicate-of-existing';

    const dl = await downloadImage(img.url, 'https://www.nba.com/');
    if (!dl) return 'download-failed';

    storePhoto({ playerId: player.id, nbaId: player.nba_id, source: 'nba-hero', url: img.url, ...dl, width: img.width, height: img.height, quality: 84 });
    return `ok-${Math.round(dl.buf.length / 1024)}KB`;
  } catch (e) {
    return `error(${e.message.slice(0, 40)})`;
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const players = db.prepare('SELECT id, nba_id, name FROM players ORDER BY id').all()
    .filter(p => !SINGLE || String(p.nba_id) === SINGLE);

  const sites = SITE ? [SITE] : ['espn', 'yahoo', 'nba'];
  console.log(`\n🏀 Multi-site action photo scraper`);
  console.log(`   Players : ${players.length}`);
  console.log(`   Sites   : ${sites.join(', ')}`);
  console.log(`   REFRESH : ${REFRESH}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage',
           '--disable-gpu','--no-first-run','--no-zygote','--single-process'],
  });

  const counts = {};
  sites.forEach(s => counts[s] = { ok: 0, cached: 0, skip: 0 });

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    process.stdout.write(`\n▶ [${i+1}/${players.length}] ${p.name} (${p.nba_id})\n`);

    for (const site of sites) {
      let status;
      if (site === 'espn')  status = await scrapeEspn(browser, p);
      if (site === 'yahoo') status = await scrapeYahoo(browser, p);
      if (site === 'nba')   status = await scrapeNba(browser, p);

      const ok = status?.startsWith('ok') || status?.startsWith('api-ok') || status?.startsWith('pptr-ok') || status?.startsWith('cdn-ok');
      const icon = ok ? '✓' : status === 'cached' ? '○' : '─';
      process.stdout.write(`  ${icon} ${site.padEnd(6)}: ${status}\n`);
      if (ok) counts[site].ok++;
      else if (status === 'cached') counts[site].cached++;
      else counts[site].skip++;

      await delay(800);
    }
    if (i < players.length - 1) await delay(1000);
  }

  await browser.close();

  console.log('\n── Results ──────────────────────────────────────────────');
  for (const [site, c] of Object.entries(counts)) {
    console.log(`  ${site.padEnd(8)} saved: ${c.ok}  cached: ${c.cached}  skipped: ${c.skip}`);
  }

  const total = db.prepare('SELECT COUNT(*) as n, SUM(file_size) as sz FROM player_photos').get();
  console.log(`\n  Total photos: ${total.n}, ${Math.round((total.sz||0)/1024/1024*10)/10} MB`);
  db.close();
}

main().catch(e => { console.error('Fatal:', e); db.close(); process.exit(1); });
