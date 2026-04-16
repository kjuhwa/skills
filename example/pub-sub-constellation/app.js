const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let W, H;
function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
resize(); window.onresize = resize;

const TOPIC_COLORS = ['#6ee7b7', '#60a5fa', '#f87171', '#fbbf24', '#c084fc'];
const TOPIC_NAMES = ['events', 'metrics', 'logs', 'commands', 'state'];

class Node {
  constructor(type, topic) {
    this.type = type; // 'pub' or 'sub'
    this.topic = topic;
    this.color = TOPIC_COLORS[topic];
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.r = type === 'pub' ? 7 : 5;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    if (this.x < 0 || this.x > W) this.vx *= -1;
    if (this.y < 0 || this.y > H) this.vy *= -1;
  }
}

const nodes = [];
for (let t = 0; t < 5; t++) {
  for (let i = 0; i < 2; i++) nodes.push(new Node('pub', t));
  for (let i = 0; i < 4; i++) nodes.push(new Node('sub', t));
}

let pulses = [];
function sendPulse() {
  const pubs = nodes.filter(n => n.type === 'pub');
  const src = pubs[Math.random() * pubs.length | 0];
  const subs = nodes.filter(n => n.type === 'sub' && n.topic === src.topic);
  subs.forEach(dst => pulses.push({ sx: src.x, sy: src.y, dx: dst.x, dy: dst.y, t: 0, color: src.color }));
  msgTotal += subs.length;
}

let msgTotal = 0;
const statsEl = document.getElementById('stats');

function draw() {
  ctx.clearRect(0, 0, W, H);

  // draw connections
  nodes.filter(n => n.type === 'pub').forEach(pub => {
    nodes.filter(n => n.type === 'sub' && n.topic === pub.topic).forEach(sub => {
      ctx.strokeStyle = pub.color + '15';
      ctx.beginPath(); ctx.moveTo(pub.x, pub.y); ctx.lineTo(sub.x, sub.y); ctx.stroke();
    });
  });

  // draw pulses
  pulses.forEach(p => {
    p.t += 0.025;
    const x = p.sx + (p.dx - p.sx) * p.t;
    const y = p.sy + (p.dy - p.sy) * p.t;
    ctx.shadowColor = p.color; ctx.shadowBlur = 12;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  });
  pulses = pulses.filter(p => p.t < 1);

  // draw nodes
  nodes.forEach(n => {
    n.update();
    ctx.fillStyle = n.type === 'pub' ? n.color : n.color + '88';
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
    if (n.type === 'pub') {
      ctx.strokeStyle = n.color + '44'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2); ctx.stroke();
    }
  });

  statsEl.textContent = `${nodes.filter(n=>n.type==='pub').length} publishers · ${nodes.filter(n=>n.type==='sub').length} subscribers · ${TOPIC_NAMES.length} topics · ${msgTotal} messages`;
  requestAnimationFrame(draw);
}

setInterval(sendPulse, 600);
draw();