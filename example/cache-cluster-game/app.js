const svg = document.getElementById('board');
const CX = 300, CY = 300, R = 220;
const colors = ['#6ee7b7', '#93c5fd', '#fcd34d', '#c4b5fd', '#f9a8d4', '#86efac', '#a5b4fc'];
let nodes = [];
let requests = [];
let coins = 60, score = 0, hits = 0, total = 0, health = 100, wave = 1;
let vnodes = 3;
let nodeId = 0;

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 0xFFFFFFFF;
}

function polar(a, r) { return [CX + Math.cos(a) * r, CY + Math.sin(a) * r]; }

function addNode(pos) {
  if (coins < 20) return;
  coins -= 20;
  const id = ++nodeId;
  const vs = [];
  for (let i = 0; i < vnodes; i++) vs.push(hash(`n${id}#${i}`));
  if (pos !== undefined) vs[0] = pos;
  nodes.push({ id, color: colors[(id - 1) % colors.length], vnodes: vs, load: 0, capacity: 10, alive: true });
}

function findOwner(p) {
  let all = [];
  nodes.filter(n => n.alive).forEach(n => n.vnodes.forEach(v => all.push({ pos: v, node: n })));
  if (!all.length) return null;
  all.sort((a, b) => a.pos - b.pos);
  for (let e of all) if (e.pos >= p) return e.node;
  return all[0].node;
}

svg.addEventListener('click', e => {
  const rect = svg.getBoundingClientRect();
  const x = (e.clientX - rect.left) * 600 / rect.width - CX;
  const y = (e.clientY - rect.top) * 600 / rect.height - CY;
  const a = Math.atan2(y, x) + Math.PI / 2;
  addNode(((a / (Math.PI * 2)) + 1) % 1);
});

document.getElementById('deploy').onclick = () => addNode();
document.getElementById('upgrade').onclick = () => {
  if (coins < 30) return;
  coins -= 30;
  vnodes++;
  nodes.forEach(n => {
    n.vnodes = [];
    for (let i = 0; i < vnodes; i++) n.vnodes.push(hash(`n${n.id}#${i}`));
  });
};

function spawnRequest() {
  const p = Math.random();
  requests.push({ pos: p, age: 0, settled: false, owner: null });
}

function tick() {
  if (Math.random() < 0.03 + wave * 0.01) spawnRequest();

  nodes.forEach(n => n.load = Math.max(0, n.load - 0.05));

  requests.forEach(r => {
    r.age++;
    if (!r.settled && r.age > 20) {
      r.settled = true;
      const owner = findOwner(r.pos);
      total++;
      if (owner && owner.load < owner.capacity) {
        owner.load++;
        hits++;
        score += Math.floor(10 / Math.max(1, owner.load));
        coins += 1;
        r.owner = owner;
        r.status = 'hit';
      } else {
        health -= 2;
        r.status = 'miss';
      }
    }
  });

  nodes.forEach(n => {
    if (n.load >= n.capacity * 1.5) { n.alive = false; }
  });

  requests = requests.filter(r => r.age < 60);
  if (score > wave * 100) wave++;

  draw();
  if (health > 0) requestAnimationFrame(tick);
  else endGame();
}

function endGame() {
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t.setAttribute('x', CX); t.setAttribute('y', CY);
  t.setAttribute('fill', '#fca5a5');
  t.setAttribute('font-size', '32');
  t.setAttribute('text-anchor', 'middle');
  t.textContent = 'CLUSTER DOWN';
  svg.appendChild(t);
}

function draw() {
  svg.innerHTML = '';
  const ns = 'http://www.w3.org/2000/svg';

  const ring = document.createElementNS(ns, 'circle');
  ring.setAttribute('cx', CX); ring.setAttribute('cy', CY); ring.setAttribute('r', R);
  ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#2a2e3b'); ring.setAttribute('stroke-width', 2);
  svg.appendChild(ring);

  nodes.forEach(n => {
    n.vnodes.forEach((v, i) => {
      const a = v * Math.PI * 2 - Math.PI / 2;
      const [x, y] = polar(a, R);
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', x); c.setAttribute('cy', y);
      c.setAttribute('r', i === 0 ? 12 : 6);
      c.setAttribute('fill', n.alive ? n.color : '#444');
      c.setAttribute('opacity', n.alive ? 1 : 0.3);
      svg.appendChild(c);
      if (i === 0 && n.alive) {
        const loadArc = document.createElementNS(ns, 'circle');
        loadArc.setAttribute('cx', x); loadArc.setAttribute('cy', y);
        loadArc.setAttribute('r', 16);
        loadArc.setAttribute('fill', 'none');
        loadArc.setAttribute('stroke', n.load > n.capacity ? '#fca5a5' : '#6ee7b7');
        loadArc.setAttribute('stroke-width', 2);
        loadArc.setAttribute('stroke-dasharray', `${n.load / n.capacity * 100} 100`);
        loadArc.setAttribute('pathLength', 100);
        svg.appendChild(loadArc);
      }
    });
  });

  requests.forEach(r => {
    const a = r.pos * Math.PI * 2 - Math.PI / 2;
    const targetR = r.settled ? R : R - 80 + r.age * 2;
    const [x, y] = polar(a, Math.min(targetR, R));
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', x); dot.setAttribute('cy', y);
    dot.setAttribute('r', 3);
    dot.setAttribute('fill', r.status === 'hit' ? '#6ee7b7' : r.status === 'miss' ? '#fca5a5' : '#fcd34d');
    svg.appendChild(dot);
  });

  document.getElementById('score').textContent = score;
  document.getElementById('coins').textContent = coins;
  document.getElementById('wave').textContent = wave;
  document.getElementById('health').textContent = Math.max(0, health);
  document.getElementById('hitRate').textContent = total ? Math.round(hits / total * 100) + '%' : '0%';
  document.getElementById('deploy').disabled = coins < 20;
  document.getElementById('upgrade').disabled = coins < 30;

  const list = document.getElementById('nodeList');
  list.innerHTML = nodes.map(n => {
    const pct = Math.min(100, n.load / n.capacity * 100);
    const clr = pct > 100 ? '#fca5a5' : pct > 70 ? '#fcd34d' : '#6ee7b7';
    return `<div class="nodeItem"><span style="color:${n.color}">n${n.id}${n.alive ? '' : ' ☠'}</span><div class="loadBar"><div class="loadFill" style="width:${pct}%;background:${clr}"></div></div></div>`;
  }).join('');
}

addNode(0.1); addNode(0.5); addNode(0.8);
coins = 60;
tick();