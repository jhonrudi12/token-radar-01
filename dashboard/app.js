/* Token Radar dashboard: renders window.RADAR, no network, no fetch. */
'use strict';
const D = window.RADAR;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* Money: $1.68B, $543.20M, $12.4K, $842. */
function money(v) {
  if (v == null || !isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + Math.round(v);
}
const pct = (v) => v == null ? '—' : (v > 0 ? '+' : '') + v.toFixed(1) + '%';
const num = (v, d = 4) => v == null ? '—' : Number(v).toFixed(d);
const ageTxt = (r) => r.age_days == null ? 'unknown' : r.age_days + ' d';

/* The model, mirrored exactly (radar-2). */
const peerByCat = new Map(D.peers.map((p) => [p.category, p.multiple]));
function impliedOf(row) {
  const peer = peerByCat.has(row.category) ? peerByCat.get(row.category) : D.global_peer_multiple;
  const growth = clamp(row.change_7d ?? 0, -60, 120);
  const growthMult = 1 + growth / 100 * 0.5;
  const age = row.age_days ?? 365;
  const maturity = 0.6 + Math.min(age, 1095) / 1095 * 0.4;
  return Math.max(1, Math.round(row.tvl_usd * peer * growthMult * maturity));
}
function peerN(row) {
  const p = D.peers.find((x) => x.category === row.category);
  return p ? p.n : 0;
}

const state = { tab: 'pre', q: '', cat: '', sortKey: 'implied', sortDir: -1 };
const bySlug = new Map(D.rows.map((r) => [r.slug, r]));

/* Columns: [key, label, sortable]. Pre-token board and live view differ. */
const PRE_COLS = [['rank', 'Rank'], ['name', 'Protocol'], ['category', 'Category'], ['tvl', 'TVL'], ['change', '7d'], ['age', 'Age'], ['implied', 'Implied value']];
const LIVE_COLS = [['name', 'Protocol'], ['category', 'Category'], ['tvl', 'TVL'], ['change', '7d'], ['mcap', 'Market value']];
const val = {
  rank: (r) => r.rank, name: (r) => r.name.toLowerCase(), category: (r) => (r.category || '').toLowerCase(),
  tvl: (r) => r.tvl_usd, change: (r) => r.change_7d ?? -Infinity, age: (r) => r.age_days ?? -1,
  implied: (r) => r.implied_value_usd, mcap: (r) => r.mcap_usd ?? 0,
};
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function filtered() {
  const q = state.q.trim().toLowerCase();
  let list = (state.tab === 'pre' ? D.rows : D.live).filter((r) =>
    (!state.cat || r.category === state.cat) &&
    (!q || r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q)));
  const f = val[state.sortKey] || val.implied;
  list = [...list].sort((a, b) => state.sortDir * cmp(f(a), f(b)) || cmp(a.slug, b.slug));
  return list;
}

function renderHead() {
  const cols = state.tab === 'pre' ? PRE_COLS : LIVE_COLS;
  $('thead').innerHTML = '<tr>' + cols.map(([k, label]) => {
    const arrow = state.sortKey === k ? (state.sortDir === 1 ? ' ▲' : ' ▼') : '';
    return `<th data-k="${k}" class="${k === 'tvl' || k === 'change' || k === 'age' || k === 'implied' || k === 'mcap' || k === 'rank' ? 'num' : ''}" aria-sort="${state.sortKey === k ? (state.sortDir === 1 ? 'ascending' : 'descending') : 'none'}">${label}${arrow}</th>`;
  }).join('') + '</tr>';
  $('thead').querySelectorAll('th').forEach((th) => th.addEventListener('click', () => {
    const k = th.dataset.k;
    if (state.sortKey === k) state.sortDir *= -1;
    else { state.sortKey = k; state.sortDir = k === 'name' || k === 'category' ? 1 : -1; }
    render();
  }));
}

function rowHtml(r) {
  const ch = pct(r.change_7d);
  const cls = r.change_7d == null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
  if (state.tab === 'live') return `<tr><td><strong>${esc(r.name)}</strong><span class="slug">${esc(r.slug)}</span></td><td>${esc(r.category || '—')}</td><td class="num">${money(r.tvl_usd)}</td><td class="num ${cls}">${ch}</td><td class="num"><strong>${money(r.mcap_usd)}</strong></td></tr>`;
  const badge = r.rank <= 3 ? ` class="rank top${r.rank}"` : ' class="rank"';
  return `<tr data-slug="${esc(r.slug)}" tabindex="0"><td${badge}>${r.rank}</td><td><strong>${esc(r.name)}</strong><span class="slug">${esc(r.slug)}</span></td><td>${esc(r.category || '—')}</td><td class="num">${money(r.tvl_usd)}</td><td class="num ${cls}">${ch}</td><td class="num">${ageTxt(r)}</td><td class="num"><strong>${money(r.implied_value_usd)}</strong></td></tr>`;
}

function render() {
  const list = filtered();
  renderHead();
  $('tbody').innerHTML = list.map(rowHtml).join('');
  $('empty').hidden = list.length > 0;
  const total = state.tab === 'pre' ? D.board_size : D.live_size;
  $('count').textContent = `Showing ${list.length} of ${total} ${state.tab === 'pre' ? 'ranked protocols' : 'live-token protocols'}.`;
  $('livenote').hidden = state.tab !== 'live';
  $('tab-pre').setAttribute('aria-selected', state.tab === 'pre');
  $('tab-live').setAttribute('aria-selected', state.tab === 'live');
  $('tbody').querySelectorAll('tr[data-slug]').forEach((tr) => {
    tr.addEventListener('click', () => openDetail(tr.dataset.slug));
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') openDetail(tr.dataset.slug); });
  });
  syncHash();
}

function openDetail(slug) {
  const r = bySlug.get(slug);
  if (!r) return;
  const peer = peerByCat.has(r.category) ? peerByCat.get(r.category) : D.global_peer_multiple;
  const growth = clamp(r.change_7d ?? 0, -60, 120);
  const gm = 1 + growth / 100 * 0.5;
  const age = r.age_days ?? 365;
  const mm = 0.6 + Math.min(age, 1095) / 1095 * 0.4;
  const recomputed = impliedOf(r);
  const match = recomputed === r.implied_value_usd;
  const chains = r.chains.length ? r.chains.join(', ') : '—';
  $('d-body').innerHTML = `
    <p class="kicker">#${r.rank} · ${esc(r.category || '—')} · records no token</p>
    <h2 id="d-name">${esc(r.name)}</h2>
    <dl class="facts-d">
      <div><dt>Chains</dt><dd>${esc(chains)}</dd></div>
      <div><dt>TVL</dt><dd>${money(r.tvl_usd)}</dd></div>
      <div><dt>7-day change</dt><dd class="${r.change_7d == null ? '' : r.change_7d >= 0 ? 'pos' : 'neg'}">${pct(r.change_7d)}</dd></div>
      <div><dt>Age</dt><dd>${r.age_days == null ? 'unknown — model uses 365 days' : r.age_days + ' days'}</dd></div>
    </dl>
    <h3>Model breakdown</h3>
    <p class="formula">${money(r.tvl_usd)} TVL × ${num(peer)} peer multiple (${peerN(r)} peer${peerN(r) === 1 ? '' : 's'} in ${esc(r.category || '—')}) × ${num(gm)} growth × ${num(mm)} maturity = <strong>${money(recomputed)}</strong></p>
    <p class="match ${match ? 'pos' : 'neg'}">${match ? 'Recomputation matches the board value of ' + money(r.implied_value_usd) + '.' : 'Recomputation gives ' + money(recomputed) + ' against a board value of ' + money(r.implied_value_usd) + '.'}</p>
    <h3>Farm plan</h3>
    <ol class="steps">${r.farm_steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
  const dlg = $('detail');
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0; /* showModal focuses the Close button, which scrolls tall dialogs down */
  history.replaceState(null, '', '#p=' + encodeURIComponent(slug));
}
$('detail').addEventListener('close', () => {
  if (location.hash.startsWith('#p=')) history.replaceState(null, '', location.pathname + location.search);
});
$('detail').addEventListener('click', (e) => { if (e.target === $('detail')) $('detail').close(); });

function syncHash() {
  if (location.hash.startsWith('#p=')) return;
  const p = new URLSearchParams();
  if (state.cat) p.set('category', state.cat);
  if (state.q) p.set('q', state.q);
  const h = p.toString();
  history.replaceState(null, '', h ? '#' + h : location.pathname + location.search);
}

/* Controls. */
function initControls() {
  const cats = [...new Set(D.rows.map((r) => r.category).filter(Boolean))].sort();
  $('cat').innerHTML = '<option value="">All categories</option>' + cats.map((c) => `<option>${esc(c)}</option>`).join('');
  $('q').addEventListener('input', () => { state.q = $('q').value; render(); });
  $('cat').addEventListener('change', () => { state.cat = $('cat').value; render(); });
  $('tab-pre').addEventListener('click', () => { state.tab = 'pre'; state.sortKey = 'implied'; state.sortDir = -1; render(); });
  $('tab-live').addEventListener('click', () => { state.tab = 'live'; state.sortKey = 'mcap'; state.sortDir = -1; render(); });
}

/* Header, facts, peer table. */
function initStatic() {
  $('asof').textContent = D.as_of;
  $('source').textContent = D.source.split(' ')[0];
  $('modelver').textContent = D.model_version;
  $('f-ranked').textContent = D.board_size;
  $('f-watch').textContent = D.watchlist_size + '/' + D.watchlist_size;
  $('f-early').textContent = D.early_size;
  $('f-model').textContent = D.model_version;
  $('peercount').textContent = D.peers.length;
  const top = [...D.peers].sort((a, b) => b.n - a.n || cmp(a.category, b.category)).slice(0, 12);
  $('peers').innerHTML = top.map((p) => `<tr><td>${esc(p.category)}</td><td class="num">${p.n}</td><td class="num">${num(p.median)}</td><td class="num">${num(p.multiple)}</td></tr>`).join('');
}

/* Hash state on load: #p=slug opens detail; #category=&q= set filters. */
function initHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('category')) { state.cat = h.get('category'); $('cat').value = state.cat; }
  if (h.get('q')) { state.q = h.get('q'); $('q').value = state.q; }
  render();
  if (h.get('p')) openDetail(h.get('p'));
}

initStatic();
initControls();
initHash();
