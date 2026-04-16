const svg = document.getElementById('svg');
const counter = document.getElementById('counter');
const NS = 'http://www.w3.org/2000/svg';
const POOL_SIZE = 12;
const conns = [];

function makeConn(i) {
  const cx = 70 + (i % 6) * 120, cy = 100 + Math.floor(i / 6) * 180;
  const g = document.createElementNS(NS, 'g');
  const circle = document.createElementNS(NS, 'circle');
  circle.setAttribute('cx', cx); circle.setAttribute('cy', cy); circle.setAttribute('r', 32);
  circle.setAttribute('fill', '#1a1d27'); circle.setAttribute('stroke', '#6ee7b7'); circle.setAttribute('stroke-width', 2);
  const txt = document.createElementNS(NS, 'text');
  txt.setAttribute('x', cx); txt.setAttribute('y', cy + 5); txt.setAttribute('text-anchor', 'middle');
  txt.setAttribute('fill', '#8b949e'); txt.setAttribute('font-size', '11'); txt.textContent = `C${i + 1}`;
  g.append(circle, txt);
  svg.append(g);
  return { g, circle, txt, cx, cy, active: false, pulse: null };
}

for (let i = 0; i < POOL_SIZE; i++) conns.push(makeConn(i));

function acquire() {
  const idle = conns.find(c => !c.active);
  if (!idle) return;
  idle.active = true;
  idle.circle.setAttribute('fill', '#6ee7b733');
  idle.circle.setAttribute('stroke', '#6ee7b7');
  idle.txt.setAttribute('fill', '#6ee7b7');
  idle.txt.textContent = 'BUSY';
  startPulse(idle);
  updateCounter();
}

function release() {
  const busy = conns.filter(c => c.active);
  if (!busy.length) return;
  const c = busy[Math.floor(Math.random() * busy.length)];
  c.active = false;
  c.circle.setAttribute('fill', '#1a1d27');
  c.circle.setAttribute('stroke', '#6ee7b7');
  c.txt.setAttribute('fill', '#8b949e');
  c.txt.textContent = `C${conns.indexOf(c) + 1}`;
  if (c.pulse) { clearInterval(c.pulse); c.pulse = null; c.circle.setAttribute('r', 32); }
  updateCounter();
}

function startPulse(c) {
  let big = false;
  c.pulse = setInterval(() => { big = !big; c.circle.setAttribute('r', big ? 36 : 32); }, 600);
}

function updateCounter() {
  const a = conns.filter(c => c.active).length;
  counter.textContent = `${a} / ${POOL_SIZE} active`;
}

document.getElementById('btnAdd').onclick = acquire;
document.getElementById('btnRelease').onclick = release;

// seed initial state
for (let i = 0; i < 5; i++) acquire();

// auto-simulate
setInterval(() => { Math.random() < 0.5 ? acquire() : release(); }, 1500);
updateCounter();