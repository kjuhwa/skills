const owners = ['Ada', 'Linus', 'Grace', 'Alan', 'Dennis', 'Margaret'];
let accounts = [];
let events = [];
let particles = [];

const logEl = document.getElementById('event-log');
const tbody = document.querySelector('#accounts tbody');
const canvas = document.getElementById('bus');
const ctx = canvas.getContext('2d');

function uid() { return 'A' + Math.floor(Math.random() * 900 + 100); }

function append(event) {
  events.push(event);
  const li = document.createElement('li');
  li.textContent = `${event.type} → ${JSON.stringify(event.payload)}`;
  logEl.prepend(li);
  while (logEl.children.length > 40) logEl.lastChild.remove();
  particles.push({ y: 0, label: event.type, color: '#6ee7b7' });
  project(event);
}

function project(e) {
  switch (e.type) {
    case 'AccountCreated':
      accounts.push({ id: e.payload.id, owner: e.payload.owner, balance: 0, status: 'open' });
      break;
    case 'Deposited': {
      const a = accounts.find(a => a.id === e.payload.id);
      if (a) a.balance += e.payload.amount;
      break;
    }
    case 'Withdrawn': {
      const a = accounts.find(a => a.id === e.payload.id);
      if (a) a.balance -= e.payload.amount;
      break;
    }
    case 'AccountClosed': {
      const a = accounts.find(a => a.id === e.payload.id);
      if (a) a.status = 'closed';
      break;
    }
  }
  render();
}

function render() {
  tbody.innerHTML = '';
  accounts.forEach(a => {
    const tr = document.createElement('tr');
    tr.className = 'flash';
    tr.innerHTML = `<td>${a.id}</td><td>${a.owner}</td><td>$${a.balance}</td><td class="status-${a.status}">${a.status}</td>`;
    tbody.appendChild(tr);
  });
}

function handle(cmd) {
  if (cmd === 'CreateAccount') {
    append({ type: 'AccountCreated', payload: { id: uid(), owner: owners[Math.floor(Math.random() * owners.length)] } });
  } else {
    const open = accounts.filter(a => a.status === 'open');
    if (!open.length) return;
    const target = open[Math.floor(Math.random() * open.length)];
    if (cmd === 'Deposit') append({ type: 'Deposited', payload: { id: target.id, amount: Math.floor(Math.random() * 500 + 50) } });
    if (cmd === 'Withdraw' && target.balance > 20) append({ type: 'Withdrawn', payload: { id: target.id, amount: Math.floor(Math.random() * Math.min(target.balance, 200)) } });
    if (cmd === 'CloseAccount') append({ type: 'AccountClosed', payload: { id: target.id } });
  }
}

document.querySelectorAll('.cmd-buttons button').forEach(b =>
  b.addEventListener('click', () => handle(b.dataset.cmd))
);

function animate() {
  ctx.clearRect(0, 0, 220, 480);
  ctx.strokeStyle = '#6ee7b7';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(110, 0); ctx.lineTo(110, 480); ctx.stroke();
  particles = particles.filter(p => p.y < 480);
  particles.forEach(p => {
    p.y += 2;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(110, p.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '10px monospace';
    ctx.fillText(p.label, 10, p.y + 3);
  });
  requestAnimationFrame(animate);
}
animate();

['CreateAccount', 'CreateAccount', 'CreateAccount', 'Deposit', 'Deposit'].forEach((c, i) =>
  setTimeout(() => handle(c), i * 300)
);