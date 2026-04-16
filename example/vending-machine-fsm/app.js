const fsm = {
  state: 'IDLE',
  credit: 0,
  selected: null,
  transitions: {
    IDLE: { INSERT: 'COLLECTING' },
    COLLECTING: { INSERT: 'COLLECTING', SELECT: 'DISPENSING', REFUND: 'IDLE' },
    DISPENSING: { DONE: 'IDLE' }
  }
};

const stateTag = document.getElementById('stateTag');
const message = document.getElementById('message');
const creditEl = document.getElementById('credit');
const tray = document.getElementById('tray');
const canvas = document.getElementById('diagram');
const ctx = canvas.getContext('2d');

const nodes = {
  IDLE: { x: 100, y: 140 },
  COLLECTING: { x: 260, y: 140 },
  DISPENSING: { x: 420, y: 140 }
};
const edges = [
  ['IDLE', 'COLLECTING', 'insert'],
  ['COLLECTING', 'COLLECTING', 'insert'],
  ['COLLECTING', 'DISPENSING', 'select'],
  ['COLLECTING', 'IDLE', 'refund'],
  ['DISPENSING', 'IDLE', 'done']
];

function drawDiagram() {
  ctx.clearRect(0, 0, 520, 280);
  edges.forEach(([from, to, label]) => {
    const a = nodes[from], b = nodes[to];
    ctx.strokeStyle = (fsm.state === from) ? '#6ee7b7' : '#2d3142';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (from === to) {
      ctx.arc(a.x, a.y - 50, 22, 0.3, Math.PI * 2 - 0.3);
      ctx.stroke();
      ctx.fillStyle = '#8b8d93'; ctx.font = '11px sans-serif';
      ctx.fillText(label, a.x - 15, a.y - 78);
    } else {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      const ux = dx / len, uy = dy / len;
      const sx = a.x + ux * 36, sy = a.y + uy * 36;
      const ex = b.x - ux * 36, ey = b.y - uy * 36;
      const offset = (from === 'COLLECTING' && to === 'IDLE') ? 30 : 0;
      ctx.beginPath();
      ctx.moveTo(sx, sy + offset);
      ctx.lineTo(ex, ey + offset);
      ctx.stroke();
      const ah = 8;
      ctx.beginPath();
      ctx.moveTo(ex, ey + offset);
      ctx.lineTo(ex - ux * ah - uy * ah / 2, ey + offset - uy * ah + ux * ah / 2);
      ctx.lineTo(ex - ux * ah + uy * ah / 2, ey + offset - uy * ah - ux * ah / 2);
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      ctx.fillStyle = '#8b8d93'; ctx.font = '11px sans-serif';
      ctx.fillText(label, (sx + ex) / 2 - 15, (sy + ey) / 2 - 8 + offset);
    }
  });
  Object.entries(nodes).forEach(([name, pos]) => {
    const active = fsm.state === name;
    ctx.fillStyle = active ? '#6ee7b7' : '#1a1d27';
    ctx.strokeStyle = active ? '#6ee7b7' : '#2d3142';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 36, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = active ? '#0f1117' : '#e4e6eb';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, pos.x, pos.y + 4);
  });
}

function transition(event) {
  const next = fsm.transitions[fsm.state]?.[event];
  if (next) fsm.state = next;
}

function render() {
  stateTag.textContent = fsm.state;
  creditEl.textContent = fsm.credit.toFixed(2);
  document.querySelectorAll('.item').forEach(btn => {
    btn.disabled = fsm.credit < parseFloat(btn.dataset.price) || fsm.state === 'DISPENSING';
  });
  if (fsm.state === 'IDLE') message.textContent = 'Insert coin to begin';
  else if (fsm.state === 'COLLECTING') message.textContent = 'Add more or select an item';
  else if (fsm.state === 'DISPENSING') message.textContent = `Dispensing ${fsm.selected}...`;
  drawDiagram();
}

document.querySelectorAll('.coin[data-val]').forEach(btn => {
  btn.onclick = () => {
    fsm.credit += parseFloat(btn.dataset.val);
    transition('INSERT');
    render();
  };
});
document.getElementById('refund').onclick = () => {
  if (fsm.credit > 0) {
    alert(`Refunded $${fsm.credit.toFixed(2)}`);
    fsm.credit = 0;
    transition('REFUND');
    render();
  }
};
document.querySelectorAll('.item').forEach(btn => {
  btn.onclick = () => {
    const price = parseFloat(btn.dataset.price);
    fsm.selected = btn.dataset.name;
    fsm.credit -= price;
    transition('SELECT');
    render();
    tray.innerHTML = `<span class="dispensed">✓ ${fsm.selected} dispensed</span>`;
    setTimeout(() => {
      transition('DONE');
      if (fsm.credit > 0) {
        tray.innerHTML += `<span class="dispensed">Change: $${fsm.credit.toFixed(2)}</span>`;
        fsm.credit = 0;
      }
      render();
      setTimeout(() => tray.innerHTML = '<span class="empty-tray">— Dispenser —</span>', 2000);
    }, 1500);
  };
});

render();