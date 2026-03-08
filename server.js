const express = require('express');
const path = require('path');
const { getDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── GET /api/players  (lightweight list for library grid) ────────────────────
app.get('/api/players', (req, res) => {
  const db = getDb();
  const players = db.prepare(`
    SELECT id, nba_id, name, team, team_short, team_primary, team_secondary,
           jersey, position, rarity, card_number
    FROM players ORDER BY id
  `).all();
  res.json(players);
});

// ── GET /api/players/:id  (full detail for card back) ────────────────────────
app.get('/api/players/:id', (req, res) => {
  const db = getDb();
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  player.career_stats = JSON.parse(player.career_stats || '[]');
  player.league_leaders = JSON.parse(player.league_leaders || '[]');
  res.json(player);
});

// ── GET /api/pack/status  ────────────────────────────────────────────────────
app.get('/api/pack/status', (req, res) => {
  const sessionId = req.query.session;
  if (!sessionId) return res.json({ canOpen: true });
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const last = db.prepare(
    'SELECT opened_at FROM packs WHERE session_id = ? ORDER BY id DESC LIMIT 1'
  ).get(sessionId);
  const canOpen = !last || last.opened_at.slice(0, 10) !== today;
  const nextOpen = canOpen ? null : new Date(new Date().setHours(24, 0, 0, 0)).toISOString();
  res.json({ canOpen, nextOpen });
});

// ── POST /api/pack/open  ─────────────────────────────────────────────────────
app.post('/api/pack/open', (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const last = db.prepare(
    'SELECT opened_at FROM packs WHERE session_id = ? ORDER BY id DESC LIMIT 1'
  ).get(sessionId);

  if (last && last.opened_at.slice(0, 10) === today) {
    return res.status(429).json({ error: 'Already opened a pack today', nextOpen: new Date(new Date().setHours(24, 0, 0, 0)).toISOString() });
  }

  // Pull all player IDs and pick 5 (no duplicates)
  const allIds = db.prepare('SELECT id FROM players').all().map(r => r.id);
  const picked = [];
  const pool = [...allIds];
  for (let i = 0; i < 5; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }

  const rarities = ['common', 'common', 'common', 'silver', 'silver', 'silver', 'silver', 'gold', 'gold', 'prismatic'];
  const cards = picked.map(pid => ({
    playerId: pid,
    rarity: rarities[Math.floor(Math.random() * rarities.length)]
  }));

  // Record the pack
  db.prepare(
    'INSERT INTO packs (session_id, opened_at, card_ids) VALUES (?, ?, ?)'
  ).run(sessionId, new Date().toISOString(), JSON.stringify(cards.map(c => c.playerId)));

  // Enrich with basic player info
  const enriched = cards.map(c => {
    const p = db.prepare(
      'SELECT id, nba_id, name, team, team_short, team_primary, team_secondary, jersey, position, card_number FROM players WHERE id = ?'
    ).get(c.playerId);
    return { ...p, rarity: c.rarity };
  });

  res.json({ cards: enriched });
});

// ── POST /api/collection/add  ────────────────────────────────────────────────
app.post('/api/collection/add', (req, res) => {
  const { sessionId, cards } = req.body;
  if (!sessionId || !Array.isArray(cards)) return res.status(400).json({ error: 'Invalid request' });
  const db = getDb();
  const insert = db.prepare(
    'INSERT INTO collection (session_id, player_id, rarity, obtained_at) VALUES (?, ?, ?, ?)'
  );
  const now = new Date().toISOString();
  const insertMany = db.transaction((items) => {
    for (const card of items) insert.run(sessionId, card.playerId, card.rarity, now);
  });
  insertMany(cards);
  res.json({ success: true, added: cards.length });
});

// ── GET /api/collection  ─────────────────────────────────────────────────────
app.get('/api/collection', (req, res) => {
  const { session } = req.query;
  if (!session) return res.json([]);
  const db = getDb();
  const rows = db.prepare(`
    SELECT c.id as collectionId, c.rarity, c.obtained_at,
           p.id, p.nba_id, p.name, p.team, p.team_short,
           p.team_primary, p.team_secondary, p.jersey, p.position, p.card_number
    FROM collection c
    JOIN players p ON c.player_id = p.id
    WHERE c.session_id = ?
    ORDER BY c.obtained_at DESC
  `).all(session);
  res.json(rows);
});

// ── GET /api/collection/:collectionId/detail ────────────────────────────────
app.get('/api/collection/:collectionId/detail', (req, res) => {
  const { session } = req.query;
  const db = getDb();
  const row = db.prepare(`
    SELECT c.rarity, c.obtained_at, p.*
    FROM collection c JOIN players p ON c.player_id = p.id
    WHERE c.id = ? AND c.session_id = ?
  `).get(req.params.collectionId, session);
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.career_stats = JSON.parse(row.career_stats || '[]');
  row.league_leaders = JSON.parse(row.league_leaders || '[]');
  res.json(row);
});

app.listen(PORT, () => {
  console.log(`\n🏀  Hoops Elite running at http://localhost:${PORT}\n`);
});
