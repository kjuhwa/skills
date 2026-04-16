const state = {
  nextId: 1,
  outbox: [],
  polling: true,
  brokerUp: true,
  inFlight: [],
};

const serviceLog = document.getElementById('serviceLog');
const outboxBody = document.querySelector('#outboxTable tbody');
const consumerLog = document.getElementById('consumerLog');
const brokerStatus = document.getElementById('brokerStatus');
const canvas = document.getElementById('brokerCanvas');
const ctx = canvas.getContext('2d');

const EVENT_TYPES = ['OrderPlaced', 'PaymentCaptured', 'ItemShipped', 'UserSignedUp'];

function log(container, text) {
  const li = document.createElement('li');
  li.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  container.prepend(li);
  while (container.children.length > 12) container.removeChild(container.lastChild);
}

function createOrder() {
  const id = state.nextId++;
  const event = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
  log(serviceLog, `TX: INSERT order #${id}, outbox(${event})`);
  state.outbox.push({ id, event, status: 'pending', tries: 0, x: 0 });
  render();
}

function render() {
  outboxBody.innerHTML = '';
  state.outbox.slice(-10).forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${row.id}</td><td>${row.event}</td>
      <td class="${row.status}">${row.status}</td><td>${row.tries}</td>`;
    outboxBody.appendChild(tr);
  });
}

function pollRelay() {
  if (!state.polling) return;
  const pending = state.outbox.find(r => r.status === 'pending');
  if (!pending) return;
  pending.status = 'sending';
  pending.tries++;
  state.inFlight.push({ ...pending, progress: 0 });
  render();
}

function drawBroker() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = state.brokerUp ? '#6ee7b7' : '#f87171';
  ctx.globalAlpha = 0.15;
  ctx.fillRect(0, 110, canvas.width, 40);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = state.brokerUp ? '#6ee7b7' : '#f87171';
  ctx.strokeRect(0, 110, canvas.width, 40);

  state.inFlight = state.inFlight.filter(m => {
    m.progress += 0.015;
    const x = m.progress * canvas.width;
    ctx.fillStyle = '#6ee7b7';
    ctx.beginPath();
    ctx.arc(x, 130, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f1117';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('#' + m.id, x, 134);

    if (m.progress >= 1) {
      const record = state.outbox.find(r => r.id === m.id);
      if (state.brokerUp) {
        record.status = 'sent';
        log(consumerLog, `✔ received ${m.event}#${m.id}`);
      } else {
        record.status = 'failed';
        setTimeout(() => { if (record.status === 'failed') record.status = 'pending'; render(); }, 1500);
      }
      render();
      return false;
    }
    return true;
  });
  requestAnimationFrame(drawBroker);
}

document.getElementById('addOrder').onclick = createOrder;
document.getElementById('togglePoll').onclick = e => {
  state.polling = !state.polling;
  e.target.textContent = state.polling ? 'Pause Relay' : 'Resume Relay';
};
document.getElementById('failBroker').onclick = () => {
  state.brokerUp = !state.brokerUp;
  brokerStatus.textContent = 'broker: ' + (state.brokerUp ? 'online' : 'DOWN');
  brokerStatus.className = state.brokerUp ? 'ok' : 'fault';
};

for (let i = 0; i < 3; i++) createOrder();
setInterval(pollRelay, 900);
setInterval(() => { if (Math.random() < 0.2) createOrder(); }, 3500);
drawBroker();