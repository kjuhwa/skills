const machines = {
  'ab*c': {
    states: ['S0','S1','S2','ACCEPT','REJECT'],
    transitions: { S0:{a:'S1'}, S1:{b:'S2',c:'ACCEPT'}, S2:{b:'S2',c:'ACCEPT'} },
    start:'S0', accept:['ACCEPT']
  },
  '(01)+': {
    states: ['S0','S1','ACCEPT','REJECT'],
    transitions: { S0:{'0':'S1'}, S1:{'1':'ACCEPT'}, ACCEPT:{'0':'S1'} },
    start:'S0', accept:['ACCEPT']
  },
  'a(b|c)d': {
    states: ['S0','S1','S2','ACCEPT','REJECT'],
    transitions: { S0:{a:'S1'}, S1:{b:'S2',c:'S2'}, S2:{d:'ACCEPT'} },
    start:'S0', accept:['ACCEPT']
  }
};

const svg = document.getElementById('svg');
const tape = document.getElementById('tape');
const result = document.getElementById('result');
let timer = null;

function drawMachine(key, current) {
  const m = machines[key]; if (!m) return;
  const n = m.states.filter(s => s !== 'REJECT').length;
  svg.innerHTML = '';
  const positions = {};
  const filtered = m.states.filter(s => s !== 'REJECT');
  filtered.forEach((s, i) => { positions[s] = { x: 80 + i * (560 / (n - 1 || 1)), y: 110 }; });
  // draw transitions
  Object.entries(m.transitions).forEach(([from, map]) => {
    Object.entries(map).forEach(([ch, to]) => {
      if (!positions[from] || !positions[to]) return;
      const a = positions[from], b = positions[to];
      const isSelf = from === to;
      if (isSelf) {
        const p = document.createElementNS('http://www.w3.org/2000/svg','path');
        p.setAttribute('d', `M${a.x-15},${a.y-28} Q${a.x},${a.y-70} ${a.x+15},${a.y-28}`);
        p.setAttribute('fill','none'); p.setAttribute('stroke','#333'); p.setAttribute('stroke-width','1.2');
        p.setAttribute('marker-end','url(#ah)'); svg.appendChild(p);
      } else {
        const dy = (a.x < b.x) ? -12 : 12;
        const l = document.createElementNS('http://www.w3.org/2000/svg','line');
        l.setAttribute('x1',a.x+20); l.setAttribute('y1',a.y+dy);
        l.setAttribute('x2',b.x-20); l.setAttribute('y2',b.y+dy);
        l.setAttribute('stroke','#333'); l.setAttribute('stroke-width','1.2');
        l.setAttribute('marker-end','url(#ah)'); svg.appendChild(l);
      }
      const mx = isSelf ? a.x : (a.x + b.x)/2;
      const my = isSelf ? a.y - 72 : (a.y + b.y)/2 - 16;
      const t = document.createElementNS('http://www.w3.org/2000/svg','text');
      t.setAttribute('x',mx); t.setAttribute('y',my); t.setAttribute('text-anchor','middle');
      t.setAttribute('fill','#6ee7b7'); t.setAttribute('font-size','12'); t.textContent = ch;
      svg.appendChild(t);
    });
  });
  // arrowhead marker
  const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
  defs.innerHTML = '<marker id="ah" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#555"/></marker>';
  svg.prepend(defs);
  // draw states
  filtered.forEach(s => {
    const p = positions[s];
    const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx',p.x); c.setAttribute('cy',p.y); c.setAttribute('r',24);
    c.setAttribute('fill', s===current?'#6ee7b722':'#1a1d27');
    c.setAttribute('stroke', s===current?'#6ee7b7':'#444'); c.setAttribute('stroke-width', s===current?'2.5':'1');
    svg.appendChild(c);
    if (m.accept.includes(s)) {
      const c2 = document.createElementNS('http://www.w3.org/2000/svg','circle');
      c2.setAttribute('cx',p.x); c2.setAttribute('cy',p.y); c2.setAttribute('r',20);
      c2.setAttribute('fill','none'); c2.setAttribute('stroke', s===current?'#6ee7b7':'#444');
      svg.appendChild(c2);
    }
    const t = document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x',p.x); t.setAttribute('y',p.y+5); t.setAttribute('text-anchor','middle');
    t.setAttribute('fill', s===current?'#6ee7b7':'#888'); t.setAttribute('font-size','12');
    t.textContent = s; svg.appendChild(t);
  });
}

function run() {
  clearInterval(timer);
  const key = document.getElementById('pattern').value;
  const str = document.getElementById('input').value;
  const m = machines[key];
  tape.innerHTML = ''; result.textContent = '';
  str.split('').forEach(ch => {
    const d = document.createElement('div'); d.className = 'cell'; d.textContent = ch;
    tape.appendChild(d);
  });
  let state = m.start, idx = 0;
  const cells = tape.querySelectorAll('.cell');
  drawMachine(key, state);
  timer = setInterval(() => {
    if (idx > 0 && cells[idx-1]) cells[idx-1].classList.replace('active','done');
    if (idx >= str.length) {
      clearInterval(timer);
      const accepted = m.accept.includes(state);
      result.innerHTML = accepted ? '<span style="color:#6ee7b7">✓ ACCEPTED</span>' : '<span style="color:#f87171">✗ REJECTED</span>';
      return;
    }
    const ch = str[idx]; cells[idx].classList.add('active');
    const next = m.transitions[state] && m.transitions[state][ch];
    state = next || 'REJECT';
    drawMachine(key, state);
    if (state === 'REJECT') {
      clearInterval(timer);
      result.innerHTML = '<span style="color:#f87171">✗ REJECTED</span>';
    }
    idx++;
  }, 500);
}

document.getElementById('run').onclick = run;
drawMachine('ab*c', 'S0');