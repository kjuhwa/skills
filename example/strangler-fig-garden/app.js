const canvas = document.getElementById('garden');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const host = { x: W/2, y: H - 40, trunk: [], leaves: [] };
const roots = [];
let hostVitality = 100;
let autoGrow = false;

function buildHost() {
  let x = host.x, y = host.y;
  for (let i = 0; i < 80; i++) {
    host.trunk.push({ x, y, w: 30 - i * 0.25 });
    y -= 4;
    x += Math.sin(i * 0.15) * 1.2;
  }
  const top = host.trunk[host.trunk.length - 1];
  for (let a = 0; a < 6; a++) {
    const angle = -Math.PI/2 + (a - 2.5) * 0.4;
    let bx = top.x, by = top.y;
    for (let j = 0; j < 30; j++) {
      bx += Math.cos(angle + Math.sin(j*0.2)*0.3) * 3;
      by += Math.sin(angle + Math.sin(j*0.2)*0.3) * 3;
      host.leaves.push({ x: bx, y: by, r: 8 + Math.random()*6, a: 1 });
    }
  }
}

class Root {
  constructor(anchor) {
    this.segments = [{ x: anchor.x, y: anchor.y }];
    this.angle = Math.random() * Math.PI - Math.PI/2;
    this.life = 200 + Math.random() * 120;
    this.done = false;
  }
  grow() {
    if (this.done) return;
    const last = this.segments[this.segments.length - 1];
    this.angle += (Math.random() - 0.5) * 0.3;
    const tx = host.trunk.reduce((c, t) =>
      Math.abs(t.y - last.y) < Math.abs(c.y - last.y) ? t : c, host.trunk[0]);
    const pull = (tx.x - last.x) * 0.02;
    const nx = last.x + Math.cos(this.angle) * 2 + pull;
    const ny = last.y + Math.sin(this.angle) * 2 - 1;
    this.segments.push({ x: nx, y: ny });
    this.life--;
    if (this.life <= 0 || ny < 60) this.done = true;
  }
  draw() {
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    this.segments.forEach((s, i) => i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y));
    ctx.stroke();
  }
}

function render() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#1a1d27';
  ctx.fillRect(0, H - 30, W, 30);

  const decay = 1 - hostVitality / 100;
  host.trunk.forEach(t => {
    ctx.fillStyle = `rgba(${100 - decay*40}, ${70 - decay*30}, ${50 - decay*20}, 1)`;
    ctx.fillRect(t.x - t.w/2, t.y, t.w, 5);
  });
  host.leaves.forEach(l => {
    ctx.fillStyle = `rgba(110, 180, 130, ${l.a * (hostVitality/100)})`;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
  });
  roots.forEach(r => { r.grow(); r.draw(); });

  document.getElementById('host').textContent = Math.round(hostVitality) + '%';
  document.getElementById('fig').textContent = Math.round(Math.min(100, roots.length * 2.5)) + '%';
  document.getElementById('roots').textContent = roots.length;

  if (roots.length > 0) hostVitality = Math.max(0, hostVitality - 0.05);
  requestAnimationFrame(render);
}

function addRoot(x, y) {
  const nearest = host.trunk.reduce((c, t) => {
    const d1 = (t.x-x)**2 + (t.y-y)**2;
    const d2 = (c.x-x)**2 + (c.y-y)**2;
    return d1 < d2 ? t : c;
  }, host.trunk[0]);
  roots.push(new Root(nearest));
}

canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  addRoot((e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height));
});
document.getElementById('grow').onclick = () => addRoot(host.trunk[Math.floor(Math.random()*host.trunk.length)]);
document.getElementById('auto').onclick = () => {
  autoGrow = !autoGrow;
  const btn = document.getElementById('auto');
  btn.textContent = autoGrow ? 'Stop' : 'Auto-Grow';
  const tick = () => {
    if (!autoGrow) return;
    if (roots.length < 40) addRoot(host.trunk[Math.floor(Math.random()*host.trunk.length)]);
    setTimeout(tick, 600);
  };
  tick();
};

buildHost();
render();