const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const writeEl = document.getElementById('write-model');
const readEl = document.getElementById('read-model');
const logEl = document.getElementById('event-log');

let state = { write: {}, events: [], read: {} };
const particles = [];

const nodes = {
  cmd:   { x: 80,  y: 180, label: 'Command' },
  write: { x: 280, y: 180, label: 'Write Model' },
  bus:   { x: 480, y: 180, label: 'Event Bus' },
  read:  { x: 680, y: 180, label: 'Read Model' },
  query: { x: 840, y: 180, label: 'Query' }
};

const routes = [
  ['cmd', 'write', '#6ee7b7'],
  ['write', 'bus', '#facc15'],
  ['bus', 'read', '#60a5fa'],
  ['query', 'read', '#f472b6']
];

function drawNode(n, active) {
  ctx.beginPath();
  ctx.arc(n.x, n.y, 42, 0, Math.PI * 2);
  ctx.fillStyle = active ? '#2a3247' : '#1f2330';
  ctx.fill();
  ctx.strokeStyle = active ? '#6ee7b7' : '#2a2f3e';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e6e8ef';
  ctx.font = '12px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText(n.label, n.x, n.y + 4);
}

function drawArrow(from, to, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(from.x + 42, from.y);
  ctx.lineTo(to.x - 42, to.y);
  ctx.stroke();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  routes.forEach(([a, b, c]) => drawArrow(nodes[a], nodes[b], c));
  Object.values(nodes).forEach(n => drawNode(n, false));
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  });
}

function animateParticle(from, to, color, onDone) {
  const p = { x: nodes[from].x, y: nodes[from].y, color };
  particles.push(p);
  const start = performance.now();
  const dur = 600;
  function step(t) {
    const pct = Math.min((t - start) / dur, 1);
    p.x = nodes[from].x + (nodes[to].x - nodes[from].x) * pct;
    p.y = nodes[from].y + (nodes[to].y - nodes[from].y) * pct;
    render();
    if (pct < 1) requestAnimationFrame(step);
    else {
      particles.splice(particles.indexOf(p), 1);
      render();
      onDone && onDone();
    }
  }
  requestAnimationFrame(step);
}

function dispatch(cmd) {
  animateParticle('cmd', 'write', '#6ee7b7', () => {
    const evt = apply(cmd);
    if (!evt) return;
    state.events.push(evt);
    updatePanes();
    animateParticle('write', 'bus', '#facc15', () => {
      animateParticle('bus', 'read', '#60a5fa', () => {
        project(evt);
        updatePanes();
      });
    });
  });
}

function apply(cmd) {
  const id = state.write.id || 'ORD-' + Math.floor(Math.random() * 900 + 100);
  if (cmd === 'CreateOrder' && !state.write.id) {
    state.write = { id, status: 'created', total: 129.5 };
    return { type: 'OrderCreated', id, total: 129.5, ts: Date.now() };
  }
  if (cmd === 'PayOrder' && state.write.status === 'created') {
    state.write.status = 'paid';
    return { type: 'OrderPaid', id, ts: Date.now() };
  }
  if (cmd === 'ShipOrder' && state.write.status === 'paid') {
    state.write.status = 'shipped';
    return { type: 'OrderShipped', id, ts: Date.now() };
  }
  if (cmd === 'CancelOrder' && state.write.status && state.write.status !== 'shipped') {
    state.write.status = 'cancelled';
    return { type: 'OrderCancelled', id, ts: Date.now() };
  }
  return null;
}

function project(evt) {
  if (evt.type === 'OrderCreated') state.read[evt.id] = { id: evt.id, total: evt.total, status: 'created' };
  else if (state.read[evt.id]) state.read[evt.id].status = evt.type.replace('Order', '').toLowerCase();
}

function updatePanes() {
  writeEl.textContent = JSON.stringify(state.write, null, 2);
  readEl.textContent = JSON.stringify(state.read, null, 2);
  logEl.innerHTML = state.events.map(e => `<li>${e.type} <span style="color:#8b92a7">${e.id}</span></li>`).join('');
}

document.querySelectorAll('[data-cmd]').forEach(b =>
  b.addEventListener('click', () => dispatch(b.dataset.cmd)));
document.getElementById('query-btn').addEventListener('click', () =>
  animateParticle('query', 'read', '#f472b6'));
document.getElementById('reset-btn').addEventListener('click', () => {
  state = { write: {}, events: [], read: {} };
  updatePanes();
  render();
});

updatePanes();
render();