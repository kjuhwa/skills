const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const log = document.getElementById('log');
let sentCount = 0, recvCount = 0, packets = [];

function resize() { canvas.width = canvas.clientWidth * 2; canvas.height = canvas.clientHeight * 2; }
resize(); window.addEventListener('resize', resize);

const msgTypes = ['PING', 'PONG', 'TEXT', 'BINARY', 'CLOSE', 'AUTH', 'SUB', 'ACK'];

function addPacket() {
  const outbound = Math.random() > 0.4;
  const type = msgTypes[Math.floor(Math.random() * msgTypes.length)];
  const size = Math.floor(Math.random() * 2048) + 32;
  const lat = Math.floor(Math.random() * 120) + 5;
  packets.push({ x: canvas.width, y: outbound ? canvas.height * 0.3 : canvas.height * 0.7, outbound, type, size, lat, alpha: 1 });
  if (outbound) sentCount++; else recvCount++;
  document.getElementById('sent').textContent = sentCount;
  document.getElementById('received').textContent = recvCount;
  document.getElementById('latency').textContent = lat + 'ms';
  const el = document.createElement('div');
  el.className = outbound ? 'out' : 'in';
  el.textContent = `${outbound ? '↑' : '↓'} ${type} ${size}B ${lat}ms`;
  log.prepend(el);
  if (log.children.length > 50) log.lastChild.remove();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#262a36'; ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(0, canvas.height * 0.5); ctx.lineTo(canvas.width, canvas.height * 0.5); ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '20px sans-serif'; ctx.fillStyle = '#475569';
  ctx.fillText('OUTBOUND ↑', 20, 30); ctx.fillText('INBOUND ↓', 20, canvas.height - 14);
  packets.forEach(p => {
    const r = Math.max(6, p.size / 80);
    ctx.globalAlpha = p.alpha;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = p.outbound ? '#6ee7b7' : '#7dd3fc'; ctx.fill();
    ctx.globalAlpha = 1;
    p.x -= 4; p.alpha -= 0.003;
  });
  packets = packets.filter(p => p.alpha > 0 && p.x > -40);
  requestAnimationFrame(draw);
}

setInterval(addPacket, 400);
draw();