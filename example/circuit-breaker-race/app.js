const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const player = { x: W/2, y: H/2, r: 8, tx: W/2, ty: H/2 };
let entities = [], score = 0, best = +localStorage.getItem('cbr-best') || 0;
let hp = 100, trips = 0, speedMult = 1, tick = 0, gameOver = false;

document.getElementById('best').textContent = best;

canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  player.tx = (e.clientX - r.left) * (W / r.width);
  player.ty = (e.clientY - r.top) * (H / r.height);
});
canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  const mx = (e.clientX - r.left) * (W / r.width);
  const my = (e.clientY - r.top) * (H / r.height);
  entities = entities.filter(en => {
    if (en.type === 'breaker' && Math.hypot(en.x - mx, en.y - my) < 22) {
      hp = Math.min(100, hp + 25); trips++;
      flash('#fbbf24'); return false;
    }
    return true;
  });
});

function spawn() {
  const types = ['energy', 'energy', 'fault', 'breaker'];
  const t = types[Math.floor(Math.random() * types.length)];
  const side = Math.floor(Math.random() * 4);
  let x, y, vx, vy;
  if (side === 0) { x = -20; y = Math.random() * H; vx = 1 + Math.random(); vy = (Math.random()-0.5)*0.5; }
  else if (side === 1) { x = W + 20; y = Math.random() * H; vx = -1 - Math.random(); vy = (Math.random()-0.5)*0.5; }
  else if (side === 2) { x = Math.random() * W; y = -20; vx = (Math.random()-0.5)*0.5; vy = 1 + Math.random(); }
  else { x = Math.random() * W; y = H + 20; vx = (Math.random()-0.5)*0.5; vy = -1 - Math.random(); }
  entities.push({ x, y, vx: vx*speedMult, vy: vy*speedMult, type: t, r: t==='breaker'?14:10, life: 600 });
}

let flashColor = null, flashT = 0;
function flash(c) { flashColor = c; flashT = 15; }

function drawGrid() {
  ctx.strokeStyle = 'rgba(110,231,183,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
}

function loop() {
  tick++;
  ctx.fillStyle = flashT > 0 ? flashColor : '#1a1d27';
  ctx.fillRect(0, 0, W, H);
  if (flashT > 0) flashT--;
  drawGrid();

  player.x += (player.tx - player.x) * 0.15;
  player.y += (player.ty - player.y) * 0.15;

  if (tick % Math.max(20, 60 - Math.floor(score/5)) === 0 && !gameOver) spawn();
  speedMult = 1 + score / 100;
  document.getElementById('speed').textContent = speedMult.toFixed(1) + 'x';

  entities = entities.filter(en => {
    en.x += en.vx; en.y += en.vy; en.life--;
    if (en.life <= 0 || en.x < -40 || en.x > W+40 || en.y < -40 || en.y > H+40) return false;
    const d = Math.hypot(en.x - player.x, en.y - player.y);
    if (d < en.r + player.r) {
      if (en.type === 'energy') { score++; flash('#6ee7b7'); return false; }
      if (en.type === 'fault') { hp -= 15; flash('#ff6b6b'); return false; }
    }
    ctx.beginPath();
    ctx.arc(en.x, en.y, en.r, 0, Math.PI*2);
    if (en.type === 'energy') { ctx.fillStyle = '#6ee7b7'; ctx.shadowBlur = 14; ctx.shadowColor = '#6ee7b7'; }
    else if (en.type === 'fault') { ctx.fillStyle = '#ff6b6b'; ctx.shadowBlur = 14; ctx.shadowColor = '#ff6b6b'; }
    else { ctx.fillStyle = '#fbbf24'; ctx.shadowBlur = 18; ctx.shadowColor = '#fbbf24'; }
    ctx.fill();
    ctx.shadowBlur = 0;
    if (en.type === 'breaker') {
      ctx.strokeStyle = '#0f1117'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(en.x-5, en.y-5); ctx.lineTo(en.x+5, en.y+5);
      ctx.moveTo(en.x+5, en.y-5); ctx.lineTo(en.x-5, en.y+5); ctx.stroke();
    }
    return true;
  });

  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI*2);
  ctx.fillStyle = '#e4e7ef';
  ctx.shadowBlur = 20; ctx.shadowColor = '#6ee7b7';
  ctx.fill(); ctx.shadowBlur = 0;

  document.getElementById('score').textContent = score;
  document.getElementById('hp').textContent = Math.max(0, hp|0);
  document.getElementById('trips').textContent = trips;

  if (hp <= 0 && !gameOver) {
    gameOver = true;
    if (score > best) { best = score; localStorage.setItem('cbr-best', best); }
    document.getElementById('best').textContent = best;
    ctx.fillStyle = 'rgba(15,17,23,0.85)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ff6b6b'; ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('CIRCUIT BROKEN', W/2, H/2 - 10);
    ctx.fillStyle = '#e4e7ef'; ctx.font = '14px sans-serif';
    ctx.fillText('Click to restart', W/2, H/2 + 24);
    canvas.onclick = () => {
      hp = 100; score = 0; trips = 0; entities = []; gameOver = false;
      canvas.onclick = null;
    };
    return;
  }
  requestAnimationFrame(loop);
}
loop();