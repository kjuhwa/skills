const schema = {
  User: { kind: 'object', fields: [
    { n: 'id', t: 'ID' }, { n: 'name', t: 'String' }, { n: 'email', t: 'String' },
    { n: 'role', t: 'Role' }, { n: 'posts', t: '[Post]' }
  ]},
  Post: { kind: 'object', fields: [
    { n: 'id', t: 'ID' }, { n: 'title', t: 'String' }, { n: 'body', t: 'String' },
    { n: 'author', t: 'User' }, { n: 'comments', t: '[Comment]' }
  ]},
  Comment: { kind: 'object', fields: [
    { n: 'id', t: 'ID' }, { n: 'text', t: 'String' }, { n: 'author', t: 'User' }
  ]},
  Role: { kind: 'enum', fields: [{ n: 'ADMIN' }, { n: 'EDITOR' }, { n: 'VIEWER' }] },
  Query: { kind: 'object', fields: [
    { n: 'users', t: '[User]' }, { n: 'posts', t: '[Post]' }, { n: 'me', t: 'User' }
  ]}
};

const SCALARS = ['ID', 'String', 'Int', 'Float', 'Boolean'];
const positions = {
  Query: { x: 80, y: 80 }, User: { x: 380, y: 60 },
  Post: { x: 700, y: 200 }, Comment: { x: 380, y: 380 }, Role: { x: 80, y: 320 }
};

const svg = document.getElementById('canvas');
const tooltip = document.getElementById('tooltip');
const list = document.getElementById('type-list');

function svgEl(name, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function render() {
  svg.innerHTML = '';
  const defs = svgEl('defs');
  const marker = svgEl('marker', { id: 'arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' });
  marker.appendChild(svgEl('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#6ee7b7' }));
  defs.appendChild(marker);
  svg.appendChild(defs);

  const edgesGroup = svgEl('g');
  svg.appendChild(edgesGroup);

  for (const [tname, t] of Object.entries(schema)) {
    const pos = positions[tname];
    const w = 180, h = 28 + t.fields.length * 20;
    const g = svgEl('g', { transform: `translate(${pos.x},${pos.y})`, 'data-type': tname });
    const rect = svgEl('rect', { class: 'node-rect', width: w, height: h, rx: 6 });
    if (t.kind === 'enum') rect.setAttribute('stroke', '#f472b6');
    g.appendChild(rect);
    g.appendChild(svgEl('text', { class: 'node-title', x: 12, y: 18 })).textContent = tname;
    t.fields.forEach((f, i) => {
      const txt = svgEl('text', { class: 'node-field', x: 12, y: 42 + i * 20 });
      txt.textContent = f.n;
      g.appendChild(txt);
      if (f.t) {
        const ty = svgEl('text', { class: 'node-field field-type', x: w - 12, y: 42 + i * 20, 'text-anchor': 'end' });
        ty.textContent = f.t;
        g.appendChild(ty);
      }
    });
    g.addEventListener('click', () => highlightType(tname));
    g.addEventListener('mousemove', e => {
      tooltip.style.left = (e.pageX + 12) + 'px';
      tooltip.style.top = (e.pageY + 12) + 'px';
      tooltip.textContent = `${tname} (${t.kind}) — ${t.fields.length} fields`;
      tooltip.style.opacity = 1;
    });
    g.addEventListener('mouseleave', () => tooltip.style.opacity = 0);
    svg.appendChild(g);
  }

  for (const [tname, t] of Object.entries(schema)) {
    if (t.kind !== 'object') continue;
    t.fields.forEach((f, i) => {
      const target = (f.t || '').replace(/[\[\]!]/g, '');
      if (schema[target] && !SCALARS.includes(target)) {
        const from = positions[tname]; const to = positions[target];
        const x1 = from.x + 180, y1 = from.y + 42 + i * 20 - 4;
        const x2 = to.x, y2 = to.y + 20;
        const path = svgEl('path', { class: 'edge', d: `M${x1},${y1} C${x1+60},${y1} ${x2-60},${y2} ${x2},${y2}`, 'data-from': tname, 'data-to': target });
        edgesGroup.appendChild(path);
      }
    });
  }
}

function highlightType(name) {
  document.querySelectorAll('#type-list li').forEach(li => li.classList.toggle('active', li.dataset.t === name));
  document.querySelectorAll('.edge').forEach(e => {
    const hot = e.dataset.from === name || e.dataset.to === name;
    e.classList.toggle('highlight', hot);
  });
}

Object.keys(schema).forEach(t => {
  const li = document.createElement('li');
  li.textContent = t; li.dataset.t = t;
  li.addEventListener('click', () => highlightType(t));
  list.appendChild(li);
});

render();
highlightType('User');