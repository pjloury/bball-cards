/* ── data.js ──────────────────────────────────────────────────────────────
   Loads the baked static dataset and exposes rarity/serial + lookup helpers.
   Everything downstream (pack, collection, cards) reads from window.DATA.
   ──────────────────────────────────────────────────────────────────────── */

const RARITIES = [
  { key: 'common',    label: 'COMMON',        weight: 60, edition: 2500, order: 0 },
  { key: 'silver',    label: 'SILVER CHROME', weight: 26, edition: 750,  order: 1 },
  { key: 'gold',      label: 'GOLD CHROME',   weight: 11, edition: 150,  order: 2 },
  { key: 'prismatic', label: 'PRISMATIC',     weight: 3,  edition: 25,   order: 3 },
];
const RARITY = Object.fromEntries(RARITIES.map(r => [r.key, r]));

// Legends are a rare "chase tier" — each is this fraction as likely to be
// pulled as a regular player (≈1 legend every ~12 packs).
const LEGEND_PULL_WEIGHT = 0.15;
const RARITY_LABELS = Object.fromEntries(RARITIES.map(r => [r.key, r.label]));

const DATA = {
  players: [],
  byId: {},
  teams: [],          // [{short, name, primary, secondary, count}]
  loaded: false,

  async load() {
    if (this.loaded) return;
    const [res, credits] = await Promise.all([
      fetch('/data/players.json'),
      fetch('/data/photo-credits.json').then(r => r.ok ? r.json() : {}).catch(() => ({})),
    ]);
    const json = await res.json();
    this.players = json.players;
    this.season = json.season;
    for (const p of this.players) { p.action = credits[p.nbaId] || null; this.byId[p.id] = p; }
    // Build team index
    const t = {};
    for (const p of this.players) {
      (t[p.teamShort] ||= { short: p.teamShort, name: p.team, primary: p.teamPrimary, secondary: p.teamSecondary, count: 0 }).count++;
    }
    this.teams = Object.values(t).sort((a, b) => a.name.localeCompare(b.name));
    this.loaded = true;
  },
};

/* Weighted rarity roll → returns a rarity key. */
function rollRarity() {
  const total = RARITIES.reduce((a, r) => a + r.weight, 0);
  let n = Math.random() * total;
  for (const r of RARITIES) { if ((n -= r.weight) < 0) return r.key; }
  return 'common';
}

/* Serial number within a tier's edition size. */
function rollSerial(rarityKey) {
  const ed = RARITY[rarityKey].edition;
  return Math.floor(Math.random() * ed) + 1;
}

/* Photo paths (baked static assets). */
const photoFront  = nbaId => `/img/players/${nbaId}.png`;
const photoHero   = nbaId => `/img/players/${nbaId}-hero.jpg`;
const photoAction = nbaId => `/img/players/${nbaId}-action.jpg`;
const teamLogo    = short => `/img/teams/${short}.png`;

/* Rarity comparison for "best card" surfacing (higher = rarer, lower serial wins ties). */
function cardBetter(a, b) {
  const ra = RARITY[a.rarity].order, rb = RARITY[b.rarity].order;
  if (ra !== rb) return ra > rb ? a : b;
  return (a.serial || 1e9) <= (b.serial || 1e9) ? a : b;
}
