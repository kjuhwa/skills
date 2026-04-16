const seriesDef = {
  temperature: { base: 22, amp: 4, tags: ['sensor-a', 'sensor-b', 'sensor-c'] },
  humidity: { base: 55, amp: 15, tags: ['sensor-a', 'sensor-b'] },
  pressure: { base: 1013, amp: 8, tags: ['station-n', 'station-s'] },
  requests: { base: 800, amp: 400, tags: ['api-v1', 'api-v2'] },
  latency_ms: { base: 45, amp: 20, tags: ['endpoint-x', 'endpoint-y'] }
};

function genSeries(name, range = 120) {
  const cfg = seriesDef[name];
  const now = Date.now();
  const pts = [];
  for (let i = range; i >= 0; i--) {
    pts.push({
      t: now - i * 1000,
      v: cfg.base + Math.sin(i / 15) * cfg.amp + (Math.random() - 0.5) * cfg.amp * 0.3,
      tag: cfg.tags[i % cfg.tags.length]
    });
  }
  return pts;
}

function renderSeriesList() {
  document.getElementById('series-list').innerHTML =
    Object.keys(seriesDef).map(k => `<li data-series="${k}">▸ ${k}</li>`).join('');
}

function sparkline(values) {
  const w = 200, h = 30;
  const min = Math.min(...values), max = Math.max(...values);
  const pts = values.map((v, i) => {
    const x = i / (values.length - 1) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg class="sparkline" width="${w}" height="${h}"><polyline points="${pts}" fill="none" stroke="#6ee7b7" stroke-width="1.5"/></svg>`;
}

function parse(q) {
  const m = q.trim().match(/^SELECT\s+(\w+)\((\w+)\)\s+FROM\s+(\w+)(?:\s+WHERE\s+tag=([^\s]+))?(?:\s+GROUP\s+BY\s+(\w+))?$/i);
  if (!m) throw new Error('Syntax error. Expected: SELECT fn(value) FROM series [WHERE tag=x] [GROUP BY Ns]');
  return { fn: m[1].toLowerCase(), field: m[2], series: m[3], tag: m[4], group: m[5] };
}

function execute(q) {
  const p = parse(q);
  if (!seriesDef[p.series]) throw new Error(`Unknown series: ${p.series}`);
  let data = genSeries(p.series);
  if (p.tag) data = data.filter(d => d.tag === p.tag);
  if (!data.length) return { rows: [], info: 'no rows' };

  const applyFn = (vals) => {
    switch (p.fn) {
      case 'mean': case 'avg': return vals.reduce((a, b) => a + b, 0) / vals.length;
      case 'max': return Math.max(...vals);
      case 'min': return Math.min(...vals);
      case 'last': return vals[vals.length - 1];
      case 'count': return vals.length;
      case 'rate': return (vals[vals.length - 1] - vals[0]) / vals.length;
      default: throw new Error(`Unknown function: ${p.fn}`);
    }
  };

  if (p.group) {
    const secs = parseInt(p.group) || 30;
    const buckets = {};
    data.forEach(d => {
      const k = Math.floor(d.t / (secs * 1000)) * secs * 1000;
      (buckets[k] = buckets[k] || []).push(d.v);
    });
    const rows = Object.entries(buckets).map(([t, vals]) => ({
      time: new Date(+t).toLocaleTimeString(), value: applyFn(vals).toFixed(3)
    }));
    return { rows, info: `${rows.length} rows, grouped by ${secs}s`, spark: Object.values(buckets).map(v => applyFn(v)) };
  }
  const val = applyFn(data.map(d => d.v));
  return { rows: [{ time: 'now', value: val.toFixed(3) }], info: `scanned ${data.length} points`, spark: data.map(d => d.v) };
}

const term = document.getElementById('terminal');
const input = document.getElementById('input');

function print(q, result, err) {
  const div = document.createElement('div');
  div.className = 'entry';
  let html = `<div class="q">${q}</div>`;
  if (err) html += `<div class="err">✗ ${err}</div>`;
  else {
    html += `<table class="result-table"><tr><th>time</th><th>value</th></tr>`;
    result.rows.forEach(r => html += `<tr><td>${r.time}</td><td>${r.value}</td></tr>`);
    html += `</table>`;
    if (result.spark) html += sparkline(result.spark);
    html += `<div class="info">${result.info}</div>`;
  }
  div.innerHTML = html;
  term.appendChild(div);
  term.scrollTop = term.scrollHeight;
}

input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && input.value.trim()) {
    const q = input.value.trim();
    try { print(q, execute(q)); } catch (err) { print(q, null, err.message); }
    input.value = '';
  }
});

document.querySelectorAll('.examples li').forEach(li => {
  li.onclick = () => { input.value = li.dataset.q; input.focus(); };
});

renderSeriesList();
document.getElementById('series-list').addEventListener('click', e => {
  if (e.target.dataset.series) {
    input.value = `SELECT last(value) FROM ${e.target.dataset.series}`;
    input.focus();
  }
});

print('-- TSDB REPL ready. Try examples on the left.', { rows: [{ time: '-', value: 'connected to tsdb://localhost:8086/metrics' }], info: 'session started' });