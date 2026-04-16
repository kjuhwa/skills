const cfg = { threshold: 75, direction: 'above', duration: 5, noise: 10 };
const series = [];
let spikeUntil = 0;
let breachStreak = 0;
let firing = false;
const log = [];
const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');
function genValue() {
  const t = Date.now() / 1000;
  let v = 50 + Math.sin(t / 8) * 15 + Math.cos(t / 3) * 6;
  v += (Math.random() - 0.5) * cfg.noise;
  if (Date.now() < spikeUntil) v += 35 + Math.random() * 10;
  return Math.max(0, Math.min(100, v));
}
function tick() {
  const v = genValue();
  series.push({ t: Date.now(), v });
  if (series.length > 300) series.shift();
  const breached = cfg.direction === 'above' ? v > cfg.threshold : v < cfg.threshold;
  if (breached) breachStreak++;
  else breachStreak = 0;
  const wasFiring = firing;
  firing = breachStreak >= cfg.duration;
  const stateEl = document.getElementById('state');
  if (firing) {
    stateEl.className = 'state fire'; stateEl.textContent = 'FIRING';
    if (!wasFiring) pushLog('🔥 Alert firing: value ' + v.toFixed(1), 'fire');
  } else if (breachStreak > 0) {
    stateEl.className = 'state warn'; stateEl.textContent = 'PENDING (' + breachStreak + '/' + cfg.duration + ')';
  } else {
    stateEl.className = 'state calm'; stateEl.textContent = 'OK';
    if (wasFiring) pushLog('✅ Recovered at ' + v.toFixed(1), 'recover');
  }
}
function pushLog(msg, cls) {
  log.unshift({ msg, cls, t: new Date().toLocaleTimeString() });
  if (log.length > 50) log.pop();
  document.getElementById('log').innerHTML = log.map(l =>
    `<li class="${l.cls}">[${l.t}] ${l.msg}</li>`).join('');
}
function draw() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  const pad = 36;
  const xs = i => pad + (i / Math.max(1, series.length - 1)) * (w - pad*2);
  const ys = v => h - pad - (v / 100) * (h - pad*2);
  ctx.strokeStyle = '#272b38'; ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const y = pad + (h - pad*2) * i / 10;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
  }
  const ty = ys(cfg.threshold);
  ctx.strokeStyle = '#ef4444'; ctx.setLineDash([6,4]); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pad, ty); ctx.lineTo(w - pad, ty); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ef4444'; ctx.font = '11px monospace';
  ctx.fillText('threshold ' + cfg.threshold, w - pad - 100, ty - 4);
  if (series.length > 1) {
    ctx.strokeStyle = firing ? '#ef4444' : '#6ee7b7';
    ctx.lineWidth = 2; ctx.beginPath();
    series.forEach((p, i) => { const x = xs(i), y = ys(p.v); i ? ctx.lineTo(x,y) : ctx.moveTo(x,y); });
    ctx.stroke();
    series.forEach((p, i) => {
      const breached = cfg.direction === 'above' ? p.v > cfg.threshold : p.v < cfg.threshold;
      if (breached) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(xs(i), ys(p.v), 2.5, 0, Math.PI*2); ctx.fill();
      }
    });
  }
  ctx.fillStyle = '#6b7280'; ctx.font = '10px monospace';
  for (let i = 0; i <= 10; i++) {
    const y = pad + (h - pad*2) * i / 10;
    ctx.fillText((100 - i*10).toString().padStart(3), 6, y + 3);
  }
}
const bind = (id, key, out) => {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    cfg[key] = el.type === 'range' ? +el.value : el.value;
    if (out) document.getElementById(out).textContent = el.value;
  });
};
bind('threshold', 'threshold', 'tv');
bind('duration', 'duration', 'dv');
bind('noise', 'noise', 'nv');
bind('direction', 'direction');
document.getElementById('spike').onclick = () => {
  spikeUntil = Date.now() + 3000;
  pushLog('⚡ Spike injected', '');
};
setInterval(tick, 500);
setInterval(draw, 60);