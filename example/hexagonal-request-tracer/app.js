const scenarios = [
  {
    name: 'Place Order (REST)', desc: 'HTTP POST /orders traverses the hexagon.',
    spans: [
      { layer: 'primary', name: 'HTTP Controller', start: 0, dur: 12 },
      { layer: 'app', name: 'PlaceOrderUseCase', start: 12, dur: 8 },
      { layer: 'domain', name: 'Order.validate()', start: 20, dur: 5 },
      { layer: 'domain', name: 'Pricing.calculate()', start: 25, dur: 9 },
      { layer: 'secondary', name: 'OrderRepo.save', start: 34, dur: 24 },
      { layer: 'secondary', name: 'EventBus.publish', start: 58, dur: 14 },
      { layer: 'app', name: 'Response mapped', start: 72, dur: 4 },
      { layer: 'primary', name: 'HTTP 201 Created', start: 76, dur: 3 }
    ]
  },
  {
    name: 'Cancel Order (CLI)', desc: 'CLI adapter drives domain cancellation.',
    spans: [
      { layer: 'primary', name: 'CLI parse', start: 0, dur: 6 },
      { layer: 'app', name: 'CancelOrderUseCase', start: 6, dur: 7 },
      { layer: 'secondary', name: 'OrderRepo.findById', start: 13, dur: 18 },
      { layer: 'domain', name: 'Order.cancel()', start: 31, dur: 4 },
      { layer: 'secondary', name: 'OrderRepo.update', start: 35, dur: 20 },
      { layer: 'secondary', name: 'Email.send', start: 55, dur: 30 },
      { layer: 'primary', name: 'CLI stdout', start: 85, dur: 2 }
    ]
  },
  {
    name: 'Sync Inventory (Kafka)', desc: 'Inbound Kafka message adapter.',
    spans: [
      { layer: 'primary', name: 'Kafka consume', start: 0, dur: 9 },
      { layer: 'app', name: 'SyncInventoryHandler', start: 9, dur: 6 },
      { layer: 'domain', name: 'Stock.reconcile()', start: 15, dur: 11 },
      { layer: 'secondary', name: 'StockRepo.upsert', start: 26, dur: 22 },
      { layer: 'secondary', name: 'Metrics.emit', start: 48, dur: 3 },
      { layer: 'primary', name: 'Ack offset', start: 51, dur: 2 }
    ]
  },
  {
    name: 'Read Product (GraphQL)', desc: 'Query path with cache adapter.',
    spans: [
      { layer: 'primary', name: 'GraphQL resolve', start: 0, dur: 5 },
      { layer: 'app', name: 'GetProductQuery', start: 5, dur: 4 },
      { layer: 'secondary', name: 'Cache.get', start: 9, dur: 2 },
      { layer: 'secondary', name: 'ProductRepo.find', start: 11, dur: 16 },
      { layer: 'domain', name: 'Product.serialize', start: 27, dur: 3 },
      { layer: 'secondary', name: 'Cache.set', start: 30, dur: 2 },
      { layer: 'primary', name: 'GraphQL payload', start: 32, dur: 2 }
    ]
  }
];

const COLORS = { primary: '#4a9eff', app: '#9d6eff', domain: '#6ee7b7', secondary: '#ff9e4a' };
const canvas = document.getElementById('timeline');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

let current = 0, runCount = 0, totalLatency = 0;

function drawTimeline(scn) {
  ctx.fillStyle = '#1a1d27';
  ctx.fillRect(0, 0, W, H);
  const pad = 40;
  const total = Math.max(...scn.spans.map(s => s.start + s.dur));
  const scale = (W - pad * 2) / total;
  const layers = ['primary', 'app', 'domain', 'secondary'];
  const rowH = (H - pad * 2) / layers.length;

  ctx.fillStyle = '#9aa0ad';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  layers.forEach((l, i) => {
    ctx.fillText(l.toUpperCase(), pad - 8, pad + rowH * i + rowH / 2 + 4);
    ctx.strokeStyle = '#2a2e3a';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(pad, pad + rowH * i);
    ctx.lineTo(W - pad, pad + rowH * i);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  scn.spans.forEach((s, idx) => {
    const li = layers.indexOf(s.layer);
    const x = pad + s.start * scale;
    const y = pad + rowH * li + rowH * 0.2;
    const w = Math.max(6, s.dur * scale);
    const h = rowH * 0.6;
    ctx.fillStyle = COLORS[s.layer];
    ctx.globalAlpha = 0;
    ctx.fillRect(x, y, w, h);
    setTimeout(() => {
      ctx.fillStyle = COLORS[s.layer];
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0f1117';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'left';
      const label = s.name.length * 5.5 < w ? s.name : s.name.slice(0, Math.floor(w / 6));
      ctx.fillText(label, x + 4, y + h / 2 + 3);
    }, idx * 120);
  });

  ctx.strokeStyle = '#2a2e3a';
  ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);
  ctx.fillStyle = '#9aa0ad';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  for (let t = 0; t <= total; t += Math.ceil(total / 8)) {
    const x = pad + t * scale;
    ctx.fillText(`${t}ms`, x, H - pad + 16);
  }
}

function renderDetails(scn) {
  const total = Math.max(...scn.spans.map(s => s.start + s.dur));
  const lines = [
    `Scenario: ${scn.name}`,
    `Total latency: ${total}ms`,
    `Spans: ${scn.spans.length}`,
    '',
    ...scn.spans.map(s => `  [${s.layer.padEnd(10)}] ${s.name.padEnd(28)} +${s.start}ms (${s.dur}ms)`)
  ];
  document.getElementById('details').textContent = lines.join('\n');
  document.getElementById('scenarioDesc').textContent = scn.desc;
  runCount++;
  totalLatency += total;
  document.getElementById('runs').textContent = runCount;
  document.getElementById('avg').textContent = Math.round(totalLatency / runCount) + 'ms';
}

function select(i) {
  current = i;
  document.querySelectorAll('#scenarios li').forEach((li, idx) => {
    li.classList.toggle('active', idx === i);
  });
  drawTimeline(scenarios[i]);
  renderDetails(scenarios[i]);
}

const list = document.getElementById('scenarios');
scenarios.forEach((s, i) => {
  const li = document.createElement('li');
  li.textContent = s.name;
  li.onclick = () => select(i);
  list.appendChild(li);
});

select(0);