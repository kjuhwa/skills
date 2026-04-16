const SIZE = 5;
const DIRS = { N: 1, E: 2, S: 4, W: 8 };
const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
const PIECES = {
  line: [DIRS.N | DIRS.S, DIRS.E | DIRS.W],
  elbow: [DIRS.N | DIRS.E, DIRS.E | DIRS.S, DIRS.S | DIRS.W, DIRS.W | DIRS.N],
  tee: [DIRS.N | DIRS.E | DIRS.S, DIRS.E | DIRS.S | DIRS.W, DIRS.S | DIRS.W | DIRS.N, DIRS.W | DIRS.N | DIRS.E],
  end: [DIRS.N, DIRS.E, DIRS.S, DIRS.W]
};

let board = [];
let level = 1;
let moves = 0;
let source = { r: 0, c: 0 };
let target = { r: SIZE - 1, c: SIZE - 1 };

function makeBoard() {
  board = [];
  for (let r = 0; r < SIZE; r++) {
    const row = [];
    for (let c = 0; c < SIZE; c++) {
      const types = Object.keys(PIECES);
      const type = types[Math.floor(Math.random() * types.length)];
      const variants = PIECES[type];
      const mask = variants[Math.floor(Math.random() * variants.length)];
      row.push({ type, mask });
    }
    board.push(row);
  }
  board[source.r][source.c] = { type: 'tee', mask: DIRS.E | DIRS.S };
  board[target.r][target.c] = { type: 'end', mask: DIRS.N };
}

function rotate(mask) {
  let result = 0;
  if (mask & DIRS.N) result |= DIRS.E;
  if (mask & DIRS.E) result |= DIRS.S;
  if (mask & DIRS.S) result |= DIRS.W;
  if (mask & DIRS.W) result |= DIRS.N;
  return result;
}

function computePower() {
  const powered = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const queue = [[source.r, source.c]];
  powered[source.r][source.c] = true;
  while (queue.length) {
    const [r, c] = queue.shift();
    const cell = board[r][c];
    const neighbors = [
      { dr: -1, dc: 0, from: DIRS.N, back: DIRS.S },
      { dr: 0, dc: 1, from: DIRS.E, back: DIRS.W },
      { dr: 1, dc: 0, from: DIRS.S, back: DIRS.N },
      { dr: 0, dc: -1, from: DIRS.W, back: DIRS.E }
    ];
    for (const n of neighbors) {
      const nr = r + n.dr, nc = c + n.dc;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
      if (powered[nr][nc]) continue;
      if ((cell.mask & n.from) && (board[nr][nc].mask & n.back)) {
        powered[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }
  return powered;
}

function svgFor(cell) {
  const paths = [];
  if (cell.mask & DIRS.N) paths.push('M30,30 L30,0');
  if (cell.mask & DIRS.E) paths.push('M30,30 L60,30');
  if (cell.mask & DIRS.S) paths.push('M30,30 L30,60');
  if (cell.mask & DIRS.W) paths.push('M30,30 L0,30');
  return `<svg viewBox="0 0 60 60"><g stroke="#6ee7b7" stroke-width="6" fill="none" stroke-linecap="round">${paths.map(p => `<path d="${p}"/>`).join('')}</g><circle cx="30" cy="30" r="5" fill="#6ee7b7"/></svg>`;
}

function render() {
  const boardEl = document.getElementById('board');
  boardEl.style.gridTemplateColumns = `repeat(${SIZE}, 60px)`;
  boardEl.innerHTML = '';
  const powered = computePower();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (r === source.r && c === source.c) cell.classList.add('source');
      if (r === target.r && c === target.c) cell.classList.add('target');
      if (powered[r][c]) cell.classList.add('powered');
      cell.innerHTML = svgFor(board[r][c]);
      cell.onclick = () => {
        if (r === source.r && c === source.c) return;
        board[r][c].mask = rotate(board[r][c].mask);
        moves++;
        document.getElementById('moves').textContent = moves;
        render();
      };
      boardEl.appendChild(cell);
    }
  }
  const st = document.getElementById('status');
  if (powered[target.r][target.c]) {
    st.textContent = '⚡ Circuit Complete!';
    st.className = 'win';
  } else {
    st.textContent = 'Working...';
    st.className = '';
  }
}

function newLevel() {
  makeBoard();
  moves = 0;
  document.getElementById('moves').textContent = '0';
  document.getElementById('level').textContent = level;
  render();
}

document.getElementById('nextBtn').onclick = () => { level++; newLevel(); };
document.getElementById('resetBtn').onclick = newLevel;

newLevel();