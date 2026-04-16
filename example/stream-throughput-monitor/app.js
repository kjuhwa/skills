const metrics = {
  ingest: { hist: [], value: 0, el: 'ingest', chart: 'ingestChart', fmt: v => `${v.toFixed(0)} msg/s`, base: 2400, amp: 600 },
  lag:    { hist: [], value: 0, el: 'lag',    chart: 'lagChart',    fmt: v => v.toFixed(0),               base: 850,  amp: 400 },
  err:    { hist: [], value: 0, el: 'err',    chart: 'errChart',    fmt: v => `${v.toFixed(2)}%`,         base: 1.2,  amp: 0.9 },
  lat:    { hist: [], value: 0, el: 'lat',    chart: 'latChart',    fmt: v => `${v.toFixed(0)} ms`,       base: 85,   amp: 30 }
};

const partitions = Array.from({ length: 12 }, (_, i) => ({
  name: `topic-events-p${i}`,
  backlog: Math.floor(Math.random() * 2000)
}));

const MAX_POINTS = 60;

function sample(m) {
  const drift = (Math.random() - 0.5) * m.amp * 0.3;
  m.value = Math.max(0, m.base + drift + Math.sin(Date.now() / 3000 + m.base) * m.amp * 0.4);
  m.hist.push(m.value);
  if (m.hist.length > MAX_POINTS) m.hist.shift();
}

function renderChart(m) {
  const svg = document.getElementById(m.chart);
  const w = 400, h = 120, pad = 4;
  if (m.hist.length < 2) return;
  const max = Math.max(...m.hist) * 1.15 || 1;
  const min = Math.min(...m.hist) * 0.85;
  const range = max - min || 1;
  const step = (w - pad * 2) / (MAX_POINTS - 1);
  const pts = m.hist.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const lineD = 'M' + pts.join(' L');
  const areaD = `${lineD} L ${pad + (m.hist.length - 1) * step},${h - pad} L ${pad},${h - pad} Z`;
  svg.innerHTML = `
    <defs>
      <linearGradient id="g-${m.chart}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#6ee7b7" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#6ee7b7" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${areaD}" fill="url(#g-${m.chart})"/>
    <path d="${lineD}" fill="none" stroke="#6ee7b7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  `;
  document.getElementById(m.el).textContent = m.fmt(m.value);
}

function renderPartitions() {
  const el = document.getElementById('partitions');
  el.innerHTML = '';
  partitions.forEach(p => {
    p.backlog += Math.floor((Math.random() - 0.5) * 400);
    p.backlog = Math.max(0, p.backlog);
    const cls = p.backlog > 2500 ? 'bad' : p.backlog > 1500 ? 'warn' : '';
    const div = document.createElement('div');
    div.className = `part ${cls}`;
    div.innerHTML = `<div class="pname">${p.name}</div><div class="pval">${p.backlog.toLocaleString()}</div>`;
    el.appendChild(div);
  });
}

function tick() {
  Object.values(metrics).forEach(m => { sample(m); renderChart(m); });
  renderPartitions();
}

for (let i = 0; i < MAX_POINTS; i++) {
  Object.values(metrics).forEach(m => sample(m));
}
tick();
setInterval(tick, 1000);