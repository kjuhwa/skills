const SIZE = 10;
const DIRS = {
  N:  [0,-1], S:  [0, 1], E:  [ 1, 0], W:  [-1, 0],
  NE: [1,-1], NW: [-1,-1], SE: [ 1, 1], SW: [-1, 1],
};
const START_FUEL = 25;

function initialState() {
  const stars = [];
  while (stars.length < 6) {
    const x = Math.floor(Math.random() * SIZE);
    const y = Math.floor(Math.random() * SIZE);
    if (x === 4 && y === 4) continue;
    if (stars.some(s => s.x === x && s.y === y)) continue;
    stars.push({ x, y, lulled: false, hum: Math.random() * 6.28 });
  }
  return {
    turn: 1,
    fuel: START_FUEL,
    carto: { x: 4, y: 4, facing: 'N' },
    stars,
    events: [],
    status: 'drifting',
  };
}

// Pure reducer: (state, action) -> newState
function reduce(state, action) {
  if (state.status !== 'drifting') return state;
  if (action.type === 'move') {
    const [dx, dy] = DIRS[action.dir];
    const nx = state.carto.x + dx;
    const ny = state.carto.y + dy;
    if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) return state;
    if (state.fuel < 1) return state;
    const next = {
      ...state,
      turn: state.turn + 1,
      fuel: state.fuel - 1,
      carto: { x: nx, y: ny, facing: action.dir },
      events: [...state.events, { kind: 'move', dir: action.dir, turn: state.turn, at: { x: nx, y: ny } }],
    };
    return finalize(next);
  }
  if (action.type === 'hum') {
    if (state.fuel < 2) return state;
    const lulled = [];
    const stars = state.stars.map(s => {
      if (s.lulled) return s;
      if (Math.abs(s.x - state.carto.x) <= 1 && Math.abs(s.y - state.carto.y) <= 1) {
        lulled.push(s);
        return { ...s, lulled: true };
      }
      return s;
    });
    const next = {
      ...state,
      turn: state.turn + 1,
      fuel: Math.max(0, state.fuel - 2 + lulled.length * 3),
      stars,
      events: [...state.events, { kind: 'hum', count: lulled.length, turn: state.turn }],
    };
    return finalize(next);
  }
  return state;
}

function finalize(s) {
  if (s.stars.every(x => x.lulled)) return { ...s, status: 'lulled' };
  if (s.fuel <= 0) return { ...s, status: 'depleted' };
  return s;
}

// Immutable history — undo rewinds by dropping snapshots
let history = [initialState()];
const current = () => history[history.length - 1];

function apply(action) {
  const next = reduce(current(), action);
  if (next !== current()) history.push(next);
  render();
}
function undo() { if (history.length > 1) history.pop(); render(); }
function reset() { history = [initialState()]; render(); }

const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const CELL = W / SIZE;

function render() {
  const s = current();
  const t = performance.now();
  ctx.clearRect(0, 0, W, H);

  // sky + aurora bands
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#05070f');
  g.addColorStop(0.55, '#141527');
  g.addColorStop(1, '#2b2336');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 3; i++) {
    const flick = 0.06 + 0.035 * Math.sin(t * 0.0018 + i);
    ctx.fillStyle = `hsla(${150 + i*22},70%,55%,${flick})`;
    ctx.fillRect(0, i * 90 + Math.sin(t*0.0007 + i)*14, W, 70);
  }

  // grid
  ctx.strokeStyle = 'rgba(230,234,242,0.07)';
  for (let i = 0; i <= SIZE; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke();
  }

  // trail
  ctx.strokeStyle = 'rgba(110,231,183,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(4 * CELL + CELL/2, 4 * CELL + CELL/2);
  for (const ev of s.events) {
    if (ev.kind === 'move') ctx.lineTo(ev.at.x * CELL + CELL/2, ev.at.y * CELL + CELL/2);
  }
  ctx.stroke();

  // stars
  for (const star of s.stars) {
    const cx = star.x * CELL + CELL / 2;
    const cy = star.y * CELL + CELL / 2;
    if (star.lulled) {
      ctx.fillStyle = 'rgba(110,231,183,0.18)';
      ctx.beginPath(); ctx.arc(cx, cy, CELL * 0.32, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6ee7b7';
      ctx.font = `${CELL*0.45}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('✦', cx, cy);
    } else {
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.003 + star.hum);
      ctx.fillStyle = `rgba(251,191,36,${0.25 + pulse * 0.2})`;
      ctx.beginPath(); ctx.arc(cx, cy, CELL * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(251,191,36,${0.55 + pulse * 0.4})`;
      ctx.beginPath(); ctx.arc(cx, cy, CELL * 0.13 + pulse * 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // cartographer pawn
  const px = s.carto.x * CELL + CELL / 2;
  const py = s.carto.y * CELL + CELL / 2;
  ctx.fillStyle = '#c4a472';
  ctx.beginPath(); ctx.arc(px, py, CELL * 0.24, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#e6eaf2'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(px, py, CELL * 0.24, 0, Math.PI * 2); ctx.stroke();
  const [ndx, ndy] = DIRS[s.carto.facing];
  ctx.strokeStyle = '#e6eaf2';
  ctx.beginPath(); ctx.moveTo(px, py);
  ctx.lineTo(px + ndx * CELL * 0.38, py + ndy * CELL * 0.38);
  ctx.stroke();

  // hum radius preview
  ctx.strokeStyle = 'rgba(110,231,183,0.25)';
  ctx.setLineDash([3, 4]);
  ctx.strokeRect((s.carto.x - 1) * CELL, (s.carto.y - 1) * CELL, CELL * 3, CELL * 3);
  ctx.setLineDash([]);

  // HUD
  document.getElementById('turn').textContent = s.turn;
  document.getElementById('fuel').textContent = s.fuel;
  document.getElementById('lulled').textContent = s.stars.filter(x => x.lulled).length;
  document.getElementById('total').textContent = s.stars.length;

  // log
  const log = document.getElementById('log');
  log.innerHTML = '';
  for (const e of s.events.slice(-14)) {
    const li = document.createElement('li');
    if (e.kind === 'move') li.textContent = `drift ${e.dir} → (${e.at.x},${e.at.y})`;
    else { li.textContent = `hum — ${e.count} lulled`; li.classList.add('hum'); }
    log.appendChild(li);
  }
  document.getElementById('logcount').textContent = s.events.length;

  // banners
  if (s.status === 'lulled') banner('All constellations sleep.', '#6ee7b7');
  else if (s.status === 'depleted') banner('Dream-fuel depleted. The atlas darkens.', '#f472b6');
}

function banner(text, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, H/2 - 34, W, 68);
  ctx.fillStyle = color;
  ctx.font = 'italic 22px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, W/2, H/2);
}

// wiring
document.querySelectorAll('[data-dir]').forEach(b =>
  b.addEventListener('click', () => apply({ type: 'move', dir: b.dataset.dir }))
);
document.getElementById('hum').addEventListener('click', () => apply({ type: 'hum' }));
document.getElementById('undo').addEventListener('click', undo);
document.getElementById('reset').addEventListener('click', reset);

const keyMap = {
  w:'N', s:'S', a:'W', d:'E', q:'NW', e:'NE', z:'SW', c:'SE',
  ArrowUp:'N', ArrowDown:'S', ArrowLeft:'W', ArrowRight:'E',
};
document.addEventListener('keydown', ev => {
  if (ev.key === ' ') { apply({ type: 'hum' }); ev.preventDefault(); return; }
  if (ev.key === 'u' || ev.key === 'U') return undo();
  const dir = keyMap[ev.key];
  if (dir) { apply({ type: 'move', dir }); ev.preventDefault(); }
});

render();
setInterval(render, 80);