/**
 * fetch-google-photos.js — Google Custom Search API action photo fetcher
 *
 * Uses Google Custom Search Image Search to find NBA player action shots,
 * downloads the best results, and stores them as BLOBs in player_photos.
 *
 * Setup (one-time):
 *   1. Go to https://console.cloud.google.com → APIs & Services → Credentials
 *   2. Create API Key → restrict to "Custom Search API"
 *   3. Go to https://programmablesearchengine.google.com → New search engine
 *      - Sites to search: leave empty (or add nba.com, espn.com, etc.)
 *      - Enable "Search the entire web" and "Image search" in settings
 *   4. Copy your Search Engine ID (cx)
 *
 * Free tier: 100 queries/day. Paid: $5 per 1000 queries.
 *
 * Usage:
 *   GOOGLE_KEY=AIza... GOOGLE_CX=xxx:yyy node db/fetch-google-photos.js
 *   GOOGLE_KEY=AIza... GOOGLE_CX=xxx:yyy node db/fetch-google-photos.js --player=2544
 *   GOOGLE_KEY=AIza... GOOGLE_CX=xxx:yyy node db/fetch-google-photos.js --refresh
 *   GOOGLE_KEY=AIza... GOOGLE_CX=xxx:yyy node db/fetch-google-photos.js --count=3
 *
 * Stores as sources: google-action-1, google-action-2, google-action-3, ...
 *
 * Photo priority in server.js already includes google-action-* — they'll
 * automatically appear as options in the card modal photo source picker.
 */

const Database = require('better-sqlite3');
const path     = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const GOOGLE_KEY = process.env.GOOGLE_KEY;
const GOOGLE_CX  = process.env.GOOGLE_CX;
const API_URL    = 'https://customsearch.googleapis.com/customsearch/v1';

if (!GOOGLE_KEY || !GOOGLE_CX) {
  console.error(`
❌  GOOGLE_KEY and GOOGLE_CX env vars required.

Setup:
  1. https://console.cloud.google.com → Enable "Custom Search API" → create API key
  2. https://programmablesearchengine.google.com → New engine → enable Image Search + Search the web
  3. Copy your Search Engine ID (cx)

Usage:
  GOOGLE_KEY=AIza... GOOGLE_CX=xxxxx:yyy node db/fetch-google-photos.js
`);
  process.exit(1);
}

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

// ── CLI args ──────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const REFRESH = args.includes('--refresh');
const SINGLE  = (args.find(a => a.startsWith('--player=')) || '').replace('--player=', '');
const COUNT   = parseInt((args.find(a => a.startsWith('--count=')) || '--count=3').replace('--count=', ''), 10);

const delay = ms => new Promise(r => setTimeout(r, ms));

// ── DB helpers ────────────────────────────────────────────────────────────────
function alreadyHave(nbaId, source) {
  if (REFRESH) return false;
  return !!db.prepare('SELECT id FROM player_photos WHERE nba_id=? AND source=?').get(nbaId, source);
}

const upsertPhoto = db.prepare(`
  INSERT INTO player_photos (player_id, nba_id, source, original_url, data, mime_type, width, height, file_size, quality)
  VALUES (@playerId, @nbaId, @source, @url, @data, @mime, @width, @height, @size, @quality)
  ON CONFLICT(nba_id, source) DO UPDATE SET
    data=excluded.data, original_url=excluded.original_url,
    width=excluded.width, height=excluded.height,
    file_size=excluded.file_size, fetched_at=datetime('now')
`);

// ── Google Custom Search ──────────────────────────────────────────────────────
async function googleImageSearch(query, num = 10) {
  // Google CSE returns max 10 per request
  const params = new URLSearchParams({
    key:        GOOGLE_KEY,
    cx:         GOOGLE_CX,
    q:          query,
    searchType: 'image',
    num:        String(Math.min(num, 10)),
    imgType:    'photo',
    imgSize:    'large',    // xlarge, large, medium, etc.
    safe:       'active',
    rights:     '',         // don't restrict by license — editorial use OK
    // Restrict to portrait/tall images ideal for cards
    imgColorType: 'color',
  });
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(`${API_URL}?${params}`, {
      signal: ctrl.signal,
      headers: { 'Accept': 'application/json' },
    });
    if (res.status === 429) {
      console.warn('  ⚠ Google API quota reached (100/day free tier)');
      return [];
    }
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Google API ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = await res.json();
    return json.items || [];
  } catch (e) {
    console.error(`  ⚠ Google search failed: ${e.message}`);
    return [];
  }
}

// ── Download one image ────────────────────────────────────────────────────────
async function downloadAndStore({ playerId, nbaId, source, imageUrl, width, height, mime }) {
  if (alreadyHave(nbaId, source)) return 'cached';
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(imageUrl, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept':     'image/webp,image/png,image/jpeg,image/*',
        'Referer':    'https://www.google.com/',
      },
      redirect: 'follow',
    });
    if (!res.ok) return `http-${res.status}`;
    const ct  = res.headers.get('content-type') || mime || 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 10000) return 'too-small';
    upsertPhoto.run({
      playerId, nbaId, source, url: imageUrl,
      data: buf, mime: ct.split(';')[0].trim(),
      width: width || 0, height: height || 0,
      size: buf.length, quality: 86,
    });
    return `ok-${Math.round(buf.length / 1024)}KB`;
  } catch (e) {
    return `fail(${e.message.slice(0, 40)})`;
  }
}

// ── Queries per player ────────────────────────────────────────────────────────
function buildQueries(name) {
  return [
    `${name} NBA basketball action shot 2024 2025`,
    `${name} NBA dunk layup highlights game`,
    `${name} basketball poster editorial photo`,
  ];
}

// ── Process one player ────────────────────────────────────────────────────────
// Blocked image hosts (watermark/paywall)
const BLOCKED_HOSTS = /getty|shutterstock|alamy|corbis|istockphoto|depositphotos|bigstockphoto|dreamstime/;

async function processPlayer(player) {
  console.log(`\n▶ [${player.id}/100] ${player.name} (NBA ID: ${player.nba_id})`);

  // Check if we already have all COUNT slots filled
  const existing = db.prepare(
    "SELECT source FROM player_photos WHERE nba_id=? AND source LIKE 'google-action-%'"
  ).all(player.nba_id).map(r => r.source);
  if (!REFRESH && existing.length >= COUNT) {
    console.log(`  ○ Already have ${existing.length} google photos — skipping`);
    return 0;
  }

  const queries = buildQueries(player.name);
  const seen    = new Set();
  const results = [];

  for (const q of queries) {
    const hits = await googleImageSearch(q, 10);
    for (const hit of hits) {
      const url = hit.link;
      if (!url || seen.has(url)) continue;
      try {
        const host = new URL(url).hostname.toLowerCase();
        if (BLOCKED_HOSTS.test(host)) continue;
      } catch { continue; }
      seen.add(url);
      results.push({
        url,
        width:  hit.image?.width  || 0,
        height: hit.image?.height || 0,
        mime:   hit.mime          || 'image/jpeg',
      });
      if (results.length >= COUNT * 3) break;
    }
    if (results.length >= COUNT * 3) break;
    await delay(350); // stay under rate limits
  }

  // Sort largest first
  results.sort((a, b) => (b.width * b.height) - (a.width * a.height));

  let saved = 0;
  for (let i = 0; i < Math.min(results.length, COUNT); i++) {
    const { url, width, height, mime } = results[i];
    // Number slots starting after existing ones
    const slotNum = existing.length + i + 1;
    const source  = `google-action-${slotNum}`;
    const status  = await downloadAndStore({ playerId: player.id, nbaId: player.nba_id, source, imageUrl: url, width, height, mime });
    const icon    = status.startsWith('ok') ? '✓' : status === 'cached' ? '○' : '✗';
    console.log(`  ${icon} ${source}: ${status}  [${width}×${height}]`);
    if (status.startsWith('ok')) saved++;
    await delay(150);
  }
  return saved;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const players = db.prepare('SELECT id, nba_id, name FROM players ORDER BY id').all()
    .filter(p => !SINGLE || String(p.nba_id) === SINGLE);

  const queries_needed = players.length * buildQueries('test').length;
  console.log(`\n🏀 Google Custom Search photo fetch — ${players.length} player(s)`);
  console.log(`   Images per player : ${COUNT}`);
  console.log(`   Queries needed    : ~${queries_needed} (free tier: 100/day)`);
  if (queries_needed > 100) {
    console.log(`   ⚠  ${queries_needed} queries exceeds free tier (100/day).`);
    console.log(`      Will hit quota around player ${Math.floor(100 / buildQueries('x').length)}.`);
    console.log(`      Re-run tomorrow to continue, or upgrade to paid ($5/1000 queries).`);
  }
  console.log(`   REFRESH: ${REFRESH}\n`);

  let totalSaved = 0;
  for (let i = 0; i < players.length; i++) {
    totalSaved += await processPlayer(players[i]);
    if (i < players.length - 1) await delay(500);
  }

  const stats = db.prepare(
    "SELECT COUNT(*) as n, SUM(file_size) as sz FROM player_photos WHERE source LIKE 'google-action-%'"
  ).get();
  const total = db.prepare('SELECT COUNT(*) as n, SUM(file_size) as sz FROM player_photos').get();
  console.log(`\n✅ Done! Saved ${totalSaved} new Google photos this run.`);
  console.log(`   Google photos in DB : ${stats.n}, ${Math.round((stats.sz||0)/1024/1024*10)/10} MB`);
  console.log(`   All photos in DB    : ${total.n}, ${Math.round((total.sz||0)/1024/1024*10)/10} MB`);
  db.close();
}

main().catch(e => { console.error('Fatal:', e); db.close(); process.exit(1); });
