/* ── app.js — router, home, boot ─────────────────────────────────────────── */

let currentView = 'home';
const VIEWS = ['home', 'pack', 'collection'];

function showView(name) {
  if (!VIEWS.includes(name)) name = 'home';
  currentView = name;
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${name}`));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.id === `nav-${name}`));
  window.scrollTo(0, 0);
  // Keep the URL hash in sync so a refresh restores this view (replaceState
  // doesn't fire hashchange, so no render loop).
  if (location.hash.slice(1) !== name) history.replaceState(null, '', '#' + name);
  if (name === 'home') renderHome();
  else if (name === 'pack') initPackView();
  else if (name === 'collection') renderCollection();
}

function renderHome() {
  const owned = Store.ownedPlayerIds().size;
  const total = DATA.players.length;
  document.getElementById('stat-collected').textContent = owned;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-packs').textContent = Store.state.packsOpened;
  document.getElementById('stat-streak').textContent = Store.state.streak;

  // Pack status
  const statusText = document.getElementById('pack-status-text');
  const btn = document.getElementById('hero-open-btn');
  const timer = document.getElementById('hero-timer');
  if (Store.needsAuthToOpen()) {
    statusText.textContent = 'Sign in to open a new pack daily and sync your collection.';
    btn.textContent = 'SIGN IN WITH GOOGLE';
    btn.onclick = () => HoopsAuth.signIn();
    btn.classList.remove('hidden'); timer.classList.add('hidden');
  } else if (Store.canOpenToday()) {
    statusText.textContent = "Today's pack is ready to open!";
    btn.textContent = "OPEN TODAY'S PACK";
    btn.onclick = () => showView('pack');
    btn.classList.remove('hidden'); timer.classList.add('hidden');
  } else {
    statusText.textContent = 'Come back tomorrow for your next pack.';
    btn.classList.add('hidden'); timer.classList.remove('hidden');
    startHomeTimer();
  }

  // Collection progress
  const pct = Math.round((owned / total) * 100);
  document.getElementById('home-progress-fill').style.width = pct + '%';
  document.getElementById('home-progress-label').textContent = `${owned}/${total} players · ${pct}%`;

  // Showcase
  const showcase = Store.showcaseCards().map(c => ({ ...DATA.byId[c.playerId], ...c }));
  const scSection = document.getElementById('home-showcase');
  const scGrid = document.getElementById('showcase-grid');
  if (showcase.length) {
    scSection.style.display = '';
    scGrid.innerHTML = showcase.map(c => `<div class="card-outer library-card rarity-${c.rarity}"><div class="card-3d">${buildCardFrontHTML(c, 'library')}</div></div>`).join('');
    [...scGrid.children].forEach((el, i) => el.onclick = () => openCardModal(showcase[i], showcase));
  } else scSection.style.display = 'none';

  // Recent pulls (last 6)
  const recent = [...Store.collection()].sort((a, b) => (b.obtainedAt || '').localeCompare(a.obtainedAt || '')).slice(0, 6)
    .map(c => ({ ...DATA.byId[c.playerId], ...c }));
  const recentSection = document.getElementById('home-recent');
  const recentGrid = document.getElementById('recent-grid');
  if (recent.length) {
    recentSection.style.display = '';
    recentGrid.innerHTML = recent.map(c => `<div class="card-outer library-card rarity-${c.rarity}"><div class="card-3d">${buildCardFrontHTML(c, 'library')}</div></div>`).join('');
    [...recentGrid.children].forEach((el, i) => el.onclick = () => openCardModal(recent[i], recent));
  } else recentSection.style.display = 'none';
}

let homeTimer = null;
function startHomeTimer() {
  clearInterval(homeTimer);
  const tick = () => {
    const el = document.getElementById('hero-timer');
    if (!el || currentView !== 'home') return clearInterval(homeTimer);
    const ms = Store.nextPackTime() - new Date();
    if (ms <= 0) { clearInterval(homeTimer); renderHome(); return; }
    el.textContent = '⏳ Next pack in ' + fmtCountdown(ms);
  };
  tick(); homeTimer = setInterval(tick, 1000);
}

/* Update collection count badge in nav. */
function refreshNavBadge() {
  document.getElementById('collection-count').textContent = Store.ownedPlayerIds().size;
}

/* Toast. */
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.classList.add('hidden'), 300); }, 2600);
}

async function boot() {
  await DATA.load();
  Store.load();
  initCollectionFilters();
  refreshNavBadge();
  window.addEventListener('store:changed', () => { refreshNavBadge(); if (currentView === 'home') renderHome(); if (currentView === 'collection') renderCollection(); });
  if (window.HoopsAuth) HoopsAuth.init();  // optional Firestore layer
  // Back/forward + manual hash edits navigate between views.
  window.addEventListener('hashchange', () => {
    const n = location.hash.slice(1) || 'home';
    if (n !== currentView) showView(n);
  });
  showView(location.hash.slice(1) || 'home');   // restore view on refresh/deep-link
}

document.addEventListener('DOMContentLoaded', boot);
