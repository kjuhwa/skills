const states = {
  Draft:     { x: 100, y: 180, transitions: { submit: 'Pending' } },
  Pending:   { x: 260, y: 180, transitions: { pay: 'Paid', cancel: 'Cancelled' } },
  Paid:      { x: 420, y: 100, transitions: { ship: 'Shipped' } },
  Shipped:   { x: 580, y: 100, transitions: { deliver: 'Delivered' } },
  Delivered: { x: 580, y: 260, transitions: {} },
  Cancelled: { x: 260, y: 300, transitions: {} }
};
const commands = {
  Draft: { name: 'submit', event: 'OrderPlaced' },
  Pending: { name: 'pay', event: 'PaymentReceived' },
  Paid: { name: 'ship', event: 'OrderShipped' },
  Shipped: { name: 'deliver', event: 'OrderDelivered' }
};

let current = 'Draft';
let history = [];

const canvas = document.getElementById('diagram');
const ctx = canvas.getContext('2d');

function draw() {
  ctx.fillStyle = '#1a1d27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const [name, s] of Object.entries(states)) {
    for (const [cmd, target] of Object.entries(s.transitions)) {
      const t = states[target];
      ctx.strokeStyle = '#3b4258';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
      const ang = Math.atan2(t.y - s.y, t.x - s.x);
      const ax = t.x - Math.cos(ang) * 48;
      const ay = t.y - Math.sin(ang) * 48;
      ctx.fillStyle = '#3b4258';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - 8 * Math.cos(ang - 0.4), ay - 8 * Math.sin(ang - 0.4));
      ctx.lineTo(ax - 8 * Math.cos(ang + 0.4), ay - 8 * Math.sin(ang + 0.4));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7a8199';
      ctx.font = 'italic 10px sans-serif';
      ctx.fillText(cmd, (s.x + t.x) / 2 - 10, (s.y + t.y) / 2 - 6);
    }
  }

  for (const [name, s] of Object.entries(states)) {
    const active = name === current;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 44, 0, Math.PI * 2);
    ctx.fillStyle = active ? '#1c3d32' : '#232838';
    ctx.fill();
    ctx.strokeStyle = active ? '#6ee7b7' : '#3b4258';
    ctx.lineWidth = active ? 3 : 1.5;
    ctx.stroke();
    if (active) {
      ctx.save();
      ctx.strokeStyle = '#6ee7b7';
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 2;
      const r = 44 + (Date.now() % 1200) / 1200 * 20;
      ctx.globalAlpha = 0.4 - ((Date.now() % 1200) / 1200) * 0.4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = active ? '#6ee7b7' : '#e4e7ef';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, s.x, s.y + 4);
  }
  ctx.textAlign = 'start';
}

function emit() {
  const cmd = commands[current];
  if (!cmd) {
    document.getElementById('status').textContent = 'Terminal state: ' + current;
    return;
  }
  const next = states[current].transitions[cmd.name];
  const evt = cmd.event;
  const ts = new Date().toLocaleTimeString();
  history.unshift({ evt, from: current, to: next, ts });
  current = next;
  renderLog();
  document.getElementById('status').textContent = `→ ${evt}`;
}

function renderLog() {
  document.getElementById('events').innerHTML = history.map(h =>
    `<li><b>${h.evt}</b><small>${h.from} → ${h.to} · ${h.ts}</small></li>`
  ).join('');
}

document.getElementById('tick').addEventListener('click', emit);
document.getElementById('reset').addEventListener('click', () => {
  current = 'Draft'; history = []; renderLog();
  document.getElementById('status').textContent = 'Reset';
});

(function loop() {
  draw();
  requestAnimationFrame(loop);
})();