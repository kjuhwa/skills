const state = {
  running: false, buffer: 0, maxBuffer: 10000,
  ingested: 0, dropped: 0, compactions: 0,
  producers: [], shards: [], tputWindow: []
};

function initProducers(n) {
  state.producers = Array.from({ length: n }, (_, i) => ({
    id: i + 1, host: `prod-${String(i + 1).padStart(2, '0')}`, active: false, rate: 0
  }));
  renderProducers();
}

function initShards() {
  state.shards = Array.from({ length: 8 }, (_, i) => ({
    id: i, size: 0, hot: false
  }));
  renderShards();
}

function renderProducers() {
  document.getElementById('prod-nodes').innerHTML = state.producers.map(p =>
    `<div class="node ${p.active ? 'active' : ''}"><span>${p.host}</span><b>${p.rate}/s</b></div>`
  ).join('');
}

function renderShards() {
  document.getElementById('shard-grid').innerHTML = state.shards.map(s =>
    `<div class="shard ${s.hot ? 'hot' : ''}">s${s.id}<b>${s.size}</b></div>`
  ).join('');
}

function log(msg, cls = 'info') {
  const el = document.getElementById('log');
  const time = new Date().toLocaleTimeString();
  el.insertAdjacentHTML('afterbegin', `<div class="log-${cls}">[${time}] ${msg}</div>`);
  while (el.children.length > 30) el.removeChild(el.lastChild);
}

function tick() {
  if (!state.running) return;
  const rate = +document.getElementById('rate').value;
  const active = state.producers.filter(p => Math.random() > 0.1);
  let produced = 0;
  active.forEach(p => {
    p.active = true;
    p.rate = Math.round(rate / state.producers.length + (Math.random() - 0.5) * 10);
    produced += p.rate;
  });
  state.producers.forEach(p => { if (!active.includes(p)) p.active = false; });

  const flushed = Math.min(state.buffer, rate * 0.9);
  state.buffer -= flushed;
  state.ingested += flushed;
  for (let i = 0; i < flushed; i++) {
    const idx = Math.floor(Math.random() * state.shards.length);
    state.shards[idx].size++;
  }

  state.buffer += produced;
  if (state.buffer > state.maxBuffer) {
    const drop = state.buffer - state.maxBuffer;
    state.dropped += drop;
    state.buffer = state.maxBuffer;
    log(`WAL full, dropped ${Math.round(drop)} points`, 'err');
  }

  state.shards.forEach(s => {
    s.hot = s.size > 5000;
    if (s.size > 8000) {
      log(`Compacting shard s${s.id} (${s.size} → ${Math.round(s.size * 0.3)})`, 'ok');
      s.size = Math.round(s.size * 0.3);
      state.compactions++;
    }
  });

  state.tputWindow.push(flushed);
  if (state.tputWindow.length > 10) state.tputWindow.shift();
  const tput = Math.round(state.tputWindow.reduce((a, b) => a + b, 0));

  document.getElementById('buffer-fill').style.width = (state.buffer / state.maxBuffer * 100) + '%';
  document.getElementById('buffer-txt').textContent = `${Math.round(state.buffer)} / ${state.maxBuffer}`;
  document.getElementById('m-ingested').textContent = Math.round(state.ingested).toLocaleString();
  document.getElementById('m-dropped').textContent = Math.round(state.dropped).toLocaleString();
  document.getElementById('m-tput').textContent = tput + '/s';
  document.getElementById('m-compact').textContent = state.compactions;
  renderProducers();
  renderShards();
}

document.getElementById('start').onclick = () => {
  state.running = true;
  document.getElementById('status').textContent = '● RUNNING';
  document.getElementById('status').classList.add('running');
  log('Ingest pipeline started', 'ok');
};
document.getElementById('stop').onclick = () => {
  state.running = false;
  document.getElementById('status').textContent = '● STOPPED';
  document.getElementById('status').classList.remove('running');
  state.producers.forEach(p => { p.active = false; p.rate = 0; });
  renderProducers();
  log('Pipeline halted', 'info');
};
document.getElementById('rate').oninput = e => document.getElementById('rateval').textContent = e.target.value;
document.getElementById('producers-n').oninput = e => {
  document.getElementById('prodval').textContent = e.target.value;
  initProducers(+e.target.value);
};

initProducers(4);
initShards();
log('Simulator ready. Click Start.', 'info');
setInterval(tick, 1000);