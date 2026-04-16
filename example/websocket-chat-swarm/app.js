const svg = document.getElementById('canvas');
const feed = document.getElementById('feed');
const form = document.getElementById('form');
const input = document.getElementById('input');
const userCount = document.getElementById('userCount');

const NAMES = ['neo','trinity','morpheus','oracle','cypher','tank','dozer','mouse','switch','apoc'];
const LINES = [
  'just joined the channel',
  'hello world!',
  'ping?',
  'wss is magical',
  'streaming works great',
  'anyone online?',
  'broadcast received',
  'latency is low today',
  'see you all later',
];

const center = { x: 400, y: 250 };
const nodes = [];
let messageId = 0;

function createNode(name, isMe = false) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 150 + Math.random() * 80;
  const node = {
    id: nodes.length,
    name,
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
    angle, radius,
    speed: 0.002 + Math.random() * 0.003,
    isMe,
  };
  nodes.push(node);
  return node;
}

function renderNetwork() {
  svg.innerHTML = '';
  const serverG = `<circle cx="${center.x}" cy="${center.y}" r="24" fill="#6ee7b7" opacity="0.9"/>
    <circle cx="${center.x}" cy="${center.y}" r="32" fill="none" stroke="#6ee7b7" stroke-width="1" opacity="0.4">
      <animate attributeName="r" from="24" to="60" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite"/>
    </circle>
    <text x="${center.x}" y="${center.y+4}" text-anchor="middle" class="label" fill="#0f1117" font-weight="700">WS</text>`;
  let links = '', dots = '';
  nodes.forEach(n => {
    links += `<line class="link" x1="${center.x}" y1="${center.y}" x2="${n.x}" y2="${n.y}"/>`;
    const fill = n.isMe ? '#fbbf24' : '#60a5fa';
    dots += `<circle class="node" cx="${n.x}" cy="${n.y}" r="8" fill="${fill}" opacity="0.85"/>
      <text x="${n.x}" y="${n.y-12}" text-anchor="middle" class="label">${n.name}</text>`;
  });
  svg.innerHTML = links + serverG + dots;
  userCount.textContent = `${nodes.length} users`;
}

function animateMessage(fromNode) {
  const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  pulse.setAttribute('cx', fromNode.x);
  pulse.setAttribute('cy', fromNode.y);
  pulse.setAttribute('r', 4);
  pulse.setAttribute('class', 'msg-dot');
  svg.appendChild(pulse);

  const steps = 30;
  let i = 0;
  const toServer = () => {
    i++;
    const t = i / steps;
    pulse.setAttribute('cx', fromNode.x + (center.x - fromNode.x) * t);
    pulse.setAttribute('cy', fromNode.y + (center.y - fromNode.y) * t);
    if (i < steps) requestAnimationFrame(toServer);
    else { svg.removeChild(pulse); broadcast(fromNode); }
  };
  toServer();
}

function broadcast(sourceNode) {
  nodes.forEach(n => {
    if (n === sourceNode) return;
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    p.setAttribute('cx', center.x);
    p.setAttribute('cy', center.y);
    p.setAttribute('r', 3);
    p.setAttribute('class', 'msg-dot');
    svg.appendChild(p);
    const steps = 25; let i = 0;
    const go = () => {
      i++;
      const t = i / steps;
      p.setAttribute('cx', center.x + (n.x - center.x) * t);
      p.setAttribute('cy', center.y + (n.y - center.y) * t);
      if (i < steps) requestAnimationFrame(go);
      else p.parentNode && p.parentNode.removeChild(p);
    };
    go();
  });
}

function addMessage(name, text) {
  const div = document.createElement('div');
  div.className = 'msg';
  div.innerHTML = `<b>${name}</b>${text}<span class="t">${new Date().toLocaleTimeString()}</span>`;
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
  while (feed.children.length > 40) feed.removeChild(feed.firstChild);
}

function animate() {
  nodes.forEach(n => {
    n.angle += n.speed;
    n.x = center.x + Math.cos(n.angle) * n.radius;
    n.y = center.y + Math.sin(n.angle) * n.radius;
  });
  renderNetwork();
  requestAnimationFrame(animate);
}

function simulateChatter() {
  const n = nodes[Math.floor(Math.random() * nodes.length)];
  if (!n || n.isMe) return;
  const line = LINES[Math.floor(Math.random() * LINES.length)];
  animateMessage(n);
  setTimeout(() => addMessage(n.name, line), 400);
}

NAMES.slice(0, 6).forEach(n => createNode(n));
const me = createNode('you', true);

form.onsubmit = (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  animateMessage(me);
  setTimeout(() => addMessage('you', text), 400);
  input.value = '';
};

setInterval(simulateChatter, 2200);
setInterval(() => {
  if (nodes.length < 10 && Math.random() < 0.5) {
    const name = NAMES[Math.floor(Math.random() * NAMES.length)] + Math.floor(Math.random()*99);
    createNode(name);
    addMessage('system', `${name} joined`);
  }
}, 6000);

animate();
addMessage('system', 'Connected to wss://swarm.example');