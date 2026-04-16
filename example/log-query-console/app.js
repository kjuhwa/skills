const LEVELS = ['ERROR','WARN','INFO','DEBUG'];
const SVCS = ['auth-svc','api-gw','billing','db-proxy','worker','notifier','cache','search'];
const USERS = ['alice','bob','charlie','dana','eve','frank'];
const STATUSES = ['200','201','204','301','400','401','403','404','500','502','503','5xx','2xx','4xx'];
const TPL = [
  '{method} /api/{r} {status} for user {user} in {ms}ms',
  'Failed to connect to {svc} (retry {n})',
  'Query executed on table {t} rows={n}',
  'Cache {hit} for key {k}',
  'Token refreshed for user {user}',
  'Payment of ${amt} processed status={status}',
  'Rate limit hit for {user} ({n}/min)',
  'Session {k} expired'
];

function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
function gen(i){
  const tpl = pick(TPL);
  const status = pick(STATUSES);
  const msg = tpl
    .replace('{method}', pick(['GET','POST','PUT','DELETE']))
    .replace('{r}', pick(['users','orders','items','stats','auth/login','payments']))
    .replace('{status}', status)
    .replace('{user}', pick(USERS))
    .replace('{svc}', pick(SVCS))
    .replace('{t}', pick(['users','orders','events','logs']))
    .replace('{hit}', pick(['hit','miss']))
    .replace('{k}', 'sess-' + Math.random().toString(36).slice(2,8))
    .replace('{amt}', (Math.random()*200).toFixed(2))
    .replace('{ms}', Math.floor(Math.random()*800))
    .replace('{n}', Math.floor(Math.random()*5000));
  const t = new Date(Date.now() - i*1500);
  const level = Math.random()<0.05?'ERROR':Math.random()<0.15?'WARN':Math.random()<0.6?'INFO':'DEBUG';
  return {
    ts: t.toTimeString().slice(0,8),
    level,
    service: pick(SVCS),
    msg,
    status,
    user: USERS.find(u => msg.includes(u)) || null
  };
}

const DATA = Array.from({length: 800}, (_, i) => gen(i));
document.getElementById('total').textContent = DATA.length;

const qEl = document.getElementById('q');
const resEl = document.getElementById('results');
const hitsEl = document.getElementById('hits');
const chipsEl = document.getElementById('chips');

const QUICK = ['level:ERROR','level:WARN','service:auth-svc','service:billing','status:5xx','user:alice'];
QUICK.forEach(q => {
  const c = document.createElement('span');
  c.className = 'chip';
  c.textContent = q;
  c.onclick = () => {
    const cur = qEl.value.trim();
    qEl.value = cur.includes(q) ? cur.replace(q,'').trim() : (cur ? cur+' '+q : q);
    render();
  };
  chipsEl.appendChild(c);
});

function parse(q) {
  const tokens = q.trim().split(/\s+/).filter(Boolean);
  const kv = [], text = [];
  tokens.forEach(t => {
    const m = t.match(/^(\w+):(.+)$/);
    if (m) kv.push([m[1].toLowerCase(), m[2].toLowerCase()]);
    else text.push(t.toLowerCase());
  });
  return { kv, text };
}

function match(row, q) {
  for (const [k,v] of q.kv) {
    const field = (row[k]||'').toString().toLowerCase();
    if (k === 'status' && (v === '5xx' || v === '4xx' || v === '2xx' || v === '3xx')) {
      if (!field.startsWith(v[0])) return false;
      continue;
    }
    if (!field.includes(v)) return false;
  }
  if (q.text.length) {
    const hay = (row.msg + ' ' + row.service + ' ' + row.level).toLowerCase();
    for (const t of q.text) if (!hay.includes(t)) return false;
  }
  return true;
}

function highlight(s, terms) {
  if (!terms.length) return s;
  const re = new RegExp('(' + terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|') + ')', 'gi');
  return s.replace(re, '<mark>$1</mark>');
}

function render() {
  const q = parse(qEl.value);
  const filtered = DATA.filter(r => match(r, q)).slice(0, 300);
  hitsEl.textContent = filtered.length;
  if (!filtered.length) {
    resEl.innerHTML = '<div class="empty">no matches — try loosening your filters</div>';
    return;
  }
  const terms = q.text;
  resEl.innerHTML = filtered.map(r =>
    `<div class="row">
      <span class="ts">${r.ts}</span>
      <span class="lvl ${r.level}">${r.level}</span>
      <span class="svc">${r.service}</span>
      <span class="msg">${highlight(r.msg, terms)}</span>
    </div>`
  ).join('');
}

qEl.addEventListener('input', render);
render();