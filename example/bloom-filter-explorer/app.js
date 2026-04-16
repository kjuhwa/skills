const M = 128, K = 3;
const bits = new Uint8Array(M);
const items = new Set();
const canvas = document.getElementById('grid');
const ctx = canvas.getContext('2d');
const cellW = canvas.width / 16;
const cellH = canvas.height / 8;
const flashing = new Map();

function hash(str, seed) {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0;
  }
  return h % M;
}
function positions(str) {
  return [hash(str, 2166136261), hash(str, 16777619), hash(str, 83492791)];
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < M; i++) {
    const x = (i % 16) * cellW, y = Math.floor(i / 16) * cellH;
    const flash = flashing.get(i);
    if (flash) {
      ctx.fillStyle = flash.color;
      ctx.globalAlpha = flash.alpha;
      ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
      ctx.globalAlpha = 1;
    } else if (bits[i]) {
      ctx.fillStyle = '#6ee7b7';
      ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
    } else {
      ctx.fillStyle = '#22262f';
      ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
    }
    ctx.fillStyle = '#0f1117';
    ctx.font = '10px monospace';
    ctx.fillText(i, x + 4, y + 12);
  }
}

function updateStats() {
  let set = 0;
  for (let i = 0; i < M; i++) if (bits[i]) set++;
  document.getElementById('nItems').textContent = items.size;
  document.getElementById('nBits').textContent = `${set} / ${M}`;
  document.getElementById('fill').textContent = `${Math.round((set / M) * 100)}%`;
  const fpr = Math.pow(set / M, K);
  document.getElementById('fpr').textContent = `${(fpr * 100).toFixed(1)}%`;
}

function trace(msg, cls = '') {
  const ul = document.getElementById('trace');
  const li = document.createElement('li');
  li.textContent = msg;
  if (cls) li.className = cls;
  ul.insertBefore(li, ul.firstChild);
}

function flash(pos, color) {
  flashing.set(pos, { color, alpha: 1 });
  const fade = () => {
    const f = flashing.get(pos);
    if (!f) return;
    f.alpha -= 0.08;
    if (f.alpha <= 0) flashing.delete(pos);
    else requestAnimationFrame(fade);
    draw();
  };
  fade();
}

function add(word) {
  if (!word) return;
  const pos = positions(word);
  pos.forEach(p => { bits[p] = 1; flash(p, '#6ee7b7'); });
  items.add(word);
  trace(`+ add "${word}" → [${pos.join(', ')}]`);
  updateStats();
  draw();
}

function check(word) {
  if (!word) return;
  const pos = positions(word);
  const hit = pos.every(p => bits[p] === 1);
  pos.forEach(p => flash(p, hit ? '#fbbf24' : '#f87171'));
  const definitely = !hit;
  const cls = hit ? 'hit' : 'miss';
  const msg = hit
    ? `? check "${word}" → [${pos.join(', ')}] probably present`
    : `✗ check "${word}" → [${pos.join(', ')}] definitely absent`;
  trace(msg, cls);
  document.getElementById('status').textContent = definitely ? 'definitely NOT in set' : 'probably in set';
}

document.getElementById('addBtn').onclick = () => {
  const w = document.getElementById('word').value.trim().toLowerCase();
  add(w);
  document.getElementById('word').value = '';
};
document.getElementById('checkBtn').onclick = () => {
  const w = document.getElementById('word').value.trim().toLowerCase();
  check(w);
};
document.getElementById('resetBtn').onclick = () => {
  bits.fill(0); items.clear();
  document.getElementById('trace').innerHTML = '';
  document.getElementById('status').textContent = '';
  updateStats(); draw();
};
document.getElementById('word').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('addBtn').click();
});

['apple', 'banana', 'cherry', 'dragonfruit', 'elderberry'].forEach(add);
draw();