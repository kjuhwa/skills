const nodes = [
  { id: 'crm_db', label: 'crm.users', type: 'source', col: 0, row: 0, desc: 'Postgres — live CRM users table (2.4M rows)' },
  { id: 'events', label: 'events.kafka', type: 'source', col: 0, row: 1, desc: 'Kafka topic — clickstream events (5k/s)' },
  { id: 'orders', label: 'orders.csv', type: 'source', col: 0, row: 2, desc: 'S3 daily dump from billing system' },
  { id: 'clean_users', label: 'clean_users', type: 'transform', col: 1, row: 0, desc: 'Deduplicate + normalize emails' },
  { id: 'sessionize', label: 'sessionize', type: 'transform', col: 1, row: 1, desc: '30-minute inactivity window' },
  { id: 'enrich', label: 'enrich_orders', type: 'transform', col: 1, row: 2, desc: 'Join with clean_users, add geo' },
  { id: 'user_facts', label: 'user_facts', type: 'transform', col: 2, row: 0, desc: 'Aggregate LTV, cohort tags' },
  { id: 'session_facts', label: 'session_facts', type: 'transform', col: 2, row: 1, desc: 'Funnel + conversion metrics' },
  { id: 'warehouse', label: 'dw.analytics', type: 'sink', col: 3, row: 0, desc: 'Snowflake — analytics warehouse' },
  { id: 'ml_store', label: 'feature.store', type: 'sink', col: 3, row: 1, desc: 'Feast — ML feature registry' },
  { id: 'report', label: 'bi.dashboard', type: 'sink', col: 3, row: 2, desc: 'Metabase dashboards' }
];

const edges = [
  ['crm_db', 'clean_users'],
  ['events', 'sessionize'],
  ['orders', 'enrich'],
  ['clean_users', 'enrich'],
  ['clean_users', 'user_facts'],
  ['sessionize', 'session_facts'],
  ['enrich', 'user_facts'],
  ['enrich', 'report'],
  ['user_facts', 'warehouse'],
  ['user_facts', 'ml_store'],
  ['session_facts', 'warehouse'],
  ['session_facts', 'ml_store']
];

const svg = document.getElementById('graph');
const W = 1000, H = 600;
const colW = W / 4;
const rowH = H / 3.2;

function pos(n) {
  return { x: 60 + n.col * colW, y: 80 + n.row * rowH, w: 160, h: 46 };
}

function render() {
  svg.innerHTML = '';

  edges.forEach(([from, to]) => {
    const a = pos(nodes.find(n => n.id === from));
    const b = pos(nodes.find(n => n.id === to));
    const x1 = a.x + a.w, y1 = a.y + a.h / 2;
    const x2 = b.x, y2 = b.y + b.h / 2;
    const mx = (x1 + x2) / 2;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`);
    path.setAttribute('class', 'edge');
    path.dataset.from = from;
    path.dataset.to = to;
    svg.appendChild(path);
  });

  nodes.forEach(n => {
    const p = pos(n);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `node type-${n.type}`);
    g.dataset.id = n.id;
    g.setAttribute('transform', `translate(${p.x},${p.y})`);
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', p.w);
    rect.setAttribute('height', p.h);
    g.appendChild(rect);
    const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t1.setAttribute('x', 10);
    t1.setAttribute('y', 20);
    t1.textContent = n.label;
    g.appendChild(t1);
    const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t2.setAttribute('x', 10);
    t2.setAttribute('y', 36);
    t2.setAttribute('fill', '#6ee7b7');
    t2.setAttribute('font-size', '10');
    t2.textContent = n.type.toUpperCase();
    g.appendChild(t2);
    g.addEventListener('click', () => select(n.id));
    svg.appendChild(g);
  });
}

function ancestors(id, set = new Set()) {
  edges.filter(e => e[1] === id).forEach(e => {
    if (!set.has(e[0])) { set.add(e[0]); ancestors(e[0], set); }
  });
  return set;
}
function descendants(id, set = new Set()) {
  edges.filter(e => e[0] === id).forEach(e => {
    if (!set.has(e[1])) { set.add(e[1]); descendants(e[1], set); }
  });
  return set;
}

function select(id) {
  const up = ancestors(id);
  const down = descendants(id);
  document.querySelectorAll('.node').forEach(el => {
    el.classList.remove('highlight', 'upstream', 'downstream');
    if (el.dataset.id === id) el.classList.add('highlight');
    else if (up.has(el.dataset.id)) el.classList.add('upstream');
    else if (down.has(el.dataset.id)) el.classList.add('downstream');
  });
  document.querySelectorAll('.edge').forEach(el => {
    const f = el.dataset.from, t = el.dataset.to;
    const onPath = (f === id || t === id) ||
      (up.has(f) && (up.has(t) || t === id)) ||
      (down.has(t) && (down.has(f) || f === id));
    el.classList.toggle('active', onPath);
  });
  const n = nodes.find(x => x.id === id);
  document.getElementById('nodeName').textContent = n.label;
  document.getElementById('nodeInfo').innerHTML =
    `<strong>Type:</strong> ${n.type}<br>` +
    `<strong>Description:</strong> ${n.desc}<br>` +
    `<strong>Upstream (${up.size}):</strong> ${[...up].join(', ') || '—'}<br>` +
    `<strong>Downstream (${down.size}):</strong> ${[...down].join(', ') || '—'}`;
}

render();
select('enrich');