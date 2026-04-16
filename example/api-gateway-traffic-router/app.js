const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const services = [
  { name: 'auth-svc', color: '#f472b6', load: 0, handled: 0 },
  { name: 'user-svc', color: '#60a5fa', load: 0, handled: 0 },
  { name: 'order-svc', color: '#fbbf24', load: 0, handled: 0 },
  { name: 'payment-svc', color: '#a78bfa', load: 0, handled: 0 },
  { name: 'inventory-svc', color: '#6ee7b7', load: 0, handled: 0 }
];
const gateway = { x: 380, y: H/2, w: 140, h: 100 };
const clientX = 60;
const requests = [];
let total = 0, dropped = 0;

function route() {
  return services[Math.floor(Math.random() * services.length)];
}

function spawn() {
  const target = route();
  const y = 80 + Math.random() * (H - 160);
  requests.push({
    x: clientX, y, targetY: y, phase: 'to-gateway',
    target, progress: 0, id: ++total
  });
}

document.getElementById('spawn').onclick = spawn;
document.getElementById('burst').onclick = () => { for (let i = 0; i < 20; i++) setTimeout(spawn, i * 50); };

let rate = 600, lastSpawn = 0;
document.getElementById('rate').oninput = e => rate = +e.target.value;

function drawGateway() {
  ctx.fillStyle = '#252938';
  ctx.strokeStyle = '#6ee7b7';
  ctx.lineWidth = 2;
  ctx.fillRect(gateway.x, gateway.y - gateway.h/2, gateway.w, gateway.h);
  ctx.strokeRect(gateway.x, gateway.y - gateway.h/2, gateway.w, gateway.h);
  ctx.fillStyle = '#6ee7b7';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('API Gateway', gateway.x + gateway.w/2, gateway.y - 10);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#8a92a8';
  ctx.fillText('auth · rate-limit', gateway.x + gateway.w/2, gateway.y + 8);
  ctx.fillText('route · transform', gateway.x + gateway.w/2, gateway.y + 22);
}

function drawClient() {
  ctx.fillStyle = '#252938';
  ctx.fillRect(clientX - 30, H/2 - 40, 60, 80);
  ctx.strokeStyle = '#60a5fa';
  ctx.strokeRect(clientX - 30, H/2 - 40, 60, 80);
  ctx.fillStyle = '#60a5fa';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('Clients', clientX, H/2 + 5);
}

function drawServices() {
  const startY = 60, gap = (H - 120) / (services.length - 1);
  services.forEach((s, i) => {
    const sx = 700, sy = startY + i * gap;
    s._x = sx; s._y = sy;
    ctx.fillStyle = '#252938';
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.load > 3 ? 3 : 1;
    ctx.fillRect(sx, sy - 20, 140, 40);
    ctx.strokeRect(sx, sy - 20, 140, 40);
    ctx.fillStyle = s.color;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.name, sx + 70, sy + 2);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#8a92a8';
    ctx.fillText(`${s.handled} served`, sx + 70, sy + 15);
  });
}

function update() {
  ctx.clearRect(0, 0, W, H);
  drawClient();
  drawGateway();
  drawServices();

  for (let i = requests.length - 1; i >= 0; i--) {
    const r = requests[i];
    r.progress += 0.02;
    let x, y;
    if (r.phase === 'to-gateway') {
      x = clientX + (gateway.x - clientX) * r.progress;
      y = H/2 + (r.y - H/2) * r.progress;
      if (r.progress >= 1) { r.phase = 'routing'; r.progress = 0; }
    } else {
      x = gateway.x + gateway.w + (r.target._x - gateway.x - gateway.w) * r.progress;
      y = gateway.y + (r.target._y - gateway.y) * r.progress;
      if (r.progress >= 1) {
        r.target.load++; r.target.handled++;
        setTimeout(() => r.target.load--, 400);
        requests.splice(i, 1); continue;
      }
    }
    ctx.fillStyle = r.target.color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  document.getElementById('total').textContent = total;
  document.getElementById('flight').textContent = requests.length;
  document.getElementById('dropped').textContent = dropped;

  const ul = document.getElementById('services');
  ul.innerHTML = services.map(s =>
    `<li class="${s.load > 2 ? 'hot' : ''}"><span style="color:${s.color}">●</span> ${s.name}<span>${s.handled}</span></li>`
  ).join('');
}

setInterval(() => {
  const now = Date.now();
  if (now - lastSpawn > (2100 - rate)) { spawn(); lastSpawn = now; }
}, 50);

setInterval(update, 30);
update();