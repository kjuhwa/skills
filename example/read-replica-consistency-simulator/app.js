const state = {
  primary: { value: 100, tick: 0 },
  replicas: [
    { value: 100, lag: 1, queue: [] },
    { value: 100, lag: 3, queue: [] },
    { value: 100, lag: 6, queue: [] }
  ]
};

function logEvent(text, cls = '') {
  const ev = document.createElement('div');
  ev.className = 'event ' + cls;
  const t = new Date().toLocaleTimeString();
  ev.textContent = `[${t}] ${text}`;
  const box = document.getElementById('events');
  box.insertBefore(ev, box.firstChild);
  while (box.children.length > 30) box.removeChild(box.lastChild);
}

function writeToPrimary() {
  const newVal = parseInt(document.getElementById('newVal').value) || 0;
  state.primary.value = newVal;
  state.primary.tick++;
  const writeTick = state.primary.tick;
  state.replicas.forEach(r => {
    const applyAt = Date.now() + r.lag * 1000;
    r.queue.push({ value: newVal, tick: writeTick, applyAt });
  });
  logEvent(`WRITE balance=${newVal} (tick #${writeTick}) — propagating to 3 replicas`, 'write');
  render();
}

function readRandom() {
  const idx = Math.floor(Math.random() * 3);
  const r = state.replicas[idx];
  const stale = r.value !== state.primary.value;
  const out = document.getElementById('readResult');
  out.innerHTML = `R${idx + 1} returned: <b>${r.value}</b>` + (stale ? ' <span style="color:#ef4444">(STALE)</span>' : ' <span style="color:#6ee7b7">(fresh)</span>');
  logEvent(`READ replica-${idx + 1} → ${r.value}${stale ? ' [STALE, primary=' + state.primary.value + ']' : ''}`, stale ? 'stale' : '');
}

function render() {
  document.getElementById('primaryVal').textContent = `balance = ${state.primary.value}`;
  document.getElementById('primaryTick').textContent = state.primary.tick;
  state.replicas.forEach((r, i) => {
    document.getElementById('rVal' + i).textContent = `balance = ${r.value}`;
    document.getElementById('lag' + i).textContent = r.lag + 's';
    const pending = r.queue.length ? `queued: ${r.queue.length} op(s)` : 'idle';
    document.getElementById('q' + i).textContent = pending;
    const node = document.querySelector(`.node.replica[data-id="${i}"]`);
    if (r.value !== state.primary.value) node.classList.add('stale');
    else node.classList.remove('stale');
  });
}

function tick() {
  const now = Date.now();
  state.replicas.forEach((r, i) => {
    while (r.queue.length && r.queue[0].applyAt <= now) {
      const op = r.queue.shift();
      r.value = op.value;
      logEvent(`replica-${i + 1} applied tick #${op.tick} → ${op.value}`);
    }
  });
  render();
}

document.getElementById('writeBtn').onclick = writeToPrimary;
document.getElementById('readBtn').onclick = readRandom;
[0, 1, 2].forEach(i => {
  document.getElementById('s' + i).oninput = e => {
    state.replicas[i].lag = parseFloat(e.target.value);
    render();
  };
});

render();
setInterval(tick, 200);
logEvent('Cluster initialized: 1 primary + 3 replicas');