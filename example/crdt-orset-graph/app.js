const state = {
  R1: { adds: new Map(), removes: new Set() },
  R2: { adds: new Map(), removes: new Set() },
};
let uidSeq = 0;
const uid = () => `u${++uidSeq}`;

function liveTags(r) {
  const live = new Map();
  for (const [id, tag] of r.adds) {
    if (!r.removes.has(id)) {
      if (!live.has(tag)) live.set(tag, []);
      live.get(tag).push(id);
    }
  }
  return live;
}

function renderChips(name) {
  const el = document.getElementById(`chips-${name}`);
  el.innerHTML = '';
  const live = liveTags(state[name]);
  for (const [tag, ids] of live) {
    const c = document.createElement('span');
    c.className = 'chip';
    c.textContent = tag;
    c.title = `uids: ${ids.join(', ')}`;
    c.onclick = () => {
      for (const id of ids) state[name].removes.add(id);
      draw();
    };
    el.appendChild(c);
  }
}

function addTag(r, tag) {
  if (!tag.trim()) return;
  state[r].adds.set(uid(), tag.trim());
}

function merge() {
  const merged = {
    adds: new Map([...state.R1.adds, ...state.R2.adds]),
    removes: new Set([...state.R1.removes, ...state.R2.removes]),
  };
  state.R1 = { adds: new Map(merged.adds), removes: new Set(merged.removes) };
  state.R2 = { adds: new Map(merged.adds), removes: new Set(merged.removes) };
  draw();
}

const svg = document.getElementById('graph');
function svgEl(t, a) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', t);
  for (const k in a) el.setAttribute(k, a[k]);
  return el;
}

function draw() {
  renderChips('R1'); renderChips('R2');
  svg.innerHTML = '';
  const replicas = ['R1', 'R2'];
  replicas.forEach((name, ri) => {
    const cx = 110 + ri * 300;
    svg.appendChild(svgEl('text', { x: cx, y: 28, fill: '#6ee7b7', 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 'bold' })).textContent = name;
    const r = state[name];
    let y = 60;
    const entries = [...r.adds.entries()];
    for (const [id, tag] of entries) {
      const tomb = r.removes.has(id);
      const color = tomb ? '#f87171' : '#6ee7b7';
      svg.appendChild(svgEl('circle', { cx, cy: y, r: 8, fill: color, opacity: tomb ? 0.4 : 1 }));
      const t = svgEl('text', { x: cx + 16, y: y + 4, fill: '#e5e7eb', 'font-size': 12, 'font-family': 'monospace' });
      t.textContent = `${tag}  (${id})${tomb ? ' ✗' : ''}`;
      svg.appendChild(t);
      y += 26;
    }
    // live summary
    const live = liveTags(r);
    svg.appendChild(svgEl('text', { x: cx, y: y + 20, fill: '#fbbf24', 'text-anchor': 'middle', 'font-size': 12 })).textContent = `live: {${[...live.keys()].join(', ')}}`;
  });
}

document.querySelectorAll('button[data-r]').forEach(b => {
  b.onclick = () => {
    const name = b.dataset.r;
    const input = document.querySelector(`input[data-r="${name}"]`);
    addTag(name, input.value);
    input.value = '';
    draw();
  };
});
document.querySelectorAll('input[data-r]').forEach(i => {
  i.addEventListener('keydown', e => { if (e.key === 'Enter') i.nextElementSibling && null, document.querySelector(`button[data-r="${i.dataset.r}"]`).click(); });
});
document.getElementById('merge').onclick = merge;
document.getElementById('reset').onclick = () => {
  state.R1 = { adds: new Map(), removes: new Set() };
  state.R2 = { adds: new Map(), removes: new Set() };
  seed();
  draw();
};

function seed() {
  addTag('R1', 'urgent');
  addTag('R1', 'bug');
  addTag('R2', 'urgent');
  addTag('R2', 'feature');
}
seed();
draw();