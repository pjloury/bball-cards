#!/usr/bin/env node
/* Download the 30 NBA team logos from ESPN's CDN into public/img/teams/{tricode}.png */
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'public', 'img', 'teams');

// NBA tricode → ESPN logo slug (ESPN differs for a handful of teams).
const ESPN = {
  ATL: 'atl', BOS: 'bos', BKN: 'bkn', CHA: 'cha', CHI: 'chi', CLE: 'cle', DAL: 'dal',
  DEN: 'den', DET: 'det', GSW: 'gs', HOU: 'hou', IND: 'ind', LAC: 'lac', LAL: 'lal',
  MEM: 'mem', MIA: 'mia', MIL: 'mil', MIN: 'min', NOP: 'no', NYK: 'ny', OKC: 'okc',
  ORL: 'orl', PHI: 'phi', PHX: 'phx', POR: 'por', SAC: 'sac', SAS: 'sa', TOR: 'tor',
  UTA: 'utah', WAS: 'wsh',
};

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  let ok = 0;
  for (const [tri, slug] of Object.entries(ESPN)) {
    const dest = path.join(OUT, `${tri}.png`);
    try {
      const res = await fetch(`https://a.espncdn.com/i/teamlogos/nba/500/${slug}.png`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 800) { fs.writeFileSync(dest, buf); ok++; process.stdout.write(`${tri} `); continue; }
      }
      console.log(`\n${tri} FAIL (${res.status})`);
    } catch (e) { console.log(`\n${tri} ERR ${e.message}`); }
  }
  console.log(`\n✅  ${ok}/30 team logos → ${path.relative(process.cwd(), OUT)}`);
}
main();
