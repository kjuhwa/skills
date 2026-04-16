const COLORS = ['#6ee7b7', '#fbbf24', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c'];
let nodes = [
  { id: 'srv-1', color: COLORS[0] },
  { id: 'srv-2', color: COLORS[1] },
  { id: 'srv-3', color: COLORS[2] },
];
let vnodeCount = 12;
let nodeCounter = 4;

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

function buildRing() {
  const ring = [];
  nodes.forEach(n => {
    for (let i = 0; i < vnodeCount; i++) {
      ring.push({ pos: hash(`${n.id}#${i}`), node: n });
    }
  });
  return ring.sort((a, b) => a.pos - b.pos);
}

function lookup(ring, key) {
  const h = hash(key);
  for (const e of ring) if (e.pos >= h) return { entry: e, h };
  return { entry: ring[0], h };
}

function render() {
  renderNodeList();
  const ring = buildRing();
  renderRing(ring);
  renderDistribution(ring);
  probeKey(ring);
}

function renderNodeList() {
  const html = nodes.map(n => `
    <div class="node-row" style="border-color:${n.color}">
      <div>
        <div class="name" style="color:${n.color}">${n.id}</div>
        <div class="meta">${vnodeCount} vnodes</div>
      </div>
      <button data-remove="${n.id}">×</button>
    </div>
  `).join('');
  const list = document.getElementById('nodeList');
  list.innerHTML = html;
  list.querySelectorAll('button[data-remove]').forEach(b => {
    b.onclick = () => {
      if (nodes.length <= 1) return;
      nodes = nodes.filter(n => n.id !== b.dataset.remove);
      render();
    };
  });
}

function renderRing(ring) {
  const svg = document.getElementById('ring');
  const cx = 300, cy = 300, r = 240;
  let html = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1a1d27" stroke-width="40"/>`;
  ring.forEach(e => {
    const a = e.pos * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + Math.cos(a) * (r - 20);
    const y1 = cy + Math.sin(a) * (r - 20);
    const x2 = cx + Math.cos(a) * (r + 20);
    const y2 = cy + Math.sin(a) * (r + 20);
    html += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${e.node.color}" stroke-width="3"/>`;
  });
  // Sample 60 keys for dots
  for (let i = 0; i < 60; i++) {
    const k = `key-${i}`;
    const { h, entry } = lookup(ring, k);
    const a = h * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * (r - 60);
    const y = cy + Math.sin(a) * (r - 60);
    html += `<circle cx="${x}" cy="${y}" r="3" fill="${entry.node.color}" opacity="0.7"/>`;
  }
  html += `<text x="${cx}" y="${cy - 4}" fill="#6ee7b7" text-anchor="middle" font-size="20" font-weight="bold">RING</text>`;
  html += `<text x="${cx}" y="${cy + 18}" fill="#8a90a3" text-anchor="middle" font-size="11">${nodes.length} nodes · ${vnodeCount * nodes.length} vnodes</text>`;
  svg.innerHTML = html;
}

function renderDistribution(ring) {
  const counts = {};
  nodes.forEach(n => counts[n.id] = 0);
  for (let i = 0; i < 1000; i++) {
    const { entry } = lookup(ring, `sample-${i}`);
    counts[entry.node.id]++;
  }
  const html = nodes.map(n => {
    const pct = (counts[n.id] / 10).toFixed(1);
    return `
      <div class="bar">
        <span class="label" style="color:${n.color}">${n.id}</span>
        <div class="track"><div class="fill" style="width:${pct}%;background:${n.color}"></div></div>
        <span class="pct">${pct}%</span>
      </div>`;
  }).join('');
  document.getElementById('distribution').innerHTML = html;
}

function probeKey(ring) {
  const k = document.getElementById('keyInput').value || 'key';
  const { entry, h } = lookup(ring, k);
  document.getElementById('probeResult').innerHTML =
    `key: <span style="color:#fbbf24">${k}</span><br>` +
    `hash: ${h.toFixed(6)}<br>` +
    `→ <span style="color:${entry.node.color}">${entry.node.id}</span>`;
}

document.getElementById('addNode').onclick = () => {
  nodes.push({ id: `srv-${nodeCounter++}`, color: COLORS[nodes.length % COLORS.length] });
  render();
};
document.getElementById('vnodes').oninput = e => {
  vnodeCount = +e.target.value;
  document.getElementById('vnodesLabel').textContent = vnodeCount;
  render();
};
document.getElementById('keyInput').oninput = () => probeKey(buildRing());

render();