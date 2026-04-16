const state = {
  cash: 100, served: 0, lost: 0,
  speed: 1, trafficBoost: 0,
  pool: [],
  queue: [],
  done: [],
  nextId: 1
};

function addConnection() {
  state.pool.push({ id: state.pool.length, busy: false, req: null, progress: 0, hangChance: 0.03 });
}
for (let i = 0; i < 3; i++) addConnection();

const qSlots = document.getElementById('qSlots');
const pSlots = document.getElementById('pSlots');
const dSlots = document.getElementById('dSlots');

document.getElementById('buySlot').onclick = () => {
  if (state.cash >= 50) { state.cash -= 50; addConnection(); }
};
document.getElementById('upgrade').onclick = () => {
  if (state.cash >= 75) { state.cash -= 75; state.speed *= 1.2; }
};
document.getElementById('marketing').onclick = () => {
  if (state.cash >= 30) { state.cash -= 30; state.trafficBoost += 8; }
};

function spawnRequest() {
  const urgent = Math.random() < 0.2;
  state.queue.push({
    id: state.nextId++,
    dur: 2000 + Math.random() * 3000,
    reward: urgent ? 8 : 4,
    urgent,
    ttl: urgent ? 4000 : 8000,
    age: 0
  });
}

let spawnAcc = 0;
function tick(dt) {
  const rate = 0.6 + state.trafficBoost * 0.1;
  state.trafficBoost = Math.max(0, state.trafficBoost - dt / 1000);
  spawnAcc += dt * rate / 1000;
  while (spawnAcc > 1) { spawnRequest(); spawnAcc -= 1; }

  state.queue.forEach(q => q.age += dt);
  state.queue = state.queue.filter(q => {
    if (q.age > q.ttl) { state.lost++; return false; }
    return true;
  });

  for (const c of state.pool) {
    if (!c.busy && state.queue.length) {
      c.req = state.queue.shift();
      c.busy = true; c.progress = 0; c.hung = false;
      if (Math.random() < c.hangChance) c.hung = true;
    }
    if (c.busy && !c.hung) {
      c.progress += dt * state.speed;
      if (c.progress >= c.req.dur) {
        state.cash += c.req.reward;
        state.served++;
        state.done.unshift({ id: c.req.id, reward: c.req.reward });
        if (state.done.length > 6) state.done.pop();
        c.busy = false; c.req = null;
      }
    }
  }
}

function render() {
  document.getElementById('cash').textContent = Math.floor(state.cash);
  document.getElementById('served').textContent = state.served;
  document.getElementById('lost').textContent = state.lost;

  qSlots.innerHTML = state.queue.slice(0, 8).map(q => `
    <div class="req ${q.urgent ? 'urgent' : ''}">
      #${q.id} · ${q.reward}¢
      <div class="bar"><div style="width:${(1 - q.age/q.ttl)*100}%"></div></div>
    </div>
  `).join('');

  pSlots.innerHTML = state.pool.map((c, i) => `
    <div class="conn ${c.busy ? 'busy' : ''} ${c.hung ? 'hung' : ''}" data-idx="${i}">
      <div class="name">conn-${i}</div>
      <div class="status">${c.hung ? 'HUNG' : c.busy ? `#${c.req.id}` : 'idle'}</div>
      ${c.busy ? `<div class="bar" style="margin-top:4px;height:3px;background:#374151;border-radius:2px;overflow:hidden"><div style="height:100%;background:#6ee7b7;width:${(c.progress/c.req.dur)*100}%"></div></div>` : ''}
    </div>
  `).join('');

  pSlots.querySelectorAll('.conn').forEach(el => {
    el.onclick = () => {
      const c = state.pool[+el.dataset.idx];
      if (c.hung) { c.busy = false; c.req = null; c.hung = false; state.lost++; }
    };
  });

  dSlots.innerHTML = state.done.map(d => `<div class="req">#${d.id} · +${d.reward}¢</div>`).join('');

  document.getElementById('buySlot').disabled = state.cash < 50;
  document.getElementById('upgrade').disabled = state.cash < 75;
  document.getElementById('marketing').disabled = state.cash < 30;
}

let last = performance.now();
function loop(now) {
  const dt = now - last; last = now;
  tick(dt); render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);