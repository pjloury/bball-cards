# 🏀 Hoops Elite v2 — Spec

A "free NBA Top Shot" — a daily card-collecting game. Open **one pack per day**,
reveal serial-numbered mint editions of real NBA players, and build a library of
rare cards. Every card is rich with bio + season-by-season career stats and a
premium player photo on the front.

## Why v2 (what changed & why)

The v1 app was a good idea trapped in a fragile shell:

- **Non-deployable runtime.** Express + `better-sqlite3` + photo blobs stored *in*
  the DB + a live `puppeteer` scraper. None of that survives a serverless/static
  deploy (the target is Vercel), and the DB is `.gitignore`d so a fresh clone has
  no data at all.
- **The photo pipeline was the tar pit.** Six competing fetchers (Bing, Google
  CSE, Yahoo/ESPN scrape, puppeteer, "extra", "recommend") all chasing in-game
  action photos that are hotlink-protected and flaky. Meanwhile the *reliable*
  source — NBA's CDN cutouts — was only ever used as the default.
- **Live NBA stats API is blocked.** `stats.nba.com` returns nothing from most
  non-residential IPs (confirmed), so `npm run seed` can't be trusted to work.

### v2 principles

1. **Static-first.** All player data is baked once into `public/data/players.json`
   and all photos into `public/img/players/`. The runtime is a pure static SPA —
   deploys to Vercel with zero server. No runtime network calls to third parties.
2. **Reliable data sources.** Stats + bio come from ESPN's open web API (reachable,
   rich, 20+ seasons of averages). Photos come from NBA's CDN cutouts (consistent,
   transparent-background — ideal for the Topps-Chrome composite) with an ESPN
   headshot fallback.
3. **Keep the crown jewels.** v1's card rendering, holographic rarity CSS, and
   pack-tear animation are genuinely good — preserved and extended.
4. **Rarity is per-card, not per-player** (the Top Shot model). The same player can
   be minted Common or Prismatic; scarcer tiers carry lower serial numbers.
5. **Local-first, cloud-optional.** Collection + daily-pack state live in
   `localStorage` and work offline forever. Firestore auth is an optional layer for
   cross-device sync — the app is fully functional without it.

## Data model (`players.json`)

```jsonc
{
  "generatedAt": "2026-07-04T...",
  "season": "2025-26",
  "players": [{
    "id": 1, "nbaId": 2544, "espnId": 1966,
    "name": "LeBron James", "firstName": "LeBron", "lastName": "James",
    "team": "Los Angeles Lakers", "teamShort": "LAL",
    "teamPrimary": "#552583", "teamSecondary": "#FDB927",
    "jersey": 23, "position": "SF",
    "height": "6'9\"", "weight": "250 lbs",
    "born": "December 30, 1984", "age": 40, "birthplace": "Akron, OH",
    "college": "St. Vincent-St. Mary HS (OH)", "draft": "2003 Rd 1, Pick 1",
    "experience": 22,
    "bio": "…",
    "careerStats": [{ "season":"2024-25","team":"LAL","gp":70,"mpg":34.9,
                      "ppg":24.4,"rpg":7.8,"apg":8.2,"spg":1.0,"bpg":0.6,
                      "fgPct":51.3,"threePct":37.6,"ftPct":78.2,"current":false }],
    "careerAverages": { "ppg":27.0, "rpg":7.5, "apg":7.4, … },
    "accolades": ["4× Champion","4× MVP","All-time scoring leader"]
  }]
}
```

## Rarity & mint editions (Top Shot's signature)

| Tier | Weight | Max serial (edition size) | Look |
|------|-------:|--------------------------:|------|
| Common    | 60% | /2500 | silver edge |
| Silver    | 26% | /750  | animated shimmer |
| Gold      | 11% | /150  | gold shimmer |
| Prismatic |  3% | /25   | rainbow holo |

Each minted card gets a **serial number** `#N/EditionSize` assigned at pack-open
(random within the tier). Lower serials are braggable. Serial is stored with the
owned card and shown on the front badge + detail view.

## Daily pack loop

- **One pack / day.** 5 cards. Gate = last-open date in `localStorage`
  (`hoops.lastPackDate`), and in the Firestore user doc when signed in.
- **Streak counter.** Consecutive days opened; shown on home.
- **Pack odds** are displayed before opening (transparency, like Top Shot).
- **Reveal** one card at a time with the existing tear/flip animation; scarcer
  pulls get bigger sparkle treatment.

## Collection / library UX (improvements over v1)

- **Set completion**: "43 / 100 players" progress bar + per-team set completion.
- **Duplicates** stack with a `×N` badge; best rarity/serial surfaces on top.
- **Filters**: search, rarity, position, team, and a **Owned / Missing** toggle so
  you can see who you still need (missing shown as locked silhouettes).
- **Sort**: recent, name, team, rarity, jersey, lowest serial.
- **Showcase**: pin up to 3 favorite cards to the top of the collection + home.
- **Export / Import** JSON backup (kept from v1).

## Screens

1. **Home** — hero, today's-pack CTA / countdown, streak, collection progress,
   showcase, recent pulls.
2. **Open Pack** — sealed pack → tear → reveal → add to collection.
3. **Collection** — grid, filters, set-completion, detail modal (flip, serial,
   full stats + bio + action photo, prev/next browse).

## Architecture / files

```
public/
  index.html
  data/players.json          # baked once, committed
  img/players/{nbaId}.png     # NBA CDN cutout (card front)
  img/players/{nbaId}-hero.jpg# action/editorial shot (detail view) — best effort
  css/main.css  css/card.css
  js/data.js       # loads players.json, rarity/serial helpers, team sets
  js/store.js      # localStorage + (optional) Firestore-backed collection & pack state
  js/card.js       # card front/back/detail HTML builders (from v1, adapted)
  js/pack.js       # daily pack open + reveal flow
  js/collection.js # library grid, filters, set completion, showcase
  js/app.js        # router, home, boot, auth UI
  js/firebase.js   # optional: auth + Firestore sync (no-op if unconfigured)
scripts/
  build-data.js    # ESPN → players.json
  fetch-photos.js  # NBA CDN + ESPN → public/img/players
  dev-server.js    # tiny static file server for local dev
vercel.json        # static hosting
```

## Non-goals

- No real-money marketplace, trading between users, or blockchain (it's "free"
  Top Shot — the collecting loop, not the economy).
- No anti-cheat on the client daily gate (personal project; Firestore gate is the
  real one when signed in).
