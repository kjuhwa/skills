const c = document.getElementById('canvas');
const ctx = c.getContext('2d');
const W = c.width, H = c.height;

const stages = [
  { name: 'SOURCE', x: 60, y: 240, color: '#6366f1' },
  { name: 'EXTRACT', x: 260, y: 240, color: '#8b5cf6' },
  { name: 'TRANSFORM', x: 500, y: 240, color: '#6ee7b7' },
  { name: 'LOAD', x: 740, y: 240, color: '#fbbf24' },
  { name: 'WAREHOUSE', x: 900, y: 240, color: '#34d399' },
];

let packets = [];
let counters = { ext: 0, trf: 0, load: 0, drop: 0 };
let running = false;
let tick = 0;

const sources = ['users.csv', 'orders.json', 'events.log', 'inventory.xml', 'clicks.parquet'];
const logEl = document.getElementById('log');

function addLog(msg, kind='') {
  const li = document.createElement('li');
  li.textContent = `[${tick.toString().padStart(4,'0')}] ${msg}`;
  if (kind) li.className = kind;
  logEl.prepend(li);
  while (logEl.children.length > 40) logEl.lastChild.remove();
}

function spawn() {
  const src = sources[Math.floor(Math.random() * sources.length)];
  packets.push({
    id: Math.random().toString(36).slice(2, 6),
    src,
    stage: 0,
    x: stages[0].x,
    y: stages[0].y + (Math.random() - 0.5) * 60,
    bad: Math.random() < 0.15,
    color: stages[0].color,
    progress: 0,
  });
}

function update() {
  const speed = +document.getElementById('speed').value * 0.3;
  for (let i = packets.length - 1; i >= 0; i--) {
    const p = packets[i];
    const next = stages[p.stage + 1];
    if (!next) {
      packets.splice(i, 1);
      counters.load++;
      addLog(`✓ Loaded ${p.src} [${p.id}]`, 'ok');
      continue;
    }
    p.x += speed;
    if (p.x >= next.x) {
      p.x = next.x;
      p.stage++;
      p.color = next.color;
      p.y = next.y + (Math.random() - 0.5) * 40;
      if (next.name === 'EXTRACT') counters.ext++;
      if (next.name === 'TRANSFORM') {
        counters.trf++;
        if (p.bad) {
          packets.splice(i, 1);
          counters.drop++;
          addLog(`✗ Dropped ${p.src} [${p.id}] bad schema`, 'err');
          continue;
        }
      }
    }
  }
  document.getElementById('sExt').textContent = counters.ext;
  document.getElementById('sTrf').textContent = counters.trf;
  document.getElementById('sLoad').textContent = counters.load;
  document.getElementById('sDrop').textContent = counters.drop;
}

function draw() {
  ctx.fillStyle = '#1a1d27';
  ctx.fillRect(0, 0, W, H);

  // connections
  ctx.strokeStyle = '#2a2e3a';
  ctx.lineWidth = 2;
  for (let i = 0; i < stages.length - 1; i++) {
    ctx.beginPath();
    ctx.moveTo(stages[i].x + 50, stages[i].y);
    ctx.lineTo(stages[i+1].x - 50, stages[i+1].y);
    ctx.stroke();
  }

  // stages
  stages.forEach(s => {
    ctx.fillStyle = '#0f1117';
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = s.color;
    ctx.font = 'bold 11px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(s.name, s.x, s.y + 4);
  });

  // packets
  packets.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e4e7eb';
    ctx.font = '10px Consolas';
    ctx.textAlign = 'left';
    ctx.fillText(p.src, p.x + 8, p.y + 3);
  });
}

function loop() {
  if (running) {
    tick++;
    if (tick % 20 === 0) spawn();
    update();
  }
  draw();
  requestAnimationFrame(loop);
}

document.getElementById('playBtn').onclick = () => {
  running = !running;
  document.getElementById('playBtn').textContent = running ? '❚❚ Pause' : '▶ Run Pipeline';
  if (running) addLog('Pipeline started');
};
document.getElementById('resetBtn').onclick = () => {
  packets = [];
  counters = { ext: 0, trf: 0, load: 0, drop: 0 };
  logEl.innerHTML = '';
  tick = 0;
  addLog('Pipeline reset');
};

addLog('Ready. Press Run to begin.');
loop();