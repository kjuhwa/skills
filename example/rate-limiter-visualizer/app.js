const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const log = document.getElementById('log');
const rateIn = document.getElementById('rate');
const burstIn = document.getElementById('burst');
let tokens, maxTokens = 10, refillRate = 5, particles = [];

function init() { tokens = maxTokens; }
init();

rateIn.oninput = () => { refillRate = +rateIn.value; document.getElementById('rateVal').textContent = refillRate; };
burstIn.oninput = () => { maxTokens = +burstIn.value; document.getElementById('burstVal').textContent = maxTokens; tokens = Math.min(tokens, maxTokens); };

function tryRequest() {
  const ok = tokens >= 1;
  if (ok) { tokens--; particles.push({ x: 400, y: 320, vy: -3, life: 40, ok: true }); }
  else { particles.push({ x: 400, y: 320, vy: -2, life: 30, ok: false }); }
  const el = document.createElement('div');
  el.className = ok ? 'ok' : 'denied';
  el.textContent = `[${new Date().toLocaleTimeString()}] ${ok ? '✓ Allowed' : '✗ Rate limited'} (tokens: ${tokens.toFixed(1)})`;
  log.prepend(el);
  if (log.children.length > 50) log.lastChild.remove();
}

document.getElementById('sendBtn').onclick = tryRequest;
document.getElementById('floodBtn').onclick = () => { for (let i = 0; i < 20; i++) setTimeout(tryRequest, i * 60); };

let last = performance.now();
function frame(now) {
  const dt = (now - last) / 1000; last = now;
  tokens = Math.min(maxTokens, tokens + refillRate * dt);
  ctx.clearRect(0, 0, 800, 400);
  // bucket
  ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
  ctx.strokeRect(300, 80, 200, 260);
  const fill = (tokens / maxTokens) * 250;
  ctx.fillStyle = tokens < 2 ? '#f8717144' : '#6ee7b744';
  ctx.fillRect(302, 330 - fill, 196, fill);
  // token circles
  const cols = 5, r = 14;
  for (let i = 0; i < Math.floor(tokens); i++) {
    const col = i % cols, row = Math.floor(i / cols);
    ctx.beginPath();
    ctx.arc(330 + col * 36, 310 - row * 32, r, 0, Math.PI * 2);
    ctx.fillStyle = '#6ee7b7'; ctx.fill();
  }
  ctx.fillStyle = '#c9d1d9'; ctx.font = '13px monospace';
  ctx.fillText(`Tokens: ${tokens.toFixed(1)} / ${maxTokens}`, 330, 60);
  // particles
  particles.forEach(p => { p.y += p.vy; p.life--; ctx.beginPath(); ctx.arc(p.x + (Math.random() - 0.5) * 40, p.y, 4, 0, Math.PI * 2); ctx.fillStyle = p.ok ? '#6ee7b7' : '#f87171'; ctx.fill(); });
  particles = particles.filter(p => p.life > 0);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// auto traffic
setInterval(() => { if (Math.random() < 0.3) tryRequest(); }, 800);