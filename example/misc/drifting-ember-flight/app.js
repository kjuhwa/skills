const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start');
const distEl = document.getElementById('dist');
const bestEl = document.getElementById('best');
const flameEl = document.getElementById('flame');
const fuelEl = document.getElementById('fuel');

let W = 0, H = 0;
function resize() {
  W = canvas.width = canvas.clientWidth;
  H = canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resize);
resize();

const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'Space') e.preventDefault(); });
window.addEventListener('keyup', e => { keys[e.code] = false; });

let state;
function newGame() {
  state = {
    lantern: { x: W * 0.25, y: H * 0.5, vx: 0, vy: 0, flame: 0.5, fuel: 1, alive: true },
    gusts: [],
    clouds: [],
    embers: [],
    distance: 0,
    wind: 0.4,
    time: 0,
  };
  for (let i = 0; i < 6; i++) spawnGust(W + i * 300);
  for (let i = 0; i < 4; i++) spawnCloud(W + Math.random() * W);
}

function spawnGust(x) {
  state.gusts.push({
    x, y: 100 + Math.random() * (H - 200),
    r: 60 + Math.random() * 50,
    dir: Math.random() < 0.5 ? -1 : 1,
    strength: 0.08 + Math.random() * 0.1,
  });
}
function spawnCloud(x) {
  state.clouds.push({
    x, y: 80 + Math.random() * (H - 160),
    w: 90 + Math.random() * 70,
    h: 40 + Math.random() * 25,
  });
}

function update(dt) {
  const L = state.lantern;
  if (!L.alive) return;
  state.time += dt;

  // Flame control
  const feeding = keys['Space'] && L.fuel > 0;
  if (feeding) {
    L.flame = Math.min(1, L.flame + dt * 0.9);
    L.fuel = Math.max(0, L.fuel - dt * 0.08);
  } else {
    L.flame = Math.max(0.05, L.flame - dt * 0.35);
  }

  // Lateral
  if (keys['ArrowLeft']) L.vx -= dt * 40;
  if (keys['ArrowRight']) L.vx += dt * 40;

  // Physics: lift proportional to flame, gravity otherwise
  const lift = L.flame * 180 - 90;
  L.vy += (-lift + state.wind * 15) * dt;
  L.vx -= L.vx * dt * 1.2;
  L.vy -= L.vy * dt * 0.8;

  // Wind drift
  L.vx += state.wind * dt * 8;

  // Gusts
  state.gusts.forEach(g => {
    const d = Math.hypot(L.x - g.x, L.y - g.y);
    if (d < g.r) {
      const f = (1 - d / g.r) * g.strength * 200;
      L.vy += g.dir * f * dt;
    }
  });

  L.x += L.vx * dt;
  L.y += L.vy * dt;
  L.x = Math.max(80, Math.min(W * 0.35, L.x));
  if (L.y < 20) { L.y = 20; L.vy = 0; }
  if (L.y > H - 20) { L.alive = false; }

  // World scroll
  const scroll = 120 * dt;
  state.distance += scroll * 0.1;
  state.gusts.forEach(g => g.x -= scroll);
  state.clouds.forEach(c => c.x -= scroll);
  state.gusts = state.gusts.filter(g => g.x > -100);
  state.clouds = state.clouds.filter(c => c.x > -200);
  while (state.gusts.length < 6) spawnGust(W + Math.random() * 200);
  while (state.clouds.length < 4) spawnCloud(W + Math.random() * 300);

  // Cloud collision douses flame
  state.clouds.forEach(c => {
    if (L.x > c.x - c.w / 2 && L.x < c.x + c.w / 2 &&
        L.y > c.y - c.h / 2 && L.y < c.y + c.h / 2) {
      L.flame = Math.max(0.02, L.flame - dt * 1.2);
      L.fuel = Math.max(0, L.fuel - dt * 0.15);
    }
  });

  // Embers
  if (Math.random() < L.flame * 0.6) {
    state.embers.push({
      x: L.x, y: L.y + 12,
      vx: -20 + (Math.random() - 0.5) * 30,
      vy: 20 + Math.random() * 40,
      life: 1,
    });
  }
  state.embers.forEach(e => { e.x += e.vx * dt; e.y += e.vy * dt; e.life -= dt * 1.2; });
  state.embers = state.embers.filter(e => e.life > 0);

  // Wind oscillates
  state.wind = 0.3 + Math.sin(state.time * 0.3) * 0.4;

  // Death check
  if (L.flame < 0.1 && L.fuel < 0.05) L.alive = false;
}

function render() {
  ctx.clearRect(0, 0, W, H);
  // Distant mountains
  ctx.fillStyle = '#1a1f33';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.75);
  for (let i = 0; i <= 10; i++) {
    const x = (i / 10) * W;
    const y = H * 0.75 - Math.sin(i + state.time * 0.05) * 30 - 40;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();

  // Gusts
  state.gusts.forEach(g => {
    ctx.strokeStyle = g.dir > 0 ? 'rgba(110,231,183,0.12)' : 'rgba(251,113,133,0.12)';
    ctx.lineWidth = 1;
    for (let r = 20; r < g.r; r += 15) {
      ctx.beginPath();
      ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // Clouds
  state.clouds.forEach(c => {
    const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.w);
    grad.addColorStop(0, 'rgba(40,44,60,0.9)');
    grad.addColorStop(1, 'rgba(40,44,60,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w, c.h, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Embers
  state.embers.forEach(e => {
    ctx.fillStyle = `rgba(251,146,60,${e.life})`;
    ctx.fillRect(e.x, e.y, 2, 2);
  });

  // Lantern
  const L = state.lantern;
  const glowR = 40 + L.flame * 60;
  const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, glowR);
  g.addColorStop(0, `rgba(251,146,60,${0.7 * L.flame})`);
  g.addColorStop(1, 'rgba(251,146,60,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(L.x, L.y, glowR, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#fde68a';
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(L.x, L.y, 14, 20, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fb923c';
  ctx.beginPath();
  ctx.ellipse(L.x, L.y + 4, 6, 8 * L.flame + 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // String up
  ctx.strokeStyle = '#555';
  ctx.beginPath(); ctx.moveTo(L.x, L.y - 20); ctx.lineTo(L.x, L.y - 40); ctx.stroke();
}

let last = performance.now();
let running = false;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (running && state.lantern.alive) {
    update(dt);
    render();
    distEl.textContent = `${Math.floor(state.distance)} m`;
    flameEl.style.width = `${state.lantern.flame * 100}%`;
    fuelEl.style.width = `${state.lantern.fuel * 100}%`;
  } else if (running && !state.lantern.alive) {
    running = false;
    const prevBest = parseInt(localStorage.getItem('lantern-best') || '0');
    const final = Math.floor(state.distance);
    if (final > prevBest) localStorage.setItem('lantern-best', final);
    bestEl.textContent = `${Math.max(prevBest, final)} m`;
    overlay.classList.remove('hidden');
    startBtn.textContent = 'Release Another';
  }
  requestAnimationFrame(loop);
}

startBtn.addEventListener('click', () => {
  overlay.classList.add('hidden');
  newGame();
  running = true;
  last = performance.now();
});
window.addEventListener('keydown', e => { if (e.code === 'KeyR') { overlay.classList.add('hidden'); newGame(); running = true; last = performance.now(); } });
bestEl.textContent = `${localStorage.getItem('lantern-best') || 0} m`;
newGame(); render();
requestAnimationFrame(loop);