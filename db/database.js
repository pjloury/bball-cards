const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'hoops.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY,
      nba_id INTEGER,
      name TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      team TEXT NOT NULL,
      team_short TEXT,
      team_primary TEXT,
      team_secondary TEXT,
      jersey INTEGER,
      position TEXT,
      height TEXT,
      weight TEXT,
      born TEXT,
      birthplace TEXT,
      college TEXT,
      draft TEXT,
      nationality TEXT,
      bio TEXT,
      rarity TEXT DEFAULT 'common',
      career_stats TEXT,
      league_leaders TEXT,
      card_number TEXT
    );

    CREATE TABLE IF NOT EXISTS packs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      opened_at TEXT NOT NULL,
      card_ids TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collection (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      player_id INTEGER NOT NULL,
      rarity TEXT,
      obtained_at TEXT NOT NULL,
      FOREIGN KEY (player_id) REFERENCES players(id)
    );
  `);
}

module.exports = { getDb };
