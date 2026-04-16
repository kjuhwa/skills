const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const log = document.getElementById('log');

const steps = [
  { name: 'Order', comp: 'Cancel Order' },
  { name: 'Payment', comp: 'Refund Payment' },
  { name: 'Inventory', comp: 'Release Stock' },
  { name: 'Shipping', comp: 'Cancel Shipment' },
  { name: 'Notify', comp: 'Send Cancel Notice' }
];

let state = steps.map(() => 'pending');
let running = false;
let failAt = -1;

function drawNode(x, y, label, status) {
  const colors = {
    pending: '#353a4d',
    active: '#ffd36e',
    success: '#6ee7b7',
    failed: '#ff7a90',
    compensated: '#b794f6'
  };
  ctx.fillStyle = colors[status];
  ctx.strokeStyle = colors[status];
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f1117';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + 4);
}

function drawArrow(x1, y1, x2, y2, active) {
  ctx.strokeStyle = active ? '#6ee7b7' : '#353a4d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1 + 34, y1);
  ctx.lineTo(x2 - 34, y2);
  ctx.stroke();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(x2 - 34, y2);
  ctx.lineTo(x2 - 42, y2 - 5);
  ctx.lineTo(x2 - 42, y2 + 5);
  ctx.closePath();
  ctx.fill();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const y = 140;
  const spacing = 170;
  const startX = 90;
  for (let i = 0; i < steps.length - 1; i++) {
    drawArrow(startX + i * spacing, y, startX + (i + 1) * spacing, y,
      state[i] === 'success' || state[i] === 'compensated');
  }
  steps.forEach((s, i) => {
    drawNode(startX + i * spacing, y, s.name, state[i]);
  });
}

function addLog(msg, cls = '') {
  const div = document.createElement('div');
  div.className = cls;
  div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  log.prepend(div);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runSaga() {
  if (running) return;
  running = true;
  state = steps.map(() => 'pending');
  log.innerHTML = '';
  addLog('Saga started', 'ok');

  let failed = -1;
  for (let i = 0; i < steps.length; i++) {
    state[i] = 'active';
    render();
    addLog(`Executing: ${steps[i].name}...`);
    await sleep(700);
    if (i === failAt) {
      state[i] = 'failed';
      addLog(`FAILED at ${steps[i].name}`, 'err');
      failed = i;
      render();
      break;
    }
    state[i] = 'success';
    addLog(`Completed: ${steps[i].name}`, 'ok');
    render();
  }

  if (failed >= 0) {
    addLog('Starting compensation...', 'comp');
    for (let i = failed - 1; i >= 0; i--) {
      await sleep(600);
      state[i] = 'compensated';
      addLog(`Compensating: ${steps[i].comp}`, 'comp');
      render();
    }
    addLog('Saga rolled back', 'comp');
  } else {
    addLog('Saga committed successfully', 'ok');
  }
  failAt = -1;
  running = false;
}

document.getElementById('run').onclick = runSaga;
document.getElementById('fail').onclick = () => {
  failAt = parseInt(document.getElementById('failStep').value);
  runSaga();
};
document.getElementById('reset').onclick = () => {
  state = steps.map(() => 'pending');
  log.innerHTML = '';
  render();
};

render();