const stages = ['ingest', 'parse', 'enrich', 'route', 'store'];
const state = {
  throughput: Array(60).fill(0).map(() => 40 + Math.random() * 20),
  lag: stages.map(s => ({ stage: s, lag: Math.random() * 800 })),
  events: [],
  totals: { processed: 0, errors: 0 },
};

const kpis = document.getElementById('kpis');
const throughputSvg = document.getElementById('throughput');
const lagSvg = document.getElementById('lag');
const eventsEl = document.getElementById('events');
const clockEl = document.getElementById('clock');

function renderKpis() {
  const tp = state.throughput[state.throughput.length - 1];
  const maxLag = Math.max(...state.lag.map(l => l.lag));
  const errRate = state.totals.processed
    ? (state.totals.errors / state.totals.processed * 100).toFixed(2)
    : '0.00';
  const tpCls = tp < 30 ? 'warn' : '';
  const lagCls = maxLag > 900 ? 'err' : maxLag > 600 ? 'warn' : '';
  const errCls = +errRate > 2 ? 'err' : +errRate > 1 ? 'warn' : '';
  kpis.innerHTML = `
    <div class="kpi ${tpCls}"><h3>Throughput</h3><div class="v">${tp.toFixed(0)}/s</div></div>
    <div class="kpi"><h3>Processed</h3><div class="v">${state.totals.processed.toLocaleString()}</div></div>
    <div class="kpi ${errCls}"><h3>Error Rate</h3><div class="v">${errRate}%</div></div>
    <div class="kpi ${lagCls}"><h3>Peak Lag</h3><div class="v">${maxLag.toFixed(0)}ms</div></div>
  `;
}

function renderThroughput() {
  const max = Math.max(...state.throughput, 1);
  const w = 600, h = 160, step = w / (state.throughput.length - 1);
  const pts = state.throughput.map((v, i) => `${i * step},${h - (v / max) * (h - 10) - 5}`).join(' ');
  const area = `M0,${h} L${pts.split(' ').join(' L')} L${w},${h} Z`;
  throughputSvg.innerHTML = `
    <path d="${area}" fill="#6ee7b733" />
    <polyline points="${pts}" fill="none" stroke="#6ee7b7" stroke-width="2"/>
  `;
}

function renderLag() {
  const max = 1000;
  const barW = 600 / state.lag.length;
  let svg = '';
  state.lag.forEach((l, i) => {
    const height = (l.lag / max) * 140;
    const color = l.lag > 900 ? '#f87171' : l.lag > 600 ? '#facc15' : '#6ee7b7';
    svg += `<rect x="${i * barW + 8}" y="${150 - height}" width="${barW - 16}" height="${height}" fill="${color}" rx="3"/>`;
    svg += `<text x="${i * barW + barW / 2}" y="158" fill="#8a90a2" font-size="10" text-anchor="middle">${l.stage}</text>`;
    svg += `<text x="${i * barW + barW / 2}" y="${150 - height - 4}" fill="${color}" font-size="10" text-anchor="middle">${l.lag.toFixed(0)}</text>`;
  });
  lagSvg.innerHTML = svg;
}

function renderEvents() {
  eventsEl.innerHTML = state.events.slice(-30).reverse().map(e =>
    `<li><span class="t">${e.time}</span><span class="lvl ${e.lvl}">${e.lvl}</span><span>${e.msg}</span></li>`
  ).join('');
}

function log(lvl, msg) {
  const d = new Date();
  const time = d.toTimeString().slice(0, 8);
  state.events.push({ time, lvl, msg });
  if (state.events.length > 200) state.events.shift();
}

function tick() {
  const base = 45 + Math.sin(Date.now() / 5000) * 15;
  const next = Math.max(5, base + (Math.random() - 0.5) * 20);
  state.throughput.push(next);
  if (state.throughput.length > 60) state.throughput.shift();

  state.totals.processed += Math.round(next);
  if (Math.random() < 0.08) {
    const n = Math.round(Math.random() * 5 + 1);
    state.totals.errors += n;
    log('WARN', `${n} records failed validation in parse`);
  }

  state.lag.forEach(l => {
    l.lag = Math.max(50, l.lag + (Math.random() - 0.5) * 200);
    if (l.lag > 900 && Math.random() < 0.3) log('ERR', `${l.stage} lag exceeded SLA (${l.lag.toFixed(0)}ms)`);
  });

  if (Math.random() < 0.1) {
    const msgs = ['batch committed to sink', 'consumer rebalanced', 'checkpoint saved', 'schema refreshed'];
    log('INFO', msgs[Math.floor(Math.random() * msgs.length)]);
  }

  clockEl.textContent = new Date().toTimeString().slice(0, 8);
  renderKpis();
  renderThroughput();
  renderLag();
  renderEvents();
}

log('INFO', 'pipeline monitor started');
log('INFO', 'connected to 5 stages');
tick();
setInterval(tick, 1000);