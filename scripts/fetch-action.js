#!/usr/bin/env node
/**
 * fetch-action.js — best-effort REAL action photos from Wikimedia Commons.
 *
 * Commons category search returns high-res, CC-licensed game photography (way
 * better than the Wikipedia lead image, which is usually a portrait). We:
 *   1. resolve each player's Commons category (Category:<Name>, else search),
 *   2. list file members + imageinfo (incl. extmetadata for attribution),
 *   3. score/filter to the best SINGLE-player game-action shot,
 *   4. download to public/img/players/{nbaId}-action.jpg (~1200px),
 *   5. record CC attribution to public/data/photo-credits.json.
 *
 * This is the free/legal layer. A later SerpAPI pass can override any file.
 *
 * Usage: node scripts/fetch-action.js [--limit=N] [--refresh]
 */
const fs = require('fs');
const path = require('path');
const { PLAYER_LIST } = require('./roster');

const OUT_DIR = path.join(__dirname, '..', 'public', 'img', 'players');
const CREDITS = path.join(__dirname, '..', 'public', 'data', 'photo-credits.json');
const UA = 'HoopsElite/2.0 (personal card project; contact via github.com/pjloury)';
const REFRESH = process.argv.includes('--refresh');
const LIMIT = (process.argv.find(a => a.startsWith('--limit=')) || '').split('=')[1];
const delay = ms => new Promise(r => setTimeout(r, ms));

async function getJSON(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
      if (res.status === 429) { await delay(4000 * (i + 1) + Math.floor(Math.random() * 1000)); continue; }
      if (res.ok) return await res.json();
    } catch {}
    await delay(700 * (i + 1));
  }
  return null;
}

// Score a Commons file for "single-player game-action shot" suitability.
// `rank` is the search-relevance position (0 = most relevant).
function scoreFile(title, w, h, name, rank) {
  const t = title.toLowerCase().replace(/^file:/, '').replace(/\.[a-z]+$/, '');
  let s = 6 - rank;                 // relevance prior
  if (/\.svg$/.test(title.toLowerCase())) return -1;
  // Off-court / non-action rejects
  if (/(logo|signature|autograph|signs |plaque|statue|mural|bobblehead|museum|jersey retire|hall of fame|\bcard\b|panini|topps|press conf|podium|interview|podcast|charity|camp\b|clinic|wax|funko)/.test(t)) return -1;
  // Action cues
  if (/(dunk|layup|lay-up|shoot|shot|jumper|free throw|drive|dribbl|block|rebound|defense|game|\bvs\b|@|playoff|finals|arena|olympic|fiba|world cup|quarterfinal)/.test(t)) s += 4;
  if (/\(\d{6,}\)/.test(title)) s += 2;          // Flickr id → real photographed moment
  if (/\bcropped\b/.test(t)) s += 4;             // cropped = tightly framed on the player (very good for a card)
  // Multi-person penalty (explicit "X and Y")
  s -= (title.match(/ (and|&|with) /gi) || []).length * 3;
  // Resolution
  const mp = (w * h) / 1e6;
  s += Math.min(mp / 3, 3);
  if (w < 500 || h < 500) s -= 5;
  if (w > 9000 || h > 9000) s -= 1;              // ultra-huge → slow download
  // Aspect ratio: portrait/near-square frames the player; ultra-wide = distant court shot
  const ar = w / h;
  if (ar <= 1.05) s += 3;                         // portrait — ideal for the card
  else if (ar <= 1.5) s += 0.5;
  else if (ar >= 2.0) return -1;                  // panoramic court shot → skip (cutout is better)
  else if (ar >= 1.7) s -= 3;
  return s;
}

async function bestActionForPlayer(name) {
  const q = `"${name}" basketball`;
  const data = await getJSON(
    `https://commons.wikimedia.org/w/api.php?action=query&format=json` +
    `&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(q)}&gsrlimit=12` +
    `&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1200`);
  const pages = data && data.query && data.query.pages;
  if (!pages) return null;
  const rows = Object.values(pages).sort((a, b) => (a.index || 99) - (b.index || 99));
  const cands = [];
  rows.forEach((p, rank) => {
    const ii = (p.imageinfo || [])[0];
    if (!ii || !/(jpe?g|png)$/i.test(ii.mime || '')) return;
    const score = scoreFile(p.title, ii.width, ii.height, name, rank);
    if (score < 0) return;
    const em = ii.extmetadata || {};
    cands.push({
      title: p.title, score,
      url: ii.thumburl || ii.url, w: ii.width, h: ii.height,
      artist: strip(em.Artist && em.Artist.value),
      license: (em.LicenseShortName && em.LicenseShortName.value) || '',
      descUrl: ii.descriptionurl,
    });
  });
  cands.sort((a, b) => b.score - a.score);
  return cands[0] || null;
}

function strip(html) { return html ? html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 120) : ''; }

async function download(url, dest, tries = 6) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(45000) });
      if (res.status === 429) { await delay(5000 * (i + 1) + Math.floor(Math.random() * 1500)); continue; }
      if (!res.ok) { await delay(800); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 5000) return false;
      fs.writeFileSync(dest, buf);
      return buf.length;
    } catch { await delay(600 * (i + 1)); }
  }
  return false;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let credits = {};
  if (fs.existsSync(CREDITS)) { try { credits = JSON.parse(fs.readFileSync(CREDITS, 'utf8')); } catch {} }
  let roster = PLAYER_LIST;
  if (LIMIT) roster = roster.slice(0, +LIMIT);

  let got = 0;
  for (const p of roster) {
    const dest = path.join(OUT_DIR, `${p.nbaId}-action.jpg`);
    process.stdout.write(`  ${p.name.padEnd(26)} `);
    if (!REFRESH && fs.existsSync(dest) && credits[p.nbaId]) { got++; console.log('cached'); continue; }
    const best = await bestActionForPlayer(p.name);
    if (best) {
      const size = await download(best.url, dest);
      if (size) {
        got++;
        credits[p.nbaId] = { source: 'wikimedia', title: best.title, artist: best.artist, license: best.license, descUrl: best.descUrl };
        console.log(`✓ ${Math.round(size / 1024)}k  ${best.title.replace(/^File:/, '').slice(0, 42)}  [${best.license}]`);
      } else console.log('dl-fail');
    } else console.log('— no candidate');
    await delay(1500 + Math.floor(Math.random() * 800));
  }
  fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 2));
  console.log(`\n✅  Action shots: ${got}/${roster.length} → ${path.relative(process.cwd(), OUT_DIR)}  · credits → ${path.relative(process.cwd(), CREDITS)}`);
}

main().catch(e => { console.error(e); process.exit(1); });
