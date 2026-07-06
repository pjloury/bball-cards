#!/usr/bin/env node
/**
 * build-data.js — bake the static player dataset.
 *
 * For each player in the roster:
 *   1. Resolve an ESPN athlete numeric id (search by name).
 *   2. Fetch bio (height, weight, dob, birthplace, college, draft, jersey, pos).
 *   3. Fetch season-by-season career averages.
 * Merge with team colors + fallback bios, then write public/data/players.json.
 *
 * ESPN's open web API is reachable and rich (stats.nba.com is IP-blocked from
 * most hosts, which is why v1's seed was unreliable). No API key required.
 *
 * Usage:
 *   node scripts/build-data.js            # full run (all players)
 *   node scripts/build-data.js --limit=5  # quick smoke test
 */
const fs = require('fs');
const path = require('path');
const { PLAYER_LIST, TEAM_COLORS, BIO_FALLBACK } = require('./roster');

const OUT = path.join(__dirname, '..', 'public', 'data', 'players.json');
const SEASON = '2025-26';
const delay = ms => new Promise(r => setTimeout(r, ms));

const args = process.argv.slice(2);
const LIMIT = (args.find(a => a.startsWith('--limit=')) || '').split('=')[1];

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';

async function getJSON(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      if (res.ok) return await res.json();
    } catch { /* retry */ }
    await delay(400 * (i + 1));
  }
  return null;
}

// ── Resolve ESPN numeric athlete id by name ──────────────────────────────────
async function resolveEspnId(name, team) {
  const data = await getJSON(`https://site.web.api.espn.com/apis/search/v2?limit=8&query=${encodeURIComponent(name)}`);
  if (!data) return null;
  const cands = [];
  for (const r of data.results || []) {
    if (r.type !== 'player') continue;
    for (const it of r.contents || []) {
      const m = /a:(\d+)/.exec(it.uid || '');
      if (m) cands.push({ id: +m[1], name: it.displayName || '', sub: it.subtitle || '' });
    }
  }
  if (!cands.length) return null;
  // Prefer exact name match, then a candidate whose subtitle mentions the team.
  const norm = s => s.toLowerCase().replace(/[^a-z]/g, '');
  const exact = cands.find(c => norm(c.name) === norm(name));
  if (exact) return exact;
  const teamMatch = cands.find(c => team && c.sub && norm(c.sub).includes(norm(team.split(' ').pop())));
  return teamMatch || cands[0];
}

// ESPN subtitle (full team name) → NBA tricode, so we can use each player's
// CURRENT team (colors + label) from ESPN rather than a possibly-stale roster.
const TEAM_BY_NAME = {
  'atlanta hawks': 'ATL', 'boston celtics': 'BOS', 'brooklyn nets': 'BKN',
  'charlotte hornets': 'CHA', 'chicago bulls': 'CHI', 'cleveland cavaliers': 'CLE',
  'dallas mavericks': 'DAL', 'denver nuggets': 'DEN', 'detroit pistons': 'DET',
  'golden state warriors': 'GSW', 'houston rockets': 'HOU', 'indiana pacers': 'IND',
  'la clippers': 'LAC', 'los angeles clippers': 'LAC', 'los angeles lakers': 'LAL',
  'memphis grizzlies': 'MEM', 'miami heat': 'MIA', 'milwaukee bucks': 'MIL',
  'minnesota timberwolves': 'MIN', 'new orleans pelicans': 'NOP', 'new york knicks': 'NYK',
  'oklahoma city thunder': 'OKC', 'orlando magic': 'ORL', 'philadelphia 76ers': 'PHI',
  'phoenix suns': 'PHX', 'portland trail blazers': 'POR', 'sacramento kings': 'SAC',
  'san antonio spurs': 'SAS', 'toronto raptors': 'TOR', 'utah jazz': 'UTA',
  'washington wizards': 'WAS',
};
function teamShortFromName(sub) {
  if (!sub) return null;
  return TEAM_BY_NAME[sub.trim().toLowerCase()] || null;
}

const TEAM_NAME_BY_SHORT = Object.fromEntries(
  Object.entries(TEAM_BY_NAME).map(([name, short]) => [short, name.replace(/\b\w/g, c => c.toUpperCase()).replace('76Ers', '76ers').replace('La ', 'LA ')])
);
// A player's CURRENT team = the team of their most recent season (real game
// data — reliable, unlike ESPN's search subtitles). Legends keep iconic teams.
function currentTeamShort(career, season) {
  if (!career || !career.length) return null;
  const cur = career.filter(s => s.season === season);
  const row = cur.length ? cur[cur.length - 1] : career[career.length - 1];
  return row && row.team || null;
}

// ── Parse ESPN bio, merging the web-v3 athlete and the core-API athlete ──────
function parseBio(web, core) {
  const bio = {};
  const a = web || {};
  const c = core || {};
  if (a.displayHeight) bio.height = a.displayHeight.replace(/\s/g, '');
  if (a.displayWeight) bio.weight = a.displayWeight;
  const dob = c.dateOfBirth || a.dateOfBirth;
  if (dob) {
    const d = new Date(dob);
    if (!isNaN(d)) {
      bio.born = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
      bio.age = Math.floor((Date.now() - d.getTime()) / 3.15576e10);
    }
  }
  const bp = c.birthPlace || a.birthPlace || {};
  bio.birthplace = [bp.city, bp.state || bp.country].filter(Boolean).join(', ');
  if (a.college && a.college.name) bio.college = a.college.name;
  const draft = c.draft || a.draft;
  if (draft) {
    if (draft.year && draft.round && (draft.selection || draft.pick)) {
      bio.draft = `${draft.year} · Rd ${draft.round}, Pick ${draft.selection || draft.pick}`;
    } else if (draft.displayText) {
      const m = /Year:\s*(\d{4}).*Round:\s*(\d+).*Pick:\s*(\d+)/i.exec(draft.displayText);
      bio.draft = m ? `${m[1]} · Rd ${m[2]}, Pick ${m[3]}` : draft.displayText;
    }
  }
  const exp = c.experience || a.experience;
  if (typeof exp === 'object' && exp) bio.experience = exp.years;
  else if (typeof exp === 'number') bio.experience = exp;
  if (a.jersey) bio.jersey = +a.jersey;
  return bio;
}

// ── Parse notable career accolades from ESPN /bio awards ─────────────────────
const AWARD_ORDER = [
  'NBA Champion', 'Champion', 'Finals MVP', 'Most Valuable Player', 'MVP',
  'Defensive Player of the Year', 'Rookie of the Year', 'All-Star MVP', 'All-Star',
  'All-NBA', 'All-Defensive', 'Scoring', 'Sixth Man', 'Most Improved',
];
function parseAwards(bioData) {
  if (!bioData || !Array.isArray(bioData.awards)) return [];
  const items = bioData.awards.map(w => {
    const count = w.displayCount || (w.seasons ? `${w.seasons.length}x` : '');
    return { name: w.name || '', count: count.replace('x', '×') };
  }).filter(w => w.name);
  // Sort by our rough prestige order, keep the marquee ones.
  const rank = n => { const i = AWARD_ORDER.findIndex(k => n.includes(k)); return i < 0 ? 99 : i; };
  items.sort((a, b) => rank(a.name) - rank(b.name));
  const keep = items.filter(w => rank(w.name) < 20).slice(0, 6);
  return keep.map(w => (w.count && w.count !== '1×' ? `${w.count} ` : '') + w.name);
}

// ── Parse ESPN career averages ───────────────────────────────────────────────
function parseCareer(data) {
  if (!data || !Array.isArray(data.categories)) return [];
  const cat = data.categories.find(c => c.name === 'averages');
  if (!cat) return [];
  const L = cat.labels || [];
  const idx = k => L.indexOf(k);
  const num = v => { const f = parseFloat(v); return isFinite(f) ? f : 0; };
  const pct = v => { const f = parseFloat(v); return isFinite(f) ? +f.toFixed(1) : 0; };
  const rows = (cat.statistics || []).map(s => {
    const v = s.stats || [];
    const yr = s.season && s.season.year;                 // e.g. 2025
    const teamSlug = (s.teamSlug || '').toUpperCase();
    const season = yr ? `${yr - 1}-${String(yr).slice(2)}` : (s.season && s.season.displayName) || '';
    return {
      season,
      team: teamAbbrevFromSlug(s.teamSlug) || teamSlug,
      gp: Math.round(num(v[idx('GP')])),
      mpg: num(v[idx('MIN')]),
      ppg: num(v[idx('PTS')]),
      rpg: num(v[idx('REB')]),
      apg: num(v[idx('AST')]),
      spg: num(v[idx('STL')]),
      bpg: num(v[idx('BLK')]),
      tpg: num(v[idx('TO')]),
      fgPct: pct(v[idx('FG%')]),
      threePct: pct(v[idx('3P%')]),
      ftPct: pct(v[idx('FT%')]),
      current: season === SEASON,
    };
  }).filter(r => r.season && /^\d{4}-\d{2}$/.test(r.season) && r.gp >= 0);
  return rows;
}

// Map ESPN team slug → NBA tricode where they differ meaningfully.
function teamAbbrevFromSlug(slug) {
  if (!slug) return '';
  const map = {
    'los-angeles-lakers': 'LAL', 'golden-state-warriors': 'GSW', 'phoenix-suns': 'PHX',
    'milwaukee-bucks': 'MIL', 'denver-nuggets': 'DEN', 'dallas-mavericks': 'DAL',
    'philadelphia-76ers': 'PHI', 'boston-celtics': 'BOS', 'oklahoma-city-thunder': 'OKC',
    'memphis-grizzlies': 'MEM', 'atlanta-hawks': 'ATL', 'new-york-knicks': 'NYK',
    'new-orleans-pelicans': 'NOP', 'miami-heat': 'MIA', 'indiana-pacers': 'IND',
    'sacramento-kings': 'SAC', 'cleveland-cavaliers': 'CLE', 'la-clippers': 'LAC',
    'los-angeles-clippers': 'LAC', 'detroit-pistons': 'DET', 'toronto-raptors': 'TOR',
    'charlotte-hornets': 'CHA', 'orlando-magic': 'ORL', 'minnesota-timberwolves': 'MIN',
    'chicago-bulls': 'CHI', 'portland-trail-blazers': 'POR', 'san-antonio-spurs': 'SAS',
    'washington-wizards': 'WAS', 'brooklyn-nets': 'BKN', 'houston-rockets': 'HOU',
    'utah-jazz': 'UTA', 'seattle-supersonics': 'SEA', 'new-jersey-nets': 'NJN',
    'charlotte-bobcats': 'CHA',
  };
  return map[slug] || '';
}

function careerAverages(stats) {
  const played = stats.filter(s => s.gp > 0);
  if (!played.length) return {};
  const totGp = played.reduce((a, s) => a + s.gp, 0) || 1;
  const w = key => +(played.reduce((a, s) => a + s[key] * s.gp, 0) / totGp).toFixed(1);
  return { ppg: w('ppg'), rpg: w('rpg'), apg: w('apg'), spg: w('spg'), bpg: w('bpg'),
           fgPct: w('fgPct'), threePct: w('threePct'), ftPct: w('ftPct'), gp: totGp,
           seasons: played.length };
}

function generateBio(p, avg) {
  const a = avg && avg.ppg ? ` Over ${avg.seasons} seasons he has averaged ${avg.ppg} points, ${avg.rpg} rebounds, and ${avg.apg} assists per game.` : '';
  return `${p.name} is a ${p.position} for the ${p.team}.${a}`;
}

async function main() {
  let roster = PLAYER_LIST;
  if (LIMIT) roster = roster.slice(0, +LIMIT);
  console.log(`Building data for ${roster.length} players via ESPN…\n`);

  const players = [];
  for (const p of roster) {
    process.stdout.write(`  [${String(p.id).padStart(3)}] ${p.name.padEnd(26)} `);
    const cand = await resolveEspnId(p.name, p.team);
    const espnId = cand && cand.id;
    let bio = {}, career = [], accolades = [];
    if (espnId) {
      const [aData, cData, sData, bData] = await Promise.all([
        getJSON(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${espnId}`),
        getJSON(`https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/athletes/${espnId}`),
        getJSON(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${espnId}/stats`),
        getJSON(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${espnId}/bio`),
      ]);
      bio = parseBio(aData && aData.athlete, cData);
      career = parseCareer(sData);
      accolades = parseAwards(bData);
    }
    const fb = BIO_FALLBACK[p.nbaId] || {};
    // Current team from the latest played season (reliable). Legends keep their
    // curated iconic team; fall back to roster when there are no stats.
    let teamShort = p.teamShort, team = p.team;
    const derived = p.legend ? null : currentTeamShort(career, SEASON);
    if (derived && TEAM_COLORS[derived] && TEAM_NAME_BY_SHORT[derived]) { teamShort = derived; team = TEAM_NAME_BY_SHORT[derived]; }
    const colors = TEAM_COLORS[teamShort] || { primary: '#1a1a40', secondary: '#f7a900' };
    const avg = careerAverages(career);
    const rec = {
      id: p.id, nbaId: p.nbaId, espnId: espnId || null, legend: p.legend || false,
      name: p.name, firstName: p.name.split(' ')[0], lastName: p.name.split(' ').slice(1).join(' '),
      team, teamShort,
      teamPrimary: colors.primary, teamSecondary: colors.secondary,
      jersey: bio.jersey != null ? bio.jersey : p.jersey,
      position: p.position,
      height: bio.height || fb.height || '',
      weight: bio.weight || fb.weight || '',
      born: bio.born || fb.born || '',
      age: bio.age || null,
      birthplace: bio.birthplace || fb.birthplace || '',
      college: bio.college || fb.college || '',
      draft: bio.draft || fb.draft || 'Undrafted',
      experience: bio.experience || null,
      bio: fb.bio || generateBio(p, avg),
      accolades,
      careerStats: career,
      careerAverages: avg,
    };
    players.push(rec);
    console.log(`espn:${espnId || '—'} · ${career.length} seasons${bio.height ? ' · bio✓' : ''}`);
    await delay(250);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const withStats = players.filter(p => p.careerStats.length).length;
  fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), season: SEASON, count: players.length, players }, null, 2));
  console.log(`\n✅  Wrote ${players.length} players → ${path.relative(process.cwd(), OUT)}  (${withStats} with career stats)`);
}

main().catch(e => { console.error(e); process.exit(1); });
