const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const dbLog = document.getElementById('db-log');
const outboxLog = document.getElementById('outbox-log');
const brokerLog = document.getElementById('broker-log');
const speedInput = document.getElementById('speed');

const nodes = {
  db: { x: 130, y: 190, label: 'DB', color: '#60a5fa' },
  outbox: { x: 450, y: 190, label: 'Outbox', color: '#6ee7b7' },
  broker: { x: 770, y: 190, label: 'Broker', color: '#fbbf24' }
};

let messages = [];
let brokerDown = false;
let msgId = 1;

function log(el, text, cls = '') {
  const li = document.createElement('li');
  li.textContent = text;
  if (cls) li.className = cls;
  el.insertBefore(li, el.firstChild);
  while (el.children.length > 8) el.removeChild(el.lastChild);
}

function emit() {
  const id = msgId++;
  const payload = `order#${1000 + id}`;
  log(dbLog, `BEGIN TX: INSERT order ${payload}`, 'ok');
  log(dbLog, `INSERT outbox(${payload}) COMMIT`, 'ok');
  log(outboxLog, `[PENDING] ${payload}`);
  messages.push({
    id, payload, x: nodes.db.x, y: nodes.db.y,
    target: 'outbox', state: 'pending', progress: 0
  });
}

function relay() {
  const speed = parseFloat(speedInput.value);
  const step = 2000 / speed;
  messages.forEach(m => {
    if (m.state === 'done') return;
    m.progress += step;
    const from = m.target === 'outbox' ? nodes.db : nodes.outbox;
    const to = m.target === 'outbox' ? nodes.outbox : nodes.broker;
    const t = Math.min(m.progress / 100, 1);
    m.x = from.x + (to.x - from.x) * t;
    m.y = from.y + (to.y - from.y) * t;
    if (t >= 1) {
      if (m.target === 'outbox') {
        m.target = 'broker';
        m.progress = 0;
      } else {
        if (brokerDown) {
          m.progress = 0;
          m.x = nodes.outbox.x;
          m.y = nodes.outbox.y;
          log(outboxLog, `[RETRY] ${m.payload}`, 'err');
        } else {
          m.state = 'done';
          log(brokerLog, `[ACKED] ${m.payload}`, 'ok');
          log(outboxLog, `[DELIVERED] ${m.payload}`, 'ok');
        }
      }
    }
  });
  messages = messages.filter(m => m.state !== 'done' || m.progress < 120);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#262a37';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(nodes.db.x + 50, nodes.db.y);
  ctx.lineTo(nodes.outbox.x - 50, nodes.outbox.y);
  ctx.moveTo(nodes.outbox.x + 50, nodes.outbox.y);
  ctx.lineTo(nodes.broker.x - 50, nodes.broker.y);
  ctx.stroke();

  Object.values(nodes).forEach(n => {
    const isBroker = n.label === 'Broker';
    ctx.fillStyle = isBroker && brokerDown ? '#f87171' : n.color;
    ctx.beginPath();
    ctx.arc(n.x, n.y, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f1117';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.label, n.x, n.y);
  });

  messages.forEach(m => {
    ctx.fillStyle = '#6ee7b7';
    ctx.beginPath();
    ctx.arc(m.x, m.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e4e6ec';
    ctx.font = '10px monospace';
    ctx.fillText(m.payload, m.x, m.y - 14);
  });

  if (brokerDown) {
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('DOWN', nodes.broker.x, nodes.broker.y + 65);
  }

  relay();
  requestAnimationFrame(draw);
}

document.getElementById('emit').onclick = emit;
document.getElementById('crash').onclick = () => {
  brokerDown = !brokerDown;
  log(brokerLog, brokerDown ? '[BROKER DOWN]' : '[BROKER RECOVERED]', brokerDown ? 'err' : 'ok');
};
document.getElementById('reset').onclick = () => {
  messages = []; msgId = 1; brokerDown = false;
  [dbLog, outboxLog, brokerLog].forEach(l => l.innerHTML = '');
};

// Seed
setTimeout(emit, 300);
setTimeout(emit, 900);
draw();