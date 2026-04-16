const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);

const state = {
  sent: 0, retries: 0, writes: 0, dupes: 0,
  events: [], // {x, y, color, time, label}
  seenKeys: new Set()
};

function resize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = 280 * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
}
resize();
window.addEventListener('resize', () => { resize(); draw(); });

function updateStats() {
  $('sent').textContent = state.sent;
  $('retries').textContent = state.retries;
  $('writes').textContent = state.writes;
  $('dupes').textContent = state.dupes;
}

function draw() {
  const w = canvas.width / devicePixelRatio;
  const h = canvas.height / devicePixelRatio;
  ctx.clearRect(0, 0, w, h);
  // timeline axis
  ctx.strokeStyle = '#262a38';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, h / 2);
  ctx.lineTo(w - 20, h / 2);
  ctx.stroke();
  ctx.fillStyle = '#8b8fa3';
  ctx.font = '11px monospace';
  ctx.fillText('client', 4, h / 2 - 60);
  ctx.fillText('server', 4, h / 2 + 70);

  const now = performance.now();
  state.events = state.events.filter(e => now - e.time < 8000);
  state.events.forEach(e => {
    const age = (now - e.time) / 8000;
    const x = 40 + age * (w - 60);
    if (x > w - 20) return;
    ctx.globalAlpha = 1 - age * 0.3;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(x, e.y, 6, 0, Math.PI * 2);
    ctx.fill();
    if (e.label) {
      ctx.fillStyle = '#8b8fa3';
      ctx.font = '10px monospace';
      ctx.fillText(e.label, x - 20, e.y - 12);
    }
  });
  ctx.globalAlpha = 1;
}

function attemptDelivery(key, isRetry) {
  const flaky = parseInt($('flaky').value) / 100;
  const idem = $('idem').checked;
  const h = 280;
  state.events.push({ y: 70, color: isRetry ? '#fbbf24' : '#6ee7b7', time: performance.now(), label: isRetry ? 'retry' : key.slice(0, 6) });

  // simulate network flakiness
  if (Math.random() < flaky) {
    state.retries++;
    // Ack lost, client retries after delay
    setTimeout(() => attemptDelivery(key, true), 300 + Math.random() * 400);
    // But the server might have already processed!
    setTimeout(() => processOnServer(key, idem), 100);
  } else {
    setTimeout(() => processOnServer(key, idem), 100);
  }
  updateStats();
}

function processOnServer(key, idem) {
  if (idem && state.seenKeys.has(key)) {
    state.events.push({ y: 210, color: '#8b8fa3', time: performance.now(), label: 'dedup' });
  } else {
    if (state.seenKeys.has(key)) {
      state.dupes++;
      state.events.push({ y: 210, color: '#ef4444', time: performance.now(), label: 'DUP!' });
    } else {
      state.events.push({ y: 210, color: '#6ee7b7', time: performance.now(), label: 'write' });
    }
    state.seenKeys.add(key);
    state.writes++;
  }
  updateStats();
}

function send() {
  state.sent++;
  const key = 'req_' + Math.random().toString(36).slice(2, 8);
  attemptDelivery(key, false);
}

function burst() {
  for (let i = 0; i < 10; i++) setTimeout(send, i * 120);
}

function reset() {
  state.sent = state.retries = state.writes = state.dupes = 0;
  state.events = [];
  state.seenKeys.clear();
  updateStats();
}

$('send').addEventListener('click', send);
$('burst').addEventListener('click', burst);
$('reset').addEventListener('click', reset);
$('flaky').addEventListener('input', e => $('flakyVal').textContent = e.target.value + '%');

(function loop() { draw(); requestAnimationFrame(loop); })();

// Seed demo burst on load
setTimeout(burst, 400);