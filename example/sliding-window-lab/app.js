const cfg = { limit: 5, window: 5 };
const fixed = { events: [], ok: 0, ko: 0 };
const sliding = { events: [], ok: 0, ko: 0 };
let auto = false;

const $ = id => document.getElementById(id);
$('limit').addEventListener('input', e => cfg.limit = +e.target.value);
$('window').addEventListener('input', e => cfg.window = +e.target.value);
$('hit').addEventListener('click', hit);
$('reset').addEventListener('click', () => {
  fixed.events = []; fixed.ok = 0; fixed.ko = 0;
  sliding.events = []; sliding.ok = 0; sliding.ko = 0;
});
$('auto').addEventListener('click', e => {
  auto = !auto;
  e.target.classList.toggle('active', auto);
  e.target.textContent = auto ? 'Stop auto' : 'Auto-traffic';
});

function hit() {
  const now = Date.now();
  const windowMs = cfg.window * 1000;

  const bucketStart = Math.floor(now / windowMs) * windowMs;
  const fInWindow = fixed.events.filter(t => t >= bucketStart).length;
  const fAccept = fInWindow < cfg.limit;
  fixed.events.push(now);
  if (fAccept) fixed.ok++; else fixed.ko++;
  fixed.events = fixed.events.slice(-200).map(t => ({ t, accept: t === now ? fAccept : (fixed.events.find(x => x === t)) }));
  fixed.events = fixed.events.map(e => typeof e === 'object' ? e : { t: e, accept: true });

  const sInWindow = sliding.events.filter(e => e.t > now - windowMs).length;
  const sAccept = sInWindow < cfg.limit;
  sliding.events.push({ t: now, accept: sAccept });
  if (sAccept) sliding.ok++; else sliding.ko++;

  if (fixed.events.length > 200) fixed.events = fixed.events.slice(-200);
  if (sliding.events.length > 200) sliding.events = sliding.events.slice(-200);
}

function render() {
  const now = Date.now();
  const windowMs = cfg.window * 1000;
  const totalSpan = windowMs * 2;
  const start = now - totalSpan;

  function drawPanel(svgId, events, mode) {
    const svg = $(svgId);
    svg.innerHTML = '';
    const W = 600, H = 160;

    // axis
    svg.insertAdjacentHTML('beforeend', `<line x1="0" y1="120" x2="600" y2="120" stroke="#374151"/>`);

    // fixed bucket shading
    if (mode === 'fixed') {
      const bucketStart = Math.floor(now / windowMs) * windowMs;
      const x = ((bucketStart - start) / totalSpan) * W;
      const w = (windowMs / totalSpan) * W;
      svg.insertAdjacentHTML('beforeend', `<rect x="${x}" y="10" width="${w}" height="110" fill="#6ee7b7" opacity="0.08"/>`);
      const prev = bucketStart - windowMs;
      const px = ((prev - start) / totalSpan) * W;
      svg.insertAdjacentHTML('beforeend', `<rect x="${px}" y="10" width="${w}" height="110" fill="#9ca3af" opacity="0.05"/>`);
    } else {
      const x = ((now - windowMs - start) / totalSpan) * W;
      const w = (windowMs / totalSpan) * W;
      svg.insertAdjacentHTML('beforeend', `<rect x="${x}" y="10" width="${w}" height="110" fill="#6ee7b7" opacity="0.08"/>`);
    }

    // now line
    const nowX = ((now - start) / totalSpan) * W;
    svg.insertAdjacentHTML('beforeend', `<line x1="${nowX}" y1="10" x2="${nowX}" y2="120" stroke="#f87171" stroke-dasharray="3"/>`);
    svg.insertAdjacentHTML('beforeend', `<text x="${nowX - 15}" y="140" fill="#f87171" font-size="10">now</text>`);

    // events
    const filtered = events.filter(e => e.t >= start);
    for (const e of filtered) {
      const x = ((e.t - start) / totalSpan) * W;
      const color = e.accept ? '#6ee7b7' : '#f87171';
      svg.insertAdjacentHTML('beforeend', `<circle cx="${x}" cy="${100 - (Math.random() * 50)}" r="4" fill="${color}"/>`);
    }

    // scale labels
    svg.insertAdjacentHTML('beforeend', `<text x="5" y="155" fill="#9ca3af" font-size="10">-${(totalSpan / 1000).toFixed(0)}s</text>`);
    svg.insertAdjacentHTML('beforeend', `<text x="575" y="155" fill="#9ca3af" font-size="10">0s</text>`);
  }

  drawPanel('fixed', fixed.events, 'fixed');
  drawPanel('sliding', sliding.events, 'sliding');

  $('fOk').textContent = fixed.ok;
  $('fKo').textContent = fixed.ko;
  $('sOk').textContent = sliding.ok;
  $('sKo').textContent = sliding.ko;
}

// seed demo events
(function seed() {
  const now = Date.now();
  for (let i = 10; i > 0; i--) {
    const t = now - i * 800;
    fixed.events.push({ t, accept: true });
    sliding.events.push({ t, accept: true });
  }
  fixed.ok = sliding.ok = 10;
})();

setInterval(() => { if (auto && Math.random() < 0.6) hit(); }, 400);
setInterval(render, 100);