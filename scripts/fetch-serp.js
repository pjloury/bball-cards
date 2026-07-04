#!/usr/bin/env node
/**
 * fetch-serp.js — high-quality action photos via SerpAPI (Google Images).
 *
 * The premium layer over fetch-action.js (Wikimedia). One search per player:
 * large + tall (portrait) in-game photos, best-scored candidate downloaded to
 * public/img/players/{nbaId}-action.jpg (overrides Wikimedia). Credits recorded
 * to photo-credits.json with source:'google' (via SerpAPI).
 *
 * QUOTA-AWARE: one SerpAPI search per player; hard ceiling via --max (default
 * 120) so a run can never blow the plan. Reads SERP_API_KEY from .env directly
 * (never logged). Idempotent: skips players already sourced from google unless
 * --refresh. Only fetches players in the roster (or a --limit subset).
 *
 * Note: Google Images results are third-party/copyrighted; fine for a personal
 * project, not a clean commercial license. Wikimedia (CC) remains the fallback.
 *
 * Usage: node scripts/fetch-serp.js [--limit=N] [--max=N] [--refresh] [--only=ids]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { PLAYER_LIST } = require('./roster');

const OUT_DIR = path.join(__dirname, '..', 'public', 'img', 'players');
const CREDITS = path.join(__dirname, '..', 'public', 'data', 'photo-credits.json');
const ENV = path.join(__dirname, '..', '.env');
const delay = ms => new Promise(r => setTimeout(r, ms));

const argv = process.argv.slice(2);
const argVal = k => (argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1];
const REFRESH = argv.includes('--refresh');
const LIMIT = argVal('limit');
const MAX_SEARCHES = +(argVal('max') || 120);
const ONLY = (argVal('only') || '').split(',').filter(Boolean).map(Number);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';

function loadKey() {
  if (process.env.SERP_API_KEY) return process.env.SERP_API_KEY;
  try {
    const line = fs.readFileSync(ENV, 'utf8').split('\n').find(l => l.startsWith('SERP_API_KEY='));
    if (line) return line.slice('SERP_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
  } catch {}
  return null;
}

async function serpImages(key, query) {
  const url = `https://serpapi.com/search.json?engine=google_images&google_domain=google.com&q=${encodeURIComponent(query)}&tbs=${encodeURIComponent('isz:l,iar:t')}&api_key=${key}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error('serp ' + res.status);
  const j = await res.json();
  if (j.error) throw new Error('serp: ' + j.error);
  return j.images_results || [];
}

// Domains that sell prints/posters/fan-art/cards or host illustrations — NOT
// real game photography. Hard-reject (user wants real action photos, no art).
const DENY = /(etsy|redbubble|society6|teepublic|fineartamerica|deviantart|artstation|pinterest|amazon|ebay|walmart|mercari|poshmark|aliexpress|wallpaper|wallhaven|posterazzi|displate|pixels\.com|zazzle|cafepress|behance|dreamstime|shutterstock|alamy|123rf|stockphoto|vecteezy|freepik|clipart|fanatics|panini|prizm|\bcgc\b|\bpsa\b|\bbgs\b|graded|slab|topps|collectible|memorabilia|goldin)/;
// Real sports-photo / news / league sources — prefer these.
// Trusted real-photo sources. NBA.com/ESPN excluded — they host promo GRAPHICS
// (posterized "Rising Stars" art with text) that look terrible on a card.
const BOOST = /(getty|usatoday|usa today|imagn|nbae|si\.com|sports illustrated|reuters|apnews|nytimes|new york times|washingtonpost|boston herald|cbssports|nbcsports|yahoo|bleacherreport|clutchpoints|sportando|hoopshype|theathletic|guardian|hindustan|masslive|denverpost|mercurynews|inquirer|star tribune|tampa|athlonsports)/;

// Score an image result for "prominent single-player action photo".
function scoreImg(r, name) {
  const w = r.original_width || 0, h = r.original_height || 0;
  if (w < 500 || h < 500) return -1;
  const t = `${r.title || ''} ${r.source || ''} ${r.link || ''}`.toLowerCase();
  if (DENY.test(t)) return -1;                                   // art/poster/marketplace → reject
  if (/(poster|canvas|framed|wall art|print\b|painting|illustration|cartoon|vector|clip art|drawing|svg|mural|jersey|sneaker|shoe|funko|figure|tattoo|logo|silhouette)/.test(t)) return -1;
  // Magazine covers, graphics, trading cards, autographs → have text/branding, look bad on a card
  if (/(\bslam\b|magazine|\bcover\b|wallpaper|autograph|certified|authentic|trading card|rookie card|\bcard\b|graphic|\bedit\b|\bmeme\b|infographic|breakdown|preview|rising stars|all-star selection|\bselection\b|presented by|at&t|starting five|player of the (week|month))/.test(t)) return -1;
  let s = 0;
  const ar = w / h;
  if (ar >= 0.6 && ar <= 0.82) s += 4;           // ideal portrait
  else if (ar > 0.82 && ar <= 1.05) s += 2;
  else if (ar > 1.2) s -= 3;                      // landscape
  s += Math.min((w * h) / 1e6 / 2, 3);            // resolution
  if (BOOST.test(t)) s += 3;
  const last = name.split(' ').slice(-1)[0].toLowerCase();
  if (t.includes(last)) s += 1;
  return s;
}

async function download(url, dest) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://www.google.com/' }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') || '';
    if (!/image\/(jpeg|png|webp)/.test(ct)) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 8000) return false;
    fs.writeFileSync(dest, buf);
    // Downscale to web size (max 1400px long edge, q80) via macOS sips.
    try { execFileSync('sips', ['-Z', '1400', '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', dest, '--out', dest], { stdio: 'ignore' }); } catch {}
    return fs.statSync(dest).size;
  } catch { return false; }
}

async function main() {
  const key = loadKey();
  if (!key) { console.error('No SERP_API_KEY in env or .env'); process.exit(1); }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let credits = {};
  if (fs.existsSync(CREDITS)) { try { credits = JSON.parse(fs.readFileSync(CREDITS, 'utf8')); } catch {} }

  let roster = PLAYER_LIST;
  if (ONLY.length) roster = roster.filter(p => ONLY.includes(p.id));
  if (LIMIT) roster = roster.slice(0, +LIMIT);

  let searches = 0, got = 0;
  for (const p of roster) {
    const dest = path.join(OUT_DIR, `${p.nbaId}-action.jpg`);
    const already = credits[p.nbaId] && credits[p.nbaId].source === 'google';
    if (already && !REFRESH) { console.log(`  ${p.name.padEnd(26)} google:cached`); continue; }
    if (searches >= MAX_SEARCHES) { console.log(`\n⚠  hit --max=${MAX_SEARCHES} search cap; stopping.`); break; }

    process.stdout.write(`  ${p.name.padEnd(26)} `);
    searches++;
    let results = [];
    try { results = await serpImages(key, `${p.name} ${p.teamShort} basketball`); }
    catch (e) { console.log('serp-err: ' + e.message); await delay(500); continue; }

    const ranked = results.map(r => ({ r, s: scoreImg(r, p.name) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
    let saved = false;
    for (const { r } of ranked.slice(0, 8)) {
      const size = await download(r.original, dest);
      if (size) {
        got++; saved = true;
        credits[p.nbaId] = { source: 'google', via: 'serpapi', title: (r.title || '').slice(0, 120), link: r.link, source_name: r.source || '', width: r.original_width, height: r.original_height };
        console.log(`✓ ${Math.round(size / 1024)}k ${r.original_width}x${r.original_height}  ${(r.source || '').slice(0, 28)}`);
        break;
      }
    }
    if (!saved) console.log(`no-dl (${ranked.length} candidates)`);
    fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 2));   // persist after each (crash-safe)
    await delay(400);
  }
  console.log(`\n✅  SerpAPI: ${got} action shots saved · ${searches} searches used (cap ${MAX_SEARCHES}).`);
}

main().catch(e => { console.error(e); process.exit(1); });
