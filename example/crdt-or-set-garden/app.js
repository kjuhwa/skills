// OR-Set: element = flower; each add carries a unique tag.
// Remove takes the tags the remover has seen.
// Merge = union of adds, union of removes, element alive iff some add-tag not in removes.

const FLOWERS = ['🌸', '🌼', '🌻', '🌷', '🌺', '🥀', '💐'];
const COLORS = ['#6ee7b7', '#f5a97f', '#c678dd', '#61afef', '#e5c07b'];

let tagSeq = 0;
function mkTag(site) { return site + ':' + (++tagSeq); }

const gardens = {
  g1: { adds: new Map(), removes: new Set() },
  g2: { adds: new Map(), removes: new Set() },
};

function addFlower(g, site) {
  const id = 'f' + Math.floor(Math.random() * 1e6);
  const data = {
    kind: FLOWERS[Math.floor(Math.random() * FLOWERS.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    x: 20 + Math.random() * 260,
    y: 20 + Math.random() * 160,
  };
  const tag = mkTag(site);
  if (!gardens[g].adds.has(id)) gardens[g].adds.set(id, new Map());
  gardens[g].adds.get(id).set(tag, data);
  render();
}

function removeRandom(g) {
  const alive = liveElements(gardens[g]);
  if (!alive.length) return;
  const pick = alive[Math.floor(Math.random() * alive.length)];
  const tags = gardens[g].adds.get(pick.id);
  for (const t of tags.keys()) gardens[g].removes.add(t);
  render();
}

function liveElements(g) {
  const out = [];
  for (const [id, tags] of g.adds) {
    const liveTags = [...tags.entries()].filter(([t]) => !g.removes.has(t));
    if (liveTags.length) out.push({ id, data: liveTags[0][1], tagCount: liveTags.length });
  }
  return out;
}

function mergedGarden() {
  const merged = { adds: new Map(), removes: new Set() };
  for (const g of [gardens.g1, gardens.g2]) {
    for (const [id, tags] of g.adds) {
      if (!merged.adds.has(id)) merged.adds.set(id, new Map());
      for (const [t, d] of tags) merged.adds.get(id).set(t, d);
    }
    for (const t of g.removes) merged.removes.add(t);
  }
  return merged;
}

function drawFlowers(svg, live) {
  svg.innerHTML = '';
  for (const { id, data } of live) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    el.setAttribute('x', data.x);
    el.setAttribute('y', data.y);
    el.setAttribute('font-size', '22');
    el.setAttribute('fill', data.color);
    el.setAttribute('class', 'flower');
    el.textContent = data.kind;
    el.dataset.id = id;
    svg.appendChild(el);
  }
}

function renderTombstones(g, elId) {
  const el = document.getElementById(elId);
  const count = gardens[g].removes.size;
  el.textContent = count ? `tombstones: ${count}` : '';
}

function render() {
  for (const g of ['g1', 'g2']) {
    const live = liveElements(gardens[g]);
    drawFlowers(document.getElementById('plot-' + g), live);
    document.getElementById('count-' + g).textContent = live.length;
    renderTombstones(g, 'tomb-' + g);
  }
  const m = mergedGarden();
  const mLive = liveElements(m);
  drawFlowers(document.getElementById('plot-m'), mLive);
  document.getElementById('count-m').textContent = mLive.length;
}

document.body.addEventListener('click', e => {
  const btn = e.target.closest('button[data-g]');
  if (!btn) return;
  const { action, g } = btn.dataset;
  if (action === 'add') addFlower(g, g === 'g1' ? 'A' : 'B');
  else if (action === 'remove') removeRandom(g);
});

document.getElementById('merge').addEventListener('click', () => {
  const m = mergedGarden();
  gardens.g1 = { adds: new Map([...m.adds].map(([k, v]) => [k, new Map(v)])), removes: new Set(m.removes) };
  gardens.g2 = { adds: new Map([...m.adds].map(([k, v]) => [k, new Map(v)])), removes: new Set(m.removes) };
  render();
});

// seed
for (let i = 0; i < 4; i++) addFlower('g1', 'A');
for (let i = 0; i < 3; i++) addFlower('g2', 'B');
render();