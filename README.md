# 🏀 Hoops Elite — a free NBA "Top Shot"

Open **one pack a day**, reveal five serial-numbered cards, and build a library of
100 NBA stars. Every card carries a premium player cutout on the front and rich
bio + season-by-season career stats + accolades on the back. Pull rarer tiers for
scarcer serial numbers (Prismatic /25, Gold /150, Silver /750, Common /2,500).

**Fully static** — no server, no database, no runtime API calls. Player data and
photos are baked once into `public/` and the whole app runs as a static site
(deploys to Vercel as-is). Your collection lives in the browser, with optional
Google sign-in for cross-device sync.

## Quick start

```bash
npm start          # serve ./public at http://localhost:3000 (zero deps)
```

That's it — the data and photos are already committed. There is no build step
required to run the app.

## Features

- **1 pack / day**, 5 cards, with a live countdown and a day-streak counter.
- **Serial-numbered mint editions** — every card is `#N / edition-size`; scarcer
  tiers are lower-numbered and braggable (the Top Shot hook).
- **4 rarities** with holographic CSS — Common, Silver Chrome, Gold Chrome,
  Prismatic — and transparent pack **odds** shown before you open.
- **Rich cards** — team-colored Topps-Chrome front; back has HT/WT/age/draft/
  college, career accolades, and a full season-by-season stat table with
  career-highs highlighted.
- **Collection** — set-completion progress (overall + per-team), duplicate
  stacking (`×N`), owned/missing/all toggle with locked silhouettes for players
  you still need, search + filter by rarity/position/team, and multiple sorts
  (incl. lowest serial). Pin up to 3 cards to your **Showcase**.
- **Detail view** — big flip card + hero action panel with career averages.
- **Export / import** your collection as JSON.
- **Optional cloud sync** — Google auth + Firestore (see below); off by default.

## Architecture

```
public/                      # the entire deployable app (static)
  index.html
  data/players.json          # baked player dataset (bio + career stats)
  img/players/{nbaId}.png     # NBA CDN cutout (card front)
  img/players/{nbaId}-hero.jpg# Wikipedia editorial/action shot (detail view)
  css/{main,card}.css
  js/{data,store,card,pack,collection,app,firebase}.js
  firebase-config.js          # optional sync config (null by default)
scripts/
  build-data.js              # ESPN web API → public/data/players.json
  fetch-photos.js            # NBA CDN + Wikipedia → public/img/players
  roster.js                  # 100-player roster + team colors
  dev-server.js              # zero-dep static server
vercel.json                  # static hosting config
```

### Why the rewrite (v1 → v2)

v1 was Express + SQLite + photo blobs stored in the DB + a `puppeteer` scraper —
none of which deploys statically, and it depended on `stats.nba.com`, which is
IP-blocked from most hosts. v2 bakes everything to static files: stats/bio come
from **ESPN's open web API** (reachable, 20+ seasons) and photos from the **NBA
CDN** (consistent transparent-bg cutouts — ideal for the chrome composite) with a
Wikipedia editorial shot as an action extra. See `SPEC.md` for the full rationale.

## Photos: cutouts + action shots

Two front treatments, chosen per player at render time:

- **Moment card** (preferred): a full-bleed real **action photo** with a
  team-color scrim. Sourced in layers — **SerpAPI / Google Images** (best
  quality, needs `SERP_API_KEY` in `.env`) overriding **Wikimedia Commons**
  (free, CC-licensed, kept as fallback). Attribution shows on the card detail.
- **Cutout card** (fallback): the NBA CDN transparent-bg cutout over the team
  gradient, used when no good action shot exists.

```bash
npm run build:data            # refresh players.json from ESPN
npm run build:photos          # NBA cutouts + wiki hero (front fallback)
npm run build:action          # action shots from Wikimedia Commons (free)
npm run build:action:serp     # action shots from SerpAPI (needs .env key)
```

`fetch-serp.js` is quota-aware (one search/player, `--max` ceiling, resumes on
re-run) and downscales images to web size via macOS `sips`. Note: Google-Images
results are third-party/copyrighted — fine for a personal project, not a clean
commercial web license; the Wikimedia CC layer is the licensable fallback.

## Optional: cross-device sync (Firebase)

The app is fully functional offline without this. To sync your collection across
devices with Google sign-in:

1. Create a Firebase project → add a **Web app** → enable **Google** auth.
2. Create a **Firestore** database with this rule:
   ```
   match /users/{uid} { allow read, write: if request.auth.uid == uid; }
   ```
3. Paste your web config into `public/firebase-config.js`.

A "Sign in" button then appears in the nav; state mirrors to `users/{uid}` and
merges live across devices. Firebase web config is public by design.

## Deploy

Push to GitHub and import into Vercel — `vercel.json` serves `public/` as a static
site with long-cache headers on the photos. No build command needed.

## Tech

Vanilla HTML/CSS/JS (no framework, no bundler) · ESPN web API (data) · NBA CDN +
Wikipedia (photos) · optional Firebase Auth + Firestore (sync).
