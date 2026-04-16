const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const colors = {
  command: '#60a5fa',
  event: '#fb923c',
  aggregate: '#fde047',
  policy: '#c084fc'
};
let stickies = [
  { kind: 'command', x: 120, y: 180, text: 'Place Order' },
  { kind: 'aggregate', x: 320, y: 180, text: 'Order' },
  { kind: 'event', x: 520, y: 180, text: 'Order Placed' },
  { kind: 'policy', x: 720, y: 180, text: 'Reserve Stock' },
  { kind: 'command', x: 920, y: 180, text: 'Reserve Items' },
  { kind: 'event', x: 1120, y: 180, text: 'Stock Reserved' },
  { kind: 'event', x: 520, y: 360, text: 'Payment Received' },
  { kind: 'policy', x: 720, y: 360, text: 'Ship Order' }
];

let drag = null;
const W = 140, H = 90;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 110;
  draw();
}
window.addEventListener('resize', resize);

function draw() {
  ctx.fillStyle = '#0f1117';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#1a1d27';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  ctx.strokeStyle = '#6ee7b7';
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  stickies.forEach(s => {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate((Math.sin(s.x * 0.01) * 2 * Math.PI) / 180);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(-W/2 + 4, -H/2 + 4, W, H);
    ctx.fillStyle = colors[s.kind];
    ctx.fillRect(-W/2, -H/2, W, H);
    ctx.fillStyle = '#0f1117';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(s.kind.toUpperCase(), -W/2 + 8, -H/2 + 16);
    ctx.font = '13px sans-serif';
    wrap(s.text, -W/2 + 8, -H/2 + 38, W - 16, 16);
    ctx.restore();
  });
}

function wrap(text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = w + ' '; y += lh;
    } else line = test;
  }
  ctx.fillText(line, x, y);
}

function hit(px, py) {
  for (let i = stickies.length - 1; i >= 0; i--) {
    const s = stickies[i];
    if (Math.abs(px - s.x) < W/2 && Math.abs(py - s.y) < H/2) return i;
  }
  return -1;
}

canvas.addEventListener('mousedown', e => {
  const i = hit(e.offsetX, e.offsetY);
  if (i >= 0) {
    drag = { i, dx: e.offsetX - stickies[i].x, dy: e.offsetY - stickies[i].y };
    stickies.push(stickies.splice(i, 1)[0]);
    drag.i = stickies.length - 1;
  }
});
canvas.addEventListener('mousemove', e => {
  if (!drag) return;
  stickies[drag.i].x = e.offsetX - drag.dx;
  stickies[drag.i].y = e.offsetY - drag.dy;
  draw();
});
canvas.addEventListener('mouseup', () => drag = null);
canvas.addEventListener('dblclick', e => {
  const i = hit(e.offsetX, e.offsetY);
  if (i >= 0) {
    const t = prompt('Rename:', stickies[i].text);
    if (t) { stickies[i].text = t; draw(); }
  }
});

document.querySelectorAll('.chip[data-kind]').forEach(b =>
  b.addEventListener('click', () => {
    stickies.push({
      kind: b.dataset.kind,
      x: canvas.width / 2 + (Math.random() - 0.5) * 80,
      y: canvas.height / 2 + (Math.random() - 0.5) * 80,
      text: 'New ' + b.dataset.kind
    });
    draw();
  }));
document.getElementById('clear').addEventListener('click', () => {
  stickies = []; draw();
});

resize();