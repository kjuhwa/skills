const services = ['api-gateway', 'auth-svc', 'user-svc', 'order-svc', 'payment-svc', 'inventory-svc', 'db-proxy', 'cache'];
const colors = ['#6ee7b7', '#60a5fa', '#f59e0b', '#f87171', '#a78bfa', '#ec4899', '#34d399', '#fbbf24'];
const svcColor = Object.fromEntries(services.map((s, i) => [s, colors[i % colors.length]]));

let traces = [];
let currentTrace = null;
let selectedSpan = null;

function rand(min, max) { return Math.random() * (max - min) + min; }

function generateTrace(id) {
  const spans = [];
  let spanId = 0;
  const root = {
    id: spanId++, parent: null, service: 'api-gateway',
    op: ['GET /checkout', 'POST /orders', 'GET /users/me'][Math.floor(rand(0, 3))],
    start: 0, duration: rand(400, 900), error: false, tags: { 'http.status': 200 }
  };
  spans.push(root);
  const childCount = Math.floor(rand(3, 7));
  let cursor = rand(5, 20);
  for (let i = 0; i < childCount; i++) {
    const svc = services[Math.floor(rand(1, services.length))];
    const dur = rand(30, 300);
    const err = Math.random() < 0.12;
    const child = {
      id: spanId++, parent: root.id, service: svc,
      op: `${svc}.${['query', 'fetch', 'validate', 'write'][Math.floor(rand(0, 4))]}`,
      start: cursor, duration: dur, error: err,
      tags: { 'db.statement': 'SELECT *', 'peer.ip': '10.0.' + Math.floor(rand(0, 255)) }
    };
    spans.push(child);
    if (Math.random() < 0.5 && dur > 60) {
      spans.push({
        id: spanId++, parent: child.id, service: Math.random() < 0.5 ? 'db-proxy' : 'cache',
        op: Math.random() < 0.5 ? 'SELECT' : 'GET', start: cursor + rand(2, 10),
        duration: dur * rand(0.3, 0.8), error: false, tags: { rows: Math.floor(rand(1, 500)) }
      });
    }
    cursor += rand(10, 40);
  }
  const total = Math.max(...spans.map(s => s.start + s.duration));
  return { id, spans, total };
}

function renderSelector() {
  const sel = document.getElementById('traceSelect');
  sel.innerHTML = traces.map(t => `<option value="${t.id}">trace-${t.id.toString(16).padStart(8, '0')}</option>`).join('');
}

function renderWaterfall() {
  const el = document.getElementById('waterfall');
  const t = currentTrace;
  const errCount = t.spans.filter(s => s.error).length;
  document.getElementById('stats').textContent = `${t.spans.length} spans · ${t.total.toFixed(1)}ms · ${errCount} errors`;
  el.innerHTML = t.spans.map(s => {
    const pct = (s.start / t.total) * 100;
    const w = (s.duration / t.total) * 100;
    const color = s.error ? '#f87171' : svcColor[s.service];
    const indent = s.parent == null ? 0 : 14;
    return `<div class="span-row" data-id="${s.id}">
      <div class="span-label" style="padding-left:${indent}px;">
        <span style="color:${color}">●</span> ${s.service} <span style="color:#6b7280">${s.op}</span>
      </div>
      <div class="span-bar-wrap">
        <div class="span-bar" style="left:${pct}%;width:${w}%;background:${color};"></div>
        <span class="span-duration">${s.duration.toFixed(1)}ms</span>
      </div>
    </div>`;
  }).join('');
  el.querySelectorAll('.span-row').forEach(r => {
    r.addEventListener('click', () => selectSpan(parseInt(r.dataset.id)));
  });
}

function selectSpan(id) {
  selectedSpan = currentTrace.spans.find(s => s.id === id);
  document.querySelectorAll('.span-row').forEach(r =>
    r.classList.toggle('selected', parseInt(r.dataset.id) === id));
  const s = selectedSpan;
  document.getElementById('detailBody').innerHTML = `
    <dl class="kv">
      <dt>Service</dt><dd>${s.service}</dd>
      <dt>Operation</dt><dd>${s.op}</dd>
      <dt>Span ID</dt><dd>${s.id}</dd>
      <dt>Parent</dt><dd>${s.parent ?? 'root'}</dd>
      <dt>Start</dt><dd>${s.start.toFixed(2)}ms</dd>
      <dt>Duration</dt><dd class="${s.error ? 'err' : ''}">${s.duration.toFixed(2)}ms</dd>
      <dt>Status</dt><dd class="${s.error ? 'err' : ''}">${s.error ? 'ERROR' : 'OK'}</dd>
      <dt>Tags</dt><dd>${Object.entries(s.tags).map(([k, v]) => `<span class="tag">${k}=${v}</span>`).join('')}</dd>
    </dl>`;
}

function regenerate() {
  traces = Array.from({ length: 6 }, (_, i) => generateTrace(Date.now() + i));
  currentTrace = traces[0];
  renderSelector();
  renderWaterfall();
}

document.getElementById('regen').addEventListener('click', regenerate);
document.getElementById('traceSelect').addEventListener('change', e => {
  currentTrace = traces.find(t => t.id === parseInt(e.target.value));
  renderWaterfall();
});

regenerate();