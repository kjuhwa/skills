const filters = [
  { id: 'logging', name: 'Logging', desc: 'Record request metadata', on: true,
    run: req => ({ pass: true, note: `logged ${req.method} ${req.path}` }) },
  { id: 'cors', name: 'CORS', desc: 'Add cross-origin headers', on: true,
    run: () => ({ pass: true, note: 'CORS headers added' }) },
  { id: 'auth', name: 'JWT Auth', desc: 'Validate bearer token', on: true,
    run: req => {
      if (!req.token || !req.token.startsWith('valid-'))
        return { pass: false, note: '401 invalid token' };
      return { pass: true, note: `user=${req.token.slice(6,12)}` };
    }},
  { id: 'rate', name: 'Rate Limiter', desc: '100 req/min per client', on: true,
    run: () => {
      rateCount++;
      if (rateCount > 5) return { pass: false, note: '429 rate limit' };
      return { pass: true, note: `quota ${rateCount}/5` };
    }},
  { id: 'cache', name: 'Cache Lookup', desc: 'Return cached response', on: false,
    run: req => Math.random() < 0.3
      ? { pass: false, note: 'HIT → 200 from cache', cached: true }
      : { pass: true, note: 'MISS' } },
  { id: 'transform', name: 'Transform', desc: 'Rewrite headers/body', on: true,
    run: () => ({ pass: true, note: 'X-Gateway header injected' }) }
];

let rateCount = 0;
setInterval(() => rateCount = Math.max(0, rateCount - 1), 2000);

function renderFilters() {
  const box = document.getElementById('filters');
  box.innerHTML = '';
  filters.forEach((f, i) => {
    const el = document.createElement('div');
    el.className = `filter ${f.on ? 'on' : 'off'}`;
    el.id = `f-${f.id}`;
    el.innerHTML = `
      <div>
        <div class="filter-name">${i+1}. ${f.name}</div>
        <div class="filter-desc">${f.desc}</div>
      </div>
      <div class="toggle"></div>
    `;
    el.querySelector('.toggle').onclick = () => { f.on = !f.on; renderFilters(); };
    box.appendChild(el);
  });
}

function log(msg, cls = 'info') {
  const el = document.createElement('div');
  el.className = `log-entry ${cls}`;
  el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  const box = document.getElementById('log');
  box.prepend(el);
  while (box.children.length > 50) box.lastChild.remove();
}

async function sendRequest() {
  const req = {
    method: 'GET',
    token: document.getElementById('token').value,
    path: document.getElementById('path').value
  };
  log(`→ ${req.method} ${req.path}`, 'info');
  document.querySelectorAll('.filter').forEach(f => f.classList.remove('active','blocked'));
  for (const f of filters) {
    if (!f.on) continue;
    const el = document.getElementById(`f-${f.id}`);
    el.classList.add('active');
    await new Promise(r => setTimeout(r, 350));
    const res = f.run(req);
    el.classList.remove('active');
    if (!res.pass) {
      el.classList.add('blocked');
      log(`✗ ${f.name}: ${res.note}`, 'err');
      if (res.cached) log('← 200 OK (cached)', 'ok');
      return;
    }
    log(`✓ ${f.name}: ${res.note}`, 'ok');
  }
  await new Promise(r => setTimeout(r, 200));
  log('← 200 OK from upstream', 'ok');
}

document.getElementById('send').onclick = sendRequest;
renderFilters();
log('Gateway ready. Send a request to see the filter chain.', 'info');