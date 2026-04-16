const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const log = document.getElementById('log');
const speed = document.getElementById('speed');

function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resize);
resize();

const actors = [];
const messages = [];
const names = ['Alpha', 'Bravo', 'Cosmo', 'Delta', 'Echo', 'Foxy', 'Gamma', 'Helix'];

class Actor {
  constructor(name) {
    this.id = Math.random().toString(36).slice(2, 7);
    this.name = name;
    this.x = Math.random() * (canvas.width - 100) + 50;
    this.y = Math.random() * (canvas.height - 100) + 50;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.mailbox = [];
    this.state = 'idle';
    this.processed = 0;
    this.hue = Math.random() * 360;
  }
  tick(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < 40 || this.x > canvas.width - 40) this.vx *= -1;
    if (this.y < 40 || this.y > canvas.height - 40) this.vy *= -1;
    if (this.mailbox.length > 0 && Math.random() < 0.05 * (speed.value / 5)) {
      const m = this.mailbox.shift();
      this.processed++;
      this.state = 'busy';
      setTimeout(() => this.state = 'idle', 300);
      logLine(`<b>${this.name}</b> handled "${m.body}"`);
      if (Math.random() < 0.4 && actors.length > 1) {
        const target = actors[Math.floor(Math.random() * actors.length)];
        if (target !== this) send(this, target, 'reply:' + m.body);
      }
    }
  }
  draw() {
    const r = 22 + Math.min(this.mailbox.length * 2, 18);
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fillStyle = this.state === 'busy' ? '#6ee7b7' : `hsl(${this.hue}, 50%, 25%)`;
    ctx.fill();
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '12px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x, this.y + 4);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px Consolas';
    ctx.fillText(`📬 ${this.mailbox.length} | ✔ ${this.processed}`, this.x, this.y + r + 14);
  }
}

function logLine(html) {
  const d = document.createElement('div');
  d.className = 'log-entry';
  d.innerHTML = html;
  log.prepend(d);
  while (log.children.length > 60) log.removeChild(log.lastChild);
}

function send(from, to, body) {
  messages.push({ from, to, body, x: from.x, y: from.y, t: 0 });
}

document.getElementById('send').onclick = () => {
  if (actors.length < 2) return;
  const a = actors[Math.floor(Math.random() * actors.length)];
  const b = actors[Math.floor(Math.random() * actors.length)];
  if (a !== b) send(a, b, 'hello-' + Math.floor(Math.random() * 100));
};
document.getElementById('spawn').onclick = () => {
  if (actors.length < 12) actors.push(new Actor(names[actors.length % names.length] + actors.length));
};
document.getElementById('kill').onclick = () => {
  if (actors.length > 1) {
    const dead = actors.splice(Math.floor(Math.random() * actors.length), 1)[0];
    logLine(`<b style="color:#f87171">${dead.name}</b> terminated`);
  }
};

for (let i = 0; i < 5; i++) actors.push(new Actor(names[i]));

let last = performance.now();
function loop(now) {
  const dt = Math.min(50, now - last);
  last = now;
  ctx.fillStyle = 'rgba(15,17,23,0.2)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  actors.forEach(a => a.tick(dt));

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    m.t += 0.005 * (speed.value / 5) * dt;
    m.x = m.from.x + (m.to.x - m.from.x) * m.t;
    m.y = m.from.y + (m.to.y - m.from.y) * m.t;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#6ee7b7';
    ctx.fill();
    if (m.t >= 1) {
      m.to.mailbox.push({ body: m.body });
      messages.splice(i, 1);
    }
  }
  actors.forEach(a => a.draw());

  if (Math.random() < 0.02 * (speed.value / 5) && actors.length >= 2) {
    const a = actors[Math.floor(Math.random() * actors.length)];
    const b = actors[Math.floor(Math.random() * actors.length)];
    if (a !== b) send(a, b, 'auto-' + Math.floor(Math.random() * 1000));
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);