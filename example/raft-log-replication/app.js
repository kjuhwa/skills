const cluster = document.getElementById('cluster');
const ciEl = document.getElementById('ci');
const input = document.getElementById('cmd-input');
const NODES = 5, LEADER = 0;
let logs = Array.from({ length: NODES }, () => []);
let commitIndex = 0, matchIndex = Array(NODES).fill(0);
let queue = [], autoTimer = null;
const CMDS = ['SET x=1','SET y=2','DEL z','SET a=hi','INCR c','SET b=42','GET x','SET d=ok','LPUSH q 7','SET e=99'];

function render() {
  cluster.innerHTML = '';
  for (let i = 0; i < NODES; i++) {
    const row = document.createElement('div'); row.className = 'node-row';
    const label = document.createElement('div');
    label.className = 'node-label ' + (i === LEADER ? 'leader' : 'follower');
    label.textContent = (i === LEADER ? '★ Leader' : '  Node') + ` ${i}`;
    const entries = document.createElement('div'); entries.className = 'log-entries';
    logs[i].forEach((e, idx) => {
      const el = document.createElement('div');
      el.className = 'entry ' + (idx < commitIndex ? 'committed' : e.replicating ? 'replicating' : 'pending');
      el.textContent = e.cmd.length > 7 ? e.cmd.slice(0, 7) : e.cmd;
      el.title = `[${e.term}] ${e.cmd}`;
      entries.appendChild(el);
    });
    row.appendChild(label); row.appendChild(entries); cluster.appendChild(row);
  }
  ciEl.textContent = commitIndex;
}

function replicateStep() {
  let changed = false;
  for (let i = 1; i < NODES; i++) {
    if (logs[i].length < logs[LEADER].length) {
      const next = logs[i].length;
      const entry = { ...logs[LEADER][next], replicating: true };
      logs[i].push(entry);
      setTimeout(() => { if (logs[i][next]) logs[i][next].replicating = false; render(); }, 400);
      matchIndex[i] = logs[i].length;
      changed = true;
    }
  }
  const leaderLen = logs[LEADER].length;
  for (let n = leaderLen; n > commitIndex; n--) {
    let count = 1;
    for (let i = 1; i < NODES; i++) if (matchIndex[i] >= n) count++;
    if (count > NODES / 2) { commitIndex = n; break; }
  }
  render();
  if (changed || logs.some((l, i) => i > 0 && l.length < logs[LEADER].length)) {
    setTimeout(replicateStep, 350);
  } else if (queue.length) {
    setTimeout(processQueue, 200);
  }
}

function processQueue() {
  if (!queue.length) return;
  const cmd = queue.shift();
  logs[LEADER].push({ cmd, term: 1, replicating: false });
  matchIndex[LEADER] = logs[LEADER].length;
  render();
  setTimeout(replicateStep, 300);
}

function submitCommand() {
  const v = input.value.trim() || CMDS[Math.random() * CMDS.length | 0];
  input.value = '';
  queue.push(v);
  if (queue.length === 1) processQueue();
}

function autoSubmit() {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; return; }
  autoTimer = setInterval(() => {
    queue.push(CMDS[Math.random() * CMDS.length | 0]);
    if (queue.length === 1) processQueue();
  }, 900);
}

input.addEventListener('keydown', e => { if (e.key === 'Enter') submitCommand(); });
render();