const endpoints = [
  { id: 'users', label: '/api/users', status: 'legacy' },
  { id: 'orders', label: '/api/orders', status: 'legacy' },
  { id: 'products', label: '/api/products', status: 'legacy' },
  { id: 'auth', label: '/api/auth', status: 'legacy' },
  { id: 'payments', label: '/api/payments', status: 'legacy' },
  { id: 'reports', label: '/api/reports', status: 'legacy' },
  { id: 'inventory', label: '/api/inventory', status: 'legacy' },
  { id: 'notifications', label: '/api/notifications', status: 'legacy' }
];
const svg = document.getElementById('svg');
const logList = document.getElementById('log-list');
let autoTimer = null;

function render() {
  svg.innerHTML = '';
  const proxyX = 400, proxyY = 210;
  svg.insertAdjacentHTML('beforeend',
    `<rect x="${proxyX-60}" y="${proxyY-25}" width="120" height="50" rx="6" fill="#6ee7b7" opacity="0.15" stroke="#6ee7b7"/>
     <text x="${proxyX}" y="${proxyY+5}" text-anchor="middle" fill="#6ee7b7" font-size="14" font-weight="600">Proxy / Facade</text>`);

  endpoints.forEach((ep, i) => {
    const angle = (i / endpoints.length) * Math.PI * 2 - Math.PI / 2;
    const r = 170;
    const x = proxyX + Math.cos(angle) * r;
    const y = proxyY + Math.sin(angle) * r;
    const active = ep.status === 'modern' ? 'active' : '';
    svg.insertAdjacentHTML('beforeend',
      `<path class="edge ${active}" d="M${proxyX},${proxyY} L${x},${y}"/>
       <g class="node ${ep.status}" data-id="${ep.id}" transform="translate(${x-55},${y-20})">
         <rect width="110" height="40" rx="6" stroke-width="1.5"/>
         <text x="55" y="24" text-anchor="middle">${ep.label}</text>
       </g>`);
  });
  updateStats();
}

function updateStats() {
  const legacy = endpoints.filter(e => e.status === 'legacy').length;
  const modern = endpoints.filter(e => e.status === 'modern').length;
  document.getElementById('legacy-count').textContent = legacy;
  document.getElementById('modern-count').textContent = modern;
  document.getElementById('traffic-pct').textContent =
    Math.round((modern / endpoints.length) * 100) + '%';
}

function log(msg) {
  const li = document.createElement('li');
  const time = new Date().toLocaleTimeString();
  li.innerHTML = `<b>[${time}]</b> ${msg}`;
  logList.prepend(li);
}

function migrateNext() {
  const target = endpoints.find(e => e.status === 'legacy');
  if (!target) { log('All endpoints migrated. The fig has strangled the host.'); return; }
  target.status = 'modern';
  log(`Rerouted <b>${target.label}</b> → modern service`);
  render();
}

function rollback() {
  const migrated = endpoints.filter(e => e.status === 'modern');
  if (!migrated.length) { log('Nothing to rollback.'); return; }
  const target = migrated[migrated.length - 1];
  target.status = 'legacy';
  log(`Rolled back <b>${target.label}</b> to legacy`);
  render();
}

document.getElementById('migrate-one').onclick = migrateNext;
document.getElementById('rollback').onclick = rollback;
document.getElementById('auto').onclick = () => {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; log('Auto-migration paused.'); return; }
  log('Auto-migration started.');
  autoTimer = setInterval(() => {
    if (!endpoints.some(e => e.status === 'legacy')) { clearInterval(autoTimer); autoTimer = null; return; }
    migrateNext();
  }, 1200);
};

render();
log('System initialized. 8 legacy endpoints detected.');