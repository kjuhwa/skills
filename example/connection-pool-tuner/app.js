const pSel = document.getElementById('poolSize'), rSel = document.getElementById('reqRate'), qSel = document.getElementById('queryTime');
const pVal = document.getElementById('poolVal'), rVal = document.getElementById('rateVal'), qVal = document.getElementById('qtVal');
const metersEl = document.getElementById('meters');
const latCtx = document.getElementById('latChart').getContext('2d');
const utilCtx = document.getElementById('utilChart').getContext('2d');
let poolSize = 10, reqRate = 5, queryTime = 300;
let slots = [], latHistory = [], utilHistory = [], pendingQueue = 0;

function buildSlots() {
  slots = []; for (let i = 0; i < poolSize; i++) slots.push({ busy: false, remaining: 0 });
}
buildSlots();

[pSel, rSel, qSel].forEach(el => el.addEventListener('input', () => {
  poolSize = +pSel.value; reqRate = +rSel.value; queryTime = +qSel.value;
  pVal.textContent = poolSize; rVal.textContent = reqRate; qVal.textContent = queryTime;
  buildSlots(); latHistory = []; utilHistory = [];
}));

function tick() {
  const incoming = Math.random() < reqRate / 20 ? 1 : 0;
  let newReqs = incoming + (pendingQueue > 0 ? 1 : 0);
  if (incoming && pendingQueue > 0) pendingQueue--;
  for (let i = 0; i < newReqs; i++) {
    const s = slots.find(s => !s.busy);
    if (s) { s.busy = true; s.remaining = queryTime * (0.5 + Math.random()) | 0; }
    else pendingQueue++;
  }
  let busyCount = 0;
  slots.forEach(s => { if (s.busy) { s.remaining -= 50; if (s.remaining <= 0) s.busy = false; else busyCount++; } });
  const util = (busyCount / poolSize) * 100;
  const latency = pendingQueue > 0 ? queryTime + pendingQueue * 80 + Math.random() * 100 : queryTime * (0.3 + Math.random() * 0.7);
  latHistory.push(latency | 0); if (latHistory.length > 60) latHistory.shift();
  utilHistory.push(util); if (utilHistory.length > 60) utilHistory.shift();
  renderMeters(); drawChart(latCtx, latHistory, 2000, '#f0883e'); drawChart(utilCtx, utilHistory, 100, '#6ee7b7');
}

function drawChart(cx, data, maxVal, color) {
  const w = 420, h = 200;
  cx.clearRect(0, 0, w, h);
  cx.strokeStyle = '#2a2d37'; cx.beginPath(); cx.moveTo(0, h - 1); cx.lineTo(w, h - 1); cx.stroke();
  if (data.length < 2) return;
  cx.beginPath(); cx.strokeStyle = color; cx.lineWidth = 2;
  data.forEach((v, i) => {
    const x = (i / 59) * w, y = h - (v / maxVal) * (h - 10);
    i === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y);
  });
  cx.stroke();
  cx.lineTo((data.length - 1) / 59 * w, h); cx.lineTo(0, h); cx.closePath();
  cx.fillStyle = color.replace(')', ',0.1)').replace('rgb', 'rgba'); cx.fill();
  cx.lineWidth = 1;
  cx.fillStyle = color; cx.font = '12px sans-serif';
  cx.fillText(data[data.length - 1].toFixed(0), w - 40, 16);
}

function renderMeters() {
  metersEl.innerHTML = slots.map((s, i) =>
    `<div class="meter ${s.busy ? 'busy' : 'idle'}">${i + 1}</div>`
  ).join('');
}

renderMeters();
setInterval(tick, 50);