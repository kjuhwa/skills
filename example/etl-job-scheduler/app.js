const seed = [
  { name: 'users-daily-sync', source: 'postgres.users', dest: 's3://warehouse/users', cron: '0 2 * * *' },
  { name: 'orders-hourly', source: 'kafka.orders', dest: 'snowflake.fct_orders', cron: '0 * * * *' },
  { name: 'ad-events-stream', source: 'kinesis.ads', dest: 'bigquery.ads_raw', cron: '*/5 * * * *' },
  { name: 'inventory-enrich', source: 'mongo.stock', dest: 'redshift.inv', cron: '30 3 * * *' },
  { name: 'clickstream-etl', source: 'fluentd.web', dest: 'clickhouse.events', cron: '*/15 * * * *' },
  { name: 'billing-reconcile', source: 'stripe.events', dest: 'postgres.fin_ledger', cron: '0 4 * * *' }
];

let jobs = seed.map((j, i) => ({
  ...j,
  id: i,
  status: ['running', 'queued', 'done', 'failed'][Math.floor(Math.random() * 3)],
  progress: Math.floor(Math.random() * 100),
  rows: Math.floor(Math.random() * 1e6),
  startedAt: Date.now() - Math.random() * 3600000
}));

function renderSummary() {
  const s = document.getElementById('summary');
  const counts = { running: 0, queued: 0, done: 0, failed: 0 };
  jobs.forEach(j => counts[j.status]++);
  const total = jobs.reduce((a, j) => a + j.rows, 0);
  s.innerHTML = `
    <div class="stat"><div class="label">Running</div><div class="value">${counts.running}</div></div>
    <div class="stat"><div class="label">Queued</div><div class="value">${counts.queued}</div></div>
    <div class="stat"><div class="label">Completed</div><div class="value">${counts.done}</div></div>
    <div class="stat"><div class="label">Rows processed</div><div class="value">${(total / 1e6).toFixed(2)}M</div></div>
  `;
}

function renderJobs() {
  const el = document.getElementById('jobs');
  el.innerHTML = '';
  jobs.forEach(j => {
    const div = document.createElement('div');
    div.className = 'job';
    div.innerHTML = `
      <div class="job-info">
        <h3>${j.name}</h3>
        <p>${j.source} → ${j.dest} · cron: <code>${j.cron}</code> · ${j.rows.toLocaleString()} rows</p>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${j.progress}%"></div></div>
      <span class="badge ${j.status}">${j.status}</span>
      <button class="ghost" data-id="${j.id}">Run now</button>
    `;
    el.appendChild(div);
  });
  el.querySelectorAll('button[data-id]').forEach(b => {
    b.onclick = () => runJob(Number(b.dataset.id));
  });
}

function runJob(id) {
  const j = jobs.find(x => x.id === id);
  if (!j) return;
  j.status = 'running';
  j.progress = 0;
  j.startedAt = Date.now();
  render();
}

function tick() {
  jobs.forEach(j => {
    if (j.status === 'running') {
      j.progress = Math.min(100, j.progress + 2 + Math.random() * 5);
      j.rows += Math.floor(Math.random() * 5000);
      if (j.progress >= 100) {
        j.status = Math.random() < 0.9 ? 'done' : 'failed';
      }
    } else if (j.status === 'queued' && Math.random() < 0.1) {
      j.status = 'running';
      j.progress = 0;
    } else if (j.status === 'done' && Math.random() < 0.03) {
      j.status = 'queued';
      j.progress = 0;
    }
  });
  render();
}

function addNew() {
  const names = ['logs-aggregator', 'cohort-builder', 'churn-model-feed', 'geo-enrich-daily'];
  const name = names[Math.floor(Math.random() * names.length)] + '-' + Math.floor(Math.random() * 99);
  jobs.unshift({
    id: Date.now(),
    name,
    source: 'kafka.events',
    dest: 's3://lake/' + name,
    cron: '*/10 * * * *',
    status: 'queued',
    progress: 0,
    rows: 0,
    startedAt: Date.now()
  });
  render();
}

function render() { renderSummary(); renderJobs(); }
document.getElementById('newJob').onclick = addNew;
setInterval(tick, 1200);
render();