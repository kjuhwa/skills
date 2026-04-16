const NODES = [
  { name: 'web-alpha',   ip: '10.0.1.11', region: 'us-east', base: 0.22 },
  { name: 'web-bravo',   ip: '10.0.1.12', region: 'us-east', base: 0.35 },
  { name: 'web-charlie', ip: '10.0.2.21', region: 'us-west', base: 0.48 },
  { name: 'api-delta',   ip: '10.0.3.31', region: 'eu-west', base: 0.61 },
  { name: 'api-echo',    ip: '10.0.3.32', region: 'eu-west', base: 0.29 },
  { name: 'api-foxtrot', ip: '10.0.4.41', region: 'ap-south',base: 0.55 },
  { name: 'cache-golf',  ip: '10.0.5.51', region: 'us-east', base: 0.18 },
  { name: 'cache-hotel', ip: '10.0.5.52', region: 'us-west', base: 0.40 },
];
NODES.forEach(n => {
  n.history = Array.from({ length: 30 }, () => n.base + (Math.random() - 0.5) * 0.2);
  n.status = 'ok';
  n.outUntil = 0;
});

const sumEl = document.getElementById('summary');
const fleetEl = document.getElementById('fleet');
const logEl = document.getElementById('log');
const tickEl = document.getElementById('lastTick');
const events = [];

function probe() {
  const now = Date.now();
  NODES.forEach(n => {
    if (Math.random() < 0.02 && n.outUntil < now) {
      n.outUntil = now + 4000 + Math.random() * 4000;
      events.push({ t: now, msg: `${n.name} failed probe — removed from pool` });
    }
    let load;
    if (n.outUntil > now) { load = 1.05; n.status = 'bad'; }
    else {
      load = Math.max(0, Math.min(1, n.base + (Math.random() - 0.5) * 0.3 + Math.sin(now / 4000 + n.base * 10) * 0.08));
      const prev = n.status;
      n.status = load > 0.85 ? 'warn' : 'ok';
      if (prev === 'bad' && n.status === 'ok') events.push({ t: now, msg: `${n.name} back online` });
      if (prev === 'ok' && n.status === 'warn') events.push({ t: now, msg: `${n.name} degraded (${(load*100).toFixed(0)}% load)` });
    }
    n.history.push(load);
    if (n.history.length > 30) n.history.shift();
    n.current = load;
  });
  tickEl.textContent = new Date(now).toLocaleTimeString();
  if (events.length > 50) events.splice(0, events.length - 50);
}

function spark(values) {
  const w = 150, h = 30;
  const pts = values.map((v, i) =>
    `${(i / (values.length - 1)) * w},${h - Math.min(1, v) * h}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${pts}" fill="none" stroke="#6ee7b7" stroke-width="1.5"/>
  </svg>`;
}

function render() {
  const ok = NODES.filter(n => n.status === 'ok').length;
  const warn = NODES.filter(n => n.status === 'warn').length;
  const bad = NODES.filter(n => n.status === 'bad').length;
  const avg = NODES.reduce((s, n) => s + (n.current || 0), 0) / NODES.length;
  sumEl.innerHTML = `
    <div class="sumCard"><h3>Healthy</h3><div class="v">${ok}</div></div>
    <div class="sumCard"><h3>Degraded</h3><div class="v">${warn}</div></div>
    <div class="sumCard"><h3>Out of pool</h3><div class="v">${bad}</div></div>
    <div class="sumCard"><h3>Fleet load</h3><div class="v">${(avg*100).toFixed(0)}%</div></div>`;
  fleetEl.innerHTML = NODES.map(n => `
    <div class="node ${n.status}">
      <div>
        <div class="name">${n.name}</div>
        <div class="ip">${n.ip} · ${n.region}</div>
      </div>
      <div class="pill ${n.status}">${n.status.toUpperCase()}</div>
      ${spark(n.history)}
      <div style="text-align:right;font-family:monospace;">${((n.current||0)*100).toFixed(0)}%</div>
    </div>`).join('');
  logEl.innerHTML = [...events].reverse().slice(0, 30).map(e =>
    `<li><b>${new Date(e.t).toLocaleTimeString()}</b> — ${e.msg}</li>`).join('');
}

probe(); render();
setInterval(() => { probe(); render(); }, 1200);