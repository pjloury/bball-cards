/* ── store.js ─────────────────────────────────────────────────────────────
   Local-first persistence for the collection + daily-pack state + showcase.
   Backed by localStorage; when Firestore is configured & signed-in, Store.sync
   mirrors state to the cloud (see firebase.js — it calls Store._onRemote()).
   ──────────────────────────────────────────────────────────────────────── */

const LS_KEY = 'hoops.state.v2';

const Store = {
  state: {
    collection: [],      // [{uid, playerId, rarity, serial, edition, obtainedAt, packId}]
    lastPackDate: null,  // 'YYYY-MM-DD' (local)
    streak: 0,
    packsOpened: 0,
    showcase: [],        // array of card uids (max 3)
  },
  remote: null,          // set by firebase.js when signed in
  signedIn: false,       // set by firebase.js on auth state change
  authAvailable: false,  // true once firebase.js loads with a valid config

  load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) Object.assign(this.state, JSON.parse(raw));
    } catch { /* ignore */ }
    // migrate v1 collection if present
    this._migrateV1();
    return this;
  },

  _save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(this.state)); } catch {}
    if (this.remote) this.remote.push(this.state);
  },

  _migrateV1() {
    if (this.state.collection.length) return;
    try {
      const old = JSON.parse(localStorage.getItem('hoops_collection') || 'null');
      if (Array.isArray(old) && old.length) {
        this.state.collection = old.map(c => ({
          uid: c.uid || uid(), playerId: c.playerId || c.id, rarity: c.rarity || 'common',
          serial: c.serial || null, edition: c.edition || (RARITY[c.rarity || 'common'].edition),
          obtainedAt: c.obtainedAt || new Date().toISOString(),
        }));
        this._save();
      }
    } catch {}
  },

  /* Called by firebase.js when a newer remote snapshot arrives. */
  _onRemote(remoteState) {
    // Merge: union collection by uid, take max streak/packs, latest lastPackDate.
    const seen = new Set(this.state.collection.map(c => c.uid));
    for (const c of remoteState.collection || []) if (!seen.has(c.uid)) this.state.collection.push(c);
    this.state.packsOpened = Math.max(this.state.packsOpened, remoteState.packsOpened || 0);
    this.state.streak = Math.max(this.state.streak, remoteState.streak || 0);
    if ((remoteState.lastPackDate || '') > (this.state.lastPackDate || '')) this.state.lastPackDate = remoteState.lastPackDate;
    if ((remoteState.showcase || []).length && !this.state.showcase.length) this.state.showcase = remoteState.showcase;
    this._save();
    window.dispatchEvent(new CustomEvent('store:changed'));
  },

  // ── Daily pack gate ──────────────────────────────────────────────────────
  todayStr() { return new Date().toLocaleDateString('en-CA'); }, // YYYY-MM-DD local
  canOpenToday() { return this.state.lastPackDate !== this.todayStr(); },

  // Guests get one free pack; opening more requires signing in. When auth isn't
  // configured at all, this never gates (local-only mode stays fully open).
  needsAuthToOpen() {
    return this.authAvailable && !this.signedIn && this.state.packsOpened >= 1;
  },
  nextPackTime() { const d = new Date(); d.setHours(24, 0, 0, 0); return d; },

  recordPackOpened() {
    const today = this.todayStr();
    // streak: +1 if last open was yesterday, else reset to 1
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yStr = y.toLocaleDateString('en-CA');
    this.state.streak = this.state.lastPackDate === yStr ? this.state.streak + 1 : 1;
    this.state.lastPackDate = today;
    this.state.packsOpened++;
    this._save();
  },

  // ── Collection ─────────────────────────────────────────────────────────────
  addCards(cards) {
    for (const c of cards) this.state.collection.push(c);
    this._save();
    window.dispatchEvent(new CustomEvent('store:changed'));
  },
  collection() { return this.state.collection; },
  ownedPlayerIds() { return new Set(this.state.collection.map(c => c.playerId)); },

  /* Group collection by player → {playerId, cards[], best, count}. */
  grouped() {
    const g = {};
    for (const c of this.state.collection) {
      (g[c.playerId] ||= { playerId: c.playerId, cards: [], count: 0 });
      g[c.playerId].cards.push(c); g[c.playerId].count++;
    }
    for (const k in g) g[k].best = g[k].cards.reduce((a, b) => cardBetter(a, b));
    return g;
  },

  // ── Showcase (pinned favorites) ──────────────────────────────────────────
  toggleShowcase(uid) {
    const i = this.state.showcase.indexOf(uid);
    if (i >= 0) this.state.showcase.splice(i, 1);
    else { if (this.state.showcase.length >= 3) this.state.showcase.shift(); this.state.showcase.push(uid); }
    this._save();
    window.dispatchEvent(new CustomEvent('store:changed'));
  },
  isShowcased(uid) { return this.state.showcase.includes(uid); },
  showcaseCards() {
    return this.state.showcase.map(u => this.state.collection.find(c => c.uid === u)).filter(Boolean);
  },

  // ── Export / import ────────────────────────────────────────────────────────
  exportJSON() { return JSON.stringify(this.state, null, 2); },
  importJSON(text) {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.collection)) throw new Error('Invalid backup file');
    Object.assign(this.state, data);
    this._save();
    window.dispatchEvent(new CustomEvent('store:changed'));
  },
};

function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
