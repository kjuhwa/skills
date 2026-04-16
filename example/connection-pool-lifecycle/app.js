const lanesEl = document.getElementById('lanes');
const queueEl = document.getElementById('queue');
const poolSizeInput = document.getElementById('poolSize');
const maxWaitInput = document.getElementById('maxWait');
let poolSize = 8, maxWait = 2000, lanes = [], waitQueue = [], reqId = 0;

function rebuild() {
  lanesEl.innerHTML = '';
  lanes = [];
  for (let i = 0; i < poolSize; i++) {
    const div = document.createElement('div');
    div.className = 'lane idle';
    div.innerHTML = `<div class="id">conn-${i}</div><div class="bar" style="width:100%"></div><div class="state">IDLE</div>`;
    lanesEl.append(div);
    lanes.push({ el: div, active: false, remaining: 0 });
  }
}

poolSizeInput.oninput = () => { poolSize = +poolSizeInput.value; document.getElementById('poolVal').textContent = poolSize; rebuild(); };
maxWaitInput.oninput = () => { maxWait = +maxWaitInput.value; document.getElementById('waitVal').textContent = maxWait; };

function tryAcquire(rid) {
  const lane = lanes.find(l => !l.active);
  if (lane) {
    lane.active = true;
    lane.remaining = 1000 + Math.random() * 3000;
    lane.total = lane.remaining;
    lane.el.className = 'lane active';
    lane.el.querySelector('.state').textContent = `REQ #${rid}`;
    return true;
  }
  return false;
}

function newRequest() {
  reqId++;
  if (!tryAcquire(reqId)) {
    const el = document.createElement('div');
    el.className = 'req'; el.textContent = `#${reqId}`;
    queueEl.append(el);
    waitQueue.push({ id: reqId, el, born: Date.now() });
  }
}

function tick() {
  lanes.forEach(l => {
    if (!l.active) return;
    l.remaining -= 100;
    const pct = Math.max(0, l.remaining / l.total * 100);
    l.el.querySelector('.bar').style.width = pct + '%';
    if (l.remaining <= 0) {
      l.active = false;
      l.el.className = 'lane idle';
      l.el.querySelector('.state').textContent = 'IDLE';
      l.el.querySelector('.bar').style.width = '100%';
      drainQueue();
    }
  });
  // expire old waiters
  const now = Date.now();
  waitQueue = waitQueue.filter(w => {
    if (now - w.born > maxWait) { w.el.remove(); return false; }
    return true;
  });
}

function drainQueue() {
  if (!waitQueue.length) return;
  const w = waitQueue.shift();
  w.el.remove();
  tryAcquire(w.id);
}

rebuild();
setInterval(tick, 100);
setInterval(() => { if (Math.random() < 0.6) newRequest(); }, 400);
for (let i = 0; i < 6; i++) newRequest();