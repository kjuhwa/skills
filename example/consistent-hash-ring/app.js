const svg = document.getElementById('ring');
const VNODES = 12;
const COLORS = ['#6ee7b7', '#7cc5ff', '#f7b955', '#e88aa5', '#c097f6', '#5fd2c4', '#ffbf74', '#a3e47e'];

let shards = [];
let keys = [];
let nextShardId = 0;

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h / 4294967295;
}

function addShard() {
  const id = nextShardId++;
  const vnodes = [];
  for (let i = 0; i < VNODES; i++) {
    vnodes.push({ pos: hash(`shard-${id}-v${i}`), shardId: id });
  }
  shards.push({ id, color: COLORS[id % COLORS.length], vnodes });
}

function removeShard() {
  if (shards.length > 1) shards.pop();
}

function allVnodes() {
  return shards.flatMap(s => s.vnodes).sort((a, b) => a.pos - b.pos);
}

function assignKey(k) {
  const p = hash(k);
  const vns = allVnodes();
  for (const v of vns) if (v.pos >= p) return v.shardId;
  return vns[0].shardId;
}

function addKeys(n = 25) {
  for (let i = 0; i < n; i++) {
    keys.push(`key-${Math.floor(Math.random() * 999999)}`);
  }
}

function render() {
  svg.innerHTML = '';
  const cx = 300, cy = 300, r = 220;
  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  ring.setAttribute('cx', cx); ring.setAttribute('cy', cy); ring.setAttribute('r', r);
  ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#2a2e3d'); ring.setAttribute('stroke-width', 2);
  svg.appendChild(ring);

  shards.forEach(s => {
    s.vnodes.forEach(v => {
      const a = v.pos * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', 7);
      dot.setAttribute('fill', s.color);
      svg.appendChild(dot);
    });
  });

  const counts = {};
  shards.forEach(s => counts[s.id] = 0);
  keys.forEach(k => {
    const sid = assignKey(k);
    counts[sid]++;
    const p = hash(k);
    const a = p * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * (r - 30);
    const y = cy + Math.sin(a) * (r - 30);
    const shard = shards.find(s => s.id === sid);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', 2.5);
    dot.setAttribute('fill', shard.color);
    dot.setAttribute('opacity', 0.7);
    svg.appendChild(dot);
  });

  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('x', cx); label.setAttribute('y', cy);
  label.setAttribute('text-anchor', 'middle'); label.setAttribute('fill', '#6ee7b7');
  label.setAttribute('font-size', '16'); label.setAttribute('font-weight', 'bold');
  label.textContent = 'HASH RING';
  svg.appendChild(label);

  const sub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  sub.setAttribute('x', cx); sub.setAttribute('y', cy + 22);
  sub.setAttribute('text-anchor', 'middle'); sub.setAttribute('fill', '#8a8f9c');
  sub.setAttribute('font-size', '11');
  sub.textContent = '0 → 2³²';
  svg.appendChild(sub);

  document.getElementById('nShards').textContent = shards.length;
  document.getElementById('nKeys').textContent = keys.length;

  const dist = document.getElementById('distribution');
  dist.innerHTML = '<h3 style="color:#6ee7b7;margin-bottom:10px;font-size:14px;">Key Distribution</h3>';
  const total = keys.length || 1;
  shards.forEach(s => {
    const pct = (counts[s.id] / total * 100).toFixed(1);
    dist.innerHTML += `
      <div class="bar-row">
        <div class="bar-label">Shard ${s.id}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${s.color};"></div></div>
        <div class="bar-value">${counts[s.id]} (${pct}%)</div>
      </div>`;
  });
}

document.getElementById('addShard').onclick = () => { addShard(); render(); };
document.getElementById('removeShard').onclick = () => { removeShard(); render(); };
document.getElementById('addKeys').onclick = () => { addKeys(25); render(); };
document.getElementById('reset').onclick = () => {
  shards = []; keys = []; nextShardId = 0;
  for (let i = 0; i < 3; i++) addShard();
  addKeys(50); render();
};

for (let i = 0; i < 3; i++) addShard();
addKeys(50);
render();