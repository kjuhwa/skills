const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');

const state = {
  rate: 3, failPct: 10, batch: 5, useOutbox: true,
  committed: 0, delivered: 0, lost: 0,
  outbox: [], history: [],
  t: 0,
};

const $ = id => document.getElementById(id);
const bindRange = (id, key, label) => {
  $(id).oninput = e => {
    state[key] = +e.target.value;
    $(label).textContent = e.target.value;
  };
};
bindRange('rate', 'rate', 'rateV');
bindRange('fail', 'failPct', 'failV');
bindRange('batch', 'batch', 'batchV');
$('useOutbox').onchange = e => state.useOutbox = e.target.checked;
$('reset').onclick = () => {
  state.committed = state.delivered = state.lost = 0;
  state.outbox = []; state.history = []; state.t = 0;
};

function step() {
  state.t++;
  const ordersThisTick = Math.round(state.rate);
  for (let i = 0; i < ordersThisTick; i++) {
    state.committed++;
    if (state.useOutbox) {
      state.outbox.push({ tries: 0, born: state.t });
    } else {
      const fails = Math.random() * 100 < state.failPct;
      if (fails) state.lost++;
      else state.delivered++;
    }
  }
  if (state.useOutbox) {
    let sent = 0;
    for (let i = state.outbox.length - 1; i >= 0 && sent < state.batch; i--) {
      const msg = state.outbox[i];
      msg.tries++;
      if (Math.random() * 100 >= state.failPct) {
        state.delivered++;
        state.outbox.splice(i, 1);
      } else if (msg.tries > 8) {
        state.lost++;
        state.outbox.splice(i, 1);
      }
      sent++;
    }
  }
  state.history.push({
    committed: state.committed,
    delivered: state.delivered,
    lost: state.lost,
    backlog: state.outbox.length,
  });
  if (state.history.length > 120) state.history.shift();
  updateUi();
  draw();
}

function updateUi() {
  $('sCommit').textContent = state.committed;
  $('sDelivered').textContent = state.delivered;
  $('sLost').textContent = state.lost;
  const r = state.committed ? ((state.delivered / state.committed) * 100).toFixed(1) : '100';
  $('sRatio').textContent = r + '%';
}

function draw() {
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#252836';
  for (let g = 0; g < 5; g++) {
    const y = 30 + (h - 60) * g / 4;
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(w - 20, y); ctx.stroke();
  }
  ctx.fillStyle = '#8b8f9e'; ctx.font = '11px monospace';
  ctx.fillText('delivered / lost / backlog', 40, 18);

  if (state.history.length < 2) return;
  const max = Math.max(10, ...state.history.map(p => Math.max(p.delivered, p.lost, p.backlog * 3)));
  const plot = (key, color, mul = 1) => {
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
    state.history.forEach((p, i) => {
      const x = 40 + (w - 60) * i / (state.history.length - 1);
      const y = h - 30 - (h - 60) * (p[key] * mul) / max;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  };
  plot('delivered', '#6ee7b7');
  plot('lost', '#f87171');
  plot('backlog', '#fbbf24', 3);

  ctx.fillStyle = '#6ee7b7'; ctx.fillText('● delivered', w - 130, 20);
  ctx.fillStyle = '#f87171'; ctx.fillText('● lost',      w - 130, 36);
  ctx.fillStyle = '#fbbf24'; ctx.fillText('● backlog×3', w - 130, 52);
}

setInterval(step, 300);
draw();