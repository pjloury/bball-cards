/**
 * fetch-photos.js — Multi-source NBA player photo downloader
 *
 * Tries ALL of the following sources IN PARALLEL per player, stores every
 * successful image as a BLOB in the player_photos table.  Multiple photos
 * per player are welcome — the API endpoint serves the best one.
 *
 * Sources attempted:
 *  1. nba-hires      — NBA CDN 1040×760 official headshot
 *  2. nba-small      — NBA CDN 260×190  (fallback / extra)
 *  3. nba-legacy     — ak-static.cms.nba.com legacy CDN
 *  4. nba-draft      — draft.nba.com headshot CDN
 *  5. espn-headshot  — ESPN CDN (needs ESPN ID mapping via ESPN search API)
 *  6. espn-action    — ESPN full-body action shot CDN
 *  7. wiki-image     — Wikipedia/Wikimedia best player photo
 *
 * Run:  node db/fetch-photos.js
 *       node db/fetch-photos.js --player=2544    (single player by nbaId)
 *       node db/fetch-photos.js --refresh        (re-fetch everything)
 */

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_PATH = path.join(__dirname, 'hoops.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS player_photos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id   INTEGER NOT NULL,
    nba_id      INTEGER NOT NULL,
    source      TEXT    NOT NULL,
    original_url TEXT,
    data        BLOB    NOT NULL,
    mime_type   TEXT    DEFAULT 'image/png',
    width       INTEGER DEFAULT 0,
    height      INTEGER DEFAULT 0,
    file_size   INTEGER DEFAULT 0,
    quality     INTEGER DEFAULT 50,   -- 0-100 subjective score (hires=100, small=40)
    fetched_at  TEXT    DEFAULT (datetime('now')),
    UNIQUE(nba_id, source)
  );
  CREATE INDEX IF NOT EXISTS idx_photos_nba_id ON player_photos(nba_id);
`);

const delay = ms => new Promise(r => setTimeout(r, ms));

// ── CLI args ──────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const REFRESH = args.includes('--refresh');
const SINGLE  = (args.find(a => a.startsWith('--player=')) || '').replace('--player=', '');

// ── Player list from DB ───────────────────────────────────────────────────────
function getPlayers() {
  const rows = db.prepare('SELECT id, nba_id, name FROM players ORDER BY id').all();
  if (SINGLE) return rows.filter(r => String(r.nba_id) === SINGLE);
  return rows;
}

// ── Already cached? ───────────────────────────────────────────────────────────
function alreadyHave(nbaId, source) {
  if (REFRESH) return false;
  const row = db.prepare('SELECT id FROM player_photos WHERE nba_id=? AND source=?').get(nbaId, source);
  return !!row;
}

// ── Store a blob ──────────────────────────────────────────────────────────────
const upsertPhoto = db.prepare(`
  INSERT INTO player_photos (player_id, nba_id, source, original_url, data, mime_type, file_size, quality)
  VALUES (@playerId, @nbaId, @source, @url, @data, @mime, @size, @quality)
  ON CONFLICT(nba_id, source) DO UPDATE SET
    data=excluded.data, original_url=excluded.original_url,
    file_size=excluded.file_size, fetched_at=datetime('now')
`);

function savePhoto({ playerId, nbaId, source, url, data, mime = 'image/png', quality = 50 }) {
  try {
    upsertPhoto.run({ playerId, nbaId, source, url, data, mime, size: data.length, quality });
    return true;
  } catch (e) {
    console.error(`  ✗ DB save failed [${source}]:`, e.message);
    return false;
  }
}

// ── Generic image fetcher ─────────────────────────────────────────────────────
async function fetchImage(url, opts = {}) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeout || 12000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'image/webp,image/png,image/*,*/*',
        'Referer': opts.referer || 'https://www.nba.com/',
        ...opts.headers,
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct   = res.headers.get('content-type') || 'image/png';
    const buf  = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2000) return null; // reject tiny/placeholder images
    return { data: buf, mime: ct.split(';')[0].trim() };
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SOURCE DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

// Source 1 — NBA CDN hi-res headshot (1040×760)
async function fetchNBAHires(player) {
  const source = 'nba-hires';
  if (alreadyHave(player.nba_id, source)) return { source, status: 'cached' };
  const url = `https://cdn.nba.com/headshots/nba/latest/1040x760/${player.nba_id}.png`;
  const img = await fetchImage(url, { quality: 100 });
  if (!img) return { source, status: 'fail' };
  const ok = savePhoto({ playerId: player.id, nbaId: player.nba_id, source, url, ...img, quality: 100 });
  return { source, status: ok ? 'ok' : 'db-err', bytes: img.data.length };
}

// Source 2 — NBA CDN small headshot (260×190)
async function fetchNBASmall(player) {
  const source = 'nba-small';
  if (alreadyHave(player.nba_id, source)) return { source, status: 'cached' };
  const url = `https://cdn.nba.com/headshots/nba/latest/260x190/${player.nba_id}.png`;
  const img = await fetchImage(url);
  if (!img) return { source, status: 'fail' };
  const ok = savePhoto({ playerId: player.id, nbaId: player.nba_id, source, url, ...img, quality: 40 });
  return { source, status: ok ? 'ok' : 'db-err', bytes: img.data.length };
}

// Source 3 — NBA legacy ak-static CDN
async function fetchNBALegacy(player) {
  const source = 'nba-legacy';
  if (alreadyHave(player.nba_id, source)) return { source, status: 'cached' };
  const url = `https://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/1040x760/${player.nba_id}.png`;
  const img = await fetchImage(url, { referer: 'https://www.nba.com/' });
  if (!img) return { source, status: 'fail' };
  const ok = savePhoto({ playerId: player.id, nbaId: player.nba_id, source, url, ...img, quality: 90 });
  return { source, status: ok ? 'ok' : 'db-err', bytes: img.data.length };
}

// Source 4 — NBA draft headshot CDN
async function fetchNBADraft(player) {
  const source = 'nba-draft';
  if (alreadyHave(player.nba_id, source)) return { source, status: 'cached' };
  const url = `https://cdn.nba.com/headshots/nba/latest/1040x760/${player.nba_id}.png`;
  // Try alternate path pattern used by draft pages
  const url2 = `https://cdn.nba.com/manage/2024/10/nba-draft-${player.nba_id}.png`;
  let img = await fetchImage(url2, { referer: 'https://www.nba.com/draft/' });
  if (!img) return { source, status: 'fail' }; // skip if neither path works
  const ok = savePhoto({ playerId: player.id, nbaId: player.nba_id, source, url: url2, ...img, quality: 80 });
  return { source, status: ok ? 'ok' : 'db-err', bytes: img.data.length };
}

// Source 5 — ESPN headshot (requires ESPN ID from their player search API)
// ESPN search returns: { items: [{ id, displayName, type:'player', ... }] }
const espnIdCache = {};
async function lookupESPNId(playerName) {
  if (espnIdCache[playerName]) return espnIdCache[playerName];
  try {
    const query = encodeURIComponent(playerName);
    const url   = `https://site.api.espn.com/apis/common/v3/search?query=${query}&limit=5&type=player&sport=basketball&league=nba`;
    const ctrl  = new AbortController();
    setTimeout(() => ctrl.abort(), 8000);
    const res   = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120', 'Referer': 'https://www.espn.com/' }
    });
    if (!res.ok) return null;
    const json  = await res.json();
    // items[] at top level, each with type:'player'
    const items = (json?.items || []).filter(i => i.type === 'player');
    if (!items.length) return null;
    const espnId = String(items[0].id);
    espnIdCache[playerName] = espnId;
    return espnId;
  } catch { return null; }
}

async function fetchESPNHeadshot(player) {
  const source = 'espn-headshot';
  if (alreadyHave(player.nba_id, source)) return { source, status: 'cached' };
  const espnId = await lookupESPNId(player.name);
  if (!espnId) return { source, status: 'no-espn-id' };
  const url = `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${espnId}.png&w=350&h=254`;
  const img = await fetchImage(url, { referer: 'https://www.espn.com/' });
  if (!img) return { source, status: 'fail' };
  const ok = savePhoto({ playerId: player.id, nbaId: player.nba_id, source, url, ...img, quality: 80 });
  return { source, status: ok ? 'ok' : 'db-err', bytes: img.data.length };
}

// Source 6 — ESPN full-body / hi-res headshot (larger scale)
async function fetchESPNAction(player) {
  const source = 'espn-action';
  if (alreadyHave(player.nba_id, source)) return { source, status: 'cached' };
  const espnId = await lookupESPNId(player.name);
  if (!espnId) return { source, status: 'no-espn-id' };
  // Use ESPN combiner for largest available crop (500px wide keeps it crisp)
  const url = `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${espnId}.png&w=500&h=364`;
  const img = await fetchImage(url, { referer: 'https://www.espn.com/' });
  if (!img) return { source, status: 'fail' };
  const ok = savePhoto({ playerId: player.id, nbaId: player.nba_id, source, url, ...img, quality: 75 });
  return { source, status: ok ? 'ok' : 'db-err', bytes: img.data.length };
}

// Source 7 — Wikipedia / Wikimedia best player photo
async function fetchWikipediaPhoto(player) {
  const source = 'wiki-image';
  if (alreadyHave(player.nba_id, source)) return { source, status: 'cached' };
  try {
    // Step 1: Search Wikipedia for the player page
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(player.name + ' NBA basketball')}&srlimit=1&format=json&origin=*`;
    const ctrl1 = new AbortController();
    setTimeout(() => ctrl1.abort(), 8000);
    const sRes  = await fetch(searchUrl, { signal: ctrl1.signal });
    if (!sRes.ok) return { source, status: 'fail' };
    const sJson = await sRes.json();
    const title = sJson?.query?.search?.[0]?.title;
    if (!title) return { source, status: 'no-article' };

    // Step 2: Get the page's main image (thumbnail / original)
    const imgUrl  = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=600&pilimit=1&format=json&origin=*`;
    const ctrl2   = new AbortController();
    setTimeout(() => ctrl2.abort(), 8000);
    const iRes    = await fetch(imgUrl, { signal: ctrl2.signal });
    if (!iRes.ok) return { source, status: 'fail' };
    const iJson   = await iRes.json();
    const pages   = iJson?.query?.pages || {};
    const page    = Object.values(pages)[0];
    const thumb   = page?.thumbnail?.source;
    if (!thumb) return { source, status: 'no-image' };

    // Step 3: Fetch the actual image
    const img = await fetchImage(thumb, { referer: 'https://en.wikipedia.org/' });
    if (!img) return { source, status: 'fetch-fail' };
    const ok = savePhoto({ playerId: player.id, nbaId: player.nba_id, source, url: thumb, ...img, quality: 70 });
    return { source, status: ok ? 'ok' : 'db-err', bytes: img.data.length };
  } catch (e) {
    return { source, status: 'error', err: e.message };
  }
}

// Source 8 — NBA.com stats player profile image (via API JSON, occasionally has richer CDN path)
async function fetchNBAStatsPhoto(player) {
  const source = 'nba-stats-profile';
  if (alreadyHave(player.nba_id, source)) return { source, status: 'cached' };
  try {
    const infoUrl = `https://stats.nba.com/stats/commonplayerinfo?PlayerID=${player.nba_id}`;
    const ctrl    = new AbortController();
    setTimeout(() => ctrl.abort(), 10000);
    const res     = await fetch(infoUrl, {
      signal: ctrl.signal,
      headers: {
        'Accept': '*/*', 'Referer': 'https://www.nba.com/',
        'Origin': 'https://www.nba.com',
        'x-nba-stats-origin': 'stats', 'x-nba-stats-token': 'true',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120 Safari/537.36',
      }
    });
    if (!res.ok) return { source, status: 'api-fail' };
    const json    = await res.json();
    const set     = json?.resultSets?.find(s => s.name === 'CommonPlayerInfo');
    const headers = set?.headers || [];
    const row     = set?.rowSet?.[0] || [];
    const get     = k => { const i = headers.indexOf(k); return i >= 0 ? row[i] : null; };

    // Try ROSTERPICTURE if available
    const rostPic = get('ROSTERPICTURE');
    if (rostPic && rostPic.startsWith('http')) {
      const img = await fetchImage(rostPic, { referer: 'https://www.nba.com/' });
      if (img) {
        const ok = savePhoto({ playerId: player.id, nbaId: player.nba_id, source, url: rostPic, ...img, quality: 85 });
        return { source, status: ok ? 'ok' : 'db-err', bytes: img.data.length };
      }
    }
    return { source, status: 'no-pic-in-api' };
  } catch (e) {
    return { source, status: 'error' };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATION
// ══════════════════════════════════════════════════════════════════════════════

async function processPlayer(player) {
  console.log(`\n▶ [${player.id}/100] ${player.name} (NBA ID: ${player.nba_id})`);

  // Run ALL sources in parallel
  const results = await Promise.allSettled([
    fetchNBAHires(player),
    fetchNBASmall(player),
    fetchNBALegacy(player),
    fetchNBADraft(player),
    fetchESPNHeadshot(player),
    fetchESPNAction(player),
    fetchWikipediaPhoto(player),
    fetchNBAStatsPhoto(player),
  ]);

  let saved = 0;
  for (const r of results) {
    const val = r.status === 'fulfilled' ? r.value : { source: '?', status: 'thrown', err: r.reason?.message };
    const icon = val.status === 'ok' ? '✓' : val.status === 'cached' ? '○' : '✗';
    const size = val.bytes ? ` (${Math.round(val.bytes/1024)}KB)` : '';
    console.log(`   ${icon} ${val.source}: ${val.status}${size}`);
    if (val.status === 'ok') saved++;
  }
  return saved;
}

async function main() {
  const players = getPlayers();
  console.log(`\n🏀 Photo fetch starting — ${players.length} player(s)  REFRESH=${REFRESH}`);
  console.log(`   Sources: nba-hires, nba-small, nba-legacy, nba-draft, espn-headshot, espn-action, wiki-image, nba-stats-profile`);
  console.log(`   DB: ${DB_PATH}\n`);

  let totalSaved = 0;
  for (let i = 0; i < players.length; i++) {
    const saved = await processPlayer(players[i]);
    totalSaved += saved;
    // Small gap between players to be a polite HTTP citizen
    if (i < players.length - 1) await delay(400);
  }

  // Summary
  const countRow = db.prepare('SELECT COUNT(*) as n, SUM(file_size) as sz FROM player_photos').get();
  const bySource = db.prepare('SELECT source, COUNT(*) as n FROM player_photos GROUP BY source ORDER BY n DESC').all();
  console.log(`\n✅ Done! Saved ${totalSaved} new photos this run.`);
  console.log(`   Total in DB: ${countRow.n} photos, ${Math.round((countRow.sz||0)/1024/1024*10)/10} MB`);
  console.log('\n   By source:');
  bySource.forEach(r => console.log(`     ${r.source.padEnd(25)} ${r.n}`));
  db.close();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
