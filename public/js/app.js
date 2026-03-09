/* ── App globals ─────────────────────────────────────────────────────────── */
const SESSION_KEY  = 'hoops-session-id';
const PACK_KEY     = 'hoops-pack-history';
const COLL_KEY     = 'hoops-collection';
const PHOTO_STORE  = 'hoops-photos'; // IndexedDB store name for blob photos

let SESSION_ID = localStorage.getItem(SESSION_KEY);
if (!SESSION_ID) {
  SESSION_ID = 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  localStorage.setItem(SESSION_KEY, SESSION_ID);
}

// In-memory cache of fetched player data
const playerCache = {};

// ── IndexedDB for photo blobs ────────────────────────────────────────────────
let photoDB = null;

function openPhotoDB() {
  return new Promise((resolve, reject) => {
    if (photoDB) return resolve(photoDB);
    const req = indexedDB.open('hoops-photo-cache', 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(PHOTO_STORE, { keyPath: 'nbaId' });
    };
    req.onsuccess  = e => { photoDB = e.target.result; resolve(photoDB); };
    req.onerror    = e => reject(e.target.error);
  });
}

async function getPhotoBlobUrl(nbaId) {
  try {
    const db   = await openPhotoDB();
    const tx   = db.transaction(PHOTO_STORE, 'readonly');
    const row  = await new Promise((res, rej) => {
      const r = tx.objectStore(PHOTO_STORE).get(nbaId);
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
    if (row?.blob) return URL.createObjectURL(row.blob);
  } catch {}
  return null;
}

async function savePhotoBlob(nbaId, blob) {
  try {
    const db = await openPhotoDB();
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    tx.objectStore(PHOTO_STORE).put({ nbaId, blob });
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
  } catch (e) { console.warn('Photo save failed:', e); }
}

/**
 * Fetch a player's photo — priority chain:
 *  1. IndexedDB blob cache (instant, offline)
 *  2. /api/photos/:nbaId   (server-side blob store — best quality, server-cached)
 *  3. NBA CDN direct       (always available, headshot only)
 *
 * On first fetch the blob is persisted to IndexedDB so every subsequent
 * call is instant with no network request at all.
 */
async function ensurePhotoBlob(nbaId) {
  // 1 — IndexedDB hit
  const cached = await getPhotoBlobUrl(nbaId);
  if (cached) return cached;

  // 2 — Server blob store (populated by npm run fetch-photos)
  try {
    const serverRes = await fetch(`/api/photos/${nbaId}`);
    if (serverRes.ok) {
      const blob = await serverRes.blob();
      if (blob.size > 2000) {
        await savePhotoBlob(nbaId, blob);
        return URL.createObjectURL(blob);
      }
    }
  } catch {}

  // 3 — NBA CDN direct fallback
  const cdnUrl = `https://cdn.nba.com/headshots/nba/latest/1040x760/${nbaId}.png`;
  try {
    const res = await fetch(cdnUrl);
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 2000) {
        await savePhotoBlob(nbaId, blob);
        return URL.createObjectURL(blob);
      }
    }
  } catch {}

  return cdnUrl; // last resort: network URL (may break offline)
}

/** Pre-fetch and cache photos for an array of players in the background. */
async function prefetchPhotos(players) {
  for (const p of players) {
    const nbaId = p.nba_id || p.nbaId;
    if (!nbaId) continue;
    const cached = await getPhotoBlobUrl(nbaId);
    if (!cached) {
      await ensurePhotoBlob(nbaId);
      await new Promise(r => setTimeout(r, 50)); // tiny gap to not saturate
    }
  }
}

// ── Routing ──────────────────────────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const el  = document.getElementById('view-' + name);
  const btn = document.getElementById('nav-' + name);
  if (el)  el.classList.add('active');
  if (btn) btn.classList.add('active');

  if (name === 'home')    initHome();
  if (name === 'pack')    initPack();
  if (name === 'library') initLibrary();
}

// ── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function getPlayerDetail(id) {
  if (playerCache[id]) return playerCache[id];
  const p = await apiFetch(`/api/players/${id}`);
  playerCache[id] = p;
  return p;
}

// ── Local collection helpers ─────────────────────────────────────────────────
function getLocalCollection() {
  try { return JSON.parse(localStorage.getItem(COLL_KEY) || '[]'); } catch { return []; }
}
function setLocalCollection(arr) {
  localStorage.setItem(COLL_KEY, JSON.stringify(arr));
}
function addToLocalCollection(cards) {
  const coll = getLocalCollection();
  const now  = new Date().toISOString();
  cards.forEach(c => coll.unshift({ ...c, obtainedAt: now, uid: Date.now() + Math.random() }));
  setLocalCollection(coll);
}
function getCollectionCount() { return getLocalCollection().length; }
function updateBadge() {
  document.getElementById('collection-count').textContent = getCollectionCount();
  document.getElementById('stat-collected').textContent   = getCollectionCount();
}

// ── Pack history ─────────────────────────────────────────────────────────────
function getLastPackDate()    { return localStorage.getItem(PACK_KEY) || null; }
function setLastPackDate()    { localStorage.setItem(PACK_KEY, new Date().toISOString().slice(0,10)); }
function getPacksOpened()     { return parseInt(localStorage.getItem('hoops-packs-count') || '0'); }
function incPacksOpened()     { localStorage.setItem('hoops-packs-count', getPacksOpened() + 1); }
function canOpenPackToday()   {
  const last  = getLastPackDate();
  const today = new Date().toISOString().slice(0,10);
  return !last || last !== today;
}

// ── Countdown ─────────────────────────────────────────────────────────────────
function formatCountdown(ms) {
  const t = Math.max(0, ms);
  const h = Math.floor(t / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  const s = Math.floor((t % 60000)   / 1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function msUntilMidnight() {
  const now = new Date();
  const mid = new Date(now); mid.setHours(24,0,0,0);
  return mid - now;
}

// ── HOME ──────────────────────────────────────────────────────────────────────
async function initHome() {
  updateBadge();
  document.getElementById('stat-packs').textContent = getPacksOpened();

  const canOpen    = canOpenPackToday();
  const statusText = document.getElementById('pack-status-text');
  const openBtn    = document.getElementById('hero-open-btn');
  const timerEl    = document.getElementById('hero-timer');

  if (canOpen) {
    statusText.textContent = 'Your daily pack is ready to open!';
    openBtn.classList.remove('hidden');
    timerEl.classList.add('hidden');
  } else {
    statusText.textContent = "You've already opened your pack today. Come back tomorrow!";
    openBtn.classList.add('hidden');
    timerEl.classList.remove('hidden');
    const tick = () => { timerEl.textContent = formatCountdown(msUntilMidnight()); };
    tick();
    if (window._homeTimer) clearInterval(window._homeTimer);
    window._homeTimer = setInterval(tick, 1000);
  }

  // Recent cards
  const coll          = getLocalCollection();
  const recentSection = document.getElementById('home-recent');
  const recentGrid    = document.getElementById('recent-grid');

  if (coll.length > 0) {
    recentSection.style.display = '';
    recentGrid.innerHTML = '';
    // Set home cards as the nav list so arrow keys work from modal
    window._filteredCards = coll.slice(0, 8);
    for (const card of coll.slice(0, 8)) {
      const wrapper = document.createElement('div');
      wrapper.className = 'card-outer mini';
      wrapper.onclick = () => openCardModal(card);
      wrapper.innerHTML = buildCardFrontHTML(card, 'mini');
      recentGrid.appendChild(wrapper);
      hydrateCardPhoto(wrapper, card.nba_id || card.nbaId);
    }
  } else {
    recentSection.style.display = 'none';
  }
}

// ── Photo blob hydration ──────────────────────────────────────────────────────
/**
 * After a card element is in the DOM, replace its <img> src with the cached
 * blob URL (or fetch+cache it if not yet stored).
 */
async function hydrateCardPhoto(cardEl, nbaId) {
  if (!nbaId) return;
  const blobUrl = await ensurePhotoBlob(nbaId);
  cardEl.querySelectorAll('img[data-nba-id]').forEach(img => {
    if (parseInt(img.dataset.nbaId) === nbaId) img.src = blobUrl;
  });
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg, duration = 3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.add('hidden'), duration);
}

// ── SPARKLE effect ────────────────────────────────────────────────────────────
function sparkle(x, y, rarity) {
  const colors = {
    common:    ['#fff','#ccc','#aaa'],
    silver:    ['#C0C0C0','#E8E8FF','#FFFFFF'],
    gold:      ['#FFD700','#FFA500','#FFEC8B'],
    prismatic: ['#FF0080','#7B00FF','#00EEFF','#FFD700','#FF4500','#00FF88'],
  };
  const pallete  = colors[rarity] || colors.common;
  const container = document.createElement('div');
  container.className = 'sparkle-container';
  document.body.appendChild(container);
  const count = rarity === 'prismatic' ? 28 : rarity === 'gold' ? 18 : 10;
  for (let i = 0; i < count; i++) {
    const el   = document.createElement('div');
    el.className = 'sparkle';
    const size = 4 + Math.random() * 8;
    const tx   = (Math.random() - 0.5) * 200;
    const ty   = (Math.random() - 0.5) * 200 - 80;
    el.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;
      background:${pallete[Math.floor(Math.random()*pallete.length)]};
      --tx:${tx}px;--ty:${ty}px;
      animation-delay:${Math.random()*0.3}s;
      animation-duration:${0.8+Math.random()*0.6}s;`;
    container.appendChild(el);
  }
  setTimeout(() => container.remove(), 2000);
}

// ── MODAL  (single card-3d flip — no double-layer) ───────────────────────────
let modalIsFlipped  = false;
let _modalCard      = null;   // current full card object in modal
let _modalSources   = [];     // available photo sources from server
let _modalSourceIdx = 0;      // which source is currently shown

// Source display labels
const SOURCE_LABELS = {
  'bing-action-1':    'Action 1',
  'bing-action-2':    'Action 2',
  'bing-action-3':    'Action 3',
  'bing-action-4':    'Action 4',
  'bing-action-5':    'Action 5',
  'nba-hires':        'NBA Official',
  'nba-legacy':       'NBA Legacy',
  'espn-headshot':    'ESPN',
  'espn-action':      'ESPN Action',
  'wiki-image':       'Wikipedia',
  'nba-small':        'NBA Thumb',
  'nba-draft':        'NBA Draft',
  'nba-stats-profile':'NBA Stats',
};

async function openCardModal(card) {
  // Fetch full player data (for stats on card back)
  let fullCard = card;
  try {
    const detail = await getPlayerDetail(card.id || card.player_id);
    fullCard = { ...card, ...detail };
  } catch {}
  fullCard.rarity = card.rarity || 'common';

  modalIsFlipped = false;
  const cardEl = document.getElementById('modal-card');
  cardEl.classList.remove('flipped');

  // Responsive sizing
  const fw = Math.min(window.innerWidth * 0.88, 380);
  const fh = Math.round(fw * 1.4);
  cardEl.style.width  = fw + 'px';
  cardEl.style.height = fh + 'px';
  document.getElementById('modal-perspective').style.width  = fw + 'px';
  document.getElementById('modal-perspective').style.height = fh + 'px';

  // Single card-3d with BOTH faces — the correct flip structure
  cardEl.innerHTML = buildCardFrontHTML(fullCard, 'full') + buildCardBackHTML(fullCard);

  // Hydrate photo blobs in the modal
  const nbaId = fullCard.nba_id || fullCard.nbaId;
  if (nbaId) {
    ensurePhotoBlob(nbaId).then(url => {
      cardEl.querySelectorAll('img[data-nba-id]').forEach(img => { img.src = url; });
    });
  }

  // Rarity badge
  const labels = { common:'⚪ Common', silver:'🥈 Silver Chrome', gold:'🥇 Gold Chrome', prismatic:'✨ Prismatic' };
  const badge  = document.getElementById('modal-rarity-badge');
  badge.textContent = labels[fullCard.rarity] || fullCard.rarity;
  badge.className   = `modal-rarity-badge rarity-badge-${fullCard.rarity}`;

  document.getElementById('modal-hint').textContent = 'Click card or F to flip';
  document.getElementById('card-modal').classList.remove('hidden');

  // Load available photo sources from server and build picker
  _modalCard      = fullCard;
  _modalSources   = [];
  _modalSourceIdx = 0;
  renderPhotoSourcePicker([]);  // reset first
  const nbaIdForPicker = fullCard.nba_id || fullCard.nbaId;
  if (nbaIdForPicker) {
    try {
      const sources = await apiFetch(`/api/photos/${nbaIdForPicker}/all`);
      _modalSources = sources.filter(s => s.source !== 'nba-small'); // skip tiny thumb
      renderPhotoSourcePicker(_modalSources);
    } catch {}
  }
}

function renderPhotoSourcePicker(sources) {
  let picker = document.getElementById('photo-source-picker');
  if (!picker) return;
  if (!sources.length) { picker.innerHTML = ''; return; }
  picker.innerHTML = `
    <span class="photo-picker-label">PHOTO:</span>
    ${sources.map((s, i) => `
      <button class="photo-src-btn ${i === _modalSourceIdx ? 'active' : ''}"
              onclick="switchPhotoSource(${i})"
              title="${SOURCE_LABELS[s.source] || s.source}">
        ${SOURCE_LABELS[s.source] || s.source}
      </button>`).join('')}
  `;
}

async function switchPhotoSource(idx) {
  if (!_modalCard || !_modalSources[idx]) return;
  _modalSourceIdx = idx;
  renderPhotoSourcePicker(_modalSources);
  const src   = _modalSources[idx].source;
  const nbaId = _modalCard.nba_id || _modalCard.nbaId;
  const url   = `/api/photos/${nbaId}?source=${src}`;
  // Swap all img[data-nba-id] in the modal
  const cardEl = document.getElementById('modal-card');
  cardEl.querySelectorAll('img[data-nba-id]').forEach(img => { img.src = url; });
}

function flipModalCard() {
  modalIsFlipped = !modalIsFlipped;
  document.getElementById('modal-card').classList.toggle('flipped', modalIsFlipped);
  document.getElementById('modal-hint').textContent = modalIsFlipped
    ? 'Viewing card back — click or press F to flip back'
    : 'Viewing card front — click or press F to flip';
}

function closeCardModal() {
  document.getElementById('card-modal').classList.add('hidden');
  _modalCard = null; _modalSources = []; _modalSourceIdx = 0;
}
function closeModal(e) {
  if (e.target.id === 'card-modal') closeCardModal();
}

// Navigate prev/next through the current view's card list
function modalNavPrev() { modalNavStep(-1); }
function modalNavNext() { modalNavStep( 1); }
async function modalNavStep(dir) {
  const cards = window._filteredCards || [];
  if (!cards.length || !_modalCard) return;
  const cur = cards.findIndex(c => (c.uid || c.id) === (_modalCard.uid || _modalCard.id));
  if (cur < 0) return;
  const next = cur + dir;
  if (next < 0 || next >= cards.length) return;
  await openCardModal(cards[next]);
}

// Clicking the card itself flips it
document.addEventListener('click', e => {
  const cardEl = document.getElementById('modal-card');
  if (cardEl && cardEl.contains(e.target)) flipModalCard();
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  const modalOpen = !document.getElementById('card-modal').classList.contains('hidden');
  if (e.key === 'Escape') closeCardModal();
  if (modalOpen && (e.key === 'f' || e.key === 'F')) flipModalCard();
  if (modalOpen && e.key === 'ArrowLeft')  modalNavPrev();
  if (modalOpen && e.key === 'ArrowRight') modalNavNext();
});

// ── COLLECTION EXPORT ────────────────────────────────────────────────────────
function exportCollection() {
  const coll = getLocalCollection();
  if (!coll.length) { showToast('No cards to export yet!'); return; }
  const payload = {
    version:    1,
    exportedAt: new Date().toISOString(),
    sessionId:  SESSION_ID,
    packsOpened: getPacksOpened(),
    lastPackDate: getLastPackDate(),
    cards:      coll,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `hoops-collection-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`✅ Exported ${coll.length} cards`);
}

// ── COLLECTION IMPORT ────────────────────────────────────────────────────────
function importCollection(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const payload = JSON.parse(e.target.result);
      if (!Array.isArray(payload.cards)) throw new Error('Invalid format');
      const existing = getLocalCollection();
      const existingUids = new Set(existing.map(c => c.uid));
      const newCards = payload.cards.filter(c => !existingUids.has(c.uid));
      const merged   = [...newCards, ...existing];
      setLocalCollection(merged);
      if (payload.packsOpened)  localStorage.setItem('hoops-packs-count', payload.packsOpened);
      if (payload.lastPackDate) localStorage.setItem(PACK_KEY, payload.lastPackDate);
      updateBadge();
      initLibrary();
      showToast(`✅ Imported ${newCards.length} new cards (${merged.length} total)`);
    } catch (err) {
      showToast('⚠️ Could not read that file — make sure it\'s a valid Hoops backup.');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// ── INIT ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  updateBadge();
  initHome();

  // Silently pre-cache photos for cards already in collection
  const coll = getLocalCollection();
  if (coll.length) {
    setTimeout(() => prefetchPhotos(coll), 2000);
  }
});
