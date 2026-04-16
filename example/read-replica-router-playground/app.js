const nodes = [
  { id: 'client', label: 'Client', type: 'client', x: 80, y: 220 },
  { id: 'router', label: 'Router', type: 'router', x: 230, y: 220 },
  { id: 'primary', label: 'primary', type: 'primary', region: 'us-east-1', x: 420, y: 80 },
  { id: 'r1', label: 'replica-1', type: 'replica', region: 'us-east-1', x: 420, y: 170 },
  { id: 'r2', label: 'replica-2', type: 'replica', region: 'us-west-2', x: 420, y: 260 },
  { id: 'r3', label: 'replica-3', type: 'replica', region: 'eu-west-1', x: 420, y: 350 }
];
let rrIndex = 0;
let sessionTarget = null;

function renderTopology() {
  const svg = document.getElementById('topology');
  svg.innerHTML = '';
  const ns = 'http://www.w3.org/2000/svg';
  ['client->router', 'router->primary', 'router->r1', 'router->r2', 'router->r3']
    .forEach(pair => {
      const [a, b] = pair.split('->').map(id => nodes.find(n => n.id === id));
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', `M${a.x + 30} ${a.y} L${b.x - 30} ${b.y}`);
      p.setAttribute('class', 'link');
      p.dataset.edge = `${a.id}-${b.id}`;
      svg.appendChild(p);
    });
  nodes.forEach(n => {
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', 'node' + (n.type === 'primary' ? ' primary' : ''));
    g.dataset.id = n.id;
    g.setAttribute('transform', `translate(${n.x},${n.y})`);
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('r', 28);
    g.appendChild(c);
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('y', -36);
    t.textContent = n.label;
    g.appendChild(t);
    if (n.region) {
      const s = document.createElementNS(ns, 'text');
      s.setAttribute('y', 46);
      s.setAttribute('class', 'sub');
      s.textContent = n.region;
      g.appendChild(s);
    }
    svg.appendChild(g);
  });
}

function classifyQuery(sql) {
  const s = sql.trim().toUpperCase();
  return /^(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE)/.test(s) ? 'WRITE' : 'READ';
}

function chooseReplica(strategy, region) {
  const reps = nodes.filter(n => n.type === 'replica');
  if (strategy === 'round') return reps[rrIndex++ % reps.length];
  if (strategy === 'nearest') {
    return reps.find(r => r.region === region) || reps[0];
  }
  if (strategy === 'sticky') {
    if (!sessionTarget) sessionTarget = reps[Math.floor(Math.random() * reps.length)];
    return sessionTarget;
  }
  return reps[Math.floor(Math.random() * reps.length)];
}

function animate(target, kind) {
  document.querySelectorAll('.link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.node').forEach(n => n.classList.remove('active'));
  const edges = ['client-router', `router-${target}`];
  edges.forEach(e => {
    const el = document.querySelector(`[data-edge="${e}"]`);
    if (el) { el.classList.add('active'); el.setAttribute('stroke-dasharray', '8 4'); }
  });
  document.querySelector(`.node[data-id="${target}"]`).classList.add('active');
  setTimeout(() => {
    document.querySelectorAll('.link').forEach(l => l.removeAttribute('stroke-dasharray'));
  }, 1200);
}

function log(entry, kind) {
  const li = document.createElement('li');
  li.className = kind === 'WRITE' ? 'write' : '';
  li.textContent = entry;
  const list = document.getElementById('logList');
  list.insertBefore(li, list.firstChild);
  while (list.children.length > 20) list.removeChild(list.lastChild);
}

function run() {
  const sql = document.getElementById('sql').value;
  const strategy = document.getElementById('strategy').value;
  const region = document.getElementById('region').value;
  const kind = classifyQuery(sql);
  let target, reason;
  if (kind === 'WRITE') {
    target = 'primary';
    reason = 'mutation → PRIMARY';
  } else {
    const rep = chooseReplica(strategy, region);
    target = rep.id;
    reason = `read via ${strategy}`;
  }
  animate(target, kind);
  log(`[${kind}] ${sql.slice(0, 50)}${sql.length > 50 ? '…' : ''} → ${target} (${reason})`, kind);
}

document.getElementById('runBtn').onclick = run;
document.querySelectorAll('.ex').forEach(e => {
  e.onclick = () => { document.getElementById('sql').value = e.dataset.q; run(); };
});
document.getElementById('strategy').onchange = () => { sessionTarget = null; rrIndex = 0; };

renderTopology();
run();