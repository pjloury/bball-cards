/**
 * fetch-puppeteer.js — Puppeteer-based NBA.com action photo scraper
 *
 * Visits each player's NBA.com profile page, extracts the large hero/action
 * image that's loaded via JavaScript (not accessible via static scraping),
 * and stores the result as `nba-page-action` in player_photos.
 *
 * These are official promotional/action shots without watermarks.
 *
 * Usage:
 *   node db/fetch-puppeteer.js
 *   node db/fetch-puppeteer.js --player=2544
 *   node db/fetch-puppeteer.js --refresh    (re-fetch even if cached)
 *
 * Requires:  npm install puppeteer
 */

const Database = require('better-sqlite3');
const path     = require('path');

// Check puppeteer is available before doing anything else
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch {
  console.error('❌ puppeteer not installed. Run: npm install puppeteer');
  process.exit(1);
}

const DB_PATH = path.join(__dirname, 'hoops.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Ensure player_photos table exists
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

function alreadyHave(nbaId) {
  if (REFRESH) return false;
  return !!db.prepare("SELECT id FROM player_photos WHERE nba_id=? AND source='nba-page-action'").get(nbaId);
}

const delay = ms => new Promise(r => setTimeout(r, ms));

/**
 * Given a loaded Puppeteer page for an NBA.com player profile,
 * find the best large action/hero image URL.
 */
async function extractHeroImageUrl(page) {
  return page.evaluate(() => {
    // Try common NBA.com hero image selectors (they change class names frequently)
    const selectors = [
      // Hero banner image
      'img[class*="PlayerImage"]',
      'img[class*="player-image"]',
      'img[class*="HeroImage"]',
      'img[class*="hero-image"]',
      // Fallback: largest img on the page
    ];

    for (const sel of selectors) {
      const imgs = Array.from(document.querySelectorAll(sel));
      // Filter out tiny icons and find the largest
      const big = imgs
        .filter(img => img.naturalWidth > 200 && img.naturalHeight > 200)
        .sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight));
      if (big.length) return { url: big[0].src, width: big[0].naturalWidth, height: big[0].naturalHeight };
    }

    // Last resort: find the largest img on the page by dimensions
    const allImgs = Array.from(document.querySelectorAll('img[src]'))
      .filter(img => {
        const src = img.src || '';
        // NBA CDN action/promo images — NOT the small headshot CDN
        return src.includes('cdn.nba.com') &&
               !src.includes('/headshots/') &&
               img.naturalWidth > 300;
      })
      .sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight));

    if (allImgs.length) {
      return { url: allImgs[0].src, width: allImgs[0].naturalWidth, height: allImgs[0].naturalHeight };
    }

    // og:image meta tag as last fallback
    const og = document.querySelector('meta[property="og:image"]');
    if (og?.content) return { url: og.content, width: 0, height: 0 };

    return null;
  });
}

async function processPlayer(browser, player) {
  if (alreadyHave(player.nba_id)) {
    console.log(`  ○ nba_id=${player.nba_id} ${player.name} — already cached`);
    return 'cached';
  }

  const url = `https://www.nba.com/player/${player.nba_id}`;
  let page;
  try {
    page = await browser.newPage();

    // Block ads, analytics, videos to speed up load
    await page.setRequestInterception(true);
    page.on('request', req => {
      const rt = req.resourceType();
      const u  = req.url();
      if (['media', 'font', 'other'].includes(rt)) { req.abort(); return; }
      if (u.includes('ads') || u.includes('analytics') || u.includes('gtm') ||
          u.includes('doubleclick') || u.includes('google-analytics')) { req.abort(); return; }
      req.continue();
    });

    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36');

    // Navigate and wait for meaningful content
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

    // Give JS a moment to render images
    await delay(2500);

    const imgInfo = await extractHeroImageUrl(page);
    if (!imgInfo?.url) {
      console.log(`  ✗ nba_id=${player.nba_id} ${player.name} — no hero image found`);
      return 'no-image';
    }

    // Don't store the standard headshot CDN URL — we already have that
    if (imgInfo.url.includes('/headshots/nba/latest/')) {
      console.log(`  ─ nba_id=${player.nba_id} ${player.name} — only headshot found, skipping`);
      return 'headshot-only';
    }

    // Download the image
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 15000);
    const resp = await fetch(imgInfo.url, {
      signal: ctrl.signal,
      headers: { 'Referer': 'https://www.nba.com/', 'User-Agent': 'Mozilla/5.0 Chrome/120' },
    });
    if (!resp.ok) return `http-${resp.status}`;
    const buf  = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 15000) return 'too-small'; // reject placeholders

    const ct   = resp.headers.get('content-type') || 'image/jpeg';
    const mime = ct.split(';')[0].trim();
    upsertPhoto.run({
      playerId: player.id, nbaId: player.nba_id, source: 'nba-page-action',
      url: imgInfo.url, data: buf, mime,
      width: imgInfo.width, height: imgInfo.height,
      size: buf.length, quality: 87,
    });
    console.log(`  ✓ nba_id=${player.nba_id} ${player.name} — ${Math.round(buf.length/1024)}KB [${imgInfo.width}×${imgInfo.height}]  ${imgInfo.url.slice(0, 70)}`);
    return 'ok';
  } catch (e) {
    console.log(`  ✗ nba_id=${player.nba_id} ${player.name} — ${e.message.slice(0, 60)}`);
    return 'error';
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

async function main() {
  const players = db.prepare('SELECT id, nba_id, name FROM players ORDER BY id').all()
    .filter(p => !SINGLE || String(p.nba_id) === SINGLE);

  console.log(`\n🏀 Puppeteer NBA.com photo fetch — ${players.length} player(s)`);
  console.log(`   REFRESH: ${REFRESH}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // lighter on RAM
      '--disable-gpu',
    ],
  });

  const counts = { ok: 0, cached: 0, skipped: 0, error: 0 };

  for (let i = 0; i < players.length; i++) {
    const status = await processPlayer(browser, players[i]);
    if (status === 'ok')     counts.ok++;
    else if (status === 'cached') counts.cached++;
    else counts.skipped++;
    if (i < players.length - 1) await delay(1200); // polite pacing
  }

  await browser.close();

  const stats = db.prepare(
    "SELECT COUNT(*) as n, SUM(file_size) as sz FROM player_photos WHERE source='nba-page-action'"
  ).get();
  console.log(`\n✅ Done! New: ${counts.ok}, Cached: ${counts.cached}, Skipped/Error: ${counts.skipped}`);
  console.log(`   nba-page-action in DB: ${stats.n} photos, ${Math.round((stats.sz||0)/1024/1024*10)/10} MB`);
  db.close();
}

main().catch(e => { console.error('Fatal:', e); db.close(); process.exit(1); });
