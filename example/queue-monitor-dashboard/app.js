const queues = ['orders','payments','emails','notifications','analytics'];
const depths = queues.map(() => Math.floor(Math.random() * 80 + 10));
const tpData = Array.from({length: 30}, () => Math.floor(Math.random() * 200 + 50));
let totalIn = 14320, totalOut = 13870, errors = 42;

const tpCanvas = document.getElementById('tpChart');
const tpCtx = tpCanvas.getContext('2d');
tpCanvas.width = tpCanvas.parentElement.clientWidth - 28;
tpCanvas.height = 120;

function drawChart() {
  const w = tpCanvas.width, h = tpCanvas.height, max = Math.max(...tpData, 1);
  tpCtx.clearRect(0, 0, w, h);
  tpCtx.beginPath();
  tpCtx.strokeStyle = '#6ee7b7';
  tpCtx.lineWidth = 2;
  tpData.forEach((v, i) => {
    const x = (i / (tpData.length - 1)) * w, y = h - (v / max) * (h - 10);
    i === 0 ? tpCtx.moveTo(x, y) : tpCtx.lineTo(x, y);
  });
  tpCtx.stroke();
  tpCtx.lineTo(w, h); tpCtx.lineTo(0, h); tpCtx.closePath();
  tpCtx.fillStyle = 'rgba(110,231,183,.08)';
  tpCtx.fill();
}

function renderBars() {
  const el = document.getElementById('bars');
  el.innerHTML = queues.map((q, i) =>
    `<div class="bar-row"><span class="bar-label">${q}</span><div class="bar-track"><div class="bar-fill" style="width:${depths[i]}%"></div></div><span class="bar-val">${depths[i]}</span></div>`
  ).join('');
}

function addEvent(text) {
  const ul = document.getElementById('events');
  const li = document.createElement('li');
  li.textContent = new Date().toLocaleTimeString() + ' ' + text;
  ul.prepend(li);
  if (ul.children.length > 40) ul.lastChild.remove();
}

function renderKPIs() {
  document.getElementById('kpiGrid').innerHTML =
    [{val: totalIn, label:'Enqueued'},{val: totalOut, label:'Dequeued'},{val: errors, label:'Errors'},{val: Math.round(totalOut/totalIn*100)+'%', label:'Throughput'}]
    .map(k => `<div class="kpi"><div class="val">${k.val}</div><div class="label">${k.label}</div></div>`).join('');
}

function tick() {
  const delta = Math.floor(Math.random() * 40 + 5);
  tpData.push(delta); tpData.shift();
  queues.forEach((q, i) => {
    depths[i] = Math.max(0, Math.min(100, depths[i] + Math.floor(Math.random() * 21 - 10)));
  });
  totalIn += delta; totalOut += delta - Math.floor(Math.random() * 5);
  if (Math.random() < .1) { errors++; addEvent('⚠ Error on ' + queues[Math.floor(Math.random()*5)]); }
  else addEvent('✓ Processed batch of ' + delta + ' msgs');
  drawChart(); renderBars(); renderKPIs();
}

drawChart(); renderBars(); renderKPIs();
addEvent('Dashboard started');
setInterval(tick, 1500);