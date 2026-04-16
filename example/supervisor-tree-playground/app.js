const svg = document.getElementById('tree');
const status = document.getElementById('status');
const strategySel = document.getElementById('strategy');

let nodes = [];
let strategy = 'one_for_one';

function buildTree() {
  nodes = [
    { id: 'root', label: 'App.Supervisor', x: 450, y: 60, type: 'sup', parent: null, alive: true, restarts: 0 },
    { id: 'db', label: 'DB.Supervisor', x: 220, y: 200, type: 'sup', parent: 'root', alive: true, restarts: 0 },
    { id: 'web', label: 'Web.Supervisor', x: 680, y: 200, type: 'sup', parent: 'root', alive: true, restarts: 0 },
    { id: 'db1', label: 'DB.Pool-1', x: 120, y: 360, type: 'worker', parent: 'db', alive: true, restarts: 0 },
    { id: 'db2', label: 'DB.Pool-2', x: 240, y: 360, type: 'worker', parent: 'db', alive: true, restarts: 0 },
    { id: 'db3', label: 'DB.Cache', x: 360, y: 360, type: 'worker', parent: 'db', alive: true, restarts: 0 },
    { id: 'web1', label: 'HTTP', x: 560, y: 360, type: 'worker', parent: 'web', alive: true, restarts: 0 },
    { id: 'web2', label: 'Router', x: 680, y: 360, type: 'worker', parent: 'web', alive: true, restarts: 0 },
    { id: 'web3', label: 'Session', x: 800, y: 360, type: 'worker', parent: 'web', alive: true, restarts: 0 },
  ];
}

function log(txt, crash = false) {
  const div = document.createElement('div');
  div.className = 'event' + (crash ? ' crash' : '');
  div.innerHTML = txt;
  status.prepend(div);
  if (status.children.length > 30) status.lastChild.remove();
}

function siblings(nodeId) {
  const n = nodes.find(x => x.id === nodeId);
  return nodes.filter(x => x.parent === n.parent && x.id !== nodeId);
}

function crash(id) {
  const n = nodes.find(x => x.id === id);
  if (!n || !n.alive || n.type !== 'worker') return;

  n.alive = false;
  log(`<b>CRASH</b> ${n.label} exited abnormally`, true);
  render();

  setTimeout(() => {
    const sibs = siblings(id);
    const applyStrategy = () => {
      if (strategy === 'one_for_one') {
        n.alive = true; n.restarts++;
        log(`<b>one_for_one</b> restarted ${n.label} (#${n.restarts})`);
      } else if (strategy === 'one_for_all') {
        [n, ...sibs].forEach(s => { s.alive = true; s.restarts++; });
        log(`<b>one_for_all</b> restarted all under ${n.parent}`);
      } else if (strategy === 'rest_for_one') {
        const order = nodes.filter(x => x.parent === n.parent);
        const idx = order.findIndex(x => x.id === id);
        for (let i = idx; i < order.length; i++) {
          order[i].alive = true; order[i].restarts++;
        }
        log(`<b>rest_for_one</b> restarted ${n.label} and following siblings`);
      }
      render();
    };
    applyStrategy();
  }, 700);
}

function render() {
  svg.innerHTML = '';
  nodes.forEach(n => {
    if (!n.parent) return;
    const p = nodes.find(x => x.id === n.parent);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', p.x);
    line.setAttribute('y1', p.y);
    line.setAttribute('x2', n.x);
    line.setAttribute('y2', n.y);
    line.setAttribute('stroke', n.alive ? '#2a2f3d' : '#ef4444');
    line.setAttribute('stroke-width', 2);
    line.setAttribute('stroke-dasharray', n.alive ? '0' : '4');
    svg.appendChild(line);
  });

  nodes.forEach(n => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'node');
    g.setAttribute('transform', `translate(${n.x},${n.y})`);
    g.onclick = () => crash(n.id);

    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('r', n.type === 'sup' ? 28 : 22);
    c.setAttribute('fill', n.alive ? '#0f1117' : '#2a0a0a');
    c.setAttribute('stroke', n.alive ? (n.type === 'sup' ? '#6ee7b7' : '#60a5fa') : '#ef4444');
    c.setAttribute('stroke-width', 2);
    g.appendChild(c);

    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('y', n.type === 'sup' ? -36 : -30);
    t.setAttribute('fill', n.alive ? '#e5e7eb' : '#ef4444');
    t.setAttribute('font-size', '12');
    t.textContent = n.label;
    g.appendChild(t);

    if (n.type === 'worker') {
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      r.setAttribute('text-anchor', 'middle');
      r.setAttribute('y', 5);
      r.setAttribute('fill', '#6ee7b7');
      r.setAttribute('font-size', '11');
      r.textContent = n.alive ? `↻${n.restarts}` : '💀';
      g.appendChild(r);
    }
    svg.appendChild(g);
  });
}

strategySel.onchange = e => { strategy = e.target.value; log(`Strategy → <b>${strategy}</b>`); };
document.getElementById('chaos').onclick = () => {
  const workers = nodes.filter(n => n.type === 'worker' && n.alive);
  if (workers.length) crash(workers[Math.floor(Math.random() * workers.length)].id);
};
document.getElementById('reset').onclick = () => { buildTree(); render(); log('<b>Reset</b> tree rebuilt'); };

buildTree();
render();
log('Click any worker node to crash it.');