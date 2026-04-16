const svg = document.getElementById('timeline');
const termInfo = document.getElementById('termInfo');
const NS = 'http://www.w3.org/2000/svg';
const N = 5, MAX_STEPS = 40, ROW_H = 56, LEFT = 70, TOP = 30, CELL = 17;
const SCOLORS = { F: '#4b5563', C: '#f59e0b', L: '#6ee7b7', D: '#ef4444' };
let history = [], step = 0, playing = false, playTimer = null;
let states = Array(N).fill('F'), term = 0;

function init() {
  history = []; step = 0; term = 0; states = Array(N).fill('F');
  history.push([...states]);
  svg.innerHTML = '';
  for (let i = 0; i < N; i++) {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', 10); t.setAttribute('y', TOP + i * ROW_H + 16);
    t.setAttribute('fill', '#888'); t.setAttribute('font-size', '12');
    t.setAttribute('font-family', 'monospace');
    t.textContent = `Node ${i}`;
    svg.appendChild(t);
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', LEFT); line.setAttribute('x2', LEFT + MAX_STEPS * CELL);
    line.setAttribute('y1', TOP + i * ROW_H + 24); line.setAttribute('y2', TOP + i * ROW_H + 24);
    line.setAttribute('stroke', '#222'); line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
  }
  renderAll();
}

function simulate() {
  const alive = states.map((s, i) => s !== 'D' ? i : -1).filter(i => i >= 0);
  const hasLeader = states.some(s => s === 'L');
  if (!hasLeader && alive.length > 0) {
    const cand = alive[Math.random() * alive.length | 0];
    states[cand] = 'C'; term++;
    history.push([...states]); step++;
    const votes = alive.filter(() => Math.random() > .3).length;
    if (votes > alive.length / 2) {
      states[cand] = 'L';
      alive.forEach(i => { if (i !== cand) states[i] = 'F'; });
    } else { states[cand] = 'F'; }
  } else if (Math.random() < .15 && alive.length > 1) {
    const li = alive.find(i => states[i] === 'L');
    if (li !== undefined) { states[li] = 'D'; }
  } else if (Math.random() < .1) {
    const dead = states.map((s, i) => s === 'D' ? i : -1).filter(i => i >= 0);
    if (dead.length > 0) { states[dead[0]] = 'F'; }
  }
  history.push([...states]); step++;
  termInfo.textContent = `Term ${term}`;
}

function renderAll() {
  svg.querySelectorAll('rect').forEach(r => r.remove());
  for (let s = 0; s < history.length; s++) {
    for (let i = 0; i < N; i++) {
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', LEFT + s * CELL); r.setAttribute('y', TOP + i * ROW_H + 10);
      r.setAttribute('width', CELL - 2); r.setAttribute('height', 20);
      r.setAttribute('rx', 3); r.setAttribute('fill', SCOLORS[history[s][i]]);
      r.setAttribute('opacity', s === history.length - 1 ? '1' : '0.6');
      svg.appendChild(r);
    }
  }
}

function doStep() {
  if (step >= MAX_STEPS - 1) { stopPlay(); return; }
  simulate(); renderAll();
}

function stopPlay() { playing = false; clearInterval(playTimer); document.getElementById('btnPlay').textContent = '▶ Play'; }

document.getElementById('btnPlay').onclick = () => {
  if (playing) { stopPlay(); } else { playing = true; document.getElementById('btnPlay').textContent = '⏸ Pause'; playTimer = setInterval(doStep, 400); }
};
document.getElementById('btnStep').onclick = doStep;
document.getElementById('btnReset').onclick = () => { stopPlay(); init(); };

init();
// Pre-seed a few steps
for (let i = 0; i < 6; i++) simulate();
renderAll();