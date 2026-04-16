const clientDefs = [
  { id: 'c1', name: 'Mobile App',    ip: '10.0.1.14' },
  { id: 'c2', name: 'Partner API',   ip: '203.0.113.9' },
  { id: 'c3', name: 'Web Dashboard', ip: '10.0.2.21' },
  { id: 'c4', name: 'Legacy Batch',  ip: '10.0.9.77' },
];

let capacity = +document.getElementById('cap').value;
let refillPerSec = +document.getElementById('refill').value;
const clients = clientDefs.map(c => ({ ...c, tokens: capacity, log: [] }));
let accepted = 0, rejected = 0;
const rpsWindow = [];

function render() {
  const host = document.getElementById('clients');
  host.innerHTML = clients.map(c => {
    const tokens = Array.from({ length: capacity }, (_, i) =>
      `<div class="token ${i < c.tokens ? '' : 'empty'}"></div>`).join('');
    const blocked = c.tokens <= 0 ? 'blocked' : '';
    const logHtml = c.log.slice(0, 6).map(l =>
      `<div class="${l.cls}">${l.t}</div>`).join('');
    return `
      <div class="client">
        <h3>${c.name}</h3>
        <div class="ip">${c.ip}</div>
        <div class="bucket">${tokens}</div>
        <button class="fire ${blocked}" data-id="${c.id}">
          ${blocked ? 'BLOCKED 429' : 'Send Request'}
        </button>
        <div class="log">${logHtml}</div>
      </div>`;
  }).join('');
  host.querySelectorAll('button').forEach(b =>
    b.onclick = () => fire(b.dataset.id));
}

function fire(id) {
  const c = clients.find(x => x.id === id);
  const ts = new Date().toLocaleTimeString();
  if (c.tokens > 0) {
    c.tokens--;
    c.log.unshift({ t: `[${ts}] 200 OK`, cls: 'ok' });
    accepted++;
  } else {
    c.log.unshift({ t: `[${ts}] 429 Too Many`, cls: 'no' });
    rejected++;
  }
  rpsWindow.push(Date.now());
  if (c.log.length > 6) c.log.pop();
  updateStats();
  render();
}

function updateStats() {
  document.getElementById('acc').textContent = accepted;
  document.getElementById('rej').textContent = rejected;
  const cutoff = Date.now() - 1000;
  while (rpsWindow.length && rpsWindow[0] < cutoff) rpsWindow.shift();
  document.getElementById('rps').textContent = rpsWindow.length;
}

setInterval(() => {
  clients.forEach(c => { c.tokens = Math.min(capacity, c.tokens + refillPerSec / 4); });
  render();
}, 250);

setInterval(() => {
  const pick = clients[Math.floor(Math.random() * clients.length)];
  if (Math.random() < 0.4) fire(pick.id);
  updateStats();
}, 600);

document.getElementById('cap').oninput = e => {
  capacity = +e.target.value;
  document.getElementById('capV').textContent = capacity;
  clients.forEach(c => c.tokens = Math.min(c.tokens, capacity));
  render();
};
document.getElementById('refill').oninput = e => {
  refillPerSec = +e.target.value;
  document.getElementById('refV').textContent = refillPerSec;
};
document.getElementById('resetBtn').onclick = () => {
  clients.forEach(c => { c.tokens = capacity; c.log = []; });
  accepted = rejected = 0;
  updateStats();
  render();
};

render();
updateStats();