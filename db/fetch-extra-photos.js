/**
 * fetch-extra-photos.js — Additional free-source photo scrapers
 *
 * Sources:
 *  1. wikimedia-commons  — Direct Wikimedia Commons image search (much richer than
 *                          Wikipedia article thumbnails — searches the whole Commons)
 *  2. nba-page-gallery   — Scrapes player's nba.com page for og:image + data-src images
 *  3. nba-fantasy-photo  — NBA Fantasy / 2KDB profile photo CDN (different crop/pose)
 *  4. hoopshype-photo    — HoopsHype player pages (often great hi-res action shots)
 *  5. flickr-nba         — Flickr NBA official account search (set FLICKR_KEY env var)
 *
 * Usage:
 *   node db/fetch-extra-photos.js
 *   node db/fetch-extra-photos.js --player=2544
 *   node db/fetch-extra-photos.js --refresh
 *   FLICKR_KEY=xxx node db/fetch-extra-photos.js          (enables Flickr source)
 */

const Database = require('better-sqlite3');
const path     = require('path');

const DB_PATH = path.join(__dirname, 'hoops.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS player_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL, nba_id INTEGER NOT NULL, source TEXT NOT NULL,
    original_url TEXT, data BLOB NOT NULL, mime_type TEXT DEFAULT 'image/jpeg',
    width INTEGER DEFAULT 0, height INTEGER DEFAULT 0, file_size INTEGER DEFAULT 0,
    quality INTEGER DEFAULT 50, fetched_at TEXT DEFAULT (datetime('now')),
    UNIQUE(nba_id, source)
  );
  CREATE INDEX IF NOT EXISTS idx_photos_nba_id ON player_photos(nba_id);
`);

const delay    = ms => new Promise(r => setTimeout(r, ms));
const args     = process.argv.slice(2);
const REFRESH  = args.includes('--refresh');
const SINGLE   = (args.find(a => a.startsWith('--player=')) || '').replace('--player=', '');
const FLICKR_KEY = process.env.FLICKR_KEY || '';

// ── DB helpers ────────────────────────────────────────────────────────────────
function alreadyHave(nbaId, source) {
  if (REFRESH) return false;
  return !!db.prepare('SELECT id FROM player_photos WHERE nba_id=? AND source=?').get(nbaId, source);
}
const upsertPhoto = db.prepare(`
  INSERT INTO player_photos (player_id,nba_id,source,original_url,data,mime_type,width,height,file_size,quality)
  VALUES (@playerId,@nbaId,@source,@url,@data,@mime,@width,@height,@size,@quality)
  ON CONFLICT(nba_id,source) DO UPDATE SET
    data=excluded.data,original_url=excluded.original_url,
    width=excluded.width,height=excluded.height,
    file_size=excluded.file_size,fetched_at=datetime('now')
`);
function savePhoto({ playerId,nbaId,source,url,data,mime='image/jpeg',width=0,height=0,quality=60 }) {
  try {
    upsertPhoto.run({ playerId,nbaId,source,url,data,mime,width,height,size:data.length,quality });
    return true;
  } catch { return false; }
}

// ── Generic image fetch ───────────────────────────────────────────────────────
async function fetchImage(url, referer='https://www.google.com/', timeoutMs=14000) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'image/webp,image/png,image/jpeg,image/*,*/*',
        'Referer': referer,
      },
      redirect: 'follow',
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const ct  = res.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 8000) return null; // reject tiny placeholders
    return { data: buf, mime: ct.split(';')[0].trim() };
  } catch { return null; }
}

// ── Generic page fetch (HTML) ─────────────────────────────────────────────────
async function fetchPage(url, referer='https://www.google.com/') {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,*/*',
        'Referer': referer,
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

// ══════════════════════════════════════════════════════════════════════════════
// SOURCE 1 — Wikimedia Commons direct image search
// Much richer than Wikipedia article thumbnails — searches the full Commons
// repository for the player name, returns highest-res file available
// ══════════════════════════════════════════════════════════════════════════════
async function fetchWikimediaCommons(player) {
  const source = 'wikimedia-commons';
  if (alreadyHave(player.nba_id, source)) return { source, status: 'cached' };
  try {
    // Search Commons for images of this player
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(player.name + ' NBA basketball')}&srnamespace=6&srlimit=5&format=json&origin=*`;
    const ctrl1 = new AbortController();
    setTimeout(() => ctrl1.abort(), 10000);
    const sRes  = await fetch(searchUrl, { signal: ctrl1.signal });
    if (!sRes.ok) return { source, status: 'api-fail' };
    const sJson = await sRes.json();
    const results = sJson?.query?.search || [];
    if (!results.length) return { source, status: 'no-results' };

    // Try each result until we get a good image
    for (const r of results.slice(0, 3)) {
      const title = r.title; // e.g. "File:LeBron James.jpg"
      // Get image info (direct URL)
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=800&format=json&origin=*`;
      const ctrl2   = new AbortController();
      setTimeout(() => ctrl2.abort(), 8000);
      const iRes    = await fetch(infoUrl, { signal: ctrl2.signal });
      if (!iRes.ok) continue;
      const iJson   = await iRes.json();
      const pages   = iJson?.query?.pages || {};
      const page    = Object.values(pages)[0];
      const info    = page?.imageinfo?.[0];
      if (!info?.url) continue;

      // Prefer the thumb URL (scaled to 800px) — original can be huge
      const imgUrl = info.thumburl || info.url;
      const img    = await fetchImage(imgUrl, 'https://commons.wikimedia.org/');
      if (!img) continue;

      const ok = savePhoto({ playerId:player.id, nbaId:player.nba_id, source, url:imgUrl, ...img,
        width: info.thumbwidth || 800, height: info.thumbheight || 600, quality: 78 });
      return { source, status: ok ? 'ok' : 'db-err', bytes: img.data.length };
    }
    return { source, status: 'no-downloadable-image' };
  } catch (e) { return { source, status: 'error', err: e.message }; }
}

// ══════════════════════════════════════════════════════════════════════════════
// SOURCE 2 — NBA.com player page og:image + gallery images
// Scrapes the player's official NBA page for the OpenGraph image (often a
// full-bleed action/promo shot different from the headshot CDN)
// ══════════════════════════════════════════════════════════════════════════════

// Build a slug from player name e.g. "LeBron James" → "lebron-james"
function nameSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function fetchNBAPageGallery(player) {
  const source = 'nba-page-og';
  if (alreadyHave(player.nba_id, source)) return { source, status: 'cached' };
  try {
    const slug    = nameSlug(player.name);
    const pageUrl = `https://www.nba.com/player/${player.nba_id}/${slug}`;
    const html    = await fetchPage(pageUrl, 'https://www.nba.com/');
    if (!html) return { source, status: 'page-fail' };

    // Extract og:image
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                 || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (!ogMatch) return { source, status: 'no-og-image' };

    let imgUrl = ogMatch[1];
    // Skip if it's just the site logo / default
    if (imgUrl.includes('nba-logoman') || imgUrl.includes('default')) return { source, status: 'default-image' };

    const img = await fetchImage(imgUrl, pageUrl);
    if (!img) return { source, status: 'fetch-fail' };

    const ok = savePhoto({ playerId:player.id, nbaId:player.nba_id, source, url:imgUrl, ...img, quality: 82 });
    return { source, status: ok ? 'ok' : 'db-err', bytes: img.data.length };
  } catch (e) { return { source, status: 'error', err: e.message }; }
}

// ══════════════════════════════════════════════════════════════════════════════
// SOURCE 3 — NBA Fantasy / stats profile alternate CDN paths
// NBA serves several different crops/poses via different CDN paths
// ══════════════════════════════════════════════════════════════════════════════
async function fetchNBAFantasyPhoto(player) {
  const source = 'nba-fantasy';
  if (alreadyHave(player.nba_id, source)) return { source, status: 'cached' };

  // Different CDN paths that NBA uses for fantasy / 2KDB / mobile apps
  const candidates = [
    `https://cdn.nba.com/headshots/nba/latest/1040x760/${player.nba_id}.png`,  // full-body pose variant
    `https://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/1040x760/${player.nba_id}.png`,
    // NBA stats profile images sometimes have different poses
    `https://stats.nba.com/media/img/players/full/${player.nba_id}.png`,
    `https://stats.nba.com/media/img/players/large/${player.nba_id}.png`,
  ];

  for (const url of candidates) {
    const img = await fetchImage(url, 'https://www.nba.com/');
    if (!img) continue;
    // Only store if genuinely different size from nba-hires (avoid duplicates)
    const existing = db.prepare('SELECT file_size FROM player_photos WHERE nba_id=? AND source=?').get(player.nba_id, 'nba-hires');
    if (existing && Math.abs(img.data.length - existing.file_size) < 2000) continue; // skip near-identical
    const ok = savePhoto({ playerId:player.id, nbaId:player.nba_id, source, url, ...img, quality: 72 });
    if (ok) return { source, status: 'ok', bytes: img.data.length };
  }
  return { source, status: 'no-distinct-image' };
}

// ══════════════════════════════════════════════════════════════════════════════
// SOURCE 4 — HoopsHype player pages
// Sports news site with hi-res player promo/action images in their articles
// ══════════════════════════════════════════════════════════════════════════════
async function fetchHoopsHype(player) {
  const source = 'hoopshype';
  if (alreadyHave(player.nba_id, source)) return { source, status: 'cached' };
  try {
    const slug    = nameSlug(player.name);
    const pageUrl = `https://hoopshype.com/player/${slug}/`;
    const html    = await fetchPage(pageUrl, 'https://hoopshype.com/');
    if (!html) return { source, status: 'page-fail' };

    // Look for og:image or large player photo
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                 || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (!ogMatch) return { source, status: 'no-og' };

    const imgUrl = ogMatch[1];
    if (!imgUrl.startsWith('http') || imgUrl.includes('logo')) return { source, status: 'skip' };

    const img = await fetchImage(imgUrl, pageUrl);
    if (!img) return { source, status: 'fetch-fail' };
    const ok = savePhoto({ playerId:player.id, nbaId:player.nba_id, source, url:imgUrl, ...img, quality: 75 });
    return { source, status: ok ? 'ok' : 'db-err', bytes: img.data.length };
  } catch (e) { return { source, status: 'error' }; }
}

// ══════════════════════════════════════════════════════════════════════════════
// SOURCE 5 — Flickr (NBA official account + general NBA search)
// Requires free API key from flickr.com/services/api/keys
// NBA's official Flickr (user_id: 41424338@N03) has thousands of game photos
// ══════════════════════════════════════════════════════════════════════════════
const FLICKR_NBA_USER = '41424338@N03'; // NBA official Flickr account

async function fetchFlickrPhoto(player, idx = 1) {
  const source = `flickr-${idx}`;
  if (!FLICKR_KEY) return { source, status: 'no-key' };
  if (alreadyHave(player.nba_id, source)) return { source, status: 'cached' };
  try {
    // Search NBA official account for this player
    const searchParams = new URLSearchParams({
      method:  'flickr.photos.search',
      api_key: FLICKR_KEY,
      text:    `${player.name} NBA`,
      user_id: FLICKR_NBA_USER,
      sort:    'relevance',
      per_page:'5',
      extras:  'url_h,url_k,url_o,url_l,url_c', // h=1600px, k=2048px, o=original, l=1024px
      format:  'json',
      nojsoncallback: '1',
    });
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 10000);
    const res  = await fetch(`https://api.flickr.com/services/rest/?${searchParams}`, { signal: ctrl.signal });
    if (!res.ok) return { source, status: 'api-fail' };
    const json = await res.json();
    const photos = json?.photos?.photo || [];
    if (!photos.length) return { source, status: 'no-results' };

    // Also try general NBA search if user account search returns nothing
    const targets = photos;
    if (!targets.length) return { source, status: 'no-photos' };

    const photo  = targets[idx - 1] || targets[0];
    // Pick highest-res URL available
    const imgUrl = photo.url_k || photo.url_h || photo.url_o || photo.url_l || photo.url_c;
    if (!imgUrl) return { source, status: 'no-url' };

    const img = await fetchImage(imgUrl, 'https://www.flickr.com/');
    if (!img) return { source, status: 'fetch-fail' };
    const ok = savePhoto({ playerId:player.id, nbaId:player.nba_id, source, url:imgUrl, ...img, quality: 92 });
    return { source, status: ok ? 'ok' : 'db-err', bytes: img.data.length };
  } catch (e) { return { source, status: 'error', err: e.message }; }
}

// Also search general Flickr (not just NBA account) for more variety
async function fetchFlickrGeneral(player) {
  const source = 'flickr-general';
  if (!FLICKR_KEY) return { source, status: 'no-key' };
  if (alreadyHave(player.nba_id, source)) return { source, status: 'cached' };
  try {
    const searchParams = new URLSearchParams({
      method:  'flickr.photos.search',
      api_key: FLICKR_KEY,
      text:    `${player.name} NBA basketball action`,
      sort:    'relevance',
      license: '4,5,6,9,10', // CC licenses (free to use)
      per_page:'3',
      extras:  'url_h,url_k,url_l',
      format:  'json',
      nojsoncallback: '1',
    });
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 10000);
    const res  = await fetch(`https://api.flickr.com/services/rest/?${searchParams}`, { signal: ctrl.signal });
    if (!res.ok) return { source, status: 'api-fail' };
    const json = await res.json();
    const photos = json?.photos?.photo || [];
    if (!photos.length) return { source, status: 'no-results' };
    const photo  = photos[0];
    const imgUrl = photo.url_k || photo.url_h || photo.url_l;
    if (!imgUrl) return { source, status: 'no-url' };
    const img = await fetchImage(imgUrl, 'https://www.flickr.com/');
    if (!img) return { source, status: 'fetch-fail' };
    const ok = savePhoto({ playerId:player.id, nbaId:player.nba_id, source, url:imgUrl, ...img, quality: 85 });
    return { source, status: ok ? 'ok' : 'db-err', bytes: img.data.length };
  } catch (e) { return { source, status: 'error' }; }
}

// ══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATION
// ══════════════════════════════════════════════════════════════════════════════
async function processPlayer(player) {
  console.log(`\n▶ [${player.id}/100] ${player.name} (NBA ID: ${player.nba_id})`);

  const results = await Promise.allSettled([
    fetchWikimediaCommons(player),
    fetchNBAPageGallery(player),
    fetchNBAFantasyPhoto(player),
    fetchHoopsHype(player),
    fetchFlickrPhoto(player, 1),
    fetchFlickrPhoto(player, 2),
    fetchFlickrGeneral(player),
  ]);

  let saved = 0;
  for (const r of results) {
    const val  = r.status === 'fulfilled' ? r.value : { source:'?', status:'thrown' };
    const icon = val.status === 'ok' ? '✓' : val.status === 'cached' ? '○' : val.status === 'no-key' ? '🔑' : '✗';
    const size = val.bytes ? ` (${Math.round(val.bytes/1024)}KB)` : '';
    console.log(`   ${icon} ${val.source}: ${val.status}${size}`);
    if (val.status === 'ok') saved++;
  }
  return saved;
}

async function main() {
  const players = db.prepare('SELECT id, nba_id, name FROM players ORDER BY id').all()
    .filter(p => !SINGLE || String(p.nba_id) === SINGLE);

  console.log(`\n🏀 Extra photo sources — ${players.length} player(s)  REFRESH=${REFRESH}`);
  console.log(`   Sources: wikimedia-commons, nba-page-og, nba-fantasy, hoopshype${FLICKR_KEY ? ', flickr-1, flickr-2, flickr-general' : ' (flickr needs FLICKR_KEY)'}`);
  console.log(`   DB: ${DB_PATH}\n`);

  let total = 0;
  for (let i = 0; i < players.length; i++) {
    total += await processPlayer(players[i]);
    if (i < players.length - 1) await delay(500);
  }

  const row = db.prepare('SELECT COUNT(*) as n, SUM(file_size) as sz FROM player_photos').get();
  console.log(`\n✅ Done! ${total} new photos saved. Total: ${row.n} photos, ${Math.round((row.sz||0)/1024/1024*10)/10}MB`);
  const bySource = db.prepare('SELECT source, COUNT(*) as n FROM player_photos GROUP BY source ORDER BY n DESC').all();
  bySource.forEach(r => console.log(`   ${r.source.padEnd(25)} ${r.n}`));
  db.close();
}

main().catch(e => { console.error('Fatal:', e); db.close(); process.exit(1); });
