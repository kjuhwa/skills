const machines = {
  'ab*c': {
    states: ['q0', 'q1', 'q2', 'qD'],
    accept: ['q2'],
    layout: { q0: [100, 180], q1: [280, 180], q2: [460, 180], qD: [280, 320] },
    transitions: {
      q0: { a: 'q1' },
      q1: { b: 'q1', c: 'q2' },
      q2: {},
      qD: {}
    }
  },
  '(hi|bye)': {
    states: ['q0', 'q1', 'q2', 'q3', 'q4', 'qA', 'qD'],
    accept: ['qA'],
    layout: { q0: [80, 180], q1: [220, 100], q2: [380, 100], q3: [220, 260], q4: [330, 260], qA: [560, 180], qD: [380, 320] },
    transitions: {
      q0: { h: 'q1', b: 'q3' },
      q1: { i: 'qA' },
      q2: {}, q3: { y: 'q4' },
      q4: { e: 'qA' },
      qA: {}, qD: {}
    }
  },
  'a+b': {
    states: ['q0', 'q1', 'q2', 'qD'],
    accept: ['q2'],
    layout: { q0: [120, 180], q1: [320, 180], q2: [520, 180], qD: [320, 320] },
    transitions: {
      q0: { a: 'q1' },
      q1: { a: 'q1', b: 'q2' },
      q2: {}, qD: {}
    }
  }
};

let machine, input, pos, current, running, timer;
const svg = document.getElementById('graph');
const tape = document.getElementById('tape');
const result = document.getElementById('result');
const trace = document.getElementById('trace');

function load(key) {
  machine = machines[key];
  reset();
}

function reset() {
  input = document.getElementById('inputStr').value;
  pos = 0; current = 'q0'; running = false;
  clearInterval(timer);
  result.className = 'result';
  result.textContent = 'Ready';
  trace.innerHTML = '';
  renderGraph(); renderTape();
}

function renderGraph() {
  svg.innerHTML = '';
  const ns = 'http://www.w3.org/2000/svg';
  const defs = document.createElementNS(ns, 'defs');
  defs.innerHTML = `<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#6ee7b7"/></marker>`;
  svg.appendChild(defs);

  Object.entries(machine.transitions).forEach(([from, trans]) => {
    Object.entries(trans).forEach(([ch, to]) => {
      const [x1, y1] = machine.layout[from];
      const [x2, y2] = machine.layout[to];
      const line = document.createElementNS(ns, 'path');
      if (from === to) {
        line.setAttribute('d', `M ${x1-15} ${y1-28} Q ${x1} ${y1-60} ${x1+15} ${y1-28}`);
      } else {
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        const ux = dx/len, uy = dy/len;
        line.setAttribute('d', `M ${x1+ux*28} ${y1+uy*28} L ${x2-ux*32} ${y2-uy*32}`);
      }
      line.setAttribute('stroke', '#6ee7b7');
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke-width', 2);
      line.setAttribute('marker-end', 'url(#arrow)');
      svg.appendChild(line);
      const label = document.createElementNS(ns, 'text');
      const mx = from === to ? x1 : (x1+x2)/2;
      const my = from === to ? y1-55 : (y1+y2)/2 - 8;
      label.setAttribute('x', mx); label.setAttribute('y', my);
      label.setAttribute('fill', '#fbbf24');
      label.setAttribute('font-family', 'monospace');
      label.setAttribute('font-size', '14');
      label.setAttribute('text-anchor', 'middle');
      label.textContent = ch;
      svg.appendChild(label);
    });
  });

  machine.states.forEach(s => {
    const [x, y] = machine.layout[s];
    const isCurrent = s === current;
    const isAccept = machine.accept.includes(s);
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', x); circle.setAttribute('cy', y);
    circle.setAttribute('r', 26);
    circle.setAttribute('fill', isCurrent ? '#6ee7b7' : '#1a1d27');
    circle.setAttribute('stroke', isAccept ? '#fbbf24' : (isCurrent ? '#6ee7b7' : '#2d3142'));
    circle.setAttribute('stroke-width', 2);
    svg.appendChild(circle);
    if (isAccept) {
      const inner = document.createElementNS(ns, 'circle');
      inner.setAttribute('cx', x); inner.setAttribute('cy', y);
      inner.setAttribute('r', 20);
      inner.setAttribute('fill', 'none');
      inner.setAttribute('stroke', '#fbbf24');
      inner.setAttribute('stroke-width', 1.5);
      svg.appendChild(inner);
    }
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', x); text.setAttribute('y', y + 5);
    text.setAttribute('fill', isCurrent ? '#0f1117' : '#e4e6eb');
    text.setAttribute('font-family', 'monospace');
    text.setAttribute('font-size', '13');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-weight', 'bold');
    text.textContent = s;
    svg.appendChild(text);
  });
}

function renderTape() {
  tape.innerHTML = '';
  [...input].forEach((ch, i) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (i < pos) cell.classList.add('consumed');
    if (i === pos) cell.classList.add('current');
    cell.textContent = ch;
    tape.appendChild(cell);
  });
}

function addTrace(msg) {
  const li = document.createElement('li');
  li.innerHTML = msg;
  trace.prepend(li);
}

function step() {
  if (pos >= input.length) {
    const accepted = machine.accept.includes(current);
    result.className = 'result ' + (accepted ? 'accept' : 'reject');
    result.textContent = accepted ? '✓ ACCEPTED' : '✗ REJECTED';
    addTrace(`<span class="arrow">→</span> End of input, state = ${current}`);
    clearInterval(timer); running = false;
    return false;
  }
  const ch = input[pos];
  const next = machine.transitions[current]?.[ch];
  if (next) {
    addTrace(`${current} <span class="arrow">--${ch}--></span> ${next}`);
    current = next;
  } else {
    addTrace(`${current} --${ch}--> ✗ dead`);
    current = 'qD';
    pos = input.length - 1;
  }
  pos++;
  renderGraph(); renderTape();
  return true;
}

document.getElementById('patternSelect').onchange = e => load(e.target.value);
document.getElementById('inputStr').oninput = reset;
document.getElementById('stepBtn').onclick = step;
document.getElementById('resetBtn').onclick = reset;
document.getElementById('runBtn').onclick = () => {
  if (running) return;
  running = true;
  timer = setInterval(() => { if (!step()) clearInterval(timer); }, 500);
};

load('ab*c');