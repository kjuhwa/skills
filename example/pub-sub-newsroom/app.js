const topics = ['tech', 'sports', 'finance', 'weather'];
const colors = { tech: '#6ee7b7', sports: '#fbbf24', finance: '#a78bfa', weather: '#60a5fa' };
const headlines = {
  tech: ['AI breakthrough announced', 'New chip unveiled', 'Quantum milestone'],
  sports: ['Championship decided', 'Record broken today', 'Rookie stuns field'],
  finance: ['Market rallies 2%', 'Rates held steady', 'IPO oversubscribed'],
  weather: ['Storm system forms', 'Heatwave incoming', 'Clear skies ahead']
};

const publishers = topics.map(t => ({ topic: t, count: 0 }));
const subscribers = [
  { name: 'Alice', topics: ['tech', 'finance'], inbox: [] },
  { name: 'Bob', topics: ['sports'], inbox: [] },
  { name: 'Carol', topics: ['weather', 'tech'], inbox: [] },
  { name: 'Dan', topics: ['finance', 'sports', 'weather'], inbox: [] }
];

const pubList = document.getElementById('pubList');
const subList = document.getElementById('subList');
const canvas = document.getElementById('busCanvas');
const ctx = canvas.getContext('2d');
const particles = [];

function renderPubs() {
  pubList.innerHTML = publishers.map(p =>
    `<div class="pub" data-topic="${p.topic}"><span><span class="tag" style="background:${colors[p.topic]}">${p.topic}</span></span><span>${p.count} msgs</span></div>`
  ).join('');
}
function renderSubs() {
  subList.innerHTML = subscribers.map(s =>
    `<div class="sub"><span>${s.name} <small style="color:#9ca3af">[${s.topics.join(',')}]</small></span><span class="inbox">${s.inbox.slice(-1)[0] || '—'}</span></div>`
  ).join('');
}

function publish(topic) {
  const msg = headlines[topic][Math.floor(Math.random() * 3)];
  publishers.find(p => p.topic === topic).count++;
  particles.push({ x: 60, y: 50 + topics.indexOf(topic) * 60, topic, msg, progress: 0 });
  renderPubs();
}

function tick() {
  ctx.fillStyle = '#0f1117';
  ctx.fillRect(0, 0, 400, 300);
  ctx.strokeStyle = '#2a2d37';
  ctx.beginPath(); ctx.moveTo(200, 20); ctx.lineTo(200, 280); ctx.stroke();
  ctx.fillStyle = '#6ee7b7'; ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center'; ctx.fillText('BROKER', 200, 150);
  ctx.strokeStyle = '#6ee7b7'; ctx.strokeRect(170, 130, 60, 30);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.progress += 0.03;
    const startX = 60, endX = 200;
    const x = startX + (endX - startX) * Math.min(p.progress, 1);
    ctx.fillStyle = colors[p.topic];
    ctx.beginPath(); ctx.arc(x, p.y, 6, 0, Math.PI * 2); ctx.fill();
    if (p.progress >= 1 && !p.delivered) {
      p.delivered = true;
      subscribers.forEach(s => { if (s.topics.includes(p.topic)) s.inbox.push(p.msg); });
      renderSubs();
    }
    if (p.progress >= 1.5) particles.splice(i, 1);
  }
  requestAnimationFrame(tick);
}

document.getElementById('publishBtn').onclick = () => publish(topics[Math.floor(Math.random() * 4)]);
setInterval(() => publish(topics[Math.floor(Math.random() * 4)]), 2500);

renderPubs(); renderSubs(); tick();