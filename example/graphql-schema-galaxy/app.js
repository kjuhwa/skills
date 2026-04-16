const canvas = document.getElementById('galaxy');
const ctx = canvas.getContext('2d');
const tip = document.getElementById('tooltip');
canvas.width = Math.min(window.innerWidth - 40, 900);
canvas.height = Math.min(window.innerHeight - 100, 600);

const types = [
  { name: 'Query', kind: 'root', fields: ['users','posts','comments'] },
  { name: 'User', kind: 'object', fields: ['id','name','email','posts'] },
  { name: 'Post', kind: 'object', fields: ['id','title','body','author','comments'] },
  { name: 'Comment', kind: 'object', fields: ['id','text','author','post'] },
  { name: 'Mutation', kind: 'root', fields: ['createUser','createPost','deletePost'] },
  { name: 'ID', kind: 'scalar', fields: [] },
  { name: 'String', kind: 'scalar', fields: [] },
  { name: 'Boolean', kind: 'scalar', fields: [] },
];
const edges = [
  ['Query','User'],['Query','Post'],['Query','Comment'],
  ['User','Post'],['Post','User'],['Post','Comment'],['Comment','User'],['Comment','Post'],
  ['Mutation','User'],['Mutation','Post']
];
const cx = canvas.width / 2, cy = canvas.height / 2;
const nodes = types.map((t, i) => {
  const a = (i / types.length) * Math.PI * 2;
  const r = t.kind === 'root' ? 80 : t.kind === 'scalar' ? 220 : 160;
  return { ...t, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, r: t.kind === 'root' ? 22 : t.kind === 'scalar' ? 12 : 17, vx: 0, vy: 0 };
});
const nameMap = Object.fromEntries(nodes.map(n => [n.name, n]));
let hovered = null;
let time = 0;

function draw() {
  time += 0.01;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  edges.forEach(([a, b]) => {
    const na = nameMap[a], nb = nameMap[b];
    const bright = hovered && (hovered.name === a || hovered.name === b);
    ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
    ctx.strokeStyle = bright ? '#6ee7b7' : 'rgba(110,231,183,0.12)';
    ctx.lineWidth = bright ? 2 : 1; ctx.stroke();
  });
  nodes.forEach(n => {
    const pulse = 1 + Math.sin(time * 2 + nodes.indexOf(n)) * 0.06;
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2);
    const col = n.kind === 'root' ? '#6ee7b7' : n.kind === 'scalar' ? '#64748b' : '#38bdf8';
    ctx.fillStyle = hovered === n ? '#fff' : col;
    ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#0f1117'; ctx.font = `bold ${n.kind === 'scalar' ? 9 : 11}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(n.name, n.x, n.y);
  });
  requestAnimationFrame(draw);
}

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  hovered = nodes.find(n => Math.hypot(n.x - mx, n.y - my) < n.r + 4) || null;
  if (hovered) {
    tip.style.display = 'block'; tip.style.left = e.clientX + 12 + 'px'; tip.style.top = e.clientY + 12 + 'px';
    tip.innerHTML = `<strong>${hovered.name}</strong> (${hovered.kind})<br>Fields: ${hovered.fields.join(', ') || '—'}`;
  } else { tip.style.display = 'none'; }
});
draw();