const canvas = document.getElementById('ring');
const ctx = canvas.getContext('2d');
const CX = 280, CY = 280, R = 220;
const colors = ['#6ee7b7', '#93c5fd', '#fca5a5', '#fcd34d', '#c4b5fd', '#f9a8d4', '#86efac'];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xFFFFFFFF;
}

let nodes = [];
let keys = [];
let vnodeCount = 5;
let nodeCounter = 0;
let keyCounter = 0;

function addNode() {
  const name = `node-${++nodeCounter}`;
  const color = colors[nodes.length % colors.length];
  const vnodes = [];
  for (let i = 0; i < vnodeCount; i++) {
    vnodes.push(hash(`${name}#${i}`));
  }
  nodes.push({ name, color, vnodes });
  render();
}

function removeNode() {
  if (nodes.length > 0) { nodes.pop(); render(); }
}

function addKey(pos) {
  const name = `key-${++keyCounter}`;
  const p = pos !== undefined ? pos : hash(name + Math.random());
  keys.push({ name, pos: p });
  render();
}

function findOwner(pos) {
  if (nodes.length === 0) return null;
  let all = [];
  nodes.forEach(n => n.vnodes.forEach(v => all.push({ pos: v, node: n })));
  all.sort((a, b) => a.pos - b.pos);
  for (let e of all) if (e.pos >= pos) return e.node;
  return all[0].node;
}

function polar(angle, radius) {
  return [CX + Math.cos(angle) * radius, CY + Math.sin(angle) * radius];
}

function render() {
  ctx.clearRect(0, 0, 560, 560);
  ctx.strokeStyle = '#2a2e3b';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.stroke();

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const [x1, y1] = polar(a, R - 5);
    const [x2, y2] = polar(a, R + 5);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  nodes.forEach(n => {
    n.vnodes.forEach(v => {
      const a = v * Math.PI * 2 - Math.PI / 2;
      const [x, y] = polar(a, R);
      ctx.fillStyle = n.color;
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    });
  });

  keys.forEach(k => {
    const a = k.pos * Math.PI * 2 - Math.PI / 2;
    const [x, y] = polar(a, R - 40);
    const owner = findOwner(k.pos);
    if (owner) {
      const [ox, oy] = polar(a, R);
      ctx.strokeStyle = owner.color + '88';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ox, oy); ctx.stroke();
    }
    ctx.fillStyle = '#e4e6eb';
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  });

  ctx.fillStyle = '#6ee7b7';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${nodes.length} nodes · ${keys.length} keys`, CX, CY);

  updateStats();
}

function updateStats() {
  const dist = document.getElementById('distribution');
  const counts = {};
  nodes.forEach(n => counts[n.name] = 0);
  keys.forEach(k => {
    const o = findOwner(k.pos);
    if (o) counts[o.name]++;
  });
  dist.innerHTML = nodes.map(n => {
    const c = counts[n.name];
    const pct = keys.length ? (c / keys.length * 100).toFixed(0) : 0;
    return `<div class="bar-row"><div class="label"><span style="color:${n.color}">${n.name}</span><span>${c} (${pct}%)</span></div><div class="bar"><div class="bar-fill" style="width:${pct}%;background:${n.color}"></div></div></div>`;
  }).join('');

  const loads = Object.values(counts);
  const avg = keys.length / (nodes.length || 1);
  const stdev = loads.length ? Math.sqrt(loads.reduce((s, v) => s + (v - avg) ** 2, 0) / loads.length).toFixed(2) : 0;
  document.getElementById('stats').innerHTML = `
    Virtual nodes each: <span>${vnodeCount}</span><br>
    Total vnodes: <span>${nodes.length * vnodeCount}</span><br>
    Std deviation: <span>${stdev}</span><br>
    Ideal per node: <span>${avg.toFixed(1)}</span>`;
}

canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left - CX, y = e.clientY - r.top - CY;
  const a = Math.atan2(y, x) + Math.PI / 2;
  addKey(((a / (Math.PI * 2)) + 1) % 1);
});

document.getElementById('addNode').onclick = addNode;
document.getElementById('removeNode').onclick = removeNode;
document.getElementById('addKey').onclick = () => addKey();
document.getElementById('reset').onclick = () => { nodes = []; keys = []; nodeCounter = 0; keyCounter = 0; init(); };
document.getElementById('vnodes').oninput = e => {
  vnodeCount = +e.target.value;
  document.getElementById('vnodesVal').textContent = vnodeCount;
  nodes.forEach(n => {
    n.vnodes = [];
    for (let i = 0; i < vnodeCount; i++) n.vnodes.push(hash(`${n.name}#${i}`));
  });
  render();
};

function init() {
  for (let i = 0; i < 4; i++) addNode();
  for (let i = 0; i < 20; i++) addKey();
}
init();