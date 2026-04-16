const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = Math.min(window.innerWidth - 40, 900);
canvas.height = 420;

const topics = { orders: '#6ee7b7', payments: '#60a5fa', alerts: '#f87171' };
const subscribers = [
  { name: 'OrderSvc', x: canvas.width - 100, y: 60, topics: ['orders'] },
  { name: 'BillingSvc', x: canvas.width - 100, y: 160, topics: ['orders', 'payments'] },
  { name: 'NotifySvc', x: canvas.width - 100, y: 260, topics: ['alerts', 'payments'] },
  { name: 'AuditLog', x: canvas.width - 100, y: 360, topics: ['orders', 'payments', 'alerts'] }
];
const publisher = { name: 'Publisher', x: 60, y: canvas.height / 2 };
const broker = { name: 'Broker', x: canvas.width / 2, y: canvas.height / 2 };
let particles = [];

function emit(topic) {
  particles.push({ x: publisher.x + 40, y: publisher.y, phase: 'toBroker', topic, progress: 0 });
}

function drawNode(x, y, label, color = '#6ee7b7') {
  ctx.fillStyle = color + '22';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x - 40, y - 18, 80, 36, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = '12px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + 4);
}

function update() {
  particles.forEach(p => {
    p.progress += 0.02;
    if (p.phase === 'toBroker' && p.progress >= 1) {
      p.phase = 'done';
      subscribers.filter(s => s.topics.includes(p.topic)).forEach(s => {
        particles.push({ x: broker.x, y: broker.y, tx: s.x - 40, ty: s.y, phase: 'toSub', topic: p.topic, progress: 0 });
      });
    }
    if (p.phase === 'toSub' && p.progress >= 1) p.phase = 'done';
  });
  particles = particles.filter(p => p.phase !== 'done');
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawNode(publisher.x, publisher.y, 'Publisher');
  drawNode(broker.x, broker.y, 'Broker', '#a78bfa');
  subscribers.forEach(s => {
    const c = topics[s.topics[0]];
    drawNode(s.x, s.y, s.name, c);
    ctx.strokeStyle = '#ffffff11';
    ctx.beginPath(); ctx.moveTo(broker.x + 40, broker.y); ctx.lineTo(s.x - 40, s.y); ctx.stroke();
  });
  ctx.strokeStyle = '#ffffff11';
  ctx.beginPath(); ctx.moveTo(publisher.x + 40, publisher.y); ctx.lineTo(broker.x - 40, broker.y); ctx.stroke();

  particles.forEach(p => {
    const color = topics[p.topic];
    let px, py;
    if (p.phase === 'toBroker') {
      px = publisher.x + 40 + (broker.x - 40 - publisher.x - 40) * p.progress;
      py = publisher.y + (broker.y - publisher.y) * p.progress;
    } else if (p.phase === 'toSub') {
      px = broker.x + (p.tx - broker.x) * p.progress;
      py = broker.y + (p.ty - broker.y) * p.progress;
    }
    if (px) {
      ctx.shadowColor = color; ctx.shadowBlur = 10;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  });
  update();
  requestAnimationFrame(draw);
}

document.getElementById('btnPublish').onclick = () => emit(document.getElementById('topicSelect').value);
setInterval(() => emit(Object.keys(topics)[Math.random() * 3 | 0]), 2000);
draw();