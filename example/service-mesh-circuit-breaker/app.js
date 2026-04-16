const cfg = { threshold: 5, reset: 4, errRate: 0.3 };
let state = 'closed';
let fails = 0;
let openUntil = 0;
let events = [];
let autoTimer = null;

const $ = id => document.getElementById(id);

['threshold', 'reset', 'errRate'].forEach(k => {
  const el = $(k);
  const label = { threshold: 'tVal', reset: 'rVal', errRate: 'eVal' }[k];
  el.oninput = () => {
    cfg[k] = k === 'errRate' ? +el.value / 100 : +el.value;
    $(label).textContent = el.value;
  };
});

function updateUI() {
  const s = $('state');
  s.className = 'state ' + (state === 'half-open' ? 'half' : state);
  s.textContent = state.toUpperCase();
  $('fails').textContent = fails;
  $('probe').textContent = state === 'open'
    ? Math.max(0, ((openUntil - Date.now()) / 1000).toFixed(1)) + 's'
    : '—';
}

function request() {
  const now = Date.now();
  let outcome;
  if (state === 'open') {
    if (now >= openUntil) { state = 'half-open'; }
    else { events.push({ t: now, type: 'rejected' }); render(); return; }
  }
  if (state === 'half-open') {
    const ok = Math.random() >= cfg.errRate;
    events.push({ t: now, type: 'probe', ok });
    if (ok) { state = 'closed'; fails = 0; }
    else { state = 'open'; openUntil = now + cfg.reset * 1000; }
    render(); return;
  }
  const ok = Math.random() >= cfg.errRate;
  outcome = ok ? 'success' : 'failure';
  events.push({ t: now, type: outcome });
  if (ok) fails = 0;
  else {
    fails++;
    if (fails >= cfg.threshold) {
      state = 'open';
      openUntil = now + cfg.reset * 1000;
    }
  }
  render();
}

function render() {
  updateUI();
  const svg = $('timeline');
  const now = Date.now();
  const window = 20000;
  events = events.filter(e => now - e.t < window);
  const width = 600, height = 300;
  let html = '';
  for (let i = 0; i <= 4; i++) {
    const y = i * (height / 4);
    html += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#2a2f3d" stroke-width="1"/>`;
  }
  events.forEach((e, i) => {
    const x = width - ((now - e.t) / window) * width;
    const y = 40 + (i % 10) * 24;
    let color = '#6ee7b7';
    if (e.type === 'failure') color = '#f87171';
    else if (e.type === 'rejected') color = '#fbbf24';
    else if (e.type === 'probe') color = '#60a5fa';
    html += `<circle cx="${x}" cy="${y}" r="6" fill="${color}" opacity="0.9"/>`;
    html += `<text x="${x}" y="${y - 10}" fill="#9ca3af" font-size="9" text-anchor="middle">${e.type[0].toUpperCase()}</text>`;
  });
  svg.innerHTML = html;
}

$('fire').onclick = request;
$('auto').onclick = () => {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; $('auto').textContent = 'Auto Traffic'; }
  else { autoTimer = setInterval(request, 400); $('auto').textContent = 'Stop'; }
};

setInterval(updateUI, 100);
render();