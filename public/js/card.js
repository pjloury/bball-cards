/* ── card.js — card HTML builders (Topps-Chrome aesthetic) ──────────────────
   A "card" here is a player record merged with mint metadata:
     { ...player, rarity, serial, edition, uid }
   Class names match card.css (preserved & extended from v1).
   ──────────────────────────────────────────────────────────────────────── */

function darken(hex, pct) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (n >> 16) - pct * 2);
  const g = Math.max(0, ((n >> 8) & 0xFF) - pct * 2);
  const b = Math.max(0, (n & 0xFF) - pct * 2);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
function isLight(hex) {
  const n = parseInt((hex || '#000000').replace('#', ''), 16);
  return ((n >> 16) * 299 + ((n >> 8) & 0xFF) * 587 + (n & 0xFF) * 114) / 1000 > 130;
}
function teamGradient(p, s) {
  return `linear-gradient(160deg, ${p} 0%, ${darken(p, 20)} 42%, ${s}33 100%)`;
}
const isLongName = n => n && n.length > 18;
function serialText(c) {
  if (!c.serial || !c.edition) return '';
  return `#${c.serial.toLocaleString()}/${c.edition.toLocaleString()}`;
}

function buildCardFrontHTML(c, size = 'default') {
  const rarity = c.rarity || 'common';
  const primary = c.teamPrimary || '#1a1a40';
  const secondary = c.teamSecondary || '#f7a900';
  const jersey = c.jersey != null ? c.jersey : '';
  const cardNum = String(c.id).padStart(3, '0');
  const name = c.name || '';
  const serial = serialText(c);
  const isMoment = !!c.action;   // real action photo available → full-bleed "moment" front

  // Photo layer: full-bleed action shot, else the transparent cutout.
  const photoLayer = isMoment
    ? `<div class="card-action-photo">
         <img src="${photoAction(c.nbaId)}" alt="${name}" loading="lazy"
              onerror="this.closest('.card-face-front').classList.remove('moment');this.remove()" />
       </div>
       <div class="card-moment-scrim"></div>`
    : `<div class="card-player-photo">
         <img src="${photoFront(c.nbaId)}" alt="${name}" loading="lazy"
              onerror="this.onerror=null;this.src='/img/player-silhouette.svg';this.style.opacity='0.4'" />
       </div>`;

  return `
    <div class="card-face card-face-front rarity-${rarity}${isMoment ? ' moment' : ''}">
      <div class="card-front-inner" style="background:${teamGradient(primary, secondary)}">
        <div class="card-chrome-border"></div>
        <div class="card-design-layer"></div>
        ${photoLayer}
        <div class="card-accent-bar" style="background:${secondary}"></div>
        <div class="card-corner-tl"></div>
        <div class="card-corner-tr"></div>
        <div class="card-set-badge">2025–26 HOOPS ELITE · ${RARITY_LABELS[rarity]}</div>
        <div class="card-jersey-num">#${jersey}</div>
        ${serial ? `<div class="card-serial-badge rarity-${rarity}">${serial}</div>` : ''}
        <div class="card-info-bar">
          <div class="card-position-tag" style="background:${secondary};color:${isLight(secondary) ? '#111' : '#fff'}">${c.position || ''}</div>
          <div class="card-player-name${isLongName(name) ? ' long' : ''}">${name}</div>
          <div class="card-team-name">${c.team || ''}</div>
        </div>
        <div class="card-number-badge">#${cardNum}</div>
      </div>
    </div>`;
}

function buildCardBackHTML(c) {
  const rarity = c.rarity || 'common';
  const primary = c.teamPrimary || '#1a1a40';
  const cardNum = String(c.id).padStart(3, '0');
  const stats = Array.isArray(c.careerStats) ? c.careerStats : [];
  const serial = serialText(c);
  const acc = Array.isArray(c.accolades) ? c.accolades : [];

  return `
    <div class="card-face card-face-back rarity-${rarity}">
      <div class="card-back-inner">
        <div class="card-back-header-stripe" style="background:${primary}"></div>
        <div class="card-back-top">
          <div class="card-back-headshot"><img src="${photoFront(c.nbaId)}" alt="${c.name}"
               onerror="this.style.opacity='0.3'" /></div>
          <div class="card-back-name-block">
            <div class="card-back-team">${c.team || ''} · #${c.jersey}</div>
            <div class="card-back-name">${c.name || ''}</div>
            <div class="card-back-bio-grid">
              ${bioRow('HT', c.height)}${bioRow('WT', c.weight)}
              ${bioRow('POS', c.position)}${bioRow('AGE', c.age)}
              ${bioRow('FROM', c.birthplace)}${bioRow('EXP', c.experience != null ? c.experience + ' yrs' : '')}
              ${bioRow('COLLEGE', shorten(c.college, 22))}${bioRow('DRAFT', c.draft)}
            </div>
          </div>
        </div>
        ${acc.length ? `<div class="card-back-accolades">${acc.map(a => `<span class="accolade">${a}</span>`).join('')}</div>` : ''}
        ${c.bio ? `<div class="card-back-bio-text">${c.bio}</div>` : ''}
        <div class="card-back-stats">
          <div class="card-back-stats-title" style="background:${primary}">CAREER — REGULAR SEASON <span class="career-high-key">◆ career high</span></div>
          <div class="stats-table-wrap">${buildStatsTable(stats)}</div>
        </div>
        <div class="card-back-footer">
          <span class="card-back-card-num">${serial || '#' + cardNum}</span>
          <div class="card-back-rarity-dot rarity-dot-${rarity}"></div>
          <span class="card-back-set-name">2025–26 Hoops Elite</span>
        </div>
      </div>
    </div>`;
}

function bioRow(label, val) {
  if (val === '' || val == null) return '';
  return `<div class="card-back-bio-item"><strong>${label}</strong> ${val}</div>`;
}
function shorten(s, n) { return s && s.length > n ? s.slice(0, n - 1) + '…' : s; }

function buildStatsTable(stats) {
  if (!stats.length) return '<p class="stats-empty">Career stats unavailable</p>';
  const cols = [
    { k: 'season', l: 'YEAR' }, { k: 'team', l: 'TM' }, { k: 'gp', l: 'GP' }, { k: 'mpg', l: 'MPG' },
    { k: 'ppg', l: 'PPG', hi: 1 }, { k: 'rpg', l: 'RPG', hi: 1 }, { k: 'apg', l: 'APG', hi: 1 },
    { k: 'spg', l: 'SPG', hi: 1 }, { k: 'bpg', l: 'BPG', hi: 1 },
    { k: 'fgPct', l: 'FG%', hi: 1, pct: 1 }, { k: 'threePct', l: '3P%', hi: 1, pct: 1 }, { k: 'ftPct', l: 'FT%', hi: 1, pct: 1 },
  ];
  const elig = stats.filter(s => s.gp >= 20);
  const highs = {};
  for (const c of cols) if (c.hi) highs[c.k] = Math.max(0, ...elig.map(s => s[c.k] || 0));

  const header = cols.map(c => `<th>${c.l}</th>`).join('');
  const rows = stats.map(s => {
    const cells = cols.map(c => {
      let v = s[c.k];
      let disp = v == null ? '—' : v;
      if (c.pct) disp = v ? v.toFixed(1) : '—';
      else if (typeof v === 'number' && c.k !== 'gp') disp = v.toFixed(1);
      const isHigh = c.hi && v && highs[c.k] && v === highs[c.k] && v > 0;
      return `<td class="${isHigh ? 'career-high' : ''}">${disp}</td>`;
    }).join('');
    return `<tr class="${s.current ? 'current-season' : ''}">${cells}</tr>`;
  }).join('');
  return `<table class="stats-table"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`;
}

/* Library grid card (front only). */
function buildLibraryCardHTML(c) {
  return `<div class="card-outer library-card rarity-${c.rarity}"><div class="card-3d">${buildCardFrontHTML(c, 'library')}</div></div>`;
}
