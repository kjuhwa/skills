const releases = [
  { id: 'r1', ver: 'v1.6.0', slot: 'blue',  status: 'ok',    time: '09:04', author: 'alice', notes: 'Initial rollout' },
  { id: 'r2', ver: 'v1.6.1', slot: 'green', status: 'ok',    time: '11:22', author: 'bob',   notes: 'Patch bug in auth' },
  { id: 'r3', ver: 'v1.7.0', slot: 'blue',  status: 'warn',  time: '14:40', author: 'carol', notes: 'Slow DB queries on release' },
  { id: 'r4', ver: 'v1.7.1', slot: 'green', status: 'ok',    time: '16:05', author: 'dan',   notes: 'Hotfix queries, promoted live' },
  { id: 'r5', ver: 'v1.8.0', slot: 'blue',  status: 'fail',  time: '18:18', author: 'eve',   notes: 'Rolled back: memory leak' },
  { id: 'r6', ver: 'v1.8.2', slot: 'blue',  status: 'ok',    time: '20:31', author: 'frank', notes: 'Stable production build' },
  { id: 'r7', ver: 'v1.9.0', slot: 'green', status: 'ok',    time: '22:12', author: 'grace', notes: 'Feature: new dashboard' }
];

let liveSlot = 'blue', live = 'v1.8.2', idle = 'v1.9.0';
let selected = null;

const svg = document.getElementById('timeline');
const detail = document.getElementById('detail');

function colorFor(s, slot) {
  if (s === 'fail') return '#f87171';
  if (s === 'warn') return '#fbbf24';
  return slot === 'blue' ? '#60a5fa' : '#6ee7b7';
}

function render() {
  svg.innerHTML = '';
  const w = 760, pad = 60;
  const step = (w - pad * 2) / (releases.length - 1);

  const axisBlue = 130, axisGreen = 290;
  const mkLine = (y, c) => {
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', pad); l.setAttribute('x2', w - pad);
    l.setAttribute('y1', y); l.setAttribute('y2', y);
    l.setAttribute('stroke', c); l.setAttribute('stroke-width', 2);
    l.setAttribute('stroke-dasharray', '4 4');
    svg.appendChild(l);
  };
  mkLine(axisBlue, '#60a5fa33');
  mkLine(axisGreen, '#6ee7b733');

  const lblBlue = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  lblBlue.setAttribute('x', 10); lblBlue.setAttribute('y', axisBlue + 5);
  lblBlue.setAttribute('fill', '#60a5fa'); lblBlue.setAttribute('font-size', '12');
  lblBlue.textContent = 'BLUE'; svg.appendChild(lblBlue);

  const lblGreen = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  lblGreen.setAttribute('x', 10); lblGreen.setAttribute('y', axisGreen + 5);
  lblGreen.setAttribute('fill', '#6ee7b7'); lblGreen.setAttribute('font-size', '12');
  lblGreen.textContent = 'GREEN'; svg.appendChild(lblGreen);

  releases.forEach((r, i) => {
    const x = pad + step * i;
    const y = r.slot === 'blue' ? axisBlue : axisGreen;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'node');
    g.addEventListener('click', () => select(r));

    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 10);
    c.setAttribute('fill', colorFor(r.status, r.slot));
    c.setAttribute('stroke', selected?.id === r.id ? '#fff' : '#1a1d27');
    c.setAttribute('stroke-width', selected?.id === r.id ? 3 : 2);
    g.appendChild(c);

    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', x); t.setAttribute('y', y - 18);
    t.setAttribute('fill', '#e7e9ee'); t.setAttribute('font-size', '11');
    t.setAttribute('text-anchor', 'middle'); t.textContent = r.ver;
    g.appendChild(t);

    const tm = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tm.setAttribute('x', x); tm.setAttribute('y', y + 26);
    tm.setAttribute('fill', '#8a93a6'); tm.setAttribute('font-size', '10');
    tm.setAttribute('text-anchor', 'middle'); tm.textContent = r.time;
    g.appendChild(tm);

    if ((r.slot === liveSlot && r.ver === live)) {
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', x); ring.setAttribute('cy', y); ring.setAttribute('r', 16);
      ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#fff');
      ring.setAttribute('stroke-dasharray', '2 3'); ring.setAttribute('opacity', '.6');
      g.appendChild(ring);
    }
    svg.appendChild(g);
  });

  document.getElementById('liveVer').textContent = live;
  document.getElementById('idleVer').textContent = idle;
  document.getElementById('liveSlot').textContent = liveSlot.toUpperCase();
  document.getElementById('idleSlot').textContent = (liveSlot === 'blue' ? 'GREEN' : 'BLUE');
  document.getElementById('liveSlot').className = 'slot' + (liveSlot === 'green' ? '' : ' alt').replace(' alt',' ');
  document.getElementById('liveSlot').style.background = liveSlot === 'blue' ? '#60a5fa' : '#6ee7b7';
  document.getElementById('idleSlot').style.background = liveSlot === 'blue' ? '#6ee7b7' : '#60a5fa';
}

function select(r) {
  selected = r;
  detail.innerHTML = `<b>${r.ver}</b>  [${r.slot.toUpperCase()}]\nstatus:  ${r.status}\nauthor:  ${r.author}\ntime:    ${r.time}\nnotes:   ${r.notes}`;
  render();
}

document.getElementById('promote').addEventListener('click', () => {
  [live, idle] = [idle, live];
  liveSlot = liveSlot === 'blue' ? 'green' : 'blue';
  render();
});
document.getElementById('rollback').addEventListener('click', () => {
  [live, idle] = [idle, live];
  liveSlot = liveSlot === 'blue' ? 'green' : 'blue';
  detail.innerHTML = `<b>ROLLBACK triggered</b>\nLive traffic reverted to ${live}`;
  render();
});

render();