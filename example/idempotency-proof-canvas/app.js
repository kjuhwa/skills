const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width = 760, H = canvas.height = 320;
const fns = {
  floor: { apply: v => Math.floor(v), samples: () => Array.from({length:12}, () => (Math.random()*10-3).toFixed(2)*1), label: 'floor' },
  abs:   { apply: v => Math.abs(v), samples: () => Array.from({length:12}, () => (Math.random()*10-5).toFixed(2)*1), label: 'abs' },
  upper: { apply: v => String(v).toUpperCase(), samples: () => ['hello','World','fOo','Bar','idempotent','API','test','Mixed','DONE','ok','Retry','safe'], label: 'upper', isStr: true },
  clamp: { apply: v => Math.min(1, Math.max(0, v)), samples: () => Array.from({length:12}, () => (Math.random()*3-1).toFixed(2)*1), label: 'clamp(0,1)' },
  double:{ apply: v => v * 2, samples: () => Array.from({length:12}, () => Math.floor(Math.random()*10+1)), label: '×2' },
};
let current = 'floor';
const PASSES = 5, COLS = PASSES + 1;

function draw() {
  const fn = fns[current]; const samples = fn.samples();
  ctx.clearRect(0, 0, W, H);
  const rowH = H / (samples.length + 1), colW = W / COLS;
  ctx.font = '11px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // Headers
  ctx.fillStyle = '#6b7280';
  ctx.fillText('input', colW * 0.5, rowH * 0.5);
  for (let p = 1; p < COLS; p++) ctx.fillText('ƒ^' + p, colW * (p + 0.5), rowH * 0.5);
  let allIdempotent = true;
  samples.forEach((val, i) => {
    const y = rowH * (i + 1.5);
    let chain = [fn.isStr ? val : +val.toFixed(4)];
    for (let p = 0; p < PASSES; p++) {
      const next = fn.apply(chain[chain.length - 1]);
      chain.push(fn.isStr ? next : +next.toFixed(4));
    }
    const firstResult = JSON.stringify(chain[1]);
    const isIdemp = chain.slice(2).every(v => JSON.stringify(v) === firstResult);
    if (!isIdemp) allIdempotent = false;
    chain.forEach((v, c) => {
      const x = colW * (c + 0.5);
      const changed = c > 0 && JSON.stringify(v) !== JSON.stringify(chain[c - 1]);
      ctx.fillStyle = c === 0 ? '#c9d1d9' : changed ? '#f87171' : '#6ee7b7';
      ctx.fillText(String(v), x, y);
      if (c > 0) {
        ctx.strokeStyle = changed ? '#f8717144' : '#6ee7b744';
        ctx.beginPath(); ctx.moveTo(colW * (c - 0.5) + 30, y); ctx.lineTo(x - 30, y); ctx.stroke();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath(); ctx.moveTo(x - 30, y - 3); ctx.lineTo(x - 24, y); ctx.lineTo(x - 30, y + 3); ctx.fill();
      }
    });
  });
  const v = document.getElementById('verdict');
  v.style.color = allIdempotent ? '#6ee7b7' : '#f87171';
  v.textContent = allIdempotent
    ? `✓ ${fn.label}() is IDEMPOTENT — ƒ(ƒ(x)) = ƒ(x) for all inputs`
    : `✗ ${fn.label}() is NOT idempotent — values keep changing on reapplication`;
}

document.querySelectorAll('.fn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.fn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    current = btn.dataset.fn; draw();
  };
});
draw();