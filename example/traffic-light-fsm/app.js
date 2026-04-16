const machine = {
  states: {
    RED: { next: 'GREEN', duration: 5000 },
    GREEN: { next: 'YELLOW', duration: 4000 },
    YELLOW: { next: 'RED', duration: 2000 }
  },
  current: 'RED',
  elapsed: 0,
  running: true
};

const lights = document.querySelectorAll('.light');
const stateName = document.getElementById('stateName');
const ring = document.getElementById('ring');
const timerText = document.getElementById('timerText');
const logList = document.getElementById('logList');
const toggleBtn = document.getElementById('toggleBtn');
const RING_LEN = 339.3;

function render() {
  lights.forEach(l => l.classList.toggle('active', l.dataset.light === machine.current.toLowerCase()));
  stateName.textContent = machine.current;
  const state = machine.states[machine.current];
  const progress = machine.elapsed / state.duration;
  ring.style.strokeDashoffset = RING_LEN * progress;
  timerText.textContent = ((state.duration - machine.elapsed) / 1000).toFixed(1) + 's';
}

function log(msg) {
  const ts = new Date().toLocaleTimeString();
  const li = document.createElement('li');
  li.innerHTML = `<span class="ts">[${ts}]</span> ${msg}`;
  logList.prepend(li);
  while (logList.children.length > 20) logList.lastChild.remove();
}

function transition() {
  const prev = machine.current;
  machine.current = machine.states[prev].next;
  machine.elapsed = 0;
  log(`${prev} → ${machine.current}`);
  render();
}

let last = performance.now();
function tick(now) {
  const dt = now - last;
  last = now;
  if (machine.running) {
    machine.elapsed += dt;
    if (machine.elapsed >= machine.states[machine.current].duration) transition();
    render();
  }
  requestAnimationFrame(tick);
}

toggleBtn.onclick = () => {
  machine.running = !machine.running;
  toggleBtn.textContent = machine.running ? 'Pause' : 'Resume';
  log(machine.running ? 'Resumed' : 'Paused');
};
document.getElementById('stepBtn').onclick = () => { transition(); };
document.getElementById('resetBtn').onclick = () => {
  machine.current = 'RED'; machine.elapsed = 0; log('Reset'); render();
};

log('Machine started');
render();
requestAnimationFrame(tick);