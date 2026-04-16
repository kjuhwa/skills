const routes = [
  { name: "GET /users", legacy: true },
  { name: "POST /orders", legacy: true },
  { name: "GET /products", legacy: true },
  { name: "PUT /cart", legacy: true },
  { name: "GET /search", legacy: true },
  { name: "POST /auth", legacy: true },
  { name: "GET /inventory", legacy: true },
  { name: "POST /payment", legacy: true },
  { name: "GET /reviews", legacy: true },
  { name: "GET /shipping", legacy: true }
];

const canvas = document.getElementById('flow');
const ctx = canvas.getContext('2d');
const packets = [];
let autoTimer = null;

function render() {
  const legacy = routes.filter(r => r.legacy);
  const migrated = routes.filter(r => !r.legacy);
  document.getElementById('legacyList').innerHTML = legacy.map(r => `<li data-name="${r.name}">${r.name}</li>`).join('');
  document.getElementById('newList').innerHTML = migrated.map(r => `<li>${r.name} <small style="color:#6ee7b7">v2</small></li>`).join('');
  document.getElementById('legacyCount').textContent = legacy.length;
  document.getElementById('newCount').textContent = migrated.length;
  document.getElementById('progress').textContent = Math.round((migrated.length / routes.length) * 100) + '%';
}

function log(msg) {
  const ul = document.getElementById('log');
  const li = document.createElement('li');
  const time = new Date().toLocaleTimeString();
  li.textContent = `[${time}] ${msg}`;
  ul.prepend(li);
  if (ul.children.length > 30) ul.lastChild.remove();
}

function strangleNext() {
  const next = routes.find(r => r.legacy);
  if (!next) { log('Migration complete. Legacy decommissioned.'); stopAuto(); return; }
  const el = document.querySelector(`[data-name="${next.name}"]`);
  if (el) el.classList.add('migrating');
  log(`Routing ${next.name} → new service…`);
  setTimeout(() => {
    next.legacy = false;
    render();
    log(`✓ ${next.name} migrated.`);
  }, 600);
}

function startAuto() {
  if (autoTimer) return;
  const speed = +document.getElementById('speed').value;
  autoTimer = setInterval(strangleNext, speed);
}
function stopAuto() { clearInterval(autoTimer); autoTimer = null; }

document.getElementById('stepBtn').onclick = strangleNext;
document.getElementById('autoBtn').onclick = () => autoTimer ? stopAuto() : startAuto();
document.getElementById('resetBtn').onclick = () => { routes.forEach(r => r.legacy = true); stopAuto(); render(); log('Reset.'); };

function spawnPacket() {
  const r = routes[Math.floor(Math.random() * routes.length)];
  packets.push({ x: 20, y: 40 + Math.random() * 340, target: r.legacy ? 'legacy' : 'new', progress: 0 });
}

let newRps = 0, rpsCount = 0;
function drawFlow() {
  ctx.fillStyle = '#1a1d27';
  ctx.fillRect(0, 0, 320, 420);
  ctx.strokeStyle = '#6ee7b7'; ctx.lineWidth = 2;
  ctx.strokeRect(130, 180, 60, 60);
  ctx.fillStyle = '#6ee7b7'; ctx.font = '10px sans-serif';
  ctx.fillText('Proxy', 142, 215);
  ctx.strokeStyle = '#f87171';
  ctx.strokeRect(10, 180, 60, 60); ctx.fillStyle = '#f87171'; ctx.fillText('Legacy', 20, 215);
  ctx.strokeStyle = '#6ee7b7';
  ctx.strokeRect(250, 180, 60, 60); ctx.fillStyle = '#6ee7b7'; ctx.fillText('New', 265, 215);

  for (let i = packets.length - 1; i >= 0; i--) {
    const p = packets[i];
    p.progress += 0.015;
    let x, y;
    if (p.progress < 0.4) {
      const t = p.progress / 0.4;
      x = 20 + t * 110; y = p.y + (210 - p.y) * t;
    } else {
      const t = (p.progress - 0.4) / 0.6;
      const targetX = p.target === 'legacy' ? 40 : 280;
      x = 160 + (targetX - 160) * t; y = 210;
    }
    ctx.fillStyle = p.target === 'legacy' ? '#f87171' : '#6ee7b7';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    if (p.progress >= 1) { if (p.target === 'new') rpsCount++; packets.splice(i, 1); }
  }
  if (Math.random() < 0.3) spawnPacket();
  requestAnimationFrame(drawFlow);
}

setInterval(() => { newRps = rpsCount; rpsCount = 0; document.getElementById('rps').textContent = newRps; }, 1000);

render();
log('Strangler Fig proxy online. Legacy routes: 10.');
drawFlow();