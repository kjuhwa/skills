let routes = [
  { method: 'GET', path: '/api/users/:id', service: 'user-svc', auth: true, rateLimit: 100 },
  { method: 'POST', path: '/api/orders', service: 'order-svc', auth: true, rateLimit: 50 },
  { method: 'GET', path: '/api/products', service: 'catalog-svc', auth: false, rateLimit: 200 },
  { method: 'POST', path: '/api/auth/login', service: 'auth-svc', auth: false, rateLimit: 10 }
];
const services = ['user-svc', 'order-svc', 'catalog-svc', 'auth-svc', 'payment-svc', 'inventory-svc'];

function render() {
  const list = document.getElementById('routeList');
  list.innerHTML = '';
  routes.forEach((r, i) => {
    const el = document.createElement('div');
    el.className = 'route';
    el.innerHTML = `
      <select data-i="${i}" data-k="method">
        ${['GET','POST','PUT','DELETE'].map(m => `<option ${m===r.method?'selected':''}>${m}</option>`).join('')}
      </select>
      <input data-i="${i}" data-k="path" value="${r.path}">
      <select data-i="${i}" data-k="service">
        ${services.map(s => `<option ${s===r.service?'selected':''}>${s}</option>`).join('')}
      </select>
      <button class="del" data-del="${i}">×</button>
    `;
    list.appendChild(el);
  });
  list.querySelectorAll('input, select').forEach(el => {
    el.onchange = e => {
      const i = +e.target.dataset.i, k = e.target.dataset.k;
      routes[i][k] = e.target.value;
      renderYaml();
    };
  });
  list.querySelectorAll('[data-del]').forEach(b => {
    b.onclick = () => { routes.splice(+b.dataset.del, 1); render(); renderYaml(); };
  });
  renderYaml();
}

function renderYaml() {
  const lines = ['<span class="k">routes</span>:'];
  routes.forEach(r => {
    lines.push(`  - <span class="k">id</span>: <span class="s">${r.method.toLowerCase()}_${r.path.replace(/[\/:]/g,'_')}</span>`);
    lines.push(`    <span class="k">method</span>: <span class="v">${r.method}</span>`);
    lines.push(`    <span class="k">path</span>: <span class="s">${r.path}</span>`);
    lines.push(`    <span class="k">upstream</span>: <span class="s">http://${r.service}:8080</span>`);
    lines.push(`    <span class="k">filters</span>:`);
    if (r.auth) lines.push(`      - <span class="v">JwtAuth</span>`);
    lines.push(`      - <span class="v">RateLimit</span>=<span class="s">${r.rateLimit || 100}/min</span>`);
    lines.push(`      - <span class="v">AddRequestHeader</span>=<span class="s">X-Gateway,true</span>`);
  });
  document.getElementById('yaml').innerHTML = lines.join('\n');
}

function matchRoute(method, path) {
  for (const r of routes) {
    if (r.method !== method) continue;
    const pattern = r.path.replace(/:[^/]+/g, '([^/]+)');
    const re = new RegExp(`^${pattern}$`);
    const m = path.match(re);
    if (m) return { route: r, params: m.slice(1) };
  }
  return null;
}

document.getElementById('add').onclick = () => {
  routes.push({ method: 'GET', path: '/api/new', service: 'user-svc', auth: false, rateLimit: 100 });
  render();
};

document.getElementById('testBtn').onclick = () => {
  const path = document.getElementById('testPath').value;
  const method = document.getElementById('testMethod').value;
  const result = matchRoute(method, path);
  const box = document.getElementById('testResult');
  if (result) {
    box.className = 'ok';
    box.textContent = `✓ Matched → ${result.route.service} ${result.route.path}` +
      (result.params.length ? ` (params: ${result.params.join(', ')})` : '');
  } else {
    box.className = 'fail';
    box.textContent = '✗ 404 - No matching route';
  }
};

render();