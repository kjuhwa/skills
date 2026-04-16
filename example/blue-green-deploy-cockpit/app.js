const state = {
  active: 'blue',
  versions: { blue: 'v1.4.2', green: 'v1.4.3' },
  pods: { blue: Array(8).fill('up'), green: Array(8).fill('up') },
  shift: 0
};

const $ = id => document.getElementById(id);
const log = [];

function logEvent(msg, color = '#6ee7b7') {
  const ts = new Date().toLocaleTimeString();
  log.unshift({ ts, msg, color });
  if (log.length > 30) log.pop();
  $('log').innerHTML = log.map(e =>
    `<li><span class="ts">${e.ts}</span><span style="color:${e.color}">${e.msg}</span></li>`
  ).join('');
}

function renderPods(env) {
  $('pods' + env[0].toUpperCase() + env.slice(1)).innerHTML =
    state.pods[env].map((s, i) => `<li class="${s}">p${i}</li>`).join('');
}

function render() {
  const greenPct = state.active === 'green' ? 100 - state.shift + state.shift : state.shift;
  const bluePct = state.active === 'blue' ? 100 - state.shift : 100 - state.shift;
  const b = state.active === 'blue' ? 100 - state.shift : state.shift;
  const g = 100 - b;
  $('barBlue').style.width = b + '%';
  $('barGreen').style.width = g + '%';
  $('verBlue').textContent = state.versions.blue;
  $('verGreen').textContent = state.versions.green;
  $('activeEnv').textContent = state.active.toUpperCase();
  $('envBlue').classList.toggle('active', b >= 50);
  $('envGreen').classList.toggle('active', g >= 50);
  $('healthBlue').textContent = state.pods.blue.every(p => p === 'up') ? 'healthy' : 'degraded';
  $('healthGreen').textContent = state.pods.green.every(p => p === 'up') ? 'healthy' : 'degraded';
  $('pctLabel').textContent = state.shift + '%';
  renderPods('blue');
  renderPods('green');
}

$('shift').addEventListener('input', e => {
  state.shift = +e.target.value;
  render();
});

$('promote').addEventListener('click', () => {
  const target = state.active === 'blue' ? 'green' : 'blue';
  logEvent(`Promoting ${target.toUpperCase()} to active`, '#6ee7b7');
  state.active = target;
  state.shift = 0;
  $('shift').value = 0;
  render();
});

$('rollback').addEventListener('click', () => {
  state.shift = 0;
  $('shift').value = 0;
  logEvent('Rollback: 100% traffic to ' + state.active.toUpperCase(), '#f87171');
  render();
});

$('deploy').addEventListener('click', () => {
  const target = state.active === 'blue' ? 'green' : 'blue';
  const cur = state.versions[target];
  const parts = cur.slice(1).split('.').map(Number);
  parts[2]++;
  state.versions[target] = 'v' + parts.join('.');
  state.pods[target] = state.pods[target].map(() => Math.random() < 0.1 ? 'down' : 'up');
  logEvent(`Deployed ${state.versions[target]} to ${target.toUpperCase()}`, '#60a5fa');
  render();
});

setInterval(() => {
  const env = Math.random() < 0.5 ? 'blue' : 'green';
  const idx = Math.floor(Math.random() * 8);
  state.pods[env][idx] = Math.random() < 0.95 ? 'up' : 'down';
  render();
}, 2000);

logEvent('Cockpit initialized. BLUE active.', '#6ee7b7');
render();