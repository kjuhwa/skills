const scopes = [
  { id: 'profile:read', desc: 'Read user profile info' },
  { id: 'profile:write', desc: 'Update user profile' },
  { id: 'email', desc: 'Access email address' },
  { id: 'repos:read', desc: 'List and read repositories' },
  { id: 'repos:write', desc: 'Create and push to repos' },
  { id: 'admin', desc: 'Full administrative access' },
  { id: 'billing:read', desc: 'View billing information' }
];

const endpoints = [
  { method: 'GET', path: '/user/me', requires: ['profile:read'] },
  { method: 'POST', path: '/user/me', requires: ['profile:write'] },
  { method: 'GET', path: '/user/email', requires: ['email'] },
  { method: 'GET', path: '/repos', requires: ['repos:read'] },
  { method: 'POST', path: '/repos', requires: ['repos:write'] },
  { method: 'GET', path: '/repos/:id/commits', requires: ['repos:read'] },
  { method: 'DELETE', path: '/repos/:id', requires: ['repos:write', 'admin'] },
  { method: 'GET', path: '/billing/invoices', requires: ['billing:read'] },
  { method: 'POST', path: '/org/members', requires: ['admin'] },
  { method: 'DELETE', path: '/org/members/:id', requires: ['admin'] },
  { method: 'GET', path: '/org/settings', requires: ['admin'] }
];

const active = new Set(['profile:read', 'email']);

function render() {
  const sl = document.getElementById('scope-list');
  sl.innerHTML = scopes.map(s =>
    `<div class="scope-item ${active.has(s.id)?'active':''}" onclick="toggle('${s.id}')">
      <div class="toggle"></div>
      <div><div class="scope-label">${s.id}</div><div class="scope-desc">${s.desc}</div></div>
    </div>`
  ).join('');

  const el = document.getElementById('endpoint-list');
  el.innerHTML = endpoints.map(e => {
    const ok = e.requires.every(r => active.has(r));
    return `<div class="ep ${ok?'unlocked':'locked'}">
      <span class="method ${e.method}">${e.method}</span>
      <span class="path">${e.path}</span>
      <span class="lock-icon">${ok ? '\u2713' : '\u26BF'}</span>
    </div>`;
  }).join('');

  const scopeStr = [...active].sort().join(' ');
  document.getElementById('token-preview').textContent = scopeStr
    ? `{ "scope": "${scopeStr}", "sub": "user-8842", "exp": ${Math.floor(Date.now()/1000)+3600} }`
    : '— no scopes selected —';
}

function toggle(id) { active.has(id) ? active.delete(id) : active.add(id); render(); }

render();