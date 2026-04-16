const endpoints = [
  { name: 'Main Website', url: 'https://example.com' },
  { name: 'API Gateway', url: 'https://api.example.com/v1' },
  { name: 'Auth Service', url: 'https://auth.example.com' },
  { name: 'CDN Assets', url: 'https://cdn.example.com' },
  { name: 'Database Cluster', url: 'db://primary:5432' },
  { name: 'Payment Processor', url: 'https://pay.example.com' }
];

function generateHistory(days, seed) {
  const data = [];
  let failureBurst = 0;
  for (let i = 0; i < days; i++) {
    let status = 'ok';
    const r = Math.random() * (seed || 1);
    if (failureBurst > 0) {
      status = failureBurst > 1 ? 'outage' : 'degraded';
      failureBurst--;
    } else if (r > 0.97) {
      status = 'outage';
      failureBurst = Math.floor(Math.random() * 2) + 1;
    } else if (r > 0.92) {
      status = 'degraded';
    }
    data.push({
      date: new Date(Date.now() - (days - i - 1) * 86400000),
      status,
      incidents: status !== 'ok' ? Math.floor(Math.random() * 3) + 1 : 0,
      downtime: status === 'outage' ? Math.floor(Math.random() * 120) + 10 :
                status === 'degraded' ? Math.floor(Math.random() * 30) : 0
    });
  }
  return data;
}

function uptimePercent(history) {
  const total = history.length * 1440;
  const down = history.reduce((s, d) => s + d.downtime, 0);
  return ((total - down) / total * 100).toFixed(3);
}

function render() {
  const days = +document.getElementById('range').value;
  const container = document.getElementById('list');
  container.innerHTML = '';
  endpoints.forEach((ep, i) => {
    const history = generateHistory(days, 0.85 + i * 0.04);
    const pct = uptimePercent(history);
    const tier = pct >= 99.9 ? 'high' : pct >= 99 ? 'mid' : 'low';
    const div = document.createElement('div');
    div.className = 'endpoint';
    div.innerHTML = `
      <div class="endpoint-head">
        <div>
          <div class="endpoint-name">${ep.name}</div>
          <div class="endpoint-url">${ep.url}</div>
        </div>
        <div class="uptime ${tier}">${pct}%</div>
      </div>
      <div class="bars"></div>
    `;
    const bars = div.querySelector('.bars');
    history.forEach(h => {
      const b = document.createElement('div');
      b.className = `bar ${h.status}`;
      b.dataset.date = h.date.toISOString().slice(0, 10);
      b.dataset.status = h.status;
      b.dataset.incidents = h.incidents;
      b.dataset.downtime = h.downtime;
      bars.appendChild(b);
    });
    container.appendChild(div);
  });
}

const tooltip = document.getElementById('tooltip');
document.addEventListener('mouseover', (e) => {
  if (!e.target.classList.contains('bar')) return;
  const { date, status, incidents, downtime } = e.target.dataset;
  tooltip.innerHTML = `
    <div class="t-status">${date}</div>
    Status: ${status}<br>
    Incidents: ${incidents}<br>
    Downtime: ${downtime} min
  `;
  tooltip.classList.remove('hidden');
});
document.addEventListener('mousemove', (e) => {
  if (tooltip.classList.contains('hidden')) return;
  tooltip.style.left = (e.clientX + 12) + 'px';
  tooltip.style.top = (e.clientY + 12) + 'px';
});
document.addEventListener('mouseout', (e) => {
  if (e.target.classList.contains('bar')) tooltip.classList.add('hidden');
});

document.getElementById('refresh').onclick = render;
document.getElementById('range').onchange = render;
render();