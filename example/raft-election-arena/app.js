const canvas = document.getElementById('arena');
const ctx = canvas.getContext('2d');
const logEl = document.getElementById('log');
const termEl = document.getElementById('term-display');
const STATES = { FOLLOWER: 'follower', CANDIDATE: 'candidate', LEADER: 'leader', DEAD: 'dead' };
const COLORS = { follower: '#94a3b8', candidate: '#fbbf24', leader: '#6ee7b7', dead: '#ef4444' };
let term = 0, messages = [], nodes = [];

function createNodes(n) {
  const cx = 350, cy = 250, r = 160;
  return Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { id: i, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), state: STATES.FOLLOWER, votedFor: null, votes: 0, timer: 150 + Math.random() * 150, pulse: 0 };
  });
}

function addLog(msg, cls) {
  const d = document.createElement('div');
  d.className = 'log-entry ' + (cls || '');
  d.textContent = `[T${term}] ${msg}`;
  logEl.prepend(d);
  if (logEl.children.length > 40) logEl.removeChild(logEl.lastChild);
}

function sendMsg(from, to, type) {
  messages.push({ from, to, type, progress: 0 });
}

function tick() {
  const leader = nodes.find(n => n.state === STATES.LEADER);
  if (leader) {
    leader.timer--;
    if (leader.timer <= 0) {
      leader.timer = 50;
      nodes.forEach(n => { if (n.id !== leader.id && n.state !== STATES.DEAD) sendMsg(leader, n, 'heartbeat'); });
    }
  }
  nodes.forEach(n => {
    if (n.state === STATES.DEAD || n.state === STATES.LEADER) return;
    n.timer--;
    if (n.timer <= 0 && n.state !== STATES.LEADER) {
      n.state = STATES.CANDIDATE; term++; termEl.textContent = 'Term: ' + term;
      n.votedFor = n.id; n.votes = 1; n.timer = 200 + Math.random() * 100;
      addLog(`Node ${n.id} starts election`, 'candidate');
      nodes.forEach(o => { if (o.id !== n.id && o.state !== STATES.DEAD) sendMsg(n, o, 'voteReq'); });
    }
  });
  messages = messages.filter(m => {
    m.progress += 0.04;
    if (m.progress >= 1) {
      const target = m.to;
      if (target.state === STATES.DEAD) return false;
      if (m.type === 'heartbeat') { target.state = STATES.FOLLOWER; target.timer = 150 + Math.random() * 150; target.votedFor = null; target.votes = 0; }
      if (m.type === 'voteReq' && target.votedFor === null) {
        target.votedFor = m.from.id; target.timer = 200 + Math.random() * 100;
        sendMsg(target, m.from, 'vote');
        addLog(`Node ${target.id} votes for ${m.from.id}`, 'follower');
      }
      if (m.type === 'vote' && m.to.state === STATES.CANDIDATE) {
        m.to.votes++;
        if (m.to.votes > Math.floor(nodes.filter(n => n.state !== STATES.DEAD).length / 2)) {
          m.to.state = STATES.LEADER; m.to.timer = 10; m.to.pulse = 1;
          addLog(`Node ${m.to.id} becomes LEADER`, 'leader');
          nodes.forEach(n => { if (n.id !== m.to.id && n.state !== STATES.DEAD) { n.state = STATES.FOLLOWER; n.votedFor = null; n.votes = 0; } });
        }
      }
      return false;
    }
    return true;
  });
}

function draw() {
  ctx.clearRect(0, 0, 700, 500);
  messages.forEach(m => {
    const x = m.from.x + (m.to.x - m.from.x) * m.progress;
    const y = m.from.y + (m.to.y - m.from.y) * m.progress;
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = m.type === 'heartbeat' ? '#6ee7b7' : m.type === 'voteReq' ? '#fbbf24' : '#60a5fa';
    ctx.fill();
  });
  nodes.forEach(n => {
    if (n.pulse > 0) { ctx.beginPath(); ctx.arc(n.x, n.y, 30 + n.pulse * 20, 0, Math.PI * 2); ctx.strokeStyle = COLORS[n.state] + '44'; ctx.lineWidth = 2; ctx.stroke(); n.pulse = Math.max(0, n.pulse - 0.015); }
    ctx.beginPath(); ctx.arc(n.x, n.y, 28, 0, Math.PI * 2);
    ctx.fillStyle = COLORS[n.state] + '33'; ctx.fill();
    ctx.strokeStyle = COLORS[n.state]; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = COLORS[n.state]; ctx.font = 'bold 14px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(n.state === STATES.DEAD ? 'X' : `N${n.id}`, n.x, n.y - 6);
    ctx.font = '10px Courier New'; ctx.fillText(n.state, n.x, n.y + 10);
  });
}

function loop() { tick(); draw(); requestAnimationFrame(loop); }

function killLeader() {
  const l = nodes.find(n => n.state === STATES.LEADER);
  if (l) { l.state = STATES.DEAD; addLog(`Node ${l.id} KILLED`, 'dead'); }
  else { const alive = nodes.filter(n => n.state !== STATES.DEAD); if (alive.length) { const v = alive[Math.random() * alive.length | 0]; v.state = STATES.DEAD; addLog(`Node ${v.id} KILLED`, 'dead'); } }
}

function resetAll() { term = 0; termEl.textContent = 'Term: 0'; messages = []; nodes = createNodes(5); logEl.innerHTML = ''; addLog('Cluster reset'); }

nodes = createNodes(5);
addLog('Cluster initialized with 5 nodes');
loop();