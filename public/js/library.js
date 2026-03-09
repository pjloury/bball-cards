/* ── Library / Collection View ───────────────────────────────────────────── */

let allCollectionCards = [];

async function initLibrary() {
  updateBadge();
  allCollectionCards = getLocalCollection();

  const grid  = document.getElementById('library-grid');
  const empty = document.getElementById('library-empty');

  if (allCollectionCards.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  renderLibrary();
}

function filterLibrary() {
  renderLibrary();
}

function renderLibrary() {
  const search   = (document.getElementById('search-input').value || '').toLowerCase();
  const rarity   = document.getElementById('filter-rarity').value;
  const position = document.getElementById('filter-position').value;
  const sortBy   = document.getElementById('sort-by').value;

  let cards = [...allCollectionCards];

  // Filter
  if (search) {
    cards = cards.filter(c =>
      (c.name  || '').toLowerCase().includes(search) ||
      (c.team  || '').toLowerCase().includes(search) ||
      (c.team_short || '').toLowerCase().includes(search)
    );
  }
  if (rarity)   cards = cards.filter(c => c.rarity   === rarity);
  if (position) cards = cards.filter(c => c.position === position);

  // Sort
  if (sortBy === 'name')   cards.sort((a,b) => (a.name||'').localeCompare(b.name||''));
  if (sortBy === 'team')   cards.sort((a,b) => (a.team||'').localeCompare(b.team||''));
  if (sortBy === 'rarity') {
    const order = { prismatic:0, gold:1, silver:2, common:3 };
    cards.sort((a,b) => (order[a.rarity]||3) - (order[b.rarity]||3));
  }
  // 'recent' = default order (already newest-first from getLocalCollection)

  const grid  = document.getElementById('library-grid');
  const empty = document.getElementById('library-empty');

  if (cards.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:80px 20px;color:#8888aa">
        <div style="font-size:48px;margin-bottom:16px">🔍</div>
        <div style="font-size:18px">No cards match your filters.</div>
      </div>`;
    return;
  }

  empty.classList.add('hidden');

  grid.innerHTML = cards.map((card, i) => {
    const rarity = card.rarity || 'common';
    return `
      <div class="lib-card-wrapper rarity-${rarity}"
           style="animation:tray-pop 0.35s ${Math.min(i*0.04, 0.8)}s both cubic-bezier(0.22,1,0.36,1)"
           onclick="openLibraryCard(${i})"
           data-idx="${i}">
        ${buildLibraryCardHTML(card)}
        <div class="lib-card-meta">
          <div class="lib-card-name">${card.name || ''}</div>
          <div class="lib-card-team">${card.team_short || card.team || ''}</div>
          <div class="lib-card-rarity rarity-text-${rarity}">${rarityIcon(rarity)} ${rarity.toUpperCase()}</div>
        </div>
      </div>`;
  }).join('');

  // Keep track of the filtered order for modal navigation
  window._filteredCards = cards;

  // Hydrate action shots for library cards (front-only view)
  (async () => {
    for (const card of cards) {
      const nbaId = card.nba_id || card.nbaId;
      if (!nbaId) continue;
      const els = grid.querySelectorAll(`img[data-nba-id="${nbaId}"]`);
      if (!els.length) continue;
      const blobUrl = await ensurePhotoBlob(nbaId, 'action');
      els.forEach(img => { img.src = blobUrl; });
      await new Promise(r => setTimeout(r, 20)); // yield to keep UI smooth
    }
  })();
}

function rarityIcon(r) {
  return { prismatic:'✨', gold:'🥇', silver:'🥈', common:'⚪' }[r] || '';
}

async function openLibraryCard(idx) {
  const cards = window._filteredCards || allCollectionCards;
  const card  = cards[idx];
  if (!card) return;
  await openCardModal(card);
}

// ── Inject lib card meta styles ───────────────────────────────────────────────
(function injectLibStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .lib-card-wrapper {
      display: flex;
      flex-direction: column;
      gap: 8px;
      cursor: pointer;
      transition: transform 0.2s;
      opacity: 0;  /* will animate in */
    }
    .lib-card-wrapper:hover { transform: translateY(-6px) scale(1.02); }
    .lib-card-meta { padding: 0 2px; }
    .lib-card-name {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: #e8e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .lib-card-team {
      font-size: 11px;
      color: #8888aa;
      font-family: 'Barlow Condensed', sans-serif;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .lib-card-rarity {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-top: 2px;
    }
    .rarity-text-common   { color: #aaa; }
    .rarity-text-silver   { color: #C0C0C0; }
    .rarity-text-gold     { color: #FFD700; }
    .rarity-text-prismatic{ color: #a855f7; }
  `;
  document.head.appendChild(style);
})();
