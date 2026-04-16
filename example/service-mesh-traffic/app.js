const services = [
  { name: 'envoy-proxy-frontend', p99: 12, rps: 3200, errors: 0.1, cpu: 34 },
  { name: 'istio-ingress', p99: 8, rps: 4800, errors: 0.02, cpu: 22 },
  { name: 'order-sidecar', p99: 45, rps: 1100, errors: 2.4, cpu: 67 },
  { name: 'payment-sidecar', p99: 88, rps: 600, errors: 5.1, cpu: 81 },
  { name: 'user-svc-proxy', p99: 15, rps: 2700, errors: 0.3, cpu: 41 },
  { name: 'auth-mtls-proxy', p99: 6, rps: 5100, errors: 0.01, cpu: 18 },
  { name: 'search-sidecar', p99: 33, rps: 1400, errors: 0.8, cpu: 55 },
  { name: 'notification-proxy', p99: 22, rps: 900, errors: 0.5, cpu: 38 },
];

const grid = document.getElementById('grid');
const sparkData = services.map(() => Array.from({length: 20}, () => Math.random() * 50 + 10));

function statusClass(err) { return err < 1 ? 'healthy' : err < 3 ? 'warn' : 'critical'; }

function sparkline(data, w=230, h=30) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v,i) => `${(i/(data.length-1))*w},${h - ((v-min)/(max-min||1))*h}`).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="#6ee7b7" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}

function render() {
  grid.innerHTML = services.map((s, i) => {
    const cls = statusClass(s.errors);
    return `<div class="card">
      <h2>${s.name}</h2>
      <div class="row"><span>p99 latency</span><span class="val">${s.p99}ms</span></div>
      <div class="row"><span>throughput</span><span class="val">${s.rps} rps</span></div>
      <div class="row"><span>error rate</span><span class="val">${s.errors.toFixed(2)}%</span></div>
      <div class="bar-wrap"><div class="bar ${cls}" style="width:${s.cpu}%"></div></div>
      <div class="row" style="margin-top:4px"><span>CPU ${s.cpu}%</span></div>
      ${sparkline(sparkData[i])}
    </div>`;
  }).join('');
}
render();

setInterval(() => {
  services.forEach((s, i) => {
    s.p99 = Math.max(1, s.p99 + (Math.random()*10-5)|0);
    s.rps = Math.max(100, s.rps + (Math.random()*200-100)|0);
    s.errors = Math.max(0, +(s.errors + (Math.random()*0.6-0.3)).toFixed(2));
    s.cpu = Math.min(99, Math.max(5, s.cpu + (Math.random()*8-4)|0));
    sparkData[i].shift(); sparkData[i].push(s.rps / 50);
  });
  render();
}, 1500);