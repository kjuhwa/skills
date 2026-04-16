const canvas = document.getElementById('river');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const rateEl = document.getElementById('rate');
const damEl = document.getElementById('dam');
const bufEl = document.getElementById('buffer');
const queuedEl = document.getElementById('queued');
const droppedEl = document.getElementById('dropped');
const flowEl = document.getElementById('flow');
const pressureEl = document.getElementById('pressure');

const particles = [];
let dropped = 0;
let flowed = 0;
let flowSamples = [];
let spawnAccum = 0;

function spawn(dt) {
  const rate = +rateEl.value;
  spawnAccum += rate * dt;
  const buffer = +bufEl.value;
  while (spawnAccum >= 1) {
    spawnAccum -= 1;
    if (particles.length >= buffer) {
      dropped++;
      continue;
    }
    particles.push({
      x: 10 + Math.random() * 40,
      y: H / 2 + (Math.random() - 0.5) * 100,
      vx: 1 + Math.random(),
      r: 3 + Math.random() * 3,
      hue: 150 + Math.random() * 40,
      passed: false,
    });
  }
}

function update(dt) {
  const damW = +damEl.value;
  const gap = damW;
  const damX = W * 0.55;
  const topY = H / 2 - gap / 2;
  const botY = H / 2 + gap / 2;

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const isNearDam = p.x > damX - 20 && p.x < damX + 20 && !p.passed;
    const inGap = p.y > topY + p.r && p.y < botY - p.r;

    if (isNearDam && !inGap) {
      p.vx *= 0.85;
      if (p.y < H / 2) p.y += 0.5;
      else p.y -= 0.5;
      p.x = Math.min(p.x, damX - p.r);
    } else {
      p.vx += (1.5 - p.vx) * 0.05;
    }

    if (p.x > damX + p.r) p.passed = true;
    p.x += p.vx;
    p.y += (H / 2 - p.y) * 0.01;

    if (p.x > W + 10) {
      particles.splice(i, 1);
      flowed++;
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#1e2633');
  grad.addColorStop(1, '#131722');
  ctx.fillStyle = grad;
  ctx.fillRect(0, H / 2 - 120, W, 240);

  const damW = +damEl.value;
  const damX = W * 0.55;
  ctx.fillStyle = '#2a3242';
  ctx.fillRect(damX - 8, H / 2 - 120, 16, 120 - damW / 2);
  ctx.fillRect(damX - 8, H / 2 + damW / 2, 16, 120 - damW / 2);

  for (const p of particles) {
    ctx.fillStyle = `hsl(${p.hue}, 70%, 60%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const buffer = +bufEl.value;
  const pressure = particles.length / buffer;
  ctx.fillStyle = pressure > 0.8 ? '#ef4444' : '#6ee7b7';
  ctx.fillRect(10, 10, (W - 20) * pressure, 6);
}

let last = performance.now();
function loop(t) {
  const dt = Math.min(0.1, (t - last) / 1000);
  last = t;
  spawn(dt);
  update(dt);
  draw();

  flowSamples.push({ t, flowed });
  flowSamples = flowSamples.filter(s => t - s.t < 1000);
  const flowPerSec = flowSamples.length > 1
    ? flowSamples[flowSamples.length - 1].flowed - flowSamples[0].flowed : 0;

  queuedEl.textContent = particles.length;
  droppedEl.textContent = dropped;
  flowEl.textContent = flowPerSec;
  const buffer = +bufEl.value;
  pressureEl.textContent = Math.round(100 * particles.length / buffer) + '%';

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);