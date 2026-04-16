const svgNS = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('flame');
const detail = document.getElementById('detail');
const palette = ['#6ee7b7','#60a5fa','#f472b6','#fbbf24','#a78bfa','#f87171','#34d399','#fb923c'];
const ops = ['HTTP GET','DB Query','Cache Lookup','gRPC Call','Auth Check','Serialize','Publish Event','Validate'];

function buildTree(depth, start, width) {
  if (depth <= 0 || width < 8) return [];
  const node = { op: ops[Math.floor(Math.random()*ops.length)], start, width, depth, dur: Math.round(width * 2.5) };
  const children = [];
  let cursor = start;
  const count = 1 + Math.floor(Math.random() * 3);
  const gap = width * 0.03;
  const childTotal = width - gap * (count + 1);
  if (childTotal > 0) {
    cursor += gap;
    for (let i = 0; i < count; i++) {
      const cw = (childTotal / count) * (0.5 + Math.random());
      const bounded = Math.min(cw, start + width - cursor - gap);
      if (bounded > 6) {
        children.push(...buildTree(depth - 1, cursor, bounded));
        cursor += bounded + gap;
      }
    }
  }
  return [node, ...children];
}

function rebuild() {
  const W = Math.min(innerWidth - 40, 920);
  const spans = buildTree(6, 0, W);
  const maxDepth = Math.max(...spans.map(s => s.depth), 1);
  const rowH = 24;
  const H = (maxDepth + 1) * rowH + 16;
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  spans.forEach(s => {
    const g = document.createElementNS(svgNS, 'g');
    const y = H - (s.depth + 1) * rowH;
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', s.start); rect.setAttribute('y', y);
    rect.setAttribute('width', Math.max(s.width - 1, 2)); rect.setAttribute('height', rowH - 2);
    rect.setAttribute('rx', 3); rect.setAttribute('fill', palette[s.depth % palette.length]);
    rect.setAttribute('opacity', '0.8');
    rect.style.cursor = 'pointer';
    g.appendChild(rect);
    if (s.width > 50) {
      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', s.start + 4); text.setAttribute('y', y + 15);
      text.setAttribute('font-size', '10'); text.setAttribute('fill', '#0f1117');
      text.textContent = s.op;
      g.appendChild(text);
    }
    g.addEventListener('mouseenter', () => {
      rect.setAttribute('opacity', '1');
      detail.textContent = `${s.op} · ${s.dur}ms · depth ${s.depth}`;
    });
    g.addEventListener('mouseleave', () => { rect.setAttribute('opacity', '0.8'); detail.textContent = ''; });
    svg.appendChild(g);
  });
}
rebuild();
addEventListener('resize', rebuild);