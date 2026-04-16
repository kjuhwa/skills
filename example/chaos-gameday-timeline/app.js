const events = [
  { t: 0, type: 'inject', msg: 'Hypothesis: Order service handles DB failover within 5s SLA' },
  { t: 5, type: 'inject', msg: '💉 Killing primary DB connection pool (pgbouncer terminated)' },
  { t: 12, type: 'observe', msg: '📈 Order service latency spiked to 1,240ms (p99)' },
  { t: 18, type: 'observe', msg: '⚠️ Circuit breaker OPEN on orders→db path. 34 requests queued' },
  { t: 24, type: 'observe', msg: '📊 Error rate: 12.4% — SLO breach detected (threshold: 1%)' },
  { t: 30, type: 'recover', msg: '🔄 DB failover initiated — replica promoted to primary' },
  { t: 38, type: 'observe', msg: '📉 Latency dropping: 890ms → 320ms → 45ms over 8s window' },
  { t: 42, type: 'recover', msg: '✅ Circuit breaker CLOSED. Traffic flowing normally' },
  { t: 48, type: 'verify', msg: '🔍 0 data loss confirmed. 12 orders retried successfully' },
  { t: 52, type: 'inject', msg: '💉 Injecting 80% packet loss on cache↔app network path' },
  { t: 58, type: 'observe', msg: '📈 Cache miss rate: 2% → 94%. App falling back to DB' },
  { t: 65, type: 'observe', msg: '⚠️ DB read replicas at 89% CPU — connection saturation risk' },
  { t: 72, type: 'recover', msg: '🔄 Cache reconnected. Warm-up prefetch started (2,400 keys)' },
  { t: 80, type: 'verify', msg: '✅ Cache hit rate restored to 97%. No customer-facing errors' },
  { t: 86, type: 'verify', msg: '📋 GameDay complete. Findings: failover took 12s (SLA=5s) — ACTION REQUIRED' },
];

const timeline = document.getElementById('timeline');
const bar = document.getElementById('bar');
const clock = document.getElementById('clock');
const btn = document.getElementById('run');
let idx = 0, elapsed = 0, timer;

function fmt(s) { return 'T+' + String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }

function addEvent(ev) {
  const div = document.createElement('div');
  div.className = 'evt ' + ev.type;
  div.innerHTML = `<div class="tag">${ev.type}</div><div class="msg">${ev.msg}</div><div class="ts">${fmt(ev.t)}</div>`;
  timeline.prepend(div);
}

function tick() {
  elapsed++;
  const total = events[events.length - 1].t + 4;
  bar.style.width = Math.min(100, (elapsed / total) * 100) + '%';
  clock.textContent = fmt(elapsed);
  while (idx < events.length && events[idx].t <= elapsed) { addEvent(events[idx]); idx++; }
  if (idx >= events.length && elapsed > events[events.length - 1].t + 3) {
    clearInterval(timer); btn.disabled = false; btn.textContent = '↻ Replay';
  }
}

btn.onclick = () => {
  idx = 0; elapsed = 0; timeline.innerHTML = ''; bar.style.width = '0%';
  btn.disabled = true; btn.textContent = 'Running...';
  timer = setInterval(tick, 600);
};