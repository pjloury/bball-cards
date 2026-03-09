/**
 * fetch-bing-photos.js — Bing Image Search action photo downloader
 *
 * Searches Bing Images for aesthetic NBA action shots of each player,
 * downloads the best results, and stores them as BLOBs in player_photos.
 *
 * Usage:
 *   BING_KEY=<key> node db/fetch-bing-photos.js
 *   BING_KEY=<key> BING_ENDPOINT=https://xxx.cognitiveservices.azure.com node db/fetch-bing-photos.js
 *   BING_KEY=<key> node db/fetch-bing-photos.js --player=2544
 *   BING_KEY=<key> node db/fetch-bing-photos.js --refresh   (re-fetch even if cached)
 *   BING_KEY=<key> node db/fetch-bing-photos.js --count=5   (images per player, default 5)
 *
 * Searches performed per player (results merged & deduplicated by URL):
 *   1. "{name} NBA action dunk layup 2024 2025"          — in-game action
 *   2. "{name} NBA basketball game play"                   — broader game shots
 *   3. "{name} NBA celebration jump poster dunk"           — highlight moments
 */

const Database = require('better-sqlite3');
const path     = require('path');

// ── Config from environment ───────────────────────────────────────────────────
const BING_KEY      = process.env.BING_KEY;
const BING_ENDPOINT = (process.env.BING_ENDPOINT || 'https://api.bing.microsoft.com').replace(/\/$/, '');
const BING_URL      = `${BING_ENDPOINT}/v7.0/images/search`;

if (!BING_KEY) {
  console.error('❌ BING_KEY env var required.\nUsage: BING_KEY=yourkey node db/fetch-bing-photos.js');
  process.exit(1);
}

const DB_PATH = path.join(__dirname, 'hoops.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Ensure player_photos table exists (also created by fetch-photos.js)
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
const args       = process.argv.slice(2);
const REFRESH    = args.includes('--refresh');
const SINGLE     = (args.find(a => a.startsWith('--player=')) || '').replace('--player=', '');
const COUNT      = parseInt((args.find(a => a.startsWith('--count=')) || '--count=5').replace('--count=', ''), 10);

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

// ── Bing Image Search ─────────────────────────────────────────────────────────
async function bingSearch(query, count = 10) {
  const params = new URLSearchParams({
    q:           query,
    count:       String(count),
    imageType:   'Photo',
    size:        'Large',       // Large = >500px on both sides
    aspect:      'Tall',        // portrait orientation — great for cards
    safeSearch:  'Moderate',
    mkt:         'en-US',
  });
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(`${BING_URL}?${params}`, {
      signal: ctrl.signal,
      headers: {
        'Ocp-Apim-Subscription-Key': BING_KEY,
        'User-Agent': 'Mozilla/5.0 Chrome/120',
      },
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Bing API ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = await res.json();
    return json.value || [];
  } catch (e) {
    console.error(`  ⚠ Bing search failed: ${e.message}`);
    return [];
  }
}

// ── Fetch and store one image URL ─────────────────────────────────────────────
async function downloadAndStore({ playerId, nbaId, source, contentUrl, width, height, encodingFormat }) {
  if (alreadyHave(nbaId, source)) return 'cached';
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(contentUrl, {
      signal: ctrl.signal,
      headers: {
        'User-Agent':  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept':      'image/webp,image/png,image/jpeg,image/*,*/*',
        'Referer':     'https://www.google.com/',
      },
      redirect: 'follow',
    });
    if (!res.ok) return `http-${res.status}`;
    const ct   = res.headers.get('content-type') || `image/${encodingFormat || 'jpeg'}`;
    const buf  = Buffer.from(await res.arrayBuffer());
    if (buf.length < 10000) return 'too-small'; // reject tiny/placeholder
    const mime = ct.split(';')[0].trim();
    upsertPhoto.run({
      playerId, nbaId, source, url: contentUrl,
      data: buf, mime, width: width || 0, height: height || 0,
      size: buf.length, quality: 88,
    });
    return `ok-${Math.round(buf.length / 1024)}KB`;
  } catch (e) {
    return `fail(${e.message.slice(0, 40)})`;
  }
}

// ── Per-player queries ────────────────────────────────────────────────────────
function buildQueries(player) {
  const n = player.name;
  return [
    `${n} NBA basketball action dunk layup 2024 2025`,
    `${n} NBA game play highlights basketball`,
    `${n} basketball poster dunk celebration jump`,
  ];
}

// ── Process one player ────────────────────────────────────────────────────────
async function processPlayer(player) {
  console.log(`\n▶ [${player.id}/100] ${player.name} (NBA ID: ${player.nba_id})`);

  const queries = buildQueries(player);
  const seen    = new Set(); // deduplicate by URL
  const results = [];

  // Run all queries sequentially (Bing rate limit: ~3 req/s)
  for (const q of queries) {
    const hits = await bingSearch(q, Math.ceil(COUNT * 1.5));
    for (const hit of hits) {
      if (!hit.contentUrl || seen.has(hit.contentUrl)) continue;
      // Skip images from sites that hotlink-block (Getty, Shutterstock, etc.)
      const host = new URL(hit.contentUrl).hostname.toLowerCase();
      if (/getty|shutterstock|alamy|corbis|istockphoto/.test(host)) continue;
      seen.add(hit.contentUrl);
      results.push(hit);
      if (results.length >= COUNT * 2) break; // collect 2× as candidates
    }
    if (results.length >= COUNT * 2) break;
    await delay(400); // stay under Bing rate limit
  }

  // Prefer largest images — sort by area desc
  results.sort((a, b) => (b.width * b.height) - (a.width * a.height));

  // Download top COUNT images
  let saved = 0;
  for (let i = 0; i < Math.min(results.length, COUNT); i++) {
    const hit    = results[i];
    const source = `bing-action-${i + 1}`;
    const status = await downloadAndStore({
      playerId: player.id, nbaId: player.nba_id, source,
      contentUrl: hit.contentUrl, width: hit.width, height: hit.height,
      encodingFormat: hit.encodingFormat,
    });
    const icon = status.startsWith('ok') ? '✓' : status === 'cached' ? '○' : '✗';
    console.log(`   ${icon} ${source}: ${status}  [${hit.width}×${hit.height}]`);
    if (status.startsWith('ok')) saved++;
    await delay(200);
  }
  return saved;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const players = db.prepare('SELECT id, nba_id, name FROM players ORDER BY id').all()
    .filter(p => !SINGLE || String(p.nba_id) === SINGLE);

  console.log(`\n🏀 Bing photo fetch — ${players.length} player(s)`);
  console.log(`   Endpoint : ${BING_URL}`);
  console.log(`   Per player: ${COUNT} images × ${buildQueries(players[0]).length} queries`);
  console.log(`   REFRESH  : ${REFRESH}\n`);

  let totalSaved = 0;
  for (let i = 0; i < players.length; i++) {
    totalSaved += await processPlayer(players[i]);
    if (i < players.length - 1) await delay(600);
  }

  const stats = db.prepare(`
    SELECT COUNT(*) as n, SUM(file_size) as sz
    FROM player_photos WHERE source LIKE 'bing-%'
  `).get();
  const total = db.prepare('SELECT COUNT(*) as n, SUM(file_size) as sz FROM player_photos').get();

  console.log(`\n✅ Done! Saved ${totalSaved} new Bing photos this run.`);
  console.log(`   Bing photos in DB : ${stats.n}, ${Math.round((stats.sz||0)/1024/1024*10)/10} MB`);
  console.log(`   All photos in DB  : ${total.n}, ${Math.round((total.sz||0)/1024/1024*10)/10} MB`);
  db.close();
}

main().catch(e => { console.error('Fatal:', e); db.close(); process.exit(1); });
