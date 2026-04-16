const phases = [
  { m: 0, title: 'Identify Seams', kind: 'legacy', desc: 'Map monolith boundaries. Catalog 47 endpoints, 12 domains. Establish baseline metrics.',
    tasks: ['Domain mapping workshop', 'Endpoint inventory', 'Dependency graph'] },
  { m: 2, title: 'Deploy Proxy', kind: 'proxy', desc: 'Insert routing proxy between clients and monolith. Zero functional change yet.',
    tasks: ['Deploy API gateway', 'Mirror 100% to legacy', 'Establish shadow traffic'] },
  { m: 4, title: 'Extract Auth', kind: 'fig', desc: 'First service carved out. Auth is low-risk, well-bounded.',
    tasks: ['Build auth service', 'Dual-write users', 'Shift 10% → 100%'] },
  { m: 7, title: 'Extract Catalog', kind: 'fig', desc: 'Product catalog migrated. Read-heavy, cacheable.',
    tasks: ['CDC from legacy', 'Canary rollout', 'Retire legacy reads'] },
  { m: 10, title: 'Payments Split', kind: 'fig', desc: 'Highest-risk extraction. Saga pattern for consistency.',
    tasks: ['Saga orchestrator', 'Dual-write with reconciliation', 'Progressive cutover'] },
  { m: 13, title: 'Orders Carved', kind: 'fig', desc: 'Orders service owns its own data. Monolith reduced to reporting.',
    tasks: ['Event sourcing', 'Projection catch-up', 'Legacy becomes read replica'] },
  { m: 16, title: 'Reporting Lift', kind: 'fig', desc: 'Final migration. Analytics moves to dedicated warehouse.',
    tasks: ['Stream to warehouse', 'Reconcile historical', 'Cutover BI tools'] },
  { m: 18, title: 'Retire Monolith', kind: 'proxy', desc: 'Legacy decommissioned. Proxy simplified to edge routing only.',
    tasks: ['Shutdown legacy', 'Archive code', 'Celebrate'] }
];

const svg = document.getElementById('timeline');
const W = 800, H = 600;
const margin = { l: 60, r: 40, t: 60, b: 80 };

function xFor(m) {
  return margin.l + (m / 18) * (W - margin.l - margin.r);
}
function yFor(kind) {
  if (kind === 'legacy') return H - margin.b - 20;
  if (kind === 'proxy') return (H - margin.b + margin.t) / 2;
  return margin.t + 40;
}
function colorFor(kind) {
  return { legacy: '#6b4f3a', proxy: '#f59e0b', fig: '#6ee7b7' }[kind];
}

function build() {
  let svgNS = 'http://www.w3.org/2000/svg';
  const axis = document.createElementNS(svgNS, 'g');
  axis.setAttribute('class', 'axis');
  const line = document.createElementNS(svgNS, 'line');
  line.setAttribute('x1', margin.l);
  line.setAttribute('x2', W - margin.r);
  line.setAttribute('y1', H - margin.b);
  line.setAttribute('y2', H - margin.b);
  axis.appendChild(line);
  for (let m = 0; m <= 18; m += 3) {
    const tx = xFor(m);
    const tick = document.createElementNS(svgNS, 'line');
    tick.setAttribute('x1', tx); tick.setAttribute('x2', tx);
    tick.setAttribute('y1', H - margin.b); tick.setAttribute('y2', H - margin.b + 6);
    axis.appendChild(tick);
    const lbl = document.createElementNS(svgNS, 'text');
    lbl.setAttribute('x', tx); lbl.setAttribute('y', H - margin.b + 22);
    lbl.setAttribute('text-anchor', 'middle');
    lbl.textContent = 'M' + m;
    axis.appendChild(lbl);
  }
  svg.appendChild(axis);

  ['legacy', 'proxy', 'fig'].forEach(kind => {
    const y = yFor(kind);
    const l = document.createElementNS(svgNS, 'line');
    l.setAttribute('x1', margin.l); l.setAttribute('x2', W - margin.r);
    l.setAttribute('y1', y); l.setAttribute('y2', y);
    l.setAttribute('class', 'connector');
    svg.appendChild(l);
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('x', margin.l - 10); t.setAttribute('y', y + 4);
    t.setAttribute('text-anchor', 'end');
    t.setAttribute('class', 'phase-label');
    t.textContent = kind.toUpperCase();
    t.style.fill = colorFor(kind);
    svg.appendChild(t);
  });

  phases.forEach((p, i) => {
    const g = document.createElementNS(svgNS, 'g');
    g.setAttribute('class', 'node');
    g.setAttribute('data-i', i);
    const cx = xFor(p.m), cy = yFor(p.kind);
    const c = document.createElementNS(svgNS, 'circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', 10);
    c.setAttribute('fill', colorFor(p.kind));
    g.appendChild(c);
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('x', cx); t.setAttribute('y', cy - 18);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('class', 'phase-label');
    t.textContent = p.title;
    g.appendChild(t);
    g.onclick = () => select(i);
    svg.appendChild(g);
  });
}

function select(i) {
  document.querySelectorAll('.node').forEach(n => n.classList.remove('active'));
  document.querySelector(`.node[data-i="${i}"]`).classList.add('active');
  const p = phases[i];
  document.getElementById('detail').innerHTML = `
    <h3>${p.title} <span style="color:${colorFor(p.kind)}">· M${p.m}</span></h3>
    <p class="body">${p.desc}</p>
    <ul>${p.tasks.map(t => `<li>${t}</li>`).join('')}</ul>
  `;
}

build();
select(0);