const svg = document.getElementById('timeline');
const NS = 'http://www.w3.org/2000/svg';
let alg = 'fixed', maxReq = 10, winMs = 3000, events = [], counters = { ok: 0, no: 0 };
let fixedWindowStart = 0, fixedCount = 0, slidingLog = [], leakyQueue = 0, leakyLast = Date.now();

document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  document.querySelector('.tab.active').classList.remove('active');
  t.classList.add('active'); alg = t.dataset.alg; resetAll();
});
document.getElementById('maxReq').oninput = e => { maxReq = +e.target.value; };
document.getElementById('winMs').oninput = e => { winMs = +e.target.value; };
document.getElementById('fire').onclick = () => fire();
document.getElementById('burst').onclick = () => { for (let i = 0; i < 15; i++) setTimeout(fire, i * 80); };
document.getElementById('reset').onclick = resetAll;

function resetAll() {
  events = []; counters = { ok: 0, no: 0 }; fixedWindowStart = 0; fixedCount = 0;
  slidingLog = []; leakyQueue = 0; leakyLast = Date.now(); render();
}

function fire() {
  const now = Date.now(); let ok = false;
  if (alg === 'fixed') {
    if (now - fixedWindowStart > winMs) { fixedWindowStart = now; fixedCount = 0; }
    ok = fixedCount < maxReq; if (ok) fixedCount++;
  } else if (alg === 'sliding') {
    slidingLog = slidingLog.filter(t => now - t < winMs);
    ok = slidingLog.length < maxReq; if (ok) slidingLog.push(now);
  } else {
    const dt = (now - leakyLast) / winMs * maxReq; leakyLast = now;
    leakyQueue = Math.max(0, leakyQueue - dt);
    ok = leakyQueue < maxReq; if (ok) leakyQueue++;
  }
  ok ? counters.ok++ : counters.no++;
  events.push({ t: now, ok });
  if (events.length > 200) events = events.slice(-200);
  render();
}

function render() {
  document.getElementById('sOk').textContent = counters.ok;
  document.getElementById('sNo').textContent = counters.no;
  document.getElementById('sTot').textContent = counters.ok + counters.no;
  svg.innerHTML = '';
  if (!events.length) return;
  const now = Date.now(), span = Math.max(5000, now - events[0].t + 500);
  // window shading
  if (alg === 'fixed' && fixedWindowStart) {
    const x1 = ((fixedWindowStart - events[0].t) / span) * 780;
    const w = (winMs / span) * 780;
    const rect = doc('rect', { x: Math.max(0, x1), y: 0, width: Math.min(w, 780), height: 280, fill: '#6ee7b711' });
    svg.appendChild(rect);
  }
  events.forEach(e => {
    const x = ((e.t - events[0].t) / span) * 760 + 10;
    const c = doc('circle', { cx: x, cy: e.ok ? 100 : 200, r: 5, fill: e.ok ? '#6ee7b7' : '#f87171', opacity: 0.85 });
    svg.appendChild(c);
  });
  // labels
  svg.appendChild(doc('text', { x: 5, y: 105, fill: '#6ee7b7', 'font-size': 11 }, 'Allowed'));
  svg.appendChild(doc('text', { x: 5, y: 205, fill: '#f87171', 'font-size': 11 }, 'Rejected'));
}

function doc(tag, attrs, text) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text) el.textContent = text; return el;
}
// seed some traffic
setTimeout(() => { for (let i = 0; i < 8; i++) setTimeout(fire, i * 150); }, 300);