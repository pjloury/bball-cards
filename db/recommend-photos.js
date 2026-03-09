/**
 * recommend-photos.js — Pick the best action photo for each player
 *
 * Evaluates all stored photos for each player and selects:
 *   - best_action  : top action/editorial shot for card FRONT
 *   - best_headshot: top portrait headshot for card BACK
 *
 * Scoring formula:
 *   score = priority_rank * 1000 + quality * 10 + log2(file_size_kb)
 *
 * Results are stored in player_photo_prefs table. The server reads this
 * table first, so every card automatically shows the recommended photo.
 *
 * Usage:
 *   node db/recommend-photos.js           (auto-recommend all players)
 *   node db/recommend-photos.js --print   (print recommendations, no DB write)
 *   node db/recommend-photos.js --player=2544
 */

const Database = require('better-sqlite3');
const path     = require('path');

const DB_PATH = path.join(__dirname, 'hoops.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const PRINT_ONLY = process.argv.includes('--print');
const SINGLE     = (process.argv.find(a => a.startsWith('--player=')) || '').replace('--player=', '');

// ── Same priority lists as server.js ─────────────────────────────────────────
const ACTION_PRIORITY = [
  'google-action-1', 'google-action-2', 'google-action-3',
  'bing-action-1',   'bing-action-2',   'bing-action-3',
  'flickr-1', 'flickr-2', 'flickr-general',
  'nba-page-action',
  'hoopshype',
  'nba-page-og',
  'espn-action',
  'wikimedia-commons', 'wiki-image',
  'google-action-4', 'google-action-5',
  'bing-action-4',   'bing-action-5',
];

const HEADSHOT_PRIORITY = [
  'nba-hires', 'nba-legacy',
  'espn-headshot',
  'nba-fantasy', 'nba-stats-profile',
  'nba-draft', 'nba-small',
];

const ACTION_RANK   = new Map(ACTION_PRIORITY.map((s, i) => [s, ACTION_PRIORITY.length - i]));
const HEADSHOT_RANK = new Map(HEADSHOT_PRIORITY.map((s, i) => [s, HEADSHOT_PRIORITY.length - i]));

// ── Ensure prefs table ────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS player_photo_prefs (
    nba_id          INTEGER PRIMARY KEY,
    action_source   TEXT,
    headshot_source TEXT,
    action_score    REAL DEFAULT 0,
    headshot_score  REAL DEFAULT 0,
    updated_at      TEXT DEFAULT (datetime('now'))
  )
`);

const upsertPref = db.prepare(`
  INSERT INTO player_photo_prefs (nba_id, action_source, headshot_source, action_score, headshot_score)
  VALUES (@nbaId, @actionSource, @headshotSource, @actionScore, @headshotScore)
  ON CONFLICT(nba_id) DO UPDATE SET
    action_source=excluded.action_source,
    headshot_source=excluded.headshot_source,
    action_score=excluded.action_score,
    headshot_score=excluded.headshot_score,
    updated_at=datetime('now')
`);

// ── Score a single photo row ──────────────────────────────────────────────────
function scorePhoto(row, rankMap) {
  const rank    = rankMap.get(row.source) || 0;
  const quality = row.quality || 50;
  const sizekb  = (row.file_size || 1) / 1024;
  // Priority rank is the dominant factor; quality and size break ties
  return rank * 1000 + quality * 10 + Math.log2(Math.max(1, sizekb));
}

// ── Process one player ────────────────────────────────────────────────────────
function processPlayer(player) {
  const photos = db.prepare(
    'SELECT source, file_size, quality FROM player_photos WHERE nba_id=?'
  ).all(player.nba_id);

  if (!photos.length) return null;

  const actionPhotos   = photos.filter(p => ACTION_RANK.has(p.source));
  const headshotPhotos = photos.filter(p => HEADSHOT_RANK.has(p.source));

  // Score and rank
  const bestAction   = actionPhotos.sort((a, b) => scorePhoto(b, ACTION_RANK) - scorePhoto(a, ACTION_RANK))[0];
  const bestHeadshot = headshotPhotos.sort((a, b) => scorePhoto(b, HEADSHOT_RANK) - scorePhoto(a, HEADSHOT_RANK))[0];

  // Fall back to any photo if no action/headshot found in dedicated lists
  const fallback = photos.sort((a, b) => (b.file_size || 0) - (a.file_size || 0))[0];

  return {
    nba_id:         player.nba_id,
    actionSource:   bestAction?.source   || fallback?.source || null,
    headshotSource: bestHeadshot?.source || fallback?.source || null,
    actionScore:    bestAction   ? scorePhoto(bestAction,   ACTION_RANK)   : 0,
    headshotScore:  bestHeadshot ? scorePhoto(bestHeadshot, HEADSHOT_RANK) : 0,
    allSources:     photos.map(p => p.source),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
const players = db.prepare('SELECT id, nba_id, name FROM players ORDER BY id').all()
  .filter(p => !SINGLE || String(p.nba_id) === SINGLE);

console.log(`\n🏀 Photo recommendation — ${players.length} player(s)\n`);

let updated = 0;
const byAction = {};   // tally which action sources are chosen
const byHead   = {};

for (const player of players) {
  const rec = processPlayer(player);
  if (!rec) { console.log(`  ✗ ${player.name} — no photos`); continue; }

  const actionLabel   = rec.actionSource   || '—';
  const headshotLabel = rec.headshotSource || '—';
  console.log(`  ${player.name.padEnd(25)} front: ${actionLabel.padEnd(22)} back: ${headshotLabel}`);

  if (!PRINT_ONLY) {
    upsertPref.run({
      nbaId:         rec.nba_id,
      actionSource:  rec.actionSource,
      headshotSource: rec.headshotSource,
      actionScore:   rec.actionScore,
      headshotScore: rec.headshotScore,
    });
    updated++;
  }

  byAction[actionLabel]   = (byAction[actionLabel]   || 0) + 1;
  byHead[headshotLabel] = (byHead[headshotLabel] || 0) + 1;
}

console.log(`\n── Action photo distribution ──────────────────────────────────`);
Object.entries(byAction).sort((a,b) => b[1]-a[1]).forEach(([src, n]) => {
  console.log(`  ${src.padEnd(25)} ${n} player${n>1?'s':''}`);
});
console.log(`\n── Headshot distribution ──────────────────────────────────────`);
Object.entries(byHead).sort((a,b) => b[1]-a[1]).forEach(([src, n]) => {
  console.log(`  ${src.padEnd(25)} ${n} player${n>1?'s':''}`);
});

if (PRINT_ONLY) {
  console.log(`\n(dry-run — pass without --print to write to DB)`);
} else {
  console.log(`\n✅ Saved recommendations for ${updated} players`);
}

db.close();
