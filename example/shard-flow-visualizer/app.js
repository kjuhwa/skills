const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const statsEl = document.getElementById('stats');
const SHARDS = 5;
let particles = [], shardCounts = new Array(SHARDS).fill(0), totalQueries = 0;

function resize() { canvas.width = canvas.clientWidth * devicePixelRatio; canvas.height = canvas.clientHeight * devicePixelRatio; ctx.scale(devicePixelRatio, devicePixelRatio); }
resize(); window.addEventListener('resize', resize);

const W = () => canvas.clientWidth, H = () => canvas.clientHeight;
const shardX = (i) => (W() / (SHARDS + 1)) * (i + 1);
const shardY = () => H() - 50;

function route(key) {
  const s = document.getElementById('strategy').value;
  if (s === 'hash') return Math.abs([...key].reduce((a, c) => a + c.charCodeAt(0), 0)) % SHARDS;
  if (s === 'range') return Math.min(Math.floor(parseInt(key, 36) / 1e8) % SHARDS, SHARDS - 1);
  return totalQueries % SHARDS;
}

function sendQuery() {
  const key = Math.random().toString(36).slice(2, 8);
  const target = route(key);
  totalQueries++;
  shardCounts[target]++;
  particles.push({ x: W() / 2, y: 40, tx: shardX(target), ty: shardY() - 20, t: 0, key, target });
}

document.getElementById('btnSend').onclick = sendQuery;
document.getElementById('btnBurst').onclick = () => { for (let i = 0; i < 10; i++) setTimeout(sendQuery, i * 60); };

function draw() {
  ctx.clearRect(0, 0, W(), H());
  ctx.fillStyle = '#6ee7b7'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('Router', W() / 2, 30);
  ctx.strokeStyle = '#6ee7b744'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(W() / 2, 40, 14, 0, Math.PI * 2); ctx.stroke();

  for (let i = 0; i < SHARDS; i++) {
    const sx = shardX(i), sy = shardY();
    ctx.fillStyle = '#1a1d27'; ctx.strokeStyle = '#6ee7b766'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(sx - 32, sy - 24, 64, 48, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6ee7b7'; ctx.fillText(`S${i}`, sx, sy + 4);
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px system-ui'; ctx.fillText(shardCounts[i], sx, sy + 18); ctx.font = '13px system-ui';
  }

  particles = particles.filter(p => {
    p.t += 0.025;
    if (p.t > 1) return false;
    const ease = p.t < 0.5 ? 2 * p.t * p.t : -1 + (4 - 2 * p.t) * p.t;
    const cx = p.x + (p.tx - p.x) * ease, cy = p.y + (p.ty - p.y) * ease;
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(110,231,183,${1 - p.t})`; ctx.fill();
    return true;
  });

  const max = Math.max(...shardCounts, 1);
  statsEl.innerHTML = `<span>Total: ${totalQueries}</span>` +
    shardCounts.map((c, i) => `<span>S${i}: ${c} (${max ? Math.round(c / max * 100) : 0}%)</span>`).join('');
  requestAnimationFrame(draw);
}
draw();
for (let i = 0; i < 15; i++) setTimeout(sendQuery, i * 120);