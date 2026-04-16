const svg = document.getElementById('ring');
const distEl = document.getElementById('dist');
const tooltip = document.getElementById('tooltip');
const vnEl = document.getElementById('vn');
const vnVal = document.getElementById('vnVal');

const RADIUS = 180;
const COLORS = ['#6ee7b7','#7dd3fc','#fca5a5','#fcd34d','#c4b5fd','#f0abfc','#86efac','#fdba74'];
let nodes = [];
let keys = [];
let vnodes = 3;
let nodeCounter = 0;

function hash(str) {
  let h = 2166136261;
  for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

function angle(p) { return p * Math.PI * 2 - Math.PI / 2; }
function polar(p, r = RADIUS) { const a = angle(p); return { x: Math.cos(a) * r, y: Math.sin(a) * r }; }

function addNode() {
  const id = String.fromCharCode(65 + nodeCounter++);
  nodes.push({ id, color: COLORS[nodes.length % COLORS.length] });
  render();
}
function removeNode() { if (nodes.length) { nodes.pop(); render(); } }
function addKeys(n = 20) {
  for (let i = 0; i < n; i++) {
    const k = 'key_' + Math.random().toString(36).slice(2, 8);
    keys.push({ id: k, pos: hash(k) });
  }
  render();
}

function getVNodes() {
  const out = [];
  for (const n of nodes) {
    for (let v = 0; v < vnodes; v++) {
      out.push({ id: n.id, color: n.color, pos: hash(n.id + '#' + v) });
    }
  }
  return out.sort((a,b) => a.pos - b.pos);
}

function routeKey(pos, vns) {
  if (!vns.length) return null;
  for (const v of vns) if (v.pos >= pos) return v;
  return vns[0];
}

function arcPath(from, to, r = RADIUS) {
  if (to < from) to += 1;
  const a1 = polar(from, r), a2 = polar(to, r);
  const large = (to - from) > 0.5 ? 1 : 0;
  return `M ${a1.x} ${a1.y} A ${r} ${r} 0 ${large} 1 ${a2.x} ${a2.y}`;
}

function render() {
  const vns = getVNodes();
  const counts = Object.fromEntries(nodes.map(n => [n.id, 0]));

  svg.innerHTML = `<circle class="ring-bg" r="${RADIUS}"/>`;

  for (let i = 0; i < vns.length; i++) {
    const cur = vns[i], next = vns[(i+1) % vns.length];
    const from = cur.pos, to = next.pos;
    svg.innerHTML += `<path class="ring-arc" d="${arcPath(from, to)}" stroke="${cur.color}"/>`;
  }

  for (const v of vns) {
    const p = polar(v.pos);
    svg.innerHTML += `<circle class="node-dot" cx="${p.x}" cy="${p.y}" r="7" fill="${v.color}" stroke="#0f1117" stroke-width="2" data-id="${v.id}"/>`;
    const pl = polar(v.pos, RADIUS + 22);
    svg.innerHTML += `<text x="${pl.x}" y="${pl.y}" fill="${v.color}" font-size="11" text-anchor="middle" dominant-baseline="middle">${v.id}</text>`;
  }

  for (const k of keys) {
    const target = routeKey(k.pos, vns);
    if (target) counts[target.id]++;
    const p = polar(k.pos, RADIUS - 40);
    const color = target ? target.color : '#555';
    svg.innerHTML += `<circle class="key-dot" cx="${p.x}" cy="${p.y}" r="3" fill="${color}" opacity="0.85"/>`;
  }

  const total = keys.length || 1;
  distEl.innerHTML = nodes.map(n =>
    `<div>
      <span class="swatch" style="background:${n.color}"></span>
      <span>${n.id}</span>
      <div class="fill"><div style="width:${counts[n.id]/total*100}%;background:${n.color}"></div></div>
      <span>${counts[n.id]}</span>
    </div>`
  ).join('') || '<div style="color:#7a8396">No nodes</div>';

  svg.querySelectorAll('.node-dot').forEach(el => {
    el.onclick = () => { nodes = nodes.filter(n => n.id !== el.dataset.id); render(); };
  });
}

svg.addEventListener('mousemove', e => {
  const rect = svg.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * 500 - 250;
  const y = (e.clientY - rect.top) / rect.height * 500 - 250;
  let a = Math.atan2(y, x) + Math.PI / 2;
  if (a < 0) a += Math.PI * 2;
  const pos = a / (Math.PI * 2);
  const vns = getVNodes();
  const target = routeKey(pos, vns);
  if (target) {
    tooltip.style.display = 'block';
    tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
    tooltip.style.top = (e.clientY - rect.top + 12) + 'px';
    tooltip.innerHTML = `pos: ${pos.toFixed(3)}<br>→ Node <b style="color:${target.color}">${target.id}</b>`;
  }
});
svg.addEventListener('mouseleave', () => tooltip.style.display = 'none');

vnEl.oninput = () => { vnodes = +vnEl.value; vnVal.textContent = vnodes; render(); };
document.getElementById('add').onclick = addNode;
document.getElementById('remove').onclick = removeNode;
document.getElementById('addKeys').onclick = () => addKeys(20);
document.getElementById('clearKeys').onclick = () => { keys = []; render(); };

['A','B','C','D'].forEach(() => addNode());
addKeys(30);