const state = { balance: 0, events: [], particles: [] };
const canvas = document.getElementById('bus');
const ctx = canvas.getContext('2d');

const commands = {
  deposit: { amt: 50, label: 'DEPOSIT' },
  withdraw: { amt: -20, label: 'WITHDRAW' },
  transfer: { amt: -10, label: 'TRANSFER' }
};

document.querySelectorAll('button[data-cmd]').forEach(btn => {
  btn.addEventListener('click', () => handleCommand(btn.dataset.cmd));
});

function handleCommand(cmd) {
  if (cmd === 'reset') {
    state.balance = 0;
    state.events = [];
    document.getElementById('command-log').innerHTML = '';
    document.getElementById('query-log').innerHTML = '';
    updateProjection('RESET');
    return;
  }
  const c = commands[cmd];
  const time = new Date().toLocaleTimeString();
  logCmd(`[${time}] ${c.label} ${c.amt > 0 ? '+' : ''}${c.amt}`);
  state.particles.push({ x: 20, y: 130, amt: c.amt, label: c.label, progress: 0 });
}

function updateProjection(op) {
  document.getElementById('balance').textContent = '$' + state.balance;
  document.getElementById('event-count').textContent = state.events.length;
  document.getElementById('last-op').textContent = op;
}

function logCmd(msg) {
  const li = document.createElement('li');
  li.textContent = msg;
  document.getElementById('command-log').prepend(li);
}
function logQuery(msg) {
  const li = document.createElement('li');
  li.textContent = msg;
  document.getElementById('query-log').prepend(li);
}

function draw() {
  ctx.fillStyle = '#0f1117';
  ctx.fillRect(0, 0, 400, 260);
  ctx.strokeStyle = '#262a36';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 130); ctx.lineTo(380, 130);
  ctx.stroke();
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(10, 120, 20, 20);
  ctx.fillStyle = '#6ee7b7';
  ctx.fillRect(370, 120, 20, 20);
  ctx.fillStyle = '#8a93a6';
  ctx.font = '10px monospace';
  ctx.fillText('CMD', 12, 115);
  ctx.fillText('PROJ', 365, 115);

  state.particles = state.particles.filter(p => {
    p.progress += 0.02;
    p.x = 20 + (360 * p.progress);
    ctx.fillStyle = p.amt > 0 ? '#6ee7b7' : '#ef4444';
    ctx.beginPath();
    ctx.arc(p.x, 130, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e6e8ef';
    ctx.font = '10px monospace';
    ctx.fillText(p.label, p.x - 20, 115);
    if (p.progress >= 1) {
      state.balance += p.amt;
      state.events.push(p);
      updateProjection(p.label);
      logQuery(`Projected ${p.label} → balance=$${state.balance}`);
      return false;
    }
    return true;
  });
  requestAnimationFrame(draw);
}
draw();
updateProjection('—');