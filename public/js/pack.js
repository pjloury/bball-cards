/* ── Pack Opening Logic ────────────────────────────────────────────────────── */

let packCards   = [];   // the 5 card objects fetched from API
let revealIndex = 0;    // which card we're on (0–4)

// ── Init pack view ────────────────────────────────────────────────────────────
async function initPack() {
  // Reset state
  packCards   = [];
  revealIndex = 0;

  // Show correct stage
  if (canOpenPackToday()) {
    showPackStage('sealed');
  } else {
    showPackStage('wait');
    startWaitTimer();
  }
}

function showPackStage(name) {
  ['sealed','wait','reveal'].forEach(s => {
    const el = document.getElementById('stage-' + s);
    if (el) el.classList.toggle('hidden', s !== name);
  });
}

// ── Tear open animation ────────────────────────────────────────────────────────
async function tearOpenPack() {
  if (!canOpenPackToday()) {
    showPackStage('wait');
    startWaitTimer();
    return;
  }

  const btn = document.getElementById('tear-open-btn');
  btn.disabled = true;
  btn.textContent = 'Opening...';

  // Animate pack flying away
  const wrapper = document.getElementById('pack-wrapper');
  wrapper.classList.add('pack-tear-out');

  // Fetch cards from API simultaneously
  let cards;
  try {
    const data = await fetch('/api/pack/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ID }),
    }).then(r => {
      if (r.status === 429) {
        // Already opened today — race condition
        showPackStage('wait');
        startWaitTimer();
        throw new Error('already opened');
      }
      if (!r.ok) throw new Error('Server error');
      return r.json();
    });
    cards = data.cards;
  } catch (err) {
    if (err.message === 'already opened') return;
    showToast('⚠️ Could not connect to server. Check that the app is running.');
    btn.disabled = false;
    btn.textContent = 'TEAR OPEN PACK';
    wrapper.classList.remove('pack-tear-out');
    return;
  }

  packCards = cards;

  // Record pack opened
  setLastPackDate();
  incPacksOpened();
  updateBadge();

  // Wait for pack animation
  await delay(600);

  // Switch to reveal stage
  showPackStage('reveal');
  initRevealStage();
}

// ── Reveal stage setup ────────────────────────────────────────────────────────
function initRevealStage() {
  revealIndex = 0;

  // Build progress dots
  const dotsEl = document.getElementById('reveal-dots');
  dotsEl.innerHTML = '';
  packCards.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'reveal-dot pending';
    dot.id = `dot-${i}`;
    dotsEl.appendChild(dot);
  });

  // Clear tray
  document.getElementById('revealed-tray').innerHTML = '';
  document.getElementById('reveal-actions').style.display = 'none';

  // Show the first unrevealed card
  showNextUnrevealedCard();
}

function showNextUnrevealedCard() {
  const slot = document.getElementById('unrevealed-slot');
  const card = document.getElementById('unrevealed-card');

  if (revealIndex >= packCards.length) {
    // All revealed
    slot.style.display = 'none';
    document.getElementById('reveal-hint').textContent = 'All cards revealed! Add them to your collection.';
    document.getElementById('reveal-actions').style.display = 'flex';
    return;
  }

  slot.style.display = 'flex';
  card.classList.remove('flip-away', 'slide-in');
  void card.offsetWidth; // force reflow
  card.classList.add('slide-in');

  document.getElementById('reveal-hint').textContent =
    `Card ${revealIndex + 1} of ${packCards.length} — Click to reveal!`;

  // Update dots
  packCards.forEach((_, i) => {
    const dot = document.getElementById(`dot-${i}`);
    if (!dot) return;
    dot.className = 'reveal-dot';
    if (i < revealIndex)  dot.classList.add('revealed');
    else if (i === revealIndex) dot.classList.add('pending');
  });
}

// ── Reveal a single card ──────────────────────────────────────────────────────
async function revealCurrentCard() {
  if (revealIndex >= packCards.length) return;

  const cardData = packCards[revealIndex];
  const unrevealedCard = document.getElementById('unrevealed-card');

  // Animate the back face flipping away
  unrevealedCard.classList.add('flip-away');

  // Sparkle at card center
  const rect = unrevealedCard.getBoundingClientRect();
  const cx   = rect.left + rect.width  / 2;
  const cy   = rect.top  + rect.height / 2;
  sparkle(cx, cy, cardData.rarity);

  await delay(300);

  // Show full revealed card in an overlay momentarily, then move to tray
  showRevealedCardAnimation(cardData, cx, cy);

  // Mark dot as revealed
  const dot = document.getElementById(`dot-${revealIndex}`);
  if (dot) { dot.className = 'reveal-dot revealed'; }

  revealIndex++;
  await delay(700);
  showNextUnrevealedCard();
}

async function showRevealedCardAnimation(card, cx, cy) {
  // Create a temporary full-size card in the center for the "wow" moment
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;
    inset:0;
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:1500;
    pointer-events:none;
  `;
  overlay.innerHTML = `
    <div class="card-outer rarity-${card.rarity}"
         style="width:220px;height:308px;
                animation:tray-pop 0.4s cubic-bezier(0.22,1,0.36,1) forwards;
                filter:drop-shadow(0 20px 60px rgba(0,0,0,0.8))">
      ${buildCardFrontHTML(card, 'default')}
    </div>
  `;
  document.body.appendChild(overlay);

  // Rarity announcement
  const rarityText = { common:'', silver:'🥈 SILVER CHROME!', gold:'🥇 GOLD!', prismatic:'✨ PRISMATIC! ✨' };
  if (rarityText[card.rarity]) showToast(rarityText[card.rarity], 2500);

  await delay(1200);
  overlay.remove();

  // Add to the tray
  const tray = document.getElementById('revealed-tray');
  const miniCard = buildMiniRevealCard(card);
  miniCard.classList.add('revealed-mini');
  miniCard.onclick = () => openCardModal(card);
  tray.appendChild(miniCard);
}

// ── Add entire pack to collection ──────────────────────────────────────────────
async function addPackToCollection() {
  const btn = document.querySelector('#reveal-actions .btn-primary');
  btn.disabled = true;
  btn.textContent = 'Adding...';

  // Save to localStorage
  addToLocalCollection(packCards.map(c => ({
    id:           c.id,
    nba_id:       c.nba_id || c.nbaId,
    name:         c.name,
    team:         c.team,
    team_short:   c.team_short,
    team_primary: c.team_primary,
    team_secondary: c.team_secondary,
    jersey:       c.jersey,
    position:     c.position,
    card_number:  c.card_number,
    rarity:       c.rarity,
  })));

  // Also sync to server (best-effort)
  try {
    await fetch('/api/collection/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: SESSION_ID,
        cards: packCards.map(c => ({ playerId: c.id, rarity: c.rarity })),
      }),
    });
  } catch { /* offline — localStorage already has it */ }

  updateBadge();
  showToast(`✅ ${packCards.length} cards added to your collection!`);

  await delay(600);
  showView('library');
}

// ── Wait timer ────────────────────────────────────────────────────────────────
function startWaitTimer() {
  const el = document.getElementById('wait-timer');
  if (!el) return;
  const tick = () => { el.textContent = formatCountdown(msUntilMidnight()); };
  tick();
  if (window._waitTimer) clearInterval(window._waitTimer);
  window._waitTimer = setInterval(tick, 1000);
}

// ── Utility ───────────────────────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
