const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const log = document.getElementById('log');

const actors = [
  { id: 'A', name: 'Router', x: 150, y: 260, color: '#6ee7b7', mailbox: [], processing: null },
  { id: 'B', name: 'Worker-1', x: 450, y: 120, color: '#60a5fa', mailbox: [], processing: null },
  { id: 'C', name: 'Worker-2', x: 450, y: 400, color: '#f472b6', mailbox: [], processing: null },
  { id: 'D', name: 'Logger', x: 750, y: 260, color: '#fbbf24', mailbox: [], processing: null },
];
const routes = { A: ['B', 'C'], B: ['D'], C: ['D'], D: [] };
const messages = [];
let paused = false;
let speed = 5;
let msgId = 0;

function addLog(txt) {
  const div = document.createElement('div');
  div.className = 'log-entry';
  div.innerHTML = txt;
  log.prepend(div);
  if (log.children.length > 60) log.lastChild.remove();
}

function sendMessage(fromId, toId, payload) {
  const from = actors.find(a => a.id === fromId);
  const to = actors.find(a => a.id === toId);
  messages.push({
    id: ++msgId, from, to, payload,
    x: from.x, y: from.y, progress: 0,
  });
}

function inject() {
  const id = ++msgId;
  sendMessage('A', 'A', `req#${id}`);
  addLog(`<b>→ Router</b> received req#${id}`);
}

function tick() {
  if (paused) { draw(); requestAnimationFrame(tick); return; }
  const step = speed / 400;

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    m.progress += step;
    m.x = m.from.x + (m.to.x - m.from.x) * m.progress;
    m.y = m.from.y + (m.to.y - m.from.y) * m.progress;
    if (m.progress >= 1) {
      m.to.mailbox.push(m.payload);
      messages.splice(i, 1);
    }
  }

  actors.forEach(a => {
    if (!a.processing && a.mailbox.length) {
      a.processing = { payload: a.mailbox.shift(), t: 0 };
    }
    if (a.processing) {
      a.processing.t += speed / 300;
      if (a.processing.t >= 1) {
        const targets = routes[a.id];
        if (targets.length) {
          const next = targets[Math.floor(Math.random() * targets.length)];
          sendMessage(a.id, next, a.processing.payload);
          addLog(`<b>${a.name}</b> → ${actors.find(x=>x.id===next).name}: ${a.processing.payload}`);
        } else {
          addLog(`<b>${a.name}</b> handled ${a.processing.payload}`);
        }
        a.processing = null;
      }
    }
  });

  draw();
  requestAnimationFrame(tick);
}

function draw() {
  ctx.fillStyle = '#1a1d27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#2a2f3d';
  ctx.lineWidth = 1.5;
  Object.entries(routes).forEach(([from, tos]) => {
    const f = actors.find(a => a.id === from);
    tos.forEach(t => {
      const to = actors.find(a => a.id === t);
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    });
  });

  actors.forEach(a => {
    ctx.fillStyle = '#0f1117';
    ctx.strokeStyle = a.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(a.x, a.y, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = a.color;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(a.name, a.x, a.y - 5);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px monospace';
    ctx.fillText(`inbox: ${a.mailbox.length}`, a.x, a.y + 12);

    if (a.processing) {
      ctx.strokeStyle = '#6ee7b7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 48, -Math.PI/2, -Math.PI/2 + a.processing.t * Math.PI * 2);
      ctx.stroke();
    }

    a.mailbox.slice(0, 5).forEach((_, i) => {
      ctx.fillStyle = a.color;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(a.x + 50 + i * 10, a.y - 4, 8, 8);
      ctx.globalAlpha = 1;
    });
  });

  messages.forEach(m => {
    ctx.fillStyle = '#6ee7b7';
    ctx.beginPath();
    ctx.arc(m.x, m.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

document.getElementById('send').onclick = inject;
document.getElementById('burst').onclick = () => { for (let i = 0; i < 10; i++) setTimeout(inject, i * 80); };
document.getElementById('pause').onclick = (e) => { paused = !paused; e.target.textContent = paused ? 'Resume' : 'Pause'; };
document.getElementById('reset').onclick = () => { actors.forEach(a => { a.mailbox = []; a.processing = null; }); messages.length = 0; log.innerHTML = ''; };
document.getElementById('speed').oninput = (e) => speed = +e.target.value;

for (let i = 0; i < 3; i++) setTimeout(inject, i * 400);
tick();