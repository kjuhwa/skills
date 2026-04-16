const svg = document.getElementById('stage');
const log = document.getElementById('log');
const NS = 'http://www.w3.org/2000/svg';

const clients = {
  web:    { x: 60,  y: 60,  color: '#6ee7b7', label: 'Web Client' },
  mobile: { x: 60,  y: 240, color: '#7dd3fc', label: 'Mobile Client' },
  tv:     { x: 60,  y: 420, color: '#fca5a5', label: 'TV Client' }
};
const bffs = {
  web:    { x: 360, y: 60,  color: '#6ee7b7', label: 'Web BFF',    services: ['auth','catalog','reviews','recommend'] },
  mobile: { x: 360, y: 240, color: '#7dd3fc', label: 'Mobile BFF', services: ['auth','catalog','offers'] },
  tv:     { x: 360, y: 420, color: '#fca5a5', label: 'TV BFF',     services: ['auth','catalog','stream'] }
};
const services = {
  auth:      { x: 700, y: 40 },
  catalog:   { x: 700, y: 130 },
  reviews:   { x: 700, y: 220 },
  recommend: { x: 700, y: 310 },
  offers:    { x: 700, y: 400 },
  stream:    { x: 700, y: 480 }
};

function drawNode(x, y, w, h, fill, label, sub) {
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', 'node');
  const rect = document.createElementNS(NS, 'rect');
  rect.setAttribute('x', x); rect.setAttribute('y', y);
  rect.setAttribute('width', w); rect.setAttribute('height', h);
  rect.setAttribute('rx', 6); rect.setAttribute('fill', fill);
  rect.setAttribute('fill-opacity', 0.15);
  rect.setAttribute('stroke', fill);
  g.appendChild(rect);
  const t = document.createElementNS(NS, 'text');
  t.setAttribute('x', x + w/2); t.setAttribute('y', y + h/2 + 4);
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('fill', fill);
  t.textContent = label;
  g.appendChild(t);
  if (sub) {
    const s = document.createElementNS(NS, 'text');
    s.setAttribute('x', x + w/2); s.setAttribute('y', y + h + 14);
    s.setAttribute('text-anchor', 'middle');
    s.setAttribute('fill', '#6b7280'); s.setAttribute('font-size', '10');
    s.textContent = sub;
    g.appendChild(s);
  }
  svg.appendChild(g);
}

function renderStage() {
  svg.innerHTML = '';
  Object.entries(clients).forEach(([k,c]) => drawNode(c.x, c.y, 140, 50, c.color, c.label));
  Object.entries(bffs).forEach(([k,b]) => drawNode(b.x, b.y, 160, 50, b.color, b.label, b.services.join(' · ')));
  Object.entries(services).forEach(([k,s]) => drawNode(s.x, s.y, 140, 40, '#e5e7eb', k));
}

function animatePacket(x1, y1, x2, y2, color, onDone) {
  const c = document.createElementNS(NS, 'circle');
  c.setAttribute('r', 5); c.setAttribute('fill', color);
  c.setAttribute('cx', x1); c.setAttribute('cy', y1);
  svg.appendChild(c);
  const start = performance.now();
  const dur = 600;
  function step(t) {
    const p = Math.min(1, (t - start) / dur);
    c.setAttribute('cx', x1 + (x2 - x1) * p);
    c.setAttribute('cy', y1 + (y2 - y1) * p);
    if (p < 1) requestAnimationFrame(step);
    else { c.remove(); onDone && onDone(); }
  }
  requestAnimationFrame(step);
}

function sendRequest(clientKey) {
  const client = clients[clientKey];
  const bff = bffs[clientKey];
  const cx = client.x + 140, cy = client.y + 25;
  const bx = bff.x, by = bff.y + 25;
  write(`${client.label} → ${bff.label}`, clientKey);
  animatePacket(cx, cy, bx, by, bff.color, () => {
    bff.services.forEach((svc, i) => {
      const s = services[svc];
      setTimeout(() => {
        animatePacket(bff.x + 160, by, s.x, s.y + 20, bff.color, () => {
          write(`  ${bff.label} ↔ ${svc}`, clientKey);
          animatePacket(s.x, s.y + 20, bff.x + 160, by, '#e5e7eb');
        });
      }, i * 200);
    });
    setTimeout(() => {
      animatePacket(bx, by, cx, cy, bff.color);
      write(`${bff.label} → ${client.label} [aggregated payload]`, clientKey);
    }, bff.services.length * 200 + 500);
  });
}

function write(msg, cls) {
  const d = document.createElement('div');
  d.className = cls || '';
  d.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  log.prepend(d);
}

document.querySelectorAll('[data-client]').forEach(b => {
  b.onclick = () => sendRequest(b.dataset.client);
});

let autoTimer = null;
document.getElementById('auto').onclick = (e) => {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; e.target.textContent = 'Auto Traffic'; return; }
  e.target.textContent = 'Stop Auto';
  autoTimer = setInterval(() => {
    const keys = ['web','mobile','tv'];
    sendRequest(keys[Math.floor(Math.random() * 3)]);
  }, 1500);
};
document.getElementById('reset').onclick = () => { renderStage(); log.innerHTML = ''; };

renderStage();
write('Ready. Click a client to dispatch a request.', 'web');