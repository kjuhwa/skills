const svg = document.getElementById('timeline');
const scrubber = document.getElementById('scrubber');
const lsnLabel = document.getElementById('lsnLabel');
const evLabel = document.getElementById('evLabel');
const playBtn = document.getElementById('playBtn');
const tbody = document.querySelector('#stateTable tbody');

const NAMES = ['Ada', 'Linus', 'Grace', 'Alan', 'Ken', 'Dennis', 'Margaret', 'Donald', 'Barbara', 'Edsger'];
const events = [];
let lsn = 10000;
for (let i = 0; i < 50; i++) {
  const r = Math.random();
  let op;
  if (i < 5) op = 'INSERT';
  else if (r < 0.6) op = 'UPDATE';
  else if (r < 0.85) op = 'INSERT';
  else op = 'DELETE';
  const id = op === 'INSERT' ? i + 1 : Math.max(1, Math.floor(Math.random() * Math.min(i + 1, 8)));
  const name = NAMES[id % NAMES.length];
  const email = `${name.toLowerCase()}@ex.io`;
  const balance = Math.floor(Math.random() * 9000) + 100;
  events.push({ lsn: lsn + i * 7, op, id, name, email, balance });
}

const colors = { INSERT: '#6ee7b7', UPDATE: '#fbbf24', DELETE: '#f87171' };

function renderTimeline() {
  svg.innerHTML = '';
  const ns = 'http://www.w3.org/2000/svg';
  const axis = document.createElementNS(ns, 'line');
  axis.setAttribute('x1', 20); axis.setAttribute('x2', 980);
  axis.setAttribute('y1', 60); axis.setAttribute('y2', 60);
  axis.setAttribute('stroke', '#2a2e3b'); axis.setAttribute('stroke-width', 2);
  svg.appendChild(axis);

  events.forEach((e, i) => {
    const cx = 20 + (i / (events.length - 1)) * 960;
    const cy = 60 + (e.op === 'INSERT' ? -20 : e.op === 'DELETE' ? 20 : 0);
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy);
    c.setAttribute('r', i === parseInt(scrubber.value) ? 7 : 5);
    c.setAttribute('fill', colors[e.op]);
    c.setAttribute('class', 'event-dot');
    c.setAttribute('opacity', i <= parseInt(scrubber.value) ? 1 : 0.25);
    c.addEventListener('click', () => { scrubber.value = i; applyScrubber(); });
    svg.appendChild(c);
  });

  const cursor = document.createElementNS(ns, 'line');
  const cx = 20 + (parseInt(scrubber.value) / (events.length - 1)) * 960;
  cursor.setAttribute('x1', cx); cursor.setAttribute('x2', cx);
  cursor.setAttribute('y1', 15); cursor.setAttribute('y2', 105);
  cursor.setAttribute('stroke', '#6ee7b7');
  cursor.setAttribute('stroke-width', 1);
  cursor.setAttribute('stroke-dasharray', '3,3');
  svg.appendChild(cursor);
}

function materialize(uptoIdx) {
  const state = new Map();
  const lastTouched = new Set();
  for (let i = 0; i <= uptoIdx; i++) {
    const e = events[i];
    if (e.op === 'DELETE') state.delete(e.id);
    else state.set(e.id, { id: e.id, name: e.name, email: e.email, balance: e.balance });
    if (i === uptoIdx) lastTouched.add(e.id);
  }
  return { rows: [...state.values()].sort((a, b) => a.id - b.id), lastTouched };
}

function applyScrubber() {
  const idx = parseInt(scrubber.value);
  const e = events[idx];
  lsnLabel.textContent = e.lsn;
  evLabel.textContent = `${e.op} id=${e.id}`;
  const { rows, lastTouched } = materialize(idx);
  tbody.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');
    if (lastTouched.has(r.id)) tr.classList.add('highlight');
    tr.innerHTML = `<td>${r.id}</td><td>${r.name}</td><td>${r.email}</td><td>$${r.balance}</td>`;
    tbody.appendChild(tr);
  });
  renderTimeline();
}

let playing = false;
playBtn.onclick = () => {
  if (playing) { playing = false; playBtn.textContent = '▶ Play'; return; }
  playing = true; playBtn.textContent = '⏸ Pause';
  const step = () => {
    if (!playing) return;
    let v = parseInt(scrubber.value);
    if (v >= events.length - 1) { playing = false; playBtn.textContent = '▶ Play'; return; }
    scrubber.value = v + 1;
    applyScrubber();
    setTimeout(step, 250);
  };
  step();
};

scrubber.addEventListener('input', applyScrubber);
applyScrubber();