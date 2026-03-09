/**
 * prune-photos.js — Remove redundant low-quality photos from player_photos
 *
 * Rules applied per player:
 *  1. If nba-hires exists, delete nba-small, nba-draft, nba-stats-profile
 *     (same CDN image, lower resolution — waste of space)
 *  2. If nba-hires exists AND nba-fantasy file size is within 3KB of nba-hires,
 *     delete nba-fantasy (it's the same image from a different CDN path)
 *  3. If nba-legacy exists (but not nba-hires), delete nba-small, nba-draft
 *  4. If espn-headshot exists, delete nba-stats-profile (lower quality duplicate)
 *
 * Usage: node db/prune-photos.js [--dry-run]
 */

const Database = require('better-sqlite3');
const path     = require('path');

const DB_PATH = path.join(__dirname, 'hoops.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) console.log('🔍 DRY RUN — no changes will be made\n');

const tableExists = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='player_photos'"
).get();
if (!tableExists) {
  console.log('No player_photos table found. Run npm run fetch-photos first.');
  process.exit(0);
}

const players = db.prepare('SELECT DISTINCT nba_id FROM player_photos ORDER BY nba_id').all();
console.log(`Checking ${players.length} players...\n`);

let totalPruned = 0;
let totalBytes  = 0;

function deleteSource(nbaId, source, reason) {
  const row = db.prepare('SELECT file_size FROM player_photos WHERE nba_id=? AND source=?').get(nbaId, source);
  if (!row) return;
  const bytes = row.file_size || 0;
  console.log(`  ✂  nba_id=${nbaId}  ${source.padEnd(20)} (${Math.round(bytes/1024)}KB) — ${reason}`);
  if (!DRY_RUN) {
    db.prepare('DELETE FROM player_photos WHERE nba_id=? AND source=?').run(nbaId, source);
  }
  totalPruned++;
  totalBytes += bytes;
}

for (const { nba_id } of players) {
  const sources = new Map(
    db.prepare('SELECT source, file_size FROM player_photos WHERE nba_id=?').all(nba_id)
      .map(r => [r.source, r.file_size || 0])
  );

  const hasHires   = sources.has('nba-hires');
  const hasLegacy  = sources.has('nba-legacy');
  const hasEspnHS  = sources.has('espn-headshot');

  if (hasHires) {
    // nba-small and nba-draft are the same player CDN image, just smaller
    if (sources.has('nba-small'))        deleteSource(nba_id, 'nba-small',        'lower-res duplicate of nba-hires');
    if (sources.has('nba-draft'))        deleteSource(nba_id, 'nba-draft',        'lower-res duplicate of nba-hires');
    if (sources.has('nba-stats-profile'))deleteSource(nba_id, 'nba-stats-profile','lower-res duplicate of nba-hires');

    // nba-fantasy: different CDN path but often the same image — check file size
    if (sources.has('nba-fantasy')) {
      const diff = Math.abs(sources.get('nba-fantasy') - sources.get('nba-hires'));
      if (diff < 4000) { // within 4KB = effectively same JPEG
        deleteSource(nba_id, 'nba-fantasy', 'same image as nba-hires (different CDN path)');
      }
    }
  } else if (hasLegacy) {
    // nba-legacy is good quality — still prune tinier redundant variants
    if (sources.has('nba-small'))  deleteSource(nba_id, 'nba-small',  'lower-res duplicate of nba-legacy');
    if (sources.has('nba-draft'))  deleteSource(nba_id, 'nba-draft',  'lower-res duplicate of nba-legacy');
  }

  // espn-headshot > nba-stats-profile quality
  if (hasEspnHS && sources.has('nba-stats-profile')) {
    deleteSource(nba_id, 'nba-stats-profile', 'lower quality than espn-headshot');
  }
}

console.log(`\n${DRY_RUN ? '(dry run) Would prune' : '✅ Pruned'} ${totalPruned} photos, saving ${Math.round(totalBytes/1024/1024*10)/10} MB`);

// Show final stats
const stats = db.prepare('SELECT COUNT(*) as n, SUM(file_size) as sz FROM player_photos').get();
console.log(`   Remaining: ${stats.n} photos, ${Math.round((stats.sz||0)/1024/1024*10)/10} MB`);
db.close();
