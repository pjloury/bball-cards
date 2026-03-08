/* ── Card HTML builders ───────────────────────────────────────────────────── */

const RARITY_LABELS = { common:'COMMON', silver:'SILVER CHROME', gold:'GOLD CHROME', prismatic:'PRISMATIC' };

function photoUrl(nbaId) {
  return `https://cdn.nba.com/headshots/nba/latest/1040x760/${nbaId}.png`;
}

// Return the gradient/bg style string for a card front based on team colors
function teamGradient(primary, secondary) {
  return `linear-gradient(160deg, ${primary} 0%, ${darken(primary, 20)} 40%, ${secondary}33 100%)`;
}

function darken(hex, pct) {
  const n = parseInt(hex.replace('#',''), 16);
  const r = Math.max(0, (n>>16) - pct*2);
  const g = Math.max(0, ((n>>8)&0xFF) - pct*2);
  const b = Math.max(0, (n&0xFF) - pct*2);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function isLongName(name) { return name && name.length > 18; }

/* ── buildCardFrontHTML ──────────────────────────────────────────────────────
   Works for mini (library/recent), default (pack reveal), and full (modal)
   The .card-outer sizing class must be applied by the caller.
*/
function buildCardFrontHTML(player, size = 'default') {
  const rarity   = player.rarity || 'common';
  const primary  = player.team_primary  || '#1a1a40';
  const secondary= player.team_secondary|| '#f7a900';
  const nbaId    = player.nba_id || player.nbaId || 0;
  const jersey   = player.jersey !== undefined ? player.jersey : '';
  const position = player.position || '';
  const cardNum  = player.card_number  || String(player.id).padStart(3,'0');
  const name     = player.name || '';

  return `
    <div class="card-face card-face-front rarity-${rarity}">
      <div class="card-front-inner"
           style="background:${teamGradient(primary, secondary)}">

        <!-- Chrome rarity border -->
        <div class="card-chrome-border"></div>

        <!-- Design layer (gradient overlay + angled shape) -->
        <div class="card-design-layer"></div>

        <!-- Accent bar line (team secondary) -->
        <div class="card-accent-bar" style="background:${secondary}"></div>

        <!-- Corner ornaments -->
        <div class="card-corner-tl"></div>
        <div class="card-corner-tr"></div>

        <!-- Set name badge -->
        <div class="card-set-badge">2025–26 HOOPS ELITE · ${RARITY_LABELS[rarity]}</div>

        <!-- Player photo -->
        <div class="card-player-photo">
          <img
            src="${photoUrl(nbaId)}"
            data-nba-id="${nbaId}"
            alt="${name}"
            onerror="this.style.opacity='0.3'; this.src='/img/player-silhouette.png'"
            crossorigin="anonymous"
          />
        </div>

        <!-- Jersey number (large, translucent, behind info bar) -->
        <div class="card-jersey-num">#${jersey}</div>

        <!-- Info bar -->
        <div class="card-info-bar">
          <div class="card-position-tag"
               style="background:${secondary}; color:${isLight(secondary)?'#111':'#fff'}">
            ${position}
          </div>
          <div class="card-player-name${isLongName(name)?' long':''}">${name}</div>
          <div class="card-team-name">${player.team || ''}</div>
        </div>

        <!-- Card number -->
        <div class="card-number-badge">#${cardNum}</div>
      </div>
    </div>
  `;
}

function isLight(hex) {
  const n = parseInt((hex||'#000000').replace('#',''), 16);
  const r = n >> 16, g = (n>>8)&0xFF, b = n&0xFF;
  return (r*299 + g*587 + b*114) / 1000 > 128;
}

/* ── buildCardBackHTML ────────────────────────────────────────────────────── */
function buildCardBackHTML(player) {
  const rarity   = player.rarity || 'common';
  const primary  = player.team_primary  || '#1a1a40';
  const secondary= player.team_secondary|| '#f7a900';
  const nbaId    = player.nba_id || player.nbaId || 0;
  const cardNum  = player.card_number || String(player.id).padStart(3,'0');

  // League leader stat keys (for 2024-25)
  const leaders = Array.isArray(player.league_leaders) ? player.league_leaders : [];

  // Career stats
  const stats = Array.isArray(player.career_stats) ? player.career_stats : [];

  return `
    <div class="card-face card-face-back rarity-${rarity}">
      <div class="card-back-inner">

        <!-- Team color stripe -->
        <div class="card-back-header-stripe" style="background:${primary}"></div>

        <!-- Player header -->
        <div class="card-back-top">
          <div class="card-back-headshot">
            <img src="${photoUrl(nbaId)}" data-nba-id="${nbaId}" alt="${player.name}"
              onerror="this.style.opacity='0.3'" crossorigin="anonymous" />
          </div>
          <div class="card-back-name-block">
            <div class="card-back-team">${player.team || ''} · #${player.jersey}</div>
            <div class="card-back-name">${player.name || ''}</div>
            <div class="card-back-bio-grid">
              ${bioRow('HT', player.height)}
              ${bioRow('WT', player.weight)}
              ${bioRow('POS', player.position)}
              ${bioRow('BORN', formatBorn(player.born))}
              ${bioRow('COLLEGE', player.college)}
              ${bioRow('DRAFT', formatDraft(player.draft))}
            </div>
          </div>
        </div>

        <!-- Short bio -->
        ${player.bio ? `<div class="card-back-bio-text">${player.bio}</div>` : ''}

        <!-- Stats table -->
        <div class="card-back-stats">
          <div class="card-back-stats-title" style="background:${primary}">
            CAREER STATISTICS — REGULAR SEASON
            ${leaders.length ? ` · <span style="color:#ff9999">★ = League Leader (2024–25)</span>` : ''}
          </div>
          <div class="stats-table-wrap">
            ${buildStatsTable(stats, leaders)}
          </div>
        </div>

        <!-- Footer -->
        <div class="card-back-footer">
          <span class="card-back-card-num">#${cardNum}/100</span>
          <div class="card-back-rarity-dot rarity-dot-${rarity}"></div>
          <span class="card-back-set-name">2025–26 Hoops Elite</span>
        </div>

      </div>
    </div>
  `;
}

function bioRow(label, val) {
  if (!val) return '';
  return `<div class="card-back-bio-item"><strong>${label}:</strong> ${val}</div>`;
}

function formatBorn(born) {
  if (!born) return '';
  // Truncate long birth strings
  return born.length > 20 ? born.slice(0, 20) + '…' : born;
}

function formatDraft(draft) {
  if (!draft) return 'Undrafted';
  // shorten e.g. "2003 NBA Draft, Round 1, Pick 1 (Cleveland Cavaliers)"
  const m = draft.match(/(\d{4}).*?Pick\s+(\d+)/i);
  if (m) return `${m[1]} Rd1 · #${m[2]}`;
  return draft.slice(0, 22);
}

/* ── Stats table ─────────────────────────────────────────────────────────── */
function buildStatsTable(stats, leaders) {
  if (!stats || stats.length === 0) {
    return '<p style="text-align:center;padding:12px;font-size:9px;color:#888">Stats loading...</p>';
  }

  // Column definitions
  const cols = [
    { key:'season',   label:'YEAR'  },
    { key:'team',     label:'TM'    },
    { key:'gp',       label:'GP'    },
    { key:'mpg',      label:'MPG'   },
    { key:'ppg',      label:'PPG',  leader:'ppg'     },
    { key:'rpg',      label:'RPG',  leader:'rpg'     },
    { key:'apg',      label:'APG',  leader:'apg'     },
    { key:'spg',      label:'SPG',  leader:'spg'     },
    { key:'bpg',      label:'BPG',  leader:'bpg'     },
    { key:'fgPct',    label:'FG%',  leader:'fgPct'   },
    { key:'threePct', label:'3P%',  leader:'threePct'},
    { key:'ftPct',    label:'FT%',  leader:'ftPct'   },
  ];

  const header = cols.map(c => `<th>${c.label}</th>`).join('');

  const rows = stats.map(s => {
    const isCurrent = s.current;
    const cells = cols.map(c => {
      const val = s[c.key];
      let display = val !== undefined && val !== null ? val : '—';
      if (c.key === 'fgPct' || c.key === 'threePct' || c.key === 'ftPct') {
        display = val ? val.toFixed(1) : '—';
      }
      // Highlight red if this player is league leader AND this is 2024-25 season
      const isLeader = c.leader && leaders.includes(c.leader) && (s.season === '2024-25' || s.season === '2025-26' && isCurrent);
      return `<td class="${isLeader ? 'league-leader' : ''}">${display}</td>`;
    }).join('');
    return `<tr class="${isCurrent ? 'current-season' : ''}">${cells}</tr>`;
  }).join('');

  return `
    <table class="stats-table">
      <thead><tr>${header}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

/* ── buildLibraryCardHTML ────────────────────────────────────────────────────
   Returns the full card-outer HTML for the library grid.
*/
function buildLibraryCardHTML(card) {
  const rarity = card.rarity || 'common';
  return `
    <div class="card-outer library-card rarity-${rarity}">
      <div class="card-3d">
        ${buildCardFrontHTML(card, 'library')}
      </div>
    </div>
  `;
}

/* ── buildMiniRevealCard ─────────────────────────────────────────────────────
   Small card shown in the revealed tray during pack opening.
*/
function buildMiniRevealCard(card) {
  const rarity = card.rarity || 'common';
  const el = document.createElement('div');
  el.className = `card-outer mini rarity-${rarity}`;
  el.innerHTML = buildCardFrontHTML(card, 'mini');
  return el;
}
