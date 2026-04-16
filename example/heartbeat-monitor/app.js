const services = [
  { name: 'API Gateway', latency: 42 }, { name: 'Auth Service', latency: 18 },
  { name: 'Database', latency: 7 }, { name: 'Cache (Redis)', latency: 3 },
  { name: 'Queue Worker', latency: 55 }, { name: 'CDN Edge', latency: 12 }
];
const el = document.getElementById('services');
const canvas = document.getElementById('pulse');
const ctx = canvas.getContext('2d');
let points = Array(200).fill(0);
let selected = 0;

function render() {
  el.innerHTML = '';
  services.forEach((s, i) => {
    const down = s.latency > 100;
    const d = document.createElement('div');
    d.className = 'svc' + (down ? ' down' : '') + (i === selected ? ' sel' : '');
    d.innerHTML = `<div class="name"><span class="dot"></span>${s.name}</div><div class="latency">${s.latency}ms latency</div>`;
    d.onclick = () => { selected = i; points = Array(200).fill(0); };
    el.appendChild(d);
  });
}

function tick() {
  services.forEach(s => {
    s.latency = Math.max(1, s.latency + Math.round((Math.random() - .48) * 10));
  });
  const s = services[selected];
  points.push(s.latency);
  if (points.length > 200) points.shift();
  render();
  drawPulse();
}

function drawPulse() {
  const w = canvas.width = canvas.offsetWidth * 2;
  const h = canvas.height = 200;
  ctx.clearRect(0, 0, w, h);
  const max = Math.max(...points, 80);
  ctx.beginPath();
  ctx.strokeStyle = services[selected].latency > 100 ? '#f87171' : '#6ee7b7';
  ctx.lineWidth = 2;
  points.forEach((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - (p / max) * (h - 20) - 10;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
}

render();
setInterval(tick, 500);