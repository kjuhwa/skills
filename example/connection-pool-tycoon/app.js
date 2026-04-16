const state = {
  money: 500,
  served: 0,
  lost: 0,
  score: 0,
  slots: [{ busy: null }, { busy: null }],
  queue: [],
  slotCost: 100,
  speedLvl: 1,
  speedCost: 150,
  capLvl: 1,
  capCost: 120,
  maxQueue: 5,
  processSpeed: 1
};

let reqId = 1;

function spawnRequest() {
  if (state.queue.length >= state.maxQueue) { state.lost++; return; }
  const payout = 10 + Math.floor(Math.random() * 30);
  const patience = 5000 + Math.random() * 5000;
  state.queue.push({
    id: reqId++,
    payout,
    ttl: patience,
    max: patience,
    work: 2000 + Math.random() * 3000
  });
}

function tick(dt) {
  // assign queue → slots
  for (const slot of state.slots) {
    if (!slot.busy && state.queue.length) {
      slot.busy = state.queue.shift();
      slot.busy.progress = 0;
    }
  }
  // progress
  for (const slot of state.slots) {
    if (slot.busy) {
      slot.busy.progress += dt * state.processSpeed;
      if (slot.busy.progress >= slot.busy.work) {
        state.money += slot.busy.payout;
        state.served++;
        state.score += slot.busy.payout;
        toast(`+$${slot.busy.payout}`);
        slot.busy = null;
      }
    }
  }
  // timeouts
  state.queue = state.queue.filter(r => {
    r.ttl -= dt;
    if (r.ttl <= 0) { state.lost++; state.score = Math.max(0, state.score - 10); return false; }
    return true;
  });
}

function render() {
  document.getElementById('money').textContent = '$' + state.money;
  document.getElementById('served').textContent = state.served;
  document.getElementById('lost').textContent = state.lost;
  document.getElementById('score').textContent = state.score;
  document.getElementById('slot-cost').textContent = '$' + state.slotCost;
  document.getElementById('speed-cost').textContent = '$' + state.speedCost;
  document.getElementById('cap-cost').textContent = '$' + state.capCost;
  document.getElementById('speed-lvl').textContent = state.speedLvl;
  document.getElementById('cap-lvl').textContent = state.capLvl;

  const pool = document.getElementById('pool');
  pool.innerHTML = '';
  state.slots.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'slot ' + (s.busy ? 'busy' : 'idle');
    if (s.busy) {
      const pct = Math.min(100, (s.busy.progress / s.busy.work) * 100);
      div.innerHTML = `<span class="id">#${s.busy.id}</span><div class="progress" style="width:${pct}%"></div>`;
    } else {
      div.innerHTML = `<span class="id">slot ${i}</span>`;
    }
    pool.appendChild(div);
  });

  const q = document.getElementById('queue');
  q.innerHTML = '';
  state.queue.forEach(r => {
    const div = document.createElement('div');
    const urgent = r.ttl / r.max < 0.3;
    div.className = 'req' + (urgent ? ' urgent' : '');
    div.innerHTML = `<span>req#${r.id}</span><span>$${r.payout}</span><span>${(r.ttl/1000).toFixed(1)}s</span>`;
    q.appendChild(div);
  });

  document.getElementById('buy-slot').disabled = state.money < state.slotCost;
  document.getElementById('upgrade-speed').disabled = state.money < state.speedCost;
  document.getElementById('upgrade-capacity').disabled = state.money < state.capCost;
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.h);
  toast.h = setTimeout(() => t.classList.remove('show'), 1200);
}

document.getElementById('buy-slot').onclick = () => {
  if (state.money < state.slotCost) return;
  state.money -= state.slotCost;
  state.slots.push({ busy: null });
  state.slotCost = Math.floor(state.slotCost * 1.6);
};
document.getElementById('upgrade-speed').onclick = () => {
  if (state.money < state.speedCost) return;
  state.money -= state.speedCost;
  state.speedLvl++;
  state.processSpeed *= 1.25;
  state.speedCost = Math.floor(state.speedCost * 1.8);
};
document.getElementById('upgrade-capacity').onclick = () => {
  if (state.money < state.capCost) return;
  state.money -= state.capCost;
  state.capLvl++;
  state.maxQueue += 3;
  state.capCost = Math.floor(state.capCost * 1.7);
};

let last = performance.now();
function loop(now) {
  const dt = now - last; last = now;
  tick(dt);
  render();
  requestAnimationFrame(loop);
}
setInterval(spawnRequest, 700);
for (let i = 0; i < 3; i++) spawnRequest();
requestAnimationFrame(loop);