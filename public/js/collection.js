/* ── collection.js — library grid, filters, set completion, detail modal ── */

const filters = { search: '', rarity: '', position: '', team: '', show: 'owned', sort: 'recent' };

function initCollectionFilters() {
  const bind = (id, key, ev = 'change') => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(ev, () => { filters[key] = el.value; renderCollection(); });
  };
  bind('f-search', 'search', 'input');
  bind('f-rarity', 'rarity'); bind('f-position', 'position');
  bind('f-team', 'team'); bind('f-sort', 'sort');
  document.querySelectorAll('.owned-toggle button').forEach(b =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.owned-toggle button').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); filters.show = b.dataset.show; renderCollection();
    }));
  // Populate team filter
  const tf = document.getElementById('f-team');
  if (tf && tf.options.length <= 1) {
    for (const t of DATA.teams) tf.insertAdjacentHTML('beforeend', `<option value="${t.short}">${t.name}</option>`);
  }
}

/* Build the display list: one entry per player (owned → best card; missing → locked). */
function buildDisplayList() {
  const grouped = Store.grouped();
  let list = DATA.players.map(p => {
    const g = grouped[p.id];
    if (g) return { ...p, ...g.best, count: g.count, owned: true, cards: g.cards };
    return { ...p, owned: false, count: 0, rarity: 'common' };
  });

  if (filters.show === 'owned') list = list.filter(x => x.owned);
  else if (filters.show === 'missing') list = list.filter(x => !x.owned);

  const q = filters.search.trim().toLowerCase();
  if (q) list = list.filter(x => x.name.toLowerCase().includes(q) || x.team.toLowerCase().includes(q));
  if (filters.rarity) list = list.filter(x => x.owned && x.rarity === filters.rarity);
  if (filters.position) list = list.filter(x => x.position === filters.position);
  if (filters.team) list = list.filter(x => x.teamShort === filters.team);

  const cmp = {
    recent: (a, b) => (b.obtainedAt || '').localeCompare(a.obtainedAt || ''),
    name: (a, b) => a.name.localeCompare(b.name),
    team: (a, b) => a.team.localeCompare(b.team) || a.name.localeCompare(b.name),
    rarity: (a, b) => (RARITY[b.rarity].order - RARITY[a.rarity].order) || (a.serial || 9e9) - (b.serial || 9e9),
    jersey: (a, b) => (a.jersey || 0) - (b.jersey || 0),
    serial: (a, b) => (a.serial || 9e9) - (b.serial || 9e9),
  }[filters.sort] || (() => 0);
  list.sort(cmp);
  return list;
}

function renderCollection() {
  const grid = document.getElementById('collection-grid');
  const empty = document.getElementById('collection-empty');
  const list = buildDisplayList();
  renderSetProgress();

  // Empty state: nothing owned AND the current view has nothing to show.
  if (list.length === 0) {
    const noneOwned = Store.collection().length === 0;
    empty.classList.remove('hidden');
    empty.querySelector('h3').textContent = noneOwned ? 'No cards yet!' : 'Nothing matches';
    empty.querySelector('p').textContent = noneOwned ? 'Open your first pack to start collecting.' : 'Try a different filter.';
    grid.innerHTML = '';
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = list.map(x => {
    if (!x.owned) {
      return `<div class="grid-cell missing" title="${x.name} — not yet collected">
        <div class="card-outer library-card missing-card">
          <div class="missing-inner"><span class="lock">🔒</span><span class="missing-name">${x.name}</span>
          <span class="missing-team">${x.teamShort}</span></div></div></div>`;
    }
    const badge = x.count > 1 ? `<span class="dupe-badge">×${x.count}</span>` : '';
    const pin = Store.isShowcased(x.uid) ? '<span class="pin-badge">★</span>' : '';
    return `<div class="grid-cell" data-uid="${x.uid}">${badge}${pin}${buildLibraryCardHTML(x)}</div>`;
  }).join('');

  grid.querySelectorAll('.grid-cell[data-uid]').forEach(cell => {
    cell.addEventListener('click', () => {
      const uid = cell.dataset.uid;
      const card = list.find(x => x.uid === uid);
      openCardModal(card, list.filter(x => x.owned));
    });
  });
}

function renderSetProgress() {
  const owned = Store.ownedPlayerIds().size;
  const total = DATA.players.length;
  const pct = Math.round((owned / total) * 100);
  const el = document.getElementById('set-progress');
  if (!el) return;
  // per-team completion
  const ownedIds = Store.ownedPlayerIds();
  const teamBits = DATA.teams.map(t => {
    const players = DATA.players.filter(p => p.teamShort === t.short);
    const have = players.filter(p => ownedIds.has(p.id)).length;
    const done = have === players.length;
    return `<span class="team-chip ${done ? 'done' : ''}" title="${t.name}: ${have}/${players.length}"
      style="--pc:${t.primary}">${t.short} ${have}/${players.length}</span>`;
  }).join('');
  el.innerHTML = `
    <div class="progress-head"><strong>${owned}</strong> / ${total} players collected <span class="progress-pct">${pct}%</span></div>
    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    <details class="team-sets"><summary>Team sets</summary><div class="team-chips">${teamBits}</div></details>`;
}

/* ── Detail modal ─────────────────────────────────────────────────────────── */
let modalList = [], modalIdx = 0, modalFlipped = false;

function openCardModal(card, list) {
  modalList = list || [card];
  modalIdx = Math.max(0, modalList.findIndex(x => x.uid === card.uid));
  modalFlipped = false;
  renderModal();
  document.getElementById('card-modal').classList.remove('hidden');
  document.addEventListener('keydown', modalKeys);
}
function renderModal() {
  const c = modalList[modalIdx] || modalList[0];
  const perspective = document.getElementById('modal-card');
  perspective.className = 'card-3d' + (modalFlipped ? ' flipped' : '');
  perspective.innerHTML = buildCardFrontHTML(c) + buildCardBackHTML(c);

  // Hero panel — prefer the real action shot, then wiki hero, then cutout
  const hero = document.getElementById('modal-hero');
  const heroSrc = c.action ? photoAction(c.nbaId) : photoHero(c.nbaId);
  hero.style.backgroundImage = `url(${heroSrc}), url(${photoFront(c.nbaId)})`;
  const cred = document.getElementById('modal-hero-credit');
  if (cred) {
    if (c.action) {
      const a = c.action;
      cred.innerHTML = a.source === 'google'
        ? `📷 ${a.source_name || 'via web image search'}`
        : `📷 ${a.artist || 'Wikimedia'}${a.license ? ' · ' + a.license : ''} · Wikimedia Commons`;
      cred.style.display = '';
    } else cred.style.display = 'none';
  }
  document.getElementById('modal-hero-name').textContent = c.name;
  document.getElementById('modal-hero-meta').textContent = `${c.team} · #${c.jersey} · ${c.position}`;
  const av = c.careerAverages || {};
  document.getElementById('modal-hero-stats').innerHTML = av.ppg != null ?
    `<div><b>${av.ppg}</b><span>PPG</span></div><div><b>${av.rpg}</b><span>RPG</span></div>
     <div><b>${av.apg}</b><span>APG</span></div>` : '';
  document.getElementById('modal-hero-acc').innerHTML = (c.accolades || []).slice(0, 4).map(a => `<span>${a}</span>`).join('');

  document.getElementById('modal-rarity-badge').textContent = RARITY_LABELS[c.rarity] + (serialText(c) ? ' · ' + serialText(c) : '');
  document.getElementById('modal-rarity-badge').className = `modal-rarity-badge rarity-badge-${c.rarity}`;
  const pin = document.getElementById('modal-pin');
  pin.classList.toggle('active', Store.isShowcased(c.uid));
  pin.style.display = c.uid ? '' : 'none';
  document.getElementById('modal-counter').textContent = `${modalIdx + 1} / ${modalList.length}`;
}
function flipModalCard() { modalFlipped = !modalFlipped; document.getElementById('modal-card').classList.toggle('flipped', modalFlipped); }
function modalNav(d) { modalIdx = (modalIdx + d + modalList.length) % modalList.length; modalFlipped = false; renderModal(); }
function modalTogglePin() { const c = modalList[modalIdx]; if (c.uid) { Store.toggleShowcase(c.uid); renderModal(); } }
function closeCardModal() { document.getElementById('card-modal').classList.add('hidden'); document.removeEventListener('keydown', modalKeys); }
function modalKeys(e) {
  if (e.key === 'Escape') closeCardModal();
  else if (e.key === 'ArrowLeft') modalNav(-1);
  else if (e.key === 'ArrowRight') modalNav(1);
  else if (e.key.toLowerCase() === 'f') flipModalCard();
}

/* ── Export / import ──────────────────────────────────────────────────────── */
function exportCollection() {
  const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'hoops-collection.json';
  a.click();
  toast('Collection exported');
}
function importCollection(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => { try { Store.importJSON(r.result); toast('Collection imported'); renderCollection(); } catch (e) { toast('Import failed: ' + e.message); } };
  r.readAsText(file);
}
