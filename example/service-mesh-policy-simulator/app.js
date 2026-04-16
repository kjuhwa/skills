let policies = [
  { id: 1, action: 'allow', from: 'users-svc', to: 'orders-svc', method: '*' },
  { id: 2, action: 'allow', from: 'api-gateway', to: '*', method: 'GET' },
  { id: 3, action: 'deny', from: '*', to: 'payments-svc', method: 'DELETE' },
  { id: 4, action: 'allow', from: 'orders-svc', to: 'payments-svc', method: '*' },
];
let logs = [];
let nextId = 5;

function match(pattern, value) {
  return pattern === '*' || pattern === value;
}

function evaluate(req) {
  for (const p of policies) {
    if (match(p.from, req.from) && match(p.to, req.to) && match(p.method, req.method)) {
      return { verdict: p.action, policy: `P${p.id}: ${p.action} ${p.from}→${p.to} [${p.method}]` };
    }
  }
  return { verdict: 'deny', policy: 'default-deny (no match)' };
}

function renderPolicies() {
  const list = document.getElementById('policyList');
  list.innerHTML = '';
  policies.forEach(p => {
    const el = document.createElement('div');
    el.className = 'policy ' + p.action;
    el.innerHTML = `
      <div class="row">
        <select data-field="action"><option ${p.action==='allow'?'selected':''}>allow</option><option ${p.action==='deny'?'selected':''}>deny</option></select>
        <button class="del">×</button>
      </div>
      <div class="row">
        <input data-field="from" value="${p.from}" placeholder="from">
        <input data-field="to" value="${p.to}" placeholder="to">
        <input data-field="method" value="${p.method}" placeholder="method">
      </div>`;
    el.querySelectorAll('[data-field]').forEach(inp => {
      inp.oninput = () => { p[inp.dataset.field] = inp.value; renderPolicies(); };
    });
    el.querySelector('.del').onclick = () => {
      policies = policies.filter(x => x.id !== p.id); renderPolicies();
    };
    list.appendChild(el);
  });
}

function sendRequest(req) {
  const result = evaluate(req);
  logs.unshift({ ...req, ...result, time: new Date().toLocaleTimeString() });
  if (logs.length > 100) logs.pop();
  renderLog();
}

function renderLog() {
  const log = document.getElementById('log');
  log.innerHTML = logs.map(l => `
    <div class="log-entry ${l.verdict}">
      <span class="verdict">${l.verdict.toUpperCase()}</span>
      <span class="path">${l.time} · ${l.from} → ${l.to} [${l.method}]</span>
      <span class="reason">${l.policy}</span>
    </div>
  `).join('');
}

document.getElementById('addPolicy').onclick = () => {
  policies.push({ id: nextId++, action: 'allow', from: '*', to: '*', method: '*' });
  renderPolicies();
};

document.getElementById('send').onclick = () => {
  sendRequest({
    from: document.getElementById('source').value,
    to: document.getElementById('dest').value,
    method: document.getElementById('method').value,
  });
};

document.getElementById('burst').onclick = () => {
  const svcs = ['users-svc', 'orders-svc', 'payments-svc', 'api-gateway', 'inventory', 'auth-svc'];
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  for (let i = 0; i < 20; i++) {
    sendRequest({
      from: svcs[Math.floor(Math.random() * svcs.length)],
      to: svcs[Math.floor(Math.random() * svcs.length)],
      method: methods[Math.floor(Math.random() * methods.length)],
    });
  }
};

renderPolicies();
sendRequest({ from: 'users-svc', to: 'orders-svc', method: 'GET' });