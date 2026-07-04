/* ── pack.js — daily pack open + one-by-one reveal ──────────────────────── */

const PACK_SIZE = 5;
let packCards = [];       // the 5 cards this pack
let revealIdx = 0;        // how many revealed

/* Roll a fresh pack of 5 unique players with per-card rarity + serial. */
function rollPack() {
  const pool = [...DATA.players];
  const cards = [];
  for (let i = 0; i < PACK_SIZE; i++) {
    const player = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const rarity = rollRarity();
    cards.push({
      uid: uid(), playerId: player.id, nbaId: player.nbaId,
      rarity, serial: rollSerial(rarity), edition: RARITY[rarity].edition,
      obtainedAt: new Date().toISOString(),
      // denormalized player fields for rendering
      ...player,
    });
  }
  // Sort so the best card is revealed LAST (build suspense)
  cards.sort((a, b) => (RARITY[a.rarity].order - RARITY[b.rarity].order) || (b.serial - a.serial));
  return cards;
}

/* Entry point when Pack view is shown. */
function initPackView() {
  showStage(Store.canOpenToday() ? 'sealed' : 'wait');
  if (!Store.canOpenToday()) startWaitTimer();
  renderPackOdds();
}

function showStage(name) {
  for (const s of ['sealed', 'wait', 'reveal']) {
    document.getElementById(`stage-${s}`).classList.toggle('hidden', s !== name);
  }
}

function renderPackOdds() {
  const el = document.getElementById('pack-odds');
  if (!el) return;
  el.innerHTML = RARITIES.slice().reverse().map(r =>
    `<div class="odds-row"><span class="odds-dot rarity-dot-${r.key}"></span>
       <span class="odds-label">${r.label}</span>
       <span class="odds-pct">${r.weight}% · /${r.edition.toLocaleString()}</span></div>`).join('');
}

/* Tear the pack open → go to reveal stage. */
function tearOpenPack() {
  if (!Store.canOpenToday()) { showStage('wait'); startWaitTimer(); return; }
  const wrap = document.getElementById('pack-wrapper');
  wrap.classList.add('tearing');
  packCards = rollPack();
  revealIdx = 0;
  setTimeout(() => {
    showStage('reveal');
    setupReveal();
  }, 850);
}

function setupReveal() {
  const dots = document.getElementById('reveal-dots');
  dots.innerHTML = packCards.map((_, i) => `<span class="rdot" data-i="${i}"></span>`).join('');
  document.getElementById('revealed-tray').innerHTML = '';
  document.getElementById('reveal-actions').style.display = 'none';
  document.getElementById('reveal-hint').textContent = 'Tap the pack to reveal your first card';
  const slot = document.getElementById('unrevealed-slot');
  slot.style.display = '';
  slot.classList.remove('gone');
}

/* Reveal the next card in the pack. */
function revealCurrentCard() {
  if (revealIdx >= packCards.length) return;
  const card = packCards[revealIdx];

  // Flash effect scaled to rarity
  const flash = document.getElementById('reveal-flash');
  flash.className = `reveal-flash flash-${card.rarity} show`;
  setTimeout(() => flash.classList.remove('show'), 700);

  // Big center reveal
  const stage = document.getElementById('reveal-center');
  stage.innerHTML = `<div class="card-outer full reveal-pop rarity-${card.rarity}"><div class="card-3d">${buildCardFrontHTML(card)}</div></div>`;
  if (card.rarity === 'gold' || card.rarity === 'prismatic') spawnSparkles(stage);

  // Add mini to tray
  const tray = document.getElementById('revealed-tray');
  const mini = document.createElement('div');
  mini.className = `card-outer mini rarity-${card.rarity}`;
  mini.innerHTML = `<div class="card-3d">${buildCardFrontHTML(card, 'mini')}</div>`;
  mini.onclick = () => openCardModal(card, packCards);
  tray.appendChild(mini);

  // Mark dot
  const dot = document.querySelector(`.rdot[data-i="${revealIdx}"]`);
  if (dot) dot.className = `rdot filled rarity-dot-${card.rarity}`;

  revealIdx++;

  if (revealIdx >= packCards.length) {
    document.getElementById('unrevealed-slot').classList.add('gone');
    document.getElementById('reveal-hint').textContent = `You pulled ${packCards.length} cards!`;
    const best = packCards.reduce((a, b) => cardBetter(a, b));
    if (best.rarity === 'gold' || best.rarity === 'prismatic')
      document.getElementById('reveal-hint').textContent = `🔥 ${RARITY_LABELS[best.rarity]} ${best.name} pulled!`;
    document.getElementById('reveal-actions').style.display = 'flex';
  } else {
    document.getElementById('reveal-hint').textContent = `${packCards.length - revealIdx} card${packCards.length - revealIdx > 1 ? 's' : ''} left — tap to reveal`;
  }
}

function spawnSparkles(container) {
  for (let i = 0; i < 18; i++) {
    const s = document.createElement('span');
    s.className = 'sparkle';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.animationDelay = Math.random() * 0.4 + 's';
    container.appendChild(s);
    setTimeout(() => s.remove(), 1400);
  }
}

/* Reveal all remaining at once. */
function revealAll() { while (revealIdx < packCards.length) revealCurrentCard(); }

/* Commit the pack to the collection. */
function addPackToCollection() {
  Store.addCards(packCards.map(c => ({
    uid: c.uid, playerId: c.playerId, rarity: c.rarity, serial: c.serial,
    edition: c.edition, obtainedAt: c.obtainedAt,
  })));
  Store.recordPackOpened();
  toast(`Added ${packCards.length} cards to your collection!`);
  showView('collection');
}

/* Countdown to next pack. */
let waitTimer = null;
function startWaitTimer() {
  clearInterval(waitTimer);
  const tick = () => {
    const el = document.getElementById('wait-timer');
    if (!el) return clearInterval(waitTimer);
    const ms = Store.nextPackTime() - new Date();
    if (ms <= 0) { clearInterval(waitTimer); initPackView(); return; }
    el.textContent = fmtCountdown(ms);
  };
  tick();
  waitTimer = setInterval(tick, 1000);
}
function fmtCountdown(ms) {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}
