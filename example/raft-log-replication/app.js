const cluster = document.getElementById('cluster');
const commitIdxEl = document.getElementById('commitIdx');
let nodes = [], nextEntry = 1, commitIndex = 0;

function createNodes() {
  cluster.innerHTML = '';
  nodes = Array.from({ length: 5 }, (_, i) => ({ id: i, role: i === 0 ? 'Leader' : 'Follower', log: [], alive: true }));
  nodes.forEach(n => {
    const div = document.createElement('div');
    div.className = 'node' + (n.role === 'Leader' ? ' leader' : '');
    div.id = `node-${n.id}`;
    div.innerHTML = `<div class="node-title">${n.role} N${n.id}</div><div class="log-bar" id="log-${n.id}"></div>`;
    cluster.appendChild(div);
  });
}

function renderLogs() {
  nodes.forEach(n => {
    const bar = document.getElementById(`log-${n.id}`);
    const el = document.getElementById(`node-${n.id}`);
    if (!bar || !el) return;
    el.className = 'node' + (n.role === 'Leader' ? ' leader' : '') + (!n.alive ? ' down' : '');
    bar.innerHTML = '';
    n.log.forEach((e, i) => {
      const d = document.createElement('div');
      d.className = 'log-entry ' + (i < commitIndex ? 'committed' : 'uncommitted');
      d.textContent = e;
      bar.appendChild(d);
    });
  });
  commitIdxEl.textContent = commitIndex;
}

function appendEntry() {
  const leader = nodes[0];
  if (!leader.alive) return;
  const val = nextEntry++;
  leader.log.push(val);
  nodes.forEach(n => {
    if (n.id !== 0 && n.alive) {
      setTimeout(() => { n.log = [...leader.log]; renderLogs(); }, 200 + Math.random() * 400);
    }
  });
  renderLogs();
}

function commitEntries() {
  const leader = nodes[0];
  if (!leader.alive) return;
  const alive = nodes.filter(n => n.alive);
  const maxCommit = leader.log.length;
  for (let i = commitIndex; i < maxCommit; i++) {
    const replicated = alive.filter(n => n.log.length > i).length;
    if (replicated > alive.length / 2) commitIndex = i + 1;
  }
  renderLogs();
}

function dropRandom() {
  const alive = nodes.filter(n => n.alive && n.id !== 0);
  if (alive.length === 0) return;
  const pick = alive[Math.random() * alive.length | 0];
  pick.alive = false;
  renderLogs();
}

function restoreAll() {
  const leader = nodes[0];
  nodes.forEach(n => { n.alive = true; n.log = [...leader.log]; });
  renderLogs();
}

document.getElementById('btnAppend').onclick = appendEntry;
document.getElementById('btnCommit').onclick = commitEntries;
document.getElementById('btnDrop').onclick = dropRandom;
document.getElementById('btnRestore').onclick = restoreAll;

createNodes();
// Seed some initial data
for (let i = 0; i < 3; i++) appendEntry();
setTimeout(commitEntries, 800);