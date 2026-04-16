const AVAILABLE = { 1: true, 2: true, 3: true, 4: false };
const strategies = {
  url: { label: 'URL Path', build: (v, r) => ({ method: 'GET', path: `/v${v}${r}`, headers: {} }) },
  header: { label: 'Header', build: (v, r) => ({ method: 'GET', path: r, headers: { 'X-API-Version': v } }) },
  accept: { label: 'Accept', build: (v, r) => ({ method: 'GET', path: r, headers: { 'Accept': `application/vnd.api.v${v}+json` } }) },
  query: { label: 'Query', build: (v, r) => ({ method: 'GET', path: `${r}?version=${v}`, headers: {} }) }
};
let history = { url: 0, header: 0, accept: 0, query: 0 };

function negotiate() {
  const strat = document.getElementById('strategy').value;
  const ver = document.getElementById('reqver').value;
  const res = document.getElementById('resource').value;
  const req = strategies[strat].build(ver, res);
  history[strat]++;

  const hdrStr = Object.entries(req.headers).map(([k, v]) => `<span class="hdr">${k}: ${v}</span>`).join('\n');
  let status, cls, note, resolved = ver;
  if (!AVAILABLE[ver]) {
    status = '404 Not Found'; cls = 'err'; note = `Version v${ver} does not exist. Client should fall back to v3.`;
  } else {
    if (ver < 3) { status = '200 OK (Deprecated)'; cls = 'warn'; note = `v${ver} is deprecated. Sunset header included. Migrate to v3.`; }
    else { status = '200 OK'; cls = 'ok'; note = `Request routed to v${ver} successfully.`; resolved = ver; }
  }

  document.getElementById('result').innerHTML = `
    <div class="req-block"><span class="method">${req.method}</span> ${req.path}\n${hdrStr || '<span class="hdr">(no extra headers)</span>'}</div>
    <div class="res-status ${cls}">${status}</div>
    <div class="res-note">${note}</div>
    <div class="res-note" style="margin-top:8px">Strategy: <strong>${strategies[strat].label}</strong> · Resolved: v${resolved}</div>`;
  drawComparison();
}

function drawComparison() {
  const svg = document.getElementById('comparison');
  const max = Math.max(...Object.values(history), 1);
  const keys = Object.keys(history);
  const w = 180, gap = 20, barH = 24, startX = 120;
  svg.innerHTML = keys.map((k, i) => {
    const bw = (history[k] / max) * w;
    const y = 20 + i * (barH + 14);
    return `<text x="10" y="${y + 16}" fill="#94a3b8" font-size="13" font-family="sans-serif">${strategies[k].label}</text>
      <rect x="${startX}" y="${y}" width="${bw || 2}" height="${barH}" rx="4" fill="#6ee7b7" opacity="0.8"/>
      <text x="${startX + bw + 8}" y="${y + 16}" fill="#e2e8f0" font-size="13" font-family="sans-serif" font-weight="bold">${history[k]}</text>`;
  }).join('');
}
drawComparison();