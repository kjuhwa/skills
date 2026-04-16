const svg = document.getElementById('svg');
const ns = 'http://www.w3.org/2000/svg';
const typeColors = { source:'#6ee7b7', transform:'#60a5fa', sink:'#c084fc' };
const typeLabels = { source:['PostgreSQL','MySQL','MongoDB','DynamoDB'], transform:['Filter','Map','Flatten','Enrich'], sink:['Kafka','S3','Elastic','Redis'] };
let nodes = [], edges = [], flowActive = false, flowDots = [], dragNode = null, dragOff = {x:0,y:0}, linking = null, idSeq = 0;

function el(tag, attrs) { const e = document.createElementNS(ns, tag); for (const [k,v] of Object.entries(attrs||{})) e.setAttribute(k,v); return e; }

function addNode(type, x, y) {
  const id = idSeq++;
  const labels = typeLabels[type];
  const label = labels[Math.floor(Math.random()*labels.length)];
  x = x || 100 + Math.random()*(innerWidth-300); y = y || 80 + Math.random()*(innerHeight-200);
  const g = el('g', { transform:`translate(${x},${y})`, cursor:'grab' });
  const rect = el('rect', { x:-60, y:-22, width:120, height:44, rx:8, fill:'#1a1d27', stroke:typeColors[type], 'stroke-width':2 });
  const txt = el('text', { x:0, y:1, fill:'#e2e8f0', 'font-size':'11', 'text-anchor':'middle', 'dominant-baseline':'middle', 'font-family':'monospace' });
  txt.textContent = label;
  const badge = el('text', { x:0, y:15, fill:typeColors[type], 'font-size':'8', 'text-anchor':'middle', 'font-family':'sans-serif' });
  badge.textContent = type.toUpperCase();
  const outPort = el('circle', { cx:60, cy:0, r:6, fill:typeColors[type], cursor:'crosshair', opacity:0.7 });
  g.append(rect, txt, badge, outPort);
  svg.appendChild(g);
  const node = { id, type, x, y, g, label };
  nodes.push(node);
  g.addEventListener('mousedown', e => { if (e.target === outPort) { linking = node; e.stopPropagation(); return; } dragNode = node; dragOff = { x:e.clientX-node.x, y:e.clientY-node.y }; });
  return node;
}

function drawEdges() {
  svg.querySelectorAll('line.edge, circle.dot').forEach(e => e.remove());
  edges.forEach(e => {
    const line = el('line', { x1:e.from.x+60, y1:e.from.y, x2:e.to.x-60, y2:e.to.y, stroke:'#2a2d37', 'stroke-width':2, class:'edge' });
    svg.insertBefore(line, svg.firstChild);
  });
}

function toggleFlow() { flowActive = !flowActive; if (flowActive) animateFlow(); }

function animateFlow() {
  if (!flowActive) { svg.querySelectorAll('circle.dot').forEach(e => e.remove()); return; }
  edges.forEach(e => {
    if (Math.random() < 0.08) flowDots.push({ edge:e, t:0 });
  });
  svg.querySelectorAll('circle.dot').forEach(e => e.remove());
  for (let i = flowDots.length-1; i >= 0; i--) {
    const d = flowDots[i]; d.t += 0.02;
    if (d.t > 1) { flowDots.splice(i,1); continue; }
    const x1=d.edge.from.x+60, y1=d.edge.from.y, x2=d.edge.to.x-60, y2=d.edge.to.y;
    const cx = x1+(x2-x1)*d.t, cy = y1+(y2-y1)*d.t;
    const dot = el('circle', { cx, cy, r:3, fill:'#6ee7b7', class:'dot', opacity: 1-d.t*0.5 });
    svg.appendChild(dot);
  }
  requestAnimationFrame(animateFlow);
}

addEventListener('mousemove', e => {
  if (dragNode) {
    dragNode.x = e.clientX - dragOff.x; dragNode.y = e.clientY - dragOff.y;
    dragNode.g.setAttribute('transform', `translate(${dragNode.x},${dragNode.y})`);
    drawEdges();
  }
});
addEventListener('mouseup', e => {
  if (linking) {
    const target = nodes.find(n => n !== linking && Math.hypot(e.clientX-n.x, e.clientY-n.y) < 70);
    if (target && !edges.find(ed => ed.from===linking && ed.to===target)) {
      edges.push({ from:linking, to:target }); drawEdges();
    }
    linking = null;
  }
  dragNode = null;
});

// seed demo pipeline
const s1 = addNode('source', 150, 200);
const s2 = addNode('source', 150, 350);
const t1 = addNode('transform', 420, 275);
const k1 = addNode('sink', 700, 200);
const k2 = addNode('sink', 700, 350);
edges.push({from:s1,to:t1},{from:s2,to:t1},{from:t1,to:k1},{from:t1,to:k2});
drawEdges();