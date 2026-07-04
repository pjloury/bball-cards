#!/usr/bin/env node
/**
 * fetch-photos.js — download player photos ONCE into public/img/players/.
 *
 * The runtime is fully static, so we bake photos in rather than hotlinking or
 * scraping at request time (v1's fatal flaw). Two images per player:
 *
 *   {nbaId}.png       NBA CDN cutout — transparent-bg posed shot. This is the
 *                     card FRONT: consistent framing, composites cleanly over the
 *                     team-color gradient (the Topps-Chrome look). Rock solid.
 *   {nbaId}-hero.jpg  Editorial/action photo from Wikipedia (best effort) — used
 *                     on the card detail view where a varied background is fine.
 *
 * Falls back to the ESPN full headshot if the NBA CDN 404s.
 *
 * Usage: node scripts/fetch-photos.js [--refresh]
 */
const fs = require('fs');
const path = require('path');
const { PLAYER_LIST } = require('./roster');

const OUT_DIR = path.join(__dirname, '..', 'public', 'img', 'players');
const DATA = path.join(__dirname, '..', 'public', 'data', 'players.json');
const REFRESH = process.argv.includes('--refresh');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';
const delay = ms => new Promise(r => setTimeout(r, ms));

async function download(url, dest, minBytes = 1000) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < minBytes) return false;
    fs.writeFileSync(dest, buf);
    return buf.length;
  } catch { return false; }
}

// Resolve the canonical Wikipedia title (handles diacritics, disambiguation,
// "Jr."/suffix variants) via the search API before fetching the lead image.
async function wikiTitle(name) {
  try {
    const q = encodeURIComponent(`${name} basketball`);
    const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&srlimit=1&format=json&origin=*`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const j = await res.json();
    return j.query?.search?.[0]?.title || null;
  } catch { return null; }
}

async function fetchSummaryImage(title, dest) {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return false;
  const j = await res.json();
  if (j.type && j.type.includes('disambiguation')) return false;
  const src = (j.originalimage && j.originalimage.source) || (j.thumbnail && j.thumbnail.source);
  if (!src) return false;
  const sized = src.replace(/\/\d+px-/, '/800px-');
  return await download(sized, dest, 3000) || await download(src, dest, 3000);
}

// Wikipedia lead image (editorial/action). Try direct title, then search-resolved.
async function wikiHero(name, dest) {
  try {
    const direct = await fetchSummaryImage(name, dest);
    if (direct) return direct;
    const title = await wikiTitle(name);
    if (title && title.toLowerCase() !== name.toLowerCase()) return await fetchSummaryImage(title, dest);
    return false;
  } catch { return false; }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let roster = PLAYER_LIST;
  const espnById = {};
  if (fs.existsSync(DATA)) {
    for (const p of JSON.parse(fs.readFileSync(DATA, 'utf8')).players) espnById[p.nbaId] = p.espnId;
  }

  let cut = 0, hero = 0;
  for (const p of roster) {
    const cutPath = path.join(OUT_DIR, `${p.nbaId}.png`);
    const heroPath = path.join(OUT_DIR, `${p.nbaId}-hero.jpg`);
    process.stdout.write(`  ${p.name.padEnd(26)} `);

    // Front cutout
    if (REFRESH || !fs.existsSync(cutPath)) {
      let ok = await download(`https://cdn.nba.com/headshots/nba/latest/1040x760/${p.nbaId}.png`, cutPath);
      if (!ok && espnById[p.nbaId]) {
        ok = await download(`https://a.espncdn.com/i/headshots/nba/players/full/${espnById[p.nbaId]}.png`, cutPath);
      }
      process.stdout.write(ok ? `cut:${Math.round(ok / 1024)}k ` : 'cut:FAIL ');
      if (ok) cut++;
    } else { cut++; process.stdout.write('cut:cached '); }

    // Hero action (best effort)
    if (REFRESH || !fs.existsSync(heroPath)) {
      const ok = await wikiHero(p.name, heroPath);
      process.stdout.write(ok ? `hero:${Math.round(ok / 1024)}k` : 'hero:—');
      if (ok) hero++;
    } else { hero++; process.stdout.write('hero:cached'); }

    console.log('');
    await delay(120);
  }
  console.log(`\n✅  Photos: ${cut}/${roster.length} cutouts, ${hero}/${roster.length} hero shots → ${path.relative(process.cwd(), OUT_DIR)}`);
}

main().catch(e => { console.error(e); process.exit(1); });
