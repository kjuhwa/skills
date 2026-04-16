const flags = {
  'auth-v2':        { x: 100, y: 80,  deps: [], on: true },
  'sso':            { x: 260, y: 60,  deps: ['auth-v2'], on: true },
  'mfa':            { x: 260, y: 160, deps: ['auth-v2'], on: false },
  'new-dashboard':  { x: 440, y: 100, deps: ['sso'], on: true },
  'audit-log':      { x: 440, y: 220, deps: ['mfa'], on: false },
  'beta-reports':   { x: 100, y: 280, deps: [], on: false },
  'advanced-charts':{ x: 300, y: 320, deps: ['beta-reports'], on: false },
  'export-pdf':     { x: 500, y: 340, deps: ['advanced-charts','new-dashboard'], on: false }
};

let selected = null;
const svg = document.getElementById('graph');
const detail = document.getElementById('detail');

function effective(name) {
  const f = flags[name];
  if (!f.on) return false;
  return f.deps.every(d => effective(d));
}

function render() {
  svg.innerHTML = '';
  Object.entries(flags).forEach(([name, f]) => {
    f.deps.forEach(dep => {
      const d = flags[dep];
      const active = effective(dep) && f.on;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      line.setAttribute('d', `M${d.x},${d.y} C${(d.x+f.x)/2},${d.y} ${(d.x+f.x)/2},${f.y} ${f.x},${f.y}`);
      line.setAttribute('class', 'edge' + (active ? ' active' : ''));
      svg.appendChild(line);
    });
  });
  Object.entries(flags).forEach(([name, f]) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const eff = effective(name);
    const blocked = f.on && !eff;
    const cls = 'node ' + (eff ? 'on' : (blocked ? 'blocked' : 'off')) + (selected === name ? ' selected' : '');
    g.setAttribute('class', cls);
    g.setAttribute('transform', `translate(${f.x},${f.y})`);
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('r', 28);
    c.setAttribute('stroke-width', 2);
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('dy', 4);
    t.textContent = name;
    g.appendChild(c);
    g.appendChild(t);
    g.addEventListener('click', () => { selected = name; render(); showDetail(name); });
    svg.appendChild(g);
  });
}

function showDetail(name) {
  const f = flags[name];
  const eff = effective(name);
  const blocked = f.on && !eff;
  const deps = f.deps.length ? f.deps.map(d => `<div class="row"><span>${d}</span><span class="tag">${effective(d) ? 'on' : 'off'}</span></div>`).join('') : '<em>No dependencies</em>';
  detail.innerHTML = `
    <div class="row"><span>Raw state</span><span class="tag">${f.on ? 'enabled' : 'disabled'}</span></div>
    <div class="row"><span>Effective</span><span class="tag">${eff ? 'ON' : (blocked ? 'BLOCKED' : 'OFF')}</span></div>
    <h2 style="margin-top:14px">Dependencies</h2>
    ${deps}
    <button class="btn ${f.on ? '' : 'off'}" id="toggle">${f.on ? 'Disable' : 'Enable'} flag</button>
  `;
  document.getElementById('toggle').addEventListener('click', () => { f.on = !f.on; render(); showDetail(name); });
}

render();