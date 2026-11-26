// Token Radar — dashboard. Reads window.RADAR written by data.js; no network, no framework.
(() => {
  'use strict';
  const R = window.RADAR;
  if (!R) return;

  const $ = (s) => document.querySelector(s);
  const fmtUSD = (v) => '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const fmtCompact = (v) => {
    const n = Number(v);
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n.toFixed(0);
  };
  const fmtPct = (p) => (100 * p).toFixed(1) + '%';
  const fmtAge = (d) => (d == null ? '—' : d >= 365 ? (d / 365).toFixed(1) + 'y' : d + 'd');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const rows = R.rows || [];
  // The snapshot's watchlist is the board's floor; flag those rows from the fit the page renders.
  // The watchlist rides on the radar payload as the snapshot's own list of slugs.
  const watchSet = new Set(R.watchlist || []);
  const fit = R.fit || {};
  const terms = R.terms || [];
  const ageRate = fit.age_rate || [];
  const calib = R.calibration || [];

  /* ---------- KPIs ---------- */
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const medianImp = med(rows.map((r) => r.implied_value_usd));
  const medianOdds = med(rows.map((r) => r.launch_odds || 0));
  $('#kpis').innerHTML = [
    ['Protocols', R.train_n + R.early_size + (R.board_size - R.early_size - R.watchlist_size) + R.live_size],
    ['Pre-token candidates', rows.filter((r) => r.pretoken).length],
    ['Live tokens shown', rows.filter((r) => !r.pretoken).length],
    ['Watchlist', R.watchlist_size],
    ['Live tokens fitted', R.train_n],
    ['Median implied', fmtCompact(medianImp)],
    ['Median P(launch)', fmtPct(medianOdds)],
  ].map(([k, v]) => `<div class="kpi"><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('');
  $('#asof').textContent = 'as of ' + R.as_of + ' · ' + R.source;
  $('#footmeta').textContent =
    `Model ${R.model_version} · fitted on ${R.train_n} live tokens · median multiple ${fit.median_multiple.toFixed(2)}x ` +
    `(p10 ${fit.p10_multiple.toFixed(2)}x, p90 ${fit.p90_multiple.toFixed(2)}x) · board ${R.board_size} rows, ${R.early_size} below the ${fmtCompact(R.floor_usd)} floor`;

  /* ---------- filters ---------- */
  const cats = [...new Set(rows.map((r) => r.category).filter(Boolean))].sort();
  const chains = [...new Set(rows.flatMap((r) => r.chains || []))].sort();
  $('#cat').innerHTML += cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  $('#chain').innerHTML += chains.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');

  const state = { q: '', cat: '', chain: '', set: '', sort: 'implied_value_usd', dir: -1 };

  function visible() {
    const q = state.q.toLowerCase();
    let out = rows.filter((r) => {
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && !(r.chains || []).includes(state.chain)) return false;
      if (state.set === 'watch' && !watchSet.has(r.slug)) return false;
      if (state.set === 'early' && (!r.pretoken || watchSet.has(r.slug))) return false;
      if (state.set === 'live' && r.pretoken) return false;
      if (q && !(`${r.name} ${r.slug} ${r.category || ''}`.toLowerCase().includes(q))) return false;
      return true;
    });
    const k = state.sort, d = state.dir;
    out.sort((a, b) => {
      const av = a[k], bv = b[k];
      if (typeof av === 'string' || typeof bv === 'string') return d * String(av ?? '').localeCompare(String(bv ?? ''));
      return d * ((av ?? 0) - (bv ?? 0));
    });
    return out;
  }

  function renderRows() {
    const list = visible();
    $('#count').textContent = `${list.length} of ${rows.length} rows`;
    $('#rows').innerHTML = list.map((r) => {
      const ch = r.change_7d;
      const live = r.pretoken === false;
      const cls = ch == null ? '' : ch >= 0 ? 'badge-up' : 'badge-down';
      const sign = ch == null ? '' : (ch >= 0 ? '+' : '');
      return `<tr>
        <td class="num">${r.pretoken ? r.rank : '—'}</td>
        <td class="name"><b>${esc(r.name)}</b> <span class="sub">${esc(r.slug)}</span> <span class="tag ${live ? 'live' : 'candidate'}">${live ? 'live token' : 'pre-token'}</span> ${watchSet.has(r.slug) ? '<span class="tag watch">watchlist</span>' : ''}</td>
        <td>${esc(r.category || '—')}</td>
        <td class="num">${fmtCompact(r.tvl_usd)}</td>
        <td class="num ${cls}">${ch == null ? '—' : sign + ch.toFixed(1) + '%'}</td>
        <td class="num">${fmtAge(r.age_days)}</td>
        <td class="num">${fmtPct(r.launch_odds || 0)}</td>
        <td class="num"><b>${fmtCompact(r.implied_value_usd)}</b></td>
        <td class="num">${fmtCompact(r.expected_value_usd || 0)}</td>
      </tr>`;
    }).join('');
    $('#boardnote').textContent =
      `All ${list.length} matching rows shown, of ${rows.length} on the board. Implied value = TVL × fitted multiple, ` +
      `adjusted for seven-day TVL growth, the age bucket's realised multiple and chain count. EV = implied value × P(launch). ` +
      `The watchlist is the floor, not the ceiling: ${R.early_size} rows sit outside it.`;
  }

  ['q', 'cat', 'chain', 'set'].forEach((id) => {
    const el = $('#' + id);
    el.addEventListener('input', () => { state[id] = el.value; renderRows(); });
  });
  document.querySelectorAll('#board thead th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const k = th.dataset.sort;
      state.dir = state.sort === k ? -state.dir : (k === 'rank' || k === 'name' || k === 'category' ? 1 : -1);
      state.sort = k;
      document.querySelectorAll('#board thead th').forEach((x) => x.removeAttribute('aria-sort'));
      th.setAttribute('aria-sort', state.dir === 1 ? 'ascending' : 'descending');
      renderRows();
    });
  });

  /* ---------- model panel ---------- */
  $('#modelpanel').innerHTML = `
    <div class="card">
      <h2>How the implied value is built</h2>
      <p>Every coefficient below is measured from the snapshot's own live tokens — the ${R.train_n} protocols whose token
      already trades — then applied to the pre-token set. Nothing is assumed: the multiple, its spread and the launch base rate all come from the same file the board reads.</p>
      <div class="formula">implied_value = TVL × multiple<br>multiple = median_multiple × bounded_growth(change_7d) × measured_age_bucket_multiple × bounded_chain_factor(chains)<br>expected_value = implied_value × P(launch)</div>
      <h3>Does the snapshot support a more complex multiple model?</h3>
      <p>The table below reports Spearman rank correlation (ρ) between each candidate feature and realised log(market-cap/TVL) across the live-token training set. These are diagnostics, not fitted causal effects: noisy or weak relationships are excluded rather than amplified into a regression.</p>
      <div class="terms">
        ${[fit.tvl_rho, fit.growth_rho, fit.age_rho, fit.chain_rho].filter(Boolean).map((t) => `<div class="term"><b>${esc(t.name)}</b> <span class="sub">n=${t.n}</span><div class="says">${esc(t.says)}</div></div>`).join('')}
      </div>
      <h3>Measured terms</h3>
      <div class="terms">
        ${terms.map((t) => `<div class="term"><b>${esc(t.name)}</b> <span class="sub">n=${t.n}</span><div class="says">${esc(t.says)}</div></div>`).join('')}
      </div>
      <h3>Token launch base rate by age</h3>
      <div class="cal">
        ${ageRate.map((a) => `<div class="term"><b>${esc(a.name)}</b> <span class="sub">n=${a.n} · ${a.live} live</span>
          <div class="says">${fmtPct(a.rate)} launched a token</div><div class="bar"><i style="width:${Math.min(100, a.rate * 100 * 2.5)}%"></i></div></div>`).join('')}
      </div>
      <h3>Age effect on realised multiple</h3>
      <p>Applied to implied value only when at least eight live tokens exist in the age bucket; otherwise it stays at the pooled median (1.00×).</p>
      <div class="terms">
        ${fit.age_multiple.map((a) => `<div class="term"><b>${esc(a.name)}</b> <span class="sub">n=${a.n}</span><div class="says">${esc(a.says)}</div></div>`).join('')}
      </div>
      <h3>Category calibration (measured, not asserted)</h3>
      <table class="coeffs">
        <thead><tr><th>Category</th><th class="num">n</th><th class="num">live</th><th class="num">launch rate</th><th class="num">median multiple</th></tr></thead>
        <tbody>
          ${calib.map((c) => `<tr><td>${esc(c.category)}</td><td class="num">${c.n}</td><td class="num">${c.live}</td><td class="num">${fmtPct(c.launch_rate)}</td><td class="num">${c.median_multiple.toFixed(2)}x</td></tr>`).join('')}
        </tbody>
      </table>
      <h3>Already-trading tokens: realised against the model's multiple</h3>
      <p>These ${(R.live || []).length} protocols already trade a token and are kept off the ranked board on purpose: the radar ranks what is still to come. Their realised multiple of TVL is the training signal the board's model is fitted on, shown here so the two sets are never confused.</p>
      <table class="coeffs">
        <thead><tr><th>Protocol</th><th>Category</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">Realised</th><th class="num">Model</th></tr></thead>
        <tbody>
          ${(R.live || []).slice(0, 25).map((l) => `<tr><td>${esc(l.name)}</td><td>${esc(l.category || '—')}</td><td class="num">${fmtCompact(l.tvl_usd)}</td><td class="num">${fmtCompact(l.mcap_usd)}</td><td class="num">${l.realised_multiple.toFixed(2)}x</td><td class="num">${l.predicted_multiple.toFixed(2)}x</td></tr>`).join('')}
        </tbody>
      </table>
      <p class="sub">Showing the 25 largest of ${(R.live || []).length} live tokens. A model multiple far from the realised one is the model being wrong, not a market inefficiency.</p>
    </div>`;

  /* ---------- detail ---------- */
  const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]));
  $('#dselect').innerHTML = rows.map((r) => `<option value="${esc(r.slug)}">#${r.rank} ${esc(r.name)}</option>`).join('');
  function renderDetail() {
    const r = bySlug[$('#dselect').value] || rows[0];
    $('#dsub').textContent = `${r.category || 'uncategorised'} · ${(r.chains || []).join(', ')}`;
    const m = r.model || {};
    $('#detail').innerHTML = `<div class="dgrid">
      <div class="dcol">
        <h4>Valuation</h4>
        <dl class="kv">
          <dt>TVL</dt><dd>${fmtUSD(r.tvl_usd)}</dd>
          <dt>7d TVL change</dt><dd>${r.change_7d == null ? '—' : (r.change_7d >= 0 ? '+' : '') + r.change_7d.toFixed(1) + '%'}</dd>
          <dt>Age</dt><dd>${fmtAge(r.age_days)}${r.age_known ? '' : ' (unlisted — treated at the base rate)'}</dd>
          <dt>Base multiple</dt><dd>${m.base_multiple != null ? m.base_multiple.toFixed(4) + 'x' : '—'}</dd>
          <dt>Growth multiplier</dt><dd>${m.growth_multiplier != null ? m.growth_multiplier.toFixed(4) + 'x' : '—'}</dd>
          <dt>Age multiple factor</dt><dd>${m.maturity_multiplier != null ? m.maturity_multiplier.toFixed(4) + 'x' : '—'}</dd>
          <dt>Implied value</dt><dd><b>${fmtUSD(r.implied_value_usd)}</b></dd>
          <dt>Range (p10–p90)</dt><dd>${fmtCompact(r.implied_low_usd)} – ${fmtCompact(r.implied_high_usd)}</dd>
          <dt>P(launch)</dt><dd>${fmtPct(r.launch_odds || 0)} <span class="sub">(range ${fmtPct(r.launch_low || 0)}–${fmtPct(r.launch_high || 0)})</span></dd>
          <dt>Expected value</dt><dd><b>${fmtUSD(r.expected_value_usd || 0)}</b></dd>
        </dl>
        <h4>Risk flags</h4>
        <div>${(r.risk_flags || []).map((f) => `<span class="pill warn">${esc(f.text || f.code)}</span>`).join(' ') || '<span class="sub">none recorded</span>'}</div>
      </div>
      <div class="dcol">
        <h4>Farm plan — <span class="pill ${((r.farm||{}).verdict)==='strong'?'ok':((r.farm||{}).verdict)==='skip'?'bad':'warn'}">${esc((r.farm||{}).verdict||'—')}</span></h4>
        <p class="sub">${esc((r.farm||{}).why||'')}</p>
        <ol class="steps">${(r.farm_steps || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        <h4>Expected farm economics</h4>
        <dl class="kv">
          <dt>Expected / day</dt><dd>${fmtUSD((r.farm || {}).expected_usd || 0)} <span class="sub">(range ${fmtCompact((r.farm || {}).expected_low_usd || 0)}–${fmtCompact((r.farm || {}).expected_high_usd || 0)})</span></dd>
          <dt>Per hour</dt><dd>${fmtUSD((r.farm || {}).per_hour || 0)}</dd>
          <dt>Capital at risk</dt><dd>${fmtUSD((r.farm || {}).capital_usd || 0)}</dd>
          <dt>Est. gas</dt><dd>${fmtUSD((r.farm || {}).gas_usd || 0)}</dd>
        </dl>
      </div>
    </div>`;
  }
  $('#dselect').addEventListener('change', renderDetail);
  renderDetail();

  /* ---------- tabs ---------- */
  document.querySelectorAll('.tab').forEach((t) => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('is-active'));
      document.querySelectorAll('.view').forEach((x) => x.classList.remove('is-active'));
      t.classList.add('is-active');
      $('#view-' + t.dataset.view).classList.add('is-active');
    });
  });

  renderRows();
})();
