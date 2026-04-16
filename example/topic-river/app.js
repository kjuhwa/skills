const svg = document.getElementById('river');
const subsEl = document.getElementById('subs');
const topicInput = document.getElementById('topicInput');
const msgInput = document.getElementById('msgInput');

const SEED_TOPICS = ['sports.nba', 'sports.nfl', 'news.tech', 'news.world', 'weather.kr', 'weather.us'];
const PATTERNS = ['sports.*', 'news.*', 'weather.kr', 'sports.nba', '*'];

let subscribers = PATTERNS.map((p, i) => ({
  id: i + 1,
  pattern: p,
  count: 0,
  recent: []
}));

let messages = [];
let nextId = 100;

function matches(pattern, topic) {
  if (pattern === '*') return true;
  const pp = pattern.split('.'), tp = topic.split('.');
  if (pp.length !== tp.length) return false;
  return pp.every((s, i) => s === '*' || s === tp[i]);
}

function publish(topic, payload) {
  const id = nextId++;
  const y = 40 + Math.random() * 420;
  messages.push({ id, topic, payload, x: 0, y, targets: [] });
  subscribers.forEach(s => {
    if (matches(s.pattern, topic)) {
      s.count++;
      s.recent.unshift(`${topic}: ${payload}`);
      if (s.recent.length > 4) s.recent.pop();
    }
  });
  renderSubs();
}

function renderSubs() {
  subsEl.innerHTML = '';
  subscribers.forEach(s => {
    const card = document.createElement('div');
    card.className = 'sub-card';
    card.innerHTML = `
      <h3>Sub #${s.id} <button data-id="${s.id}">remove</button></h3>
      <div class="pattern">${s.pattern}</div>
      <div class="count">received: ${s.count}</div>
      <div class="recent">${s.recent.map(r => '• ' + r).join('<br>') || '—'}</div>
    `;
    subsEl.appendChild(card);
  });
  subsEl.querySelectorAll('button').forEach(b => {
    b.onclick = () => {
      subscribers = subscribers.filter(s => s.id !== +b.dataset.id);
      renderSubs();
    };
  });
}

function renderRiver() {
  svg.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const y = 40 + i * 75;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', 0); line.setAttribute('x2', 900);
    line.setAttribute('y1', y); line.setAttribute('y2', y);
    line.setAttribute('stroke', '#2a2f3d');
    line.setAttribute('stroke-dasharray', '4 4');
    svg.appendChild(line);
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', 10); label.setAttribute('y', y - 6);
    label.setAttribute('fill', '#6ee7b7'); label.setAttribute('font-size', '11');
    label.setAttribute('font-family', 'monospace');
    label.textContent = SEED_TOPICS[i];
    svg.appendChild(label);
  }
  messages.forEach(m => {
    const idx = SEED_TOPICS.indexOf(m.topic);
    const y = idx >= 0 ? 40 + idx * 75 : m.y;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', m.x); c.setAttribute('cy', y);
    c.setAttribute('r', 8); c.setAttribute('fill', '#6ee7b7');
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', m.x + 12); t.setAttribute('y', y + 4);
    t.setAttribute('fill', '#e4e6eb'); t.setAttribute('font-size', '10');
    t.textContent = m.payload;
    g.appendChild(c); g.appendChild(t);
    svg.appendChild(g);
  });
}

function animate() {
  messages = messages.filter(m => {
    m.x += 3;
    return m.x < 900;
  });
  renderRiver();
  requestAnimationFrame(animate);
}

document.getElementById('sendBtn').onclick = () => {
  const t = topicInput.value.trim() || SEED_TOPICS[Math.floor(Math.random() * 6)];
  const p = msgInput.value.trim() || 'ping';
  publish(t, p);
};

document.getElementById('addSub').onclick = () => {
  const pattern = prompt('Pattern (e.g. sports.*, news.tech, *)', 'sports.*');
  if (pattern) {
    subscribers.push({ id: Date.now(), pattern, count: 0, recent: [] });
    renderSubs();
  }
};

setInterval(() => {
  const topic = SEED_TOPICS[Math.floor(Math.random() * SEED_TOPICS.length)];
  const samples = ['update', 'score:42', 'breaking', 'sunny', 'cloudy', 'victory'];
  publish(topic, samples[Math.floor(Math.random() * samples.length)]);
}, 1400);

renderSubs();
animate();