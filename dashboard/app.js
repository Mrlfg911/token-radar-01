// Token Radar — the page. Reads window.RADAR (written by main.ts), renders the board, the
// calibration table, the live-token set, and a detail drawer per protocol. No network, no framework.

const D = window.RADAR;
if (!D) throw new Error('Token Radar: window.RADAR is missing; ../data.js did not load');

/* ---------- formatting ---------- */
const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const nf = new Intl.NumberFormat('en-US');

/** A short money figure: $2.75B, $499.1M, $84.0k. */
function usd(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(a >= 1e8 ? 0 : 1)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

/** A full money figure with every digit, for the detail view. */
function usdFull(n) {
  return n === null || n === undefined || !Number.isFinite(n) ? '—' : usd0.format(Math.round(n));
}

function pct(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const s = n > 0 ? '+' : '';
  return `${s}${n.toFixed(2)}%`;
}

function ageText(days, known) {
  if (!known || days === null) return 'unknown';
  if (days < 60) return `${days}d`;
  if (days < 730) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ---------- header + hero ---------- */
document.getElementById('ver').textContent = D.model_version;

const maxVal = D.rows.reduce((m, r) => Math.max(m, r.implied_value_usd), 1);

document.getElementById('meta').innerHTML = [
  ['Snapshot', D.as_of],
  ['Source', 'DefiLlama protocol index'],
  ['Model', D.model_version],
].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');

const top10 = Math.round(D.top10_tvl_share * 100);
document.getElementById('dek').textContent =
  `${D.board_size} protocols with no token on record, ranked by what a launch would plausibly be worth. ` +
  `${D.watchlist_size} of them clear the snapshot's own watchlist floor of ${usd(D.floor_usd)}; ` +
  `the other ${D.early_size} are below it and are the ones a radar is for.`;

document.getElementById('stats').innerHTML = [
  ['Watchlist covered', `${D.watchlist_size} / ${D.watchlist_size}`, 'every slug the snapshot names'],
  ['Rows ranked', nf.format(D.board_size), `${D.early_size} below the floor`],
  ['Top-10 TVL share', `${top10}%`, 'how concentrated the opportunity is'],
  ['Categories priced', String(D.calibration.length), 'model vs. market, below'],
]
  .map(
    ([k, v, n]) =>
      `<div class="stat"><p class="k">${esc(k)}</p><p class="v">${esc(v)}</p><p class="n">${esc(n)}</p></div>`,
  )
  .join('');

document.getElementById('src').textContent = `Data: ${D.source}. Floor: ${usdFull(D.floor_usd)} of TVL.`;

/* ---------- state ---------- */
const state = { q: '', cat: '', chain: '', set: 'pre', sort: 'implied_value_usd', dir: -1 };

/* ---------- filter option lists ---------- */
const cats = [...new Set(D.rows.map((r) => r.category ?? 'Uncategorised'))].sort();
const chains = [...new Set(D.rows.flatMap((r) => r.chains))].sort();
const catSel = document.getElementById('cat');
for (const c of cats) catSel.append(new Option(c, c));
const chainSel = document.getElementById('chain');
for (const c of chains) chainSel.append(new Option(c, c));

/* ---------- the board ---------- */
function matches(r) {
  if (state.cat && (r.category ?? 'Uncategorised') !== state.cat) return false;
  if (state.chain && !r.chains.includes(state.chain)) return false;
  if (state.q) {
    const q = state.q.toLowerCase();
    const hay = `${r.name} ${r.category ?? ''} ${r.chains.join(' ')} ${r.slug}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function sortRows(rows) {
  const k = state.sort;
  const dir = state.dir;
  return [...rows].sort((a, b) => {
    let x = a[k];
    let y = b[k];
    if (k === 'name' || k === 'category') {
      x = String(x ?? '').toLowerCase();
      y = String(y ?? '').toLowerCase();
      return x < y ? -dir : x > y ? dir : a.rank - b.rank;
    }
    if (x === null || x === undefined) x = -Infinity;
    if (y === null || y === undefined) y = -Infinity;
    if (x === y) return a.rank - b.rank;
    return (x - y) * dir;
  });
}

function rowHtml(r, i) {
  const chg = r.change_7d;
  const cls = chg === null ? 'na' : chg >= 0 ? 'up' : 'dn';
  const w = Math.max(2, Math.round((r.implied_value_usd / maxVal) * 74));
  const flags = r.risk_flags.length
    ? r.risk_flags.slice(0, 2).map((f) => `<span class="fchip">${esc(f)}</span>`).join('')
    : '<span class="chip-none">—</span>';
  const more = r.risk_flags.length > 2 ? `<span class="fchip">+${r.risk_flags.length - 2}</span>` : '';
  return `<tr tabindex="0" data-i="${i}" data-slug="${esc(r.slug)}">
    <td class="c-rank"><span class="rank${r.rank <= 10 ? ' top' : ''}">${r.rank}</span></td>
    <td><div class="pname">${esc(r.name)}</div>
      <div class="pmeta" title="${esc((r.category ?? 'Uncategorised') + ' · ' + (r.chains.join(', ') || 'no chain'))}">${esc(r.category ?? 'Uncategorised')}<span class="sep">·</span>${esc(r.chains.slice(0, 3).join(', ') || 'no chain')}${r.chains.length > 3 ? ` +${r.chains.length - 3}` : ''}</div></td>
    <td class="c-num mono">${usd(r.tvl_usd)}</td>
    <td class="c-num chg ${cls}">${pct(chg)}</td>
    <td class="c-num age${r.age_known ? '' : ' unk'}">${ageText(r.age_days, r.age_known)}</td>
    <td class="c-num"><div class="barcell"><span class="bar track"><i style="width:${w}px"></i></span><span class="iv">${usd(r.implied_value_usd)}</span></div></td>
    <td><span class="fl">${flags}${more}</span></td>
  </tr>`;
}

function renderBoard() {
  const rows = D.rows.filter(matches);
  const sorted = sortRows(rows);
  document.getElementById('rows').innerHTML = sorted.map((r, i) => rowHtml(r, i)).join('');

  const cat1 = state.cat ? ` in ${state.cat}` : '';
  const chain1 = state.chain ? ` on ${state.chain}` : '';
  const q1 = state.q ? ` matching “${state.q}”` : '';
  document.getElementById('count').textContent = `${nf.format(sorted.length)} of ${nf.format(D.rows.length)} rows`;
  document.getElementById('boardsub').textContent = `Pre-token protocols${cat1}${chain1}${q1}, strongest implied value first. Select any row for its inputs, its four multipliers and its farm plan.`;
  document.getElementById('foot').textContent =
    `Showing ${nf.format(sorted.length)} of ${nf.format(D.board_size)} ranked rows. ` +
    `Implied value is a model output, not a price: the four multipliers behind every row are on that row's detail view.`;

  // remember the sorted order for the drawer
  window.__sorted = sorted;
}
renderBoard();

/* row click + keyboard */
const tbody = document.getElementById('rows');
function openFromEvent(e) {
  const tr = e.target.closest('tr[data-slug]');
  if (!tr) return;
  const slug = tr.dataset.slug;
  const row = (window.__sorted ?? D.rows).find((r) => r.slug === slug) ?? D.rows.find((r) => r.slug === slug);
  if (row) openDetail(row);
}
tbody.addEventListener('click', openFromEvent);
tbody.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openFromEvent(e);
  }
});

/* controls */
document.getElementById('q').addEventListener('input', (e) => {
  state.q = e.target.value.trim();
  renderBoard();
});
catSel.addEventListener('change', (e) => {
  state.cat = e.target.value;
  renderBoard();
});
chainSel.addEventListener('change', (e) => {
  state.chain = e.target.value;
  renderBoard();
});

/* sort headers */
const heads = [...document.querySelectorAll('#board thead th[data-sort]')];
for (const th of heads) {
  th.querySelector('button').addEventListener('click', () => {
    const k = th.dataset.sort;
    if (state.sort === k) {
      state.dir = -state.dir;
    } else {
      state.sort = k;
      state.dir = k === 'name' ? 1 : k === 'rank' ? 1 : -1;
    }
    for (const h of heads) h.removeAttribute('aria-sort');
    th.setAttribute('aria-sort', state.dir === 1 ? 'ascending' : 'descending');
    renderBoard();
  });
}

/* the Pre-token / Live-token segmented control */
const segs = [...document.querySelectorAll('.seg-b')];
for (const b of segs) {
  b.addEventListener('click', () => {
    for (const o of segs) {
      o.classList.toggle('on', o === b);
      o.setAttribute('aria-pressed', o === b ? 'true' : 'false');
    }
    state.set = b.dataset.set;
    document.getElementById('board-panel').hidden = state.set !== 'pre';
    document.getElementById('live').hidden = state.set !== 'live';
  });
}

/* ---------- calibration ---------- */
function verdict(m, obs) {
  if (obs === null || obs === undefined) return ['na', 'no market read'];
  const ratio = obs / m;
  if (ratio >= 1.6) return ['hi', 'market pays far more'];
  if (ratio >= 1.15) return ['hi', 'market pays more'];
  if (ratio >= 0.87) return ['ok', 'model matches market'];
  if (ratio >= 0.6) return ['lo', 'model under-prices'];
  return ['lo', 'model far under-prices'];
}

function renderCal() {
  const rows = [...D.calibration];
  const k = window.__calSort ?? 'protocols';
  const dir = window.__calDir ?? -1;
  rows.sort((a, b) => {
    let x = a[k];
    let y = b[k];
    if (k === 'category') {
      x = String(x).toLowerCase();
      y = String(y).toLowerCase();
      return x < y ? -dir : x > y ? dir : 0;
    }
    if (x === null || x === undefined) x = -Infinity;
    if (y === null || y === undefined) y = -Infinity;
    return (x - y) * dir;
  });
  document.getElementById('calrows').innerHTML = rows
    .map((c) => {
      const [cls, label] = verdict(c.multiple, c.observed_mcap_per_tvl);
      return `<tr>
        <td>${esc(c.category)}</td>
        <td class="c-num mono">${c.protocols}</td>
        <td class="c-num mono">${c.multiple.toFixed(2)}&times;</td>
        <td class="c-num mono">${c.observed_mcap_per_tvl === null ? '—' : `${c.observed_mcap_per_tvl.toFixed(2)}&times;`}</td>
        <td class="c-num mono">${c.observed_count}</td>
        <td class="c-verdict"><span class="vd ${cls}">${esc(label)}</span></td>
      </tr>`;
    })
    .join('');
}
renderCal();
for (const th of document.querySelectorAll('#cal thead th[data-csort]')) {
  th.querySelector('button').addEventListener('click', () => {
    const k = th.dataset.csort;
    if (window.__calSort === k) window.__calDir = -(window.__calDir ?? -1);
    else {
      window.__calSort = k;
      window.__calDir = k === 'category' ? 1 : -1;
    }
    renderCal();
  });
}

/* ---------- live tokens ---------- */
document.getElementById('liverows').innerHTML = D.live
  .map((l) => {
    const chg = l.change_7d;
    const cls = chg === null ? 'na' : chg >= 0 ? 'up' : 'dn';
    return `<tr>
      <td><div class="pname">${esc(l.name)}</div><div class="pmeta">${esc(l.category ?? 'Uncategorised')}<span class="sep">·</span>${esc(l.chains.slice(0, 3).join(', ') || 'no chain')}</div></td>
      <td class="c-num mono">${usd(l.tvl_usd)}</td>
      <td class="c-num mono">${usd(l.mcap_usd)}</td>
      <td class="c-num mono">${l.mcap_per_tvl === null ? '—' : `${l.mcap_per_tvl.toFixed(2)}&times;`}</td>
      <td class="c-num chg ${cls}">${pct(chg)}</td>
    </tr>`;
  })
  .join('');

/* ---------- risk flags ---------- */
document.getElementById('flags').innerHTML = D.flag_counts
  .map((f) => `<li><span class="n">${f.rows}</span><span>${esc(f.flag)}</span></li>`)
  .join('');

/* ---------- detail drawer ---------- */
const drawer = document.getElementById('drawer');
const scrim = document.getElementById('scrim');
let lastFocus = null;

function openDetail(r) {
  lastFocus = document.activeElement;
  document.getElementById('d-rank').textContent = `Rank ${r.rank} of ${D.board_size} · ${r.slug}`;
  document.getElementById('d-title').textContent = r.name;
  document.getElementById('d-sub').textContent =
    `${r.category ?? 'Uncategorised'} · ${r.chains.join(', ') || 'no chain on record'}`;
  document.getElementById('d-value').textContent = usdFull(r.implied_value_usd);

  const share = r.tvl_usd > 0 ? r.implied_value_usd / r.tvl_usd : 0;
  document.getElementById('d-value-note').textContent =
    `that is ${share.toFixed(2)}× its ${usd(r.tvl_usd)} of TVL — the four multipliers below are what turn one into the other`;

  document.getElementById('d-kv').innerHTML = [
    ['TVL', usdFull(r.tvl_usd)],
    ['7-day change', pct(r.change_7d)],
    ['First tracked', r.listed_at ?? 'not on record'],
    ['Age', r.age_known ? `${nf.format(r.age_days)} days` : 'unknown'],
    ['Chains', r.chains.length ? r.chains.join(', ') : 'none on record'],
    ['Token', r.symbol ? `${r.symbol} (${r.gecko_id ?? 'no gecko id'})` : 'none — this is the pre-token case'],
  ]
    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
    .join('');

  const mults = [
    ['Category', r.base_multiple, `${r.category ?? 'Uncategorised'} at ${r.base_multiple.toFixed(2)}× TVL`, r.base_multiple / 0.35],
    ['Growth', r.growth_multiplier, `7d of ${pct(r.change_7d)}, clipped and weighted`, r.growth_multiplier / 0.35],
    ['Maturity', r.maturity_multiplier, r.age_known ? `${nf.format(r.age_days)} days with no token` : 'age unknown, priced at the default', r.maturity_multiplier / 0.35],
    ['Chain spread', r.chain_multiplier, `${r.chains.length} chain${r.chains.length === 1 ? '' : 's'}`, r.chain_multiplier / 1.2],
  ];
  document.getElementById('d-mult').innerHTML = mults
    .map(([k, v, note, scale]) => {
      const w = Math.max(3, Math.min(100, Math.round(Math.max(0, scale) * 100)));
      return `<div class="mult-row">
        <span class="k">${esc(k)}</span>
        <span class="t" title="${esc(note)}"><i style="width:${w}%"></i></span>
        <span class="v">${v.toFixed(2)}×</span>
      </div>`;
    })
    .join('');

  document.getElementById('d-flags').innerHTML = r.risk_flags.length
    ? r.risk_flags.map((f) => `<li>${esc(f)}</li>`).join('')
    : '<li class="none">No risk flag raised by the record on this row.</li>';

  document.getElementById('d-plan').innerHTML = r.farm_steps.map((s) => `<li>${esc(s)}</li>`).join('');

  drawer.hidden = false;
  drawer.setAttribute('aria-hidden', 'false');
  document.getElementById('dclose').focus();
}

function closeDetail() {
  drawer.hidden = true;
  drawer.setAttribute('aria-hidden', 'true');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

document.getElementById('dclose').addEventListener('click', closeDetail);
scrim.addEventListener('click', closeDetail);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !drawer.hidden) closeDetail();
});

/* ---------- ready ---------- */
document.getElementById('board').removeAttribute('aria-busy');
