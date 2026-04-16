const wire = document.getElementById('wire');
const wctx = wire.getContext('2d');
const tp = document.getElementById('throughput');
const tctx = tp.getContext('2d');
const latInp = document.getElementById('latency');
const dropInp = document.getElementById('drop');
const latVal = document.getElementById('lat-val');
const dropVal = document.getElementById('drop-val');

function resize() {
  wire.width = wire.clientWidth;
  wire.height = wire.clientHeight;
  tp.width = tp.clientWidth;
  tp.height = tp.clientHeight;
}
window.addEventListener('resize', resize);
setTimeout(resize, 0);

class Actor {
  constructor(name) {
    this.name = name;
    this.mailbox = [];
    this.sent = 0;
    this.recv = 0;
    this.peer = null;
  }
  receive(msg) {
    this.recv++;
    this.mailbox.push(msg);
    this.updateUI();
    const next = this.name === 'Pinger' ? 'pong' : 'ping';
    setTimeout(() => {
      this.mailbox.shift();
      this.updateUI();
      if (running) send(this, this.peer, next + '#' + (this.sent + 1));
    }, 200);
  }
  updateUI() {
    const key = this.name.toLowerCase();
    document.getElementById(`${key}-sent`).textContent = this.sent;
    document.getElementById(`${key}-recv`).textContent = this.recv;
    const box = document.getElementById(`${key}-mbox`);
    box.innerHTML = '';
    this.mailbox.slice(-6).forEach(m => {
      const d = document.createElement('div');
      d.className = 'msg';
      d.textContent = m;
      box.appendChild(d);
    });
  }
}

const pinger = new Actor('Pinger');
const ponger = new Actor('Ponger');
pinger.peer = ponger;
ponger.peer = pinger;

const inFlight = [];
function send(from, to, body) {
  from.sent++;
  from.updateUI();
  const drop = parseInt(dropInp.value) / 100;
  if (Math.random() < drop) {
    inFlight.push({ from, to, body, t: 0, duration: 300, dropped: true });
    return;
  }
  inFlight.push({ from, to, body, t: 0, duration: parseInt(latInp.value) });
}

let running = false;
let history = [];
let lastCount = 0;
document.getElementById('start').onclick = () => {
  if (!running) {
    running = true;
    send(pinger, ponger, 'ping#1');
  }
};
document.getElementById('stop').onclick = () => running = false;
document.getElementById('burst').onclick = () => {
  for (let i = 0; i < 20; i++) send(pinger, ponger, 'burst#' + i);
};

latInp.oninput = () => latVal.textContent = latInp.value;
dropInp.oninput = () => dropVal.textContent = dropInp.value;

let last = performance.now();
function loop(now) {
  const dt = now - last;
  last = now;
  wctx.clearRect(0, 0, wire.width, wire.height);
  const y = wire.height / 2;
  wctx.strokeStyle = '#2a2f3a';
  wctx.setLineDash([4, 4]);
  wctx.beginPath();
  wctx.moveTo(0, y);
  wctx.lineTo(wire.width, y);
  wctx.stroke();
  wctx.setLineDash([]);

  for (let i = inFlight.length - 1; i >= 0; i--) {
    const m = inFlight[i];
    m.t += dt;
    const p = Math.min(1, m.t / m.duration);
    const dir = m.from === pinger ? 1 : -1;
    const x = dir > 0 ? p * wire.width : (1 - p) * wire.width;
    const yy = y + Math.sin(p * Math.PI) * -20 * dir;
    wctx.beginPath();
    wctx.arc(x, yy, 5, 0, Math.PI * 2);
    wctx.fillStyle = m.dropped ? '#f87171' : '#6ee7b7';
    wctx.fill();
    wctx.fillStyle = '#e5e7eb';
    wctx.font = '10px Consolas';
    wctx.fillText(m.body, x + 8, yy - 8);
    if (p >= 1) {
      if (!m.dropped) m.to.receive(m.body);
      inFlight.splice(i, 1);
    }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

setInterval(() => {
  const total = pinger.recv + ponger.recv;
  history.push(total - lastCount);
  lastCount = total;
  if (history.length > 60) history.shift();
  tctx.clearRect(0, 0, tp.width, tp.height);
  const max = Math.max(10, ...history);
  tctx.strokeStyle = '#6ee7b7';
  tctx.lineWidth = 2;
  tctx.beginPath();
  history.forEach((v, i) => {
    const x = (i / 60) * tp.width;
    const yy = tp.height - (v / max) * (tp.height - 20) - 10;
    if (i === 0) tctx.moveTo(x, yy); else tctx.lineTo(x, yy);
  });
  tctx.stroke();
  tctx.fillStyle = '#9ca3af';
  tctx.font = '11px Consolas';
  tctx.fillText(`msg/s (peak ${max})`, 10, 15);
}, 1000);