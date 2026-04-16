const HANDLERS = [
  { name: 'Auth Listener', topic: 'user.login', processed: 0, active: false },
  { name: 'Audit Logger', topic: 'user.*', processed: 0, active: false },
  { name: 'Cart Updater', topic: 'cart.change', processed: 0, active: false },
  { name: 'Email Sender', topic: 'order.placed', processed: 0, active: false },
  { name: 'Analytics', topic: '*', processed: 0, active: false },
  { name: 'Fraud Check', topic: 'order.*', processed: 0, active: false }
];

const TOPICS = ['user.login', 'user.logout', 'cart.change', 'order.placed', 'order.canceled'];

let queue = [];
let delivered = 0;
let tpsHistory = new Array(60).fill(0);
let perSecondCount = 0;
let rate = 6;
let latency = 80;
let spikeTimeout = 0;

const busEl = document.getElementById('bus');
const handlersEl = document.getElementById('handlers');
const tpsEl = document.getElementById('tps');
const queueEl = document.getElementById('queue');
const deliveredEl = document.getElementById('delivered');
const chart = document.getElementById('chart');
const cctx = chart.getContext('2d');

function match(pattern, topic) {
  if (pattern === '*') return true;
  if (pattern.endsWith('.*')) return topic.startsWith(pattern.slice(0, -1));
  return pattern === topic;
}

function publish(topic) {
  const evt = { topic, payload: 'p' + Math.floor(Math.random() * 999), id: Date.now() + Math.random() };
  queue.push(evt);
  const line = document.createElement('div');
  line.className = 'evt';
  line.innerHTML = `[${new Date().toISOString().slice(11, 19)}] <span class="t">${topic}</span> → <span class="p">${evt.payload}</span>`;
  busEl.prepend(line);
  while (busEl.children.length > 30) busEl.lastChild.remove();
}

function drain() {
  if (!queue.length) return;
  const evt = queue.shift();
  HANDLERS.forEach(h => {
    if (match(h.topic, evt.topic)) {
      setTimeout(() => {
        h.processed++;
        h.active = true;
        perSecondCount++;
        delivered++;
        setTimeout(() => h.active = false, 120);
      }, latency + Math.random() * 40);
    }
  });
}

function renderHandlers() {
  handlersEl.innerHTML = '';
  const max = Math.max(1, ...HANDLERS.map(h => h.processed));
  HANDLERS.forEach(h => {
    const el = document.createElement('div');
    el.className = 'handler' + (h.active ? ' firing' : '');
    el.innerHTML = `
      <h4>${h.name}</h4>
      <div class="topic">${h.topic}</div>
      <div class="bar"><div class="fill" style="width:${(h.processed / max) * 100}%"></div></div>
      <div class="stats">processed: ${h.processed}</div>
    `;
    handlersEl.appendChild(el);
  });
}

function drawChart() {
  const w = chart.width = chart.offsetWidth;
  const h = chart.height = chart.offsetHeight;
  cctx.clearRect(0, 0, w, h);
  const max = Math.max(10, ...tpsHistory);
  cctx.strokeStyle = '#6ee7b7';
  cctx.lineWidth = 2;
  cctx.beginPath();
  tpsHistory.forEach((v, i) => {
    const x = (i / (tpsHistory.length - 1)) * w;
    const y = h - (v / max) * (h - 6) - 3;
    if (i === 0) cctx.moveTo(x, y);
    else cctx.lineTo(x, y);
  });
  cctx.stroke();
  cctx.fillStyle = 'rgba(110,231,183,0.1)';
  cctx.lineTo(w, h);
  cctx.lineTo(0, h);
  cctx.fill();
}

document.getElementById('rate').oninput = e => {
  rate = +e.target.value;
  document.getElementById('rateV').textContent = rate;
};
document.getElementById('lat').oninput = e => {
  latency = +e.target.value;
  document.getElementById('latV').textContent = latency;
};
document.getElementById('spike').onclick = () => {
  spikeTimeout = 50;
};

setInterval(() => {
  const effective = spikeTimeout > 0 ? 25 : rate;
  if (spikeTimeout > 0) spikeTimeout--;
  for (let i = 0; i < effective; i++) {
    if (Math.random() < 0.2 || i < effective) {
      publish(TOPICS[Math.floor(Math.random() * TOPICS.length)]);
    }
  }
}, 1000);

setInterval(() => {
  drain();
}, 50);

setInterval(() => {
  tpsHistory.push(perSecondCount);
  tpsHistory.shift();
  tpsEl.textContent = perSecondCount;
  perSecondCount = 0;
  queueEl.textContent = queue.length;
  deliveredEl.textContent = delivered;
}, 1000);

setInterval(() => {
  renderHandlers();
  drawChart();
}, 100);

renderHandlers();