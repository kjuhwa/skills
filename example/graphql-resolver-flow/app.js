const svg = document.getElementById('flow');
const log = document.getElementById('log');
const queries = [
  { name: 'users', steps: [
    { label: 'Client', x: 60, y: 170 },
    { label: 'Query.users', x: 250, y: 170 },
    { label: 'UserResolver', x: 440, y: 170 },
    { label: 'DB: Users', x: 630, y: 170 }
  ], logs: ['→ Parsing query { users { id name } }','→ Query.users resolver invoked','→ UserResolver fetches from DB','← Returns [{id:1,name:"Alice"},{id:2,name:"Bob"}]'] },
  { name: 'posts+author', steps: [
    { label: 'Client', x: 60, y: 100 },
    { label: 'Query.posts', x: 230, y: 100 },
    { label: 'PostResolver', x: 400, y: 100 },
    { label: 'DB: Posts', x: 580, y: 100 },
    { label: 'Post.author', x: 400, y: 240 },
    { label: 'DB: Users', x: 580, y: 240 }
  ], logs: ['→ Parsing query { posts { title author { name } } }','→ Query.posts resolver','→ PostResolver: fetch posts','→ Post.author: nested resolver (N+1)','→ DataLoader batches user lookup','← Returns merged data'] },
  { name: 'createPost', steps: [
    { label: 'Client', x: 60, y: 170 },
    { label: 'Mutation', x: 250, y: 170 },
    { label: 'AuthGuard', x: 440, y: 170 },
    { label: 'DB: Write', x: 630, y: 170 }
  ], logs: ['→ Mutation createPost(title:"New")','→ AuthGuard: checking JWT token','→ Authorized → writing to DB','← Returns { id: 11, title: "New" }'] }
];
let animating = false;

function drawStep(step, idx, total, highlight) {
  const g = document.createElementNS('http://www.w3.org/2000/svg','g');
  const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
  const w = 120, h = 44;
  rect.setAttribute('x', step.x - w/2); rect.setAttribute('y', step.y - h/2);
  rect.setAttribute('width', w); rect.setAttribute('height', h);
  rect.setAttribute('rx', 8); rect.setAttribute('fill', highlight ? '#6ee7b7' : '#2a2d37');
  rect.setAttribute('stroke', '#6ee7b7'); rect.setAttribute('stroke-width', highlight ? 2 : 1);
  const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
  txt.setAttribute('x', step.x); txt.setAttribute('y', step.y + 4);
  txt.setAttribute('text-anchor', 'middle'); txt.setAttribute('fill', highlight ? '#0f1117' : '#e2e8f0');
  txt.setAttribute('font-size', '12'); txt.textContent = step.label;
  g.appendChild(rect); g.appendChild(txt);
  return g;
}

function drawArrow(a, b) {
  const line = document.createElementNS('http://www.w3.org/2000/svg','line');
  line.setAttribute('x1', a.x + 60); line.setAttribute('y1', a.y);
  line.setAttribute('x2', b.x - 60); line.setAttribute('y2', b.y);
  line.setAttribute('stroke', '#6ee7b7'); line.setAttribute('stroke-width', 2);
  line.setAttribute('stroke-dasharray', '6,4');
  line.setAttribute('opacity', '0.5');
  return line;
}

async function runQuery(qi) {
  if (animating) return;
  animating = true;
  const q = queries[qi];
  svg.innerHTML = ''; log.innerHTML = '';
  q.steps.forEach((s, i) => {
    if (i < q.steps.length - 1 && !(qi === 1 && i === 3)) {
      svg.appendChild(drawArrow(s, q.steps[i + 1]));
    }
  });
  if (qi === 1) svg.appendChild(drawArrow(q.steps[2], q.steps[4]));
  if (qi === 1) svg.appendChild(drawArrow(q.steps[4], q.steps[5]));
  const groups = q.steps.map((s, i) => drawStep(s, i, q.steps.length, false));
  groups.forEach(g => svg.appendChild(g));

  for (let i = 0; i < q.steps.length; i++) {
    groups.forEach((g, j) => { g.querySelector('rect').setAttribute('fill', j === i ? '#6ee7b7' : '#2a2d37'); g.querySelector('text').setAttribute('fill', j === i ? '#0f1117' : '#e2e8f0'); });
    if (q.logs[i]) {
      const d = document.createElement('div');
      d.className = 'log-line';
      d.style.color = q.logs[i].startsWith('←') ? '#6ee7b7' : '#94a3b8';
      d.textContent = q.logs[i]; log.appendChild(d);
    }
    await new Promise(r => setTimeout(r, 600));
  }
  animating = false;
}
runQuery(0);