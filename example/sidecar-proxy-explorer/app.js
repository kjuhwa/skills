const svg = document.getElementById('mesh');
const NS = 'http://www.w3.org/2000/svg';
const pods = [
  { id: 'gateway', x: 80, y: 220, name: 'gateway' },
  { id: 'orders', x: 320, y: 100, name: 'orders' },
  { id: 'users', x: 320, y: 340, name: 'users' },
  { id: 'payments', x: 580, y: 220, name: 'payments' },
];
const edges = [
  ['gateway','orders'], ['gateway','users'],
  ['orders','payments'], ['users','payments']
];
let stats = { total:0, ok:0, err:0, latencies:[] };
let faultMode = false;

function el(tag, attrs={}) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

function drawTopology() {
  edges.forEach(([a,b]) => {
    const A = pods.find(p=>p.id===a), B = pods.find(p=>p.id===b);
    svg.appendChild(el('path', { d:`M${A.x+30},${A.y} C${(A.x+B.x)/2},${A.y} ${(A.x+B.x)/2},${B.y} ${B.x-30},${B.y}`, class:'edge' }));
  });
  pods.forEach(p => {
    svg.appendChild(el('rect', { x:p.x-55, y:p.y-32, width:110, height:64, rx:10, class:'pod' }));
    svg.appendChild(el('rect', { x:p.x-48, y:p.y-24, width:40, height:48, rx:4, class:'app' }));
    svg.appendChild(el('rect', { x:p.x+8,  y:p.y-24, width:40, height:48, rx:4, class:'sidecar' }));
    svg.appendChild(el('text', { x:p.x-28, y:p.y+4, class:'label' })).textContent = 'app';
    svg.appendChild(el('text', { x:p.x+28, y:p.y+4, class:'label' })).textContent = 'sc';
    svg.appendChild(el('text', { x:p.x, y:p.y+48, class:'label' })).textContent = p.name;
  });
}

function sendPacket(from, to, forceErr=false) {
  const A = pods.find(p=>p.id===from), B = pods.find(p=>p.id===to);
  if (!A || !B) return;
  const err = forceErr || (faultMode && Math.random() < 0.4) || Math.random() < 0.05;
  const pkt = el('circle', { r:5, cx:A.x+30, cy:A.y, class:'packet'+(err?' err':'') });
  svg.appendChild(pkt);
  const start = performance.now();
  const dur = 900 + Math.random()*600;
  const step = now => {
    const t = Math.min(1,(now-start)/dur);
    const mx = (A.x+B.x)/2;
    const cx = (1-t)*(1-t)*(A.x+30) + 2*(1-t)*t*mx + t*t*(B.x-30);
    const cy = (1-t)*(1-t)*A.y + 2*(1-t)*t*((A.y+B.y)/2) + t*t*B.y;
    pkt.setAttribute('cx', cx); pkt.setAttribute('cy', cy);
    if (t<1) requestAnimationFrame(step);
    else { pkt.remove(); logTrace(from,to,err,Math.round(dur)); }
  };
  requestAnimationFrame(step);
}

function logTrace(from,to,err,ms) {
  stats.total++; stats[err?'err':'ok']++;
  stats.latencies.push(ms);
  if (stats.latencies.length>100) stats.latencies.shift();
  const sorted = [...stats.latencies].sort((a,b)=>a-b);
  const p95 = sorted[Math.floor(sorted.length*0.95)] || 0;
  document.getElementById('total').textContent = stats.total;
  document.getElementById('ok').textContent = stats.ok;
  document.getElementById('err').textContent = stats.err;
  document.getElementById('p95').textContent = p95;
  const li = document.createElement('li');
  if (err) li.className = 'err';
  li.textContent = `${from}→${to} ${err?'500':'200'} ${ms}ms`;
  const log = document.getElementById('log');
  log.insertBefore(li, log.firstChild);
  if (log.children.length>30) log.removeChild(log.lastChild);
}

drawTopology();
setInterval(() => {
  const e = edges[Math.floor(Math.random()*edges.length)];
  sendPacket(e[0], e[1]);
}, 800);

document.getElementById('boost').onclick = () => {
  for (let i=0;i<10;i++) setTimeout(()=>{
    const e = edges[Math.floor(Math.random()*edges.length)];
    sendPacket(e[0], e[1]);
  }, i*60);
};
document.getElementById('fault').onclick = () => {
  faultMode = !faultMode;
  document.getElementById('fault').style.color = faultMode ? '#f87171' : '#6ee7b7';
};