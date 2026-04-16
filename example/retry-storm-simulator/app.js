const stage = document.getElementById('stage');
const N = 50;
const SERVER = { x: 700, y: 210, capacity: 5, load: 0 };
let clients = [], tick = 0, peak = 0, completed = 0, mode = 'none';

function reset() {
  clients = [];
  tick = 0; peak = 0; completed = 0;
  SERVER.load = 0;
  stage.innerHTML = '';
  for (let i = 0; i < N; i++) {
    clients.push({
      id: i,
      x: 60, y: 30 + i * 7.5,
      state: 'waiting',
      nextAttempt: 10 + Math.floor(Math.random() * 5),
      attempts: 0,
      lastDelay: 50
    });
  }
  const srv = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  srv.setAttribute('id', 'server');
  srv.setAttribute('x', SERVER.x - 30);
  srv.setAttribute('y', SERVER.y - 40);
  srv.setAttribute('width', 60);
  srv.setAttribute('height', 80);
  srv.setAttribute('rx', 6);
  srv.setAttribute('fill', '#6ee7b7');
  stage.appendChild(srv);
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('x', SERVER.x);
  label.setAttribute('y', SERVER.y + 60);
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('fill', '#8b93a7');
  label.setAttribute('font-size', '11');
  label.textContent = 'SERVER';
  stage.appendChild(label);
  clients.forEach(c => {
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('id', 'c' + c.id);
    dot.setAttribute('r', 3);
    dot.setAttribute('cx', c.x);
    dot.setAttribute('cy', c.y);
    dot.setAttribute('fill', '#8b93a7');
    stage.appendChild(dot);
  });
}

function nextDelay(c) {
  const base = 50;
  const cap = 1000;
  const exp = Math.min(cap, base * Math.pow(2, c.attempts));
  if (mode === 'none') return exp;
  if (mode === 'full') return Math.random() * exp;
  if (mode === 'decorrelated') return Math.min(cap, Math.random() * (c.lastDelay * 3 - base) + base);
  return exp;
}

function step() {
  tick++;
  let inflight = 0;
  SERVER.load = Math.max(0, SERVER.load - 1);
  clients.forEach(c => {
    const dot = document.getElementById('c' + c.id);
    if (c.state === 'done') { dot.setAttribute('fill', '#6ee7b7'); return; }
    if (c.state === 'waiting') {
      if (tick >= c.nextAttempt) {
        c.state = 'flying';
        c.attempts++;
        inflight++;
      }
    }
    if (c.state === 'flying') {
      c.x += (SERVER.x - c.x) * 0.15;
      if (c.x > SERVER.x - 40) {
        if (SERVER.load < SERVER.capacity) {
          SERVER.load++;
          c.state = 'done';
          completed++;
        } else {
          c.state = 'waiting';
          c.x = 60;
          const d = nextDelay(c);
          c.lastDelay = d;
          c.nextAttempt = tick + Math.max(1, Math.round(d / 50));
          dot.setAttribute('fill', '#f87171');
        }
      } else {
        dot.setAttribute('fill', '#fbbf24');
      }
    }
    dot.setAttribute('cx', c.x);
  });
  const srv = document.getElementById('server');
  const overload = SERVER.load / SERVER.capacity;
  srv.setAttribute('fill', overload > 0.9 ? '#f87171' : overload > 0.5 ? '#fbbf24' : '#6ee7b7');
  peak = Math.max(peak, inflight);
  document.getElementById('reqs').textContent = inflight;
  document.getElementById('succ').textContent = completed;
  document.getElementById('peak').textContent = peak;
}

document.querySelectorAll('input[name=mode]').forEach(r => r.onchange = e => { mode = e.target.value; reset(); });
document.getElementById('restart').onclick = reset;
reset();
setInterval(step, 80);