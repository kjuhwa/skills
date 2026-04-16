const services = [
  { id: 'api', name: 'API Gateway', latency: 12, errors: 0, rpm: 4200 },
  { id: 'auth', name: 'Auth Service', latency: 8, errors: 0, rpm: 3100 },
  { id: 'orders', name: 'Order Service', latency: 22, errors: 0, rpm: 1800 },
  { id: 'pay', name: 'Payments', latency: 45, errors: 0, rpm: 950 },
  { id: 'inv', name: 'Inventory', latency: 15, errors: 0, rpm: 2200 },
  { id: 'cache', name: 'Redis Cache', latency: 2, errors: 0, rpm: 8800 },
  { id: 'db', name: 'PostgreSQL', latency: 5, errors: 0, rpm: 6200 },
  { id: 'notify', name: 'Notifications', latency: 30, errors: 0, rpm: 600 },
];

const grid = document.getElementById('grid');
const logInner = document.getElementById('log-inner');
const btn = document.getElementById('toggle');
let running = false, interval;

function render() {
  grid.innerHTML = '';
  services.forEach(s => {
    const cls = s.errors > 20 ? 'fail' : s.errors > 5 ? 'warn' : '';
    const vcls = s.latency > 200 ? 'fail' : s.latency > 80 ? 'warn' : 'ok';
    grid.innerHTML += `<div class="card ${cls}"><h3>${s.name}</h3><div class="val ${vcls}">${s.latency}ms</div><div style="font-size:0.7rem;color:#64748b;margin-top:6px">${s.rpm} rpm · ${s.errors} err</div></div>`;
  });
}

function log(msg, type) {
  const t = new Date().toLocaleTimeString();
  logInner.innerHTML = `<div class="log-line ${type}"><span class="ts">[${t}]</span> ${msg}</div>` + logInner.innerHTML;
  if (logInner.children.length > 50) logInner.lastChild.remove();
}

function tick() {
  const target = services[Math.floor(Math.random() * services.length)];
  const action = Math.random();
  if (action < 0.3) {
    const spike = Math.floor(Math.random() * 400) + 100;
    target.latency = spike;
    log(`⚡ Injected latency spike → ${target.name} (${spike}ms)`, 'err');
  } else if (action < 0.55) {
    const errs = Math.floor(Math.random() * 30) + 5;
    target.errors += errs;
    log(`💀 Injected ${errs} errors → ${target.name}`, 'err');
  } else if (action < 0.7) {
    target.rpm = Math.floor(target.rpm * 0.3);
    log(`🔌 Throttled traffic → ${target.name}`, 'err');
  } else {
    target.latency = Math.max(2, target.latency - Math.floor(Math.random() * 30));
    target.errors = Math.max(0, target.errors - Math.floor(Math.random() * 10));
    log(`✅ ${target.name} recovering`, 'ok');
  }
  render();
}

btn.onclick = () => {
  running = !running;
  btn.textContent = running ? '⏸ Stop Chaos' : '▶ Start Chaos';
  btn.classList.toggle('active', running);
  if (running) { log('🐒 Chaos Monkey unleashed!', 'err'); interval = setInterval(tick, 1200); }
  else { clearInterval(interval); log('🛑 Chaos stopped', 'ok'); }
};
render();