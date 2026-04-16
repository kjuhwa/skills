const svg = document.getElementById('net');
const bar = document.getElementById('status-bar');
const N = 5, R = 140, CX = 300, CY = 210;
const ST = { F: 'follower', C: 'candidate', L: 'leader', D: 'dead' };
const COL = { follower: '#94a3b8', candidate: '#fbbf24', leader: '#6ee7b7', dead: '#ef4444' };

let nodes = [], links = [], packets = [], term = 0;

function initPositions() {
  return Array.from({ length: N }, (_, i) => {
    const a = (Math.PI * 2 * i) / N - Math.PI / 2;
    return { id: i, x: CX + R * Math.cos(a), y: CY + R * Math.sin(a), state: ST.F, timer: 80 + Math.random() * 80 | 0, votedFor: null, votes: 0 };
  });
}

function initLinks() {
  const l = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) l.push({ a: i, b: j, cut: false });
  return l;
}

function connected(a, b) { return !links.find(l => ((l.a === a && l.b === b) || (l.a === b && l.b === a)) && l.cut); }
function peers(id) { return nodes.filter(n => n.id !== id && connected(id, n.id)); }

function sendPacket(from, to, type) { packets.push({ from, to, type, t: 0 }); }

function tick() {
  const leader = nodes.find(n => n.state === ST.L);
  if (leader) {
    leader.timer--;
    if (leader.timer <= 0) { leader.timer = 30; peers(leader.id).forEach(n => sendPacket(leader.id, n.id, 'hb')); }
  }
  nodes.forEach(n => {
    if (n.state === ST.L || n.state === ST.D) return;
    n.timer--;
    if (n.timer <= 0) {
      n.state = ST.C; term++; n.votedFor = n.id; n.votes = 1; n.timer = 100 + Math.random() * 60 | 0;
      peers(n.id).forEach(p => sendPacket(n.id, p.id, 'vreq'));
    }
  });
  packets = packets.filter(p => {
    p.t += 0.05;
    if (p.t >= 1) {
      const tgt = nodes[p.to];
      if (!connected(p.from, p.to)) return false;
      if (p.type === 'hb') { if (tgt.state !== ST.D) { tgt.state = ST.F; tgt.timer = 80 + Math.random() * 80 | 0; tgt.votedFor = null; tgt.votes = 0; } }
      if (p.type === 'vreq' && tgt.votedFor === null && tgt.state !== ST.D) { tgt.votedFor = p.from; tgt.timer = 120 + Math.random() * 40 | 0; sendPacket(p.to, p.from, 'vote'); }
      if (p.type === 'vote') {
        const src = nodes[p.to];
        if (src.state === ST.C) {
          src.votes++;
          const live = nodes.filter(n => n.state !== ST.D && connected(src.id, n.id)).length + 1;
          if (src.votes > live / 2) {
            src.state = ST.L; src.timer = 5;
            peers(src.id).forEach(n => { if (n.state !== ST.D) { n.state = ST.F; n.votedFor = null; n.votes = 0; } });
          }
        }
      }
      return false;
    }
    return true;
  });
}

function render() {
  svg.innerHTML = '';
  links.forEach((l, idx) => {
    const a = nodes[l.a], b = nodes[l.b];
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    Object.entries({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'link' + (l.cut ? ' cut' : '') }).forEach(([k, v]) => line.setAttribute(k, v));
    line.addEventListener('click', () => { l.cut = !l.cut; });
    svg.appendChild(line);
  });
  packets.forEach(p => {
    const a = nodes[p.from], b = nodes[p.to];
    const cx = a.x + (b.x - a.x) * p.t, cy = a.y + (b.y - a.y) * p.t;
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', 3);
    c.setAttribute('fill', p.type === 'hb' ? '#6ee7b7' : p.type === 'vreq' ? '#fbbf24' : '#60a5fa');
    svg.appendChild(c);
  });
  nodes.forEach(n => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', n.x); circle.setAttribute('cy', n.y); circle.setAttribute('r', 26);
    circle.setAttribute('fill', COL[n.state] + '22'); circle.setAttribute('stroke', COL[n.state]);
    circle.setAttribute('class', 'node-circle');
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', n.x); txt.setAttribute('y', n.y - 5); txt.setAttribute('class', 'node-text');
    txt.textContent = 'N' + n.id;
    const st = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    st.setAttribute('x', n.x); st.setAttribute('y', n.y + 9); st.setAttribute('class', 'state-text');
    st.textContent = n.state; st.setAttribute('fill', COL[n.state]);
    g.appendChild(circle); g.appendChild(txt); g.appendChild(st); svg.appendChild(g);
  });
  bar.innerHTML = nodes.map(n => `<span class="status-chip" style="border-color:${COL[n.state]}">N${n.id}: ${n.state}</span>`).join('') + `<span class="status-chip" style="border-color:#6ee7b7">Term ${term}</span>`;
}

nodes = initPositions(); links = initLinks();
function loop() { tick(); render(); requestAnimationFrame(loop); }
loop();