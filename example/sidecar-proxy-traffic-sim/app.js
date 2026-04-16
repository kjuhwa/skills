const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const rpsIn = document.getElementById('rps');
const wIn = document.getElementById('workers');
const cbIn = document.getElementById('cb');
const rpsVal = document.getElementById('rpsVal');
const wVal = document.getElementById('wVal');
const cbVal = document.getElementById('cbVal');

let queue = [];
let served = 0, dropped = 0, recentFails = [];
let breaker = 'CLOSED', breakerOpenedAt = 0;
const workers = [];

function sync() {
  rpsVal.textContent = rpsIn.value;
  wVal.textContent = wIn.value;
  cbVal.textContent = cbIn.value;
  while (workers.length < +wIn.value) workers.push({ busy:false, progress:0, fail:false });
  while (workers.length > +wIn.value) workers.pop();
}
[rpsIn, wIn, cbIn].forEach(el => el.addEventListener('input', sync));
sync();

let lastSpawn = performance.now();
let lastTick = performance.now();

function spawnRequests(now, dt) {
  const rps = +rpsIn.value;
  const toSpawn = Math.floor((now - lastSpawn) / 1000 * rps);
  if (toSpawn > 0) {
    lastSpawn = now;
    for (let i=0; i<toSpawn; i++) {
      if (breaker === 'OPEN') { dropped++; continue; }
      if (queue.length > 40) { dropped++; continue; }
      queue.push({ x: 20, y: 60 + Math.random()*40, born: now });
    }
  }
}

function processWorkers(now, dt) {
  workers.forEach((w, i) => {
    if (!w.busy && queue.length && breaker !== 'OPEN') {
      queue.shift();
      w.busy = true; w.progress = 0;
      w.fail = Math.random() < 0.08;
    }
    if (w.busy) {
      w.progress += dt * 0.8;
      if (w.progress >= 1) {
        w.busy = false;
        if (w.fail) {
          recentFails.push(now);
        } else served++;
      }
    }
  });
  recentFails = recentFails.filter(t => now - t < 3000);
  const cbThresh = +cbIn.value;
  if (breaker === 'CLOSED' && recentFails.length >= cbThresh) {
    breaker = 'OPEN'; breakerOpenedAt = now;
  } else if (breaker === 'OPEN' && now - breakerOpenedAt > 4000) {
    breaker = 'HALF';
  } else if (breaker === 'HALF' && recentFails.length < 3) {
    breaker = 'CLOSED';
  }
}

function draw() {
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#0f1117'; ctx.fillRect(0,0,w,h);

  // queue lane
  ctx.fillStyle = '#1a1d27';
  ctx.fillRect(10, 40, 260, 80);
  ctx.fillStyle = '#6ee7b7'; ctx.font = '11px monospace';
  ctx.fillText('INGRESS QUEUE', 14, 34);

  queue.forEach((req, i) => {
    const x = 20 + (i % 12) * 20;
    const y = 60 + Math.floor(i/12) * 20;
    ctx.fillStyle = '#6ee7b7';
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2); ctx.fill();
  });

  // sidecar box
  ctx.strokeStyle = breaker === 'OPEN' ? '#f87171'
                  : breaker === 'HALF' ? '#fbbf24' : '#6ee7b7';
  ctx.lineWidth = 2;
  ctx.strokeRect(300, 40, 220, 240);
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fillText('SIDECAR PROXY', 306, 34);

  // workers
  workers.forEach((wk, i) => {
    const y = 70 + i * 28;
    ctx.fillStyle = '#232632';
    ctx.fillRect(320, y, 180, 18);
    if (wk.busy) {
      ctx.fillStyle = wk.fail ? '#f87171' : '#6ee7b7';
      ctx.fillRect(320, y, 180 * Math.min(1, wk.progress), 18);
    }
    ctx.fillStyle = '#9ca3af'; ctx.font = '10px monospace';
    ctx.fillText('w'+i, 306, y+13);
  });

  // upstream
  ctx.fillStyle = '#1a1d27';
  ctx.fillRect(560, 100, 140, 120);
  ctx.strokeStyle = '#6ee7b7'; ctx.strokeRect(560, 100, 140, 120);
  ctx.fillStyle = '#6ee7b7'; ctx.font = '12px monospace';
  ctx.fillText('UPSTREAM', 590, 165);

  // connecting lines
  ctx.strokeStyle = '#232632';
  ctx.beginPath(); ctx.moveTo(270,80); ctx.lineTo(300,80); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(520,160); ctx.lineTo(560,160); ctx.stroke();

  // update metrics
  document.getElementById('qLen').textContent = queue.length;
  document.getElementById('served').textContent = served;
  document.getElementById('dropped').textContent = dropped;
  const b = document.getElementById('breaker');
  b.textContent = breaker; b.className = breaker;
}

function loop(now) {
  const dt = (now - lastTick) / 1000;
  lastTick = now;
  spawnRequests(now, dt);
  processWorkers(now, dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);