const chart = document.getElementById('chart');
const ctx = chart.getContext('2d');
const log = document.getElementById('log');
const dot = document.getElementById('dot');
const statusText = document.getElementById('statusText');
const latencyEl = document.getElementById('latency');
const mpsEl = document.getElementById('mps');
const totalEl = document.getElementById('total');
const peakEl = document.getElementById('peak');
const avgLatEl = document.getElementById('avgLat');

const history = new Array(120).fill(0);
let total = 0, peak = 0, running = true, latencies = [];
const events = ['data', 'ping', 'ack', 'subscribe', 'heartbeat', 'publish'];

function connect() {
  statusText.textContent = 'Connected';
  dot.classList.remove('off');
  addLog('Connection established to wss://mock.endpoint', 'info');
}

function addLog(msg, type='info') {
  const li = document.createElement('li');
  li.className = type;
  const t = new Date().toLocaleTimeString();
  li.innerHTML = `<span class="time">${t}</span>${msg}`;
  log.prepend(li);
  while (log.children.length > 50) log.removeChild(log.lastChild);
}

function tick() {
  if (!running) { requestAnimationFrame(tick); return; }
  const burst = Math.random() < 0.05 ? 20 : 0;
  const count = Math.floor(Math.random() * 8) + burst;
  history.shift();
  history.push(count);
  total += count;
  if (count > peak) peak = count;

  const lat = 20 + Math.random() * 80;
  latencies.push(lat);
  if (latencies.length > 30) latencies.shift();
  latencyEl.textContent = `${lat.toFixed(0)} ms`;

  for (let i = 0; i < Math.min(count, 2); i++) {
    if (Math.random() < 0.2) {
      const ev = events[Math.floor(Math.random()*events.length)];
      addLog(`← ${ev} #${Math.floor(Math.random()*9999)}`, Math.random()<0.1?'warn':'info');
    }
  }

  draw();
  mpsEl.textContent = count;
  totalEl.textContent = total;
  peakEl.textContent = peak;
  avgLatEl.textContent = (latencies.reduce((a,b)=>a+b,0)/latencies.length).toFixed(0) + 'ms';
  setTimeout(() => requestAnimationFrame(tick), 150);
}

function draw() {
  const w = chart.width, h = chart.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#252836';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = (h / 5) * i;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  const max = Math.max(...history, 10);
  const step = w / history.length;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(110,231,183,0.4)');
  grad.addColorStop(1, 'rgba(110,231,183,0)');
  ctx.beginPath();
  ctx.moveTo(0, h);
  history.forEach((v, i) => {
    const x = i * step;
    const y = h - (v / max) * (h - 20);
    ctx.lineTo(x, y);
  });
  ctx.lineTo(w, h);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  history.forEach((v, i) => {
    const x = i * step;
    const y = h - (v / max) * (h - 20);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#6ee7b7';
  ctx.lineWidth = 2;
  ctx.stroke();
}

document.getElementById('toggle').onclick = (e) => {
  running = !running;
  e.target.textContent = running ? 'Pause' : 'Resume';
  addLog(running ? 'Stream resumed' : 'Stream paused', 'warn');
};
document.getElementById('burst').onclick = () => {
  for (let i = 0; i < 5; i++) history[history.length-1-i] += 30;
  addLog('Simulated traffic burst injected', 'warn');
};
document.getElementById('clear').onclick = () => { log.innerHTML = ''; };

connect();
tick();