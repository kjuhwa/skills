const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const logEl = document.getElementById('log');
const termLabel = document.getElementById('termLabel');
const STATES = { FOLLOWER: 'Follower', CANDIDATE: 'Candidate', LEADER: 'Leader' };
const COLORS = { Follower: '#4b5563', Candidate: '#f59e0b', Leader: '#6ee7b7' };
let nodes = [], term = 0, running = false, messages = [];

function initNodes() {
  nodes = []; term = 0; messages = []; logEl.innerHTML = '';
  const cx = 400, cy = 250, r = 150;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    nodes.push({ id: i, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), state: STATES.FOLLOWER, votes: 0, alive: true, timer: 150 + Math.random() * 150 | 0, votedFor: -1 });
  }
}

function addLog(msg) {
  const d = document.createElement('div');
  d.className = 'log-entry'; d.textContent = `[T${term}] ${msg}`;
  logEl.prepend(d);
  if (logEl.children.length > 50) logEl.lastChild.remove();
}

function tick() {
  if (!running) return;
  nodes.forEach(n => {
    if (!n.alive || n.state === STATES.LEADER) return;
    n.timer--;
    if (n.timer <= 0) {
      n.state = STATES.CANDIDATE; term++; termLabel.textContent = `Term: ${term}`;
      n.votes = 1; n.votedFor = n.id;
      addLog(`Node ${n.id} starts election`);
      nodes.forEach(o => {
        if (o.id !== n.id && o.alive) messages.push({ from: n.id, to: o.id, type: 'vote-req', t: 20 });
      });
      n.timer = 300 + Math.random() * 200 | 0;
    }
  });
  messages.forEach(m => { m.t--; });
  messages.filter(m => m.t <= 0).forEach(m => {
    if (m.type === 'vote-req') {
      const voter = nodes[m.to];
      if (voter.alive && (voter.votedFor === -1 || voter.votedFor === m.from)) {
        voter.votedFor = m.from; voter.timer = 150 + Math.random() * 150 | 0;
        messages.push({ from: m.to, to: m.from, type: 'vote-ok', t: 15 });
      }
    } else if (m.type === 'vote-ok') {
      const c = nodes[m.to];
      if (c.alive && c.state === STATES.CANDIDATE) {
        c.votes++;
        if (c.votes > nodes.filter(n => n.alive).length / 2) {
          c.state = STATES.LEADER;
          addLog(`Node ${c.id} elected leader!`);
          nodes.forEach(o => { if (o.id !== c.id) { o.state = STATES.FOLLOWER; o.votedFor = -1; o.timer = 150 + Math.random() * 150 | 0; } });
        }
      }
    }
  });
  messages = messages.filter(m => m.t > 0);
}

function draw() {
  ctx.clearRect(0, 0, 800, 500);
  messages.forEach(m => {
    const a = nodes[m.from], b = nodes[m.to];
    const p = 1 - m.t / 20;
    const mx = a.x + (b.x - a.x) * p, my = a.y + (b.y - a.y) * p;
    ctx.beginPath(); ctx.arc(mx, my, 4, 0, Math.PI * 2);
    ctx.fillStyle = m.type === 'vote-req' ? '#f59e0b' : '#6ee7b7'; ctx.fill();
  });
  nodes.forEach(n => {
    ctx.beginPath(); ctx.arc(n.x, n.y, 32, 0, Math.PI * 2);
    ctx.fillStyle = n.alive ? COLORS[n.state] + '33' : '#1a1d2733';
    ctx.strokeStyle = n.alive ? COLORS[n.state] : '#333'; ctx.lineWidth = 3;
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = n.alive ? '#fff' : '#555'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
    ctx.fillText(`N${n.id}`, n.x, n.y - 4);
    ctx.font = '10px monospace'; ctx.fillStyle = n.alive ? COLORS[n.state] : '#444';
    ctx.fillText(n.alive ? n.state : 'Dead', n.x, n.y + 14);
  });
  requestAnimationFrame(draw);
}

function gameLoop() { tick(); setTimeout(gameLoop, 50); }

document.getElementById('btnStart').onclick = () => { if (!running) { initNodes(); running = true; addLog('Cluster started'); } };
document.getElementById('btnKillLeader').onclick = () => { const l = nodes.find(n => n.state === STATES.LEADER && n.alive); if (l) { l.alive = false; addLog(`Node ${l.id} killed!`); nodes.forEach(n => { if (n.alive) n.timer = Math.min(n.timer, 50); n.votedFor = -1; }); } };
document.getElementById('btnReset').onclick = () => { running = false; initNodes(); };

initNodes(); draw(); gameLoop();