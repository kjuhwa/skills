const palette = ['#6ee7b7', '#60a5fa', '#fbbf24', '#f472b6'];
const experiments = [
  { name: 'checkout-button-color', status: 'live', variants: ['control', 'green', 'orange'], base: [0.042, 0.051, 0.047] },
  { name: 'homepage-hero-copy', status: 'live', variants: ['control', 'benefit', 'urgency'], base: [0.081, 0.093, 0.088] },
  { name: 'search-ranking-v3', status: 'live', variants: ['control', 'ml-model'], base: [0.12, 0.138] },
  { name: 'onboarding-flow', status: 'paused', variants: ['short', 'guided'], base: [0.31, 0.34] }
];

experiments.forEach(e => {
  e.data = e.variants.map(() => []);
  e.samples = e.variants.map(() => ({ n: 0, conv: 0 }));
});

const tpl = document.getElementById('cardTpl');
const root = document.getElementById('experiments');
experiments.forEach((e, i) => {
  const node = tpl.content.cloneNode(true);
  node.querySelector('h2').textContent = e.name;
  const status = node.querySelector('.status');
  status.textContent = e.status;
  if (e.status === 'live') status.classList.add('live');
  const vwrap = node.querySelector('.variants');
  e.variants.forEach((v, vi) => {
    const row = document.createElement('div');
    row.className = 'variant';
    row.innerHTML = `<span class="name"><span class="swatch" style="background:${palette[vi]}"></span>${v}</span><span class="rate" id="rate-${i}-${vi}">—</span>`;
    vwrap.appendChild(row);
  });
  root.appendChild(node);
  e.card = root.children[i];
  e.canvas = e.card.querySelector('canvas');
  e.ctx = e.canvas.getContext('2d');
});

function tick() {
  experiments.forEach((e, ei) => {
    if (e.status !== 'live') return;
    e.variants.forEach((_, vi) => {
      const visits = Math.floor(Math.random() * 40) + 10;
      const rate = e.base[vi] + (Math.random() - 0.5) * 0.01;
      const convs = Math.max(0, Math.round(visits * rate));
      e.samples[vi].n += visits;
      e.samples[vi].conv += convs;
      const cr = e.samples[vi].conv / e.samples[vi].n;
      e.data[vi].push(cr);
      if (e.data[vi].length > 60) e.data[vi].shift();
      document.getElementById(`rate-${ei}-${vi}`).textContent = (cr * 100).toFixed(2) + '%';
    });
    draw(e);
    checkWinner(e, ei);
  });
}

function draw(e) {
  const { ctx, canvas } = e;
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#0f1117';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#2a2f3d';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const y = h * i / 4;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  const all = e.data.flat();
  if (!all.length) return;
  const min = Math.min(...all) * 0.9;
  const max = Math.max(...all) * 1.1;
  e.data.forEach((series, vi) => {
    ctx.strokeStyle = palette[vi];
    ctx.lineWidth = 2;
    ctx.beginPath();
    series.forEach((v, i) => {
      const x = (i / Math.max(1, series.length - 1)) * w;
      const y = h - ((v - min) / (max - min)) * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
}

function checkWinner(e, ei) {
  const rates = e.samples.map(s => s.n ? s.conv / s.n : 0);
  const best = rates.indexOf(Math.max(...rates));
  const bestRate = rates[best];
  const control = rates[0];
  const lift = control > 0 ? ((bestRate - control) / control) * 100 : 0;
  const winnerEl = e.card.querySelector('.winner');
  if (best > 0 && lift > 5 && e.samples[best].n > 500) {
    winnerEl.className = 'winner has';
    winnerEl.textContent = `Winner: ${e.variants[best]} (+${lift.toFixed(1)}% lift)`;
  } else {
    winnerEl.className = 'winner';
    winnerEl.textContent = e.status === 'paused' ? 'Experiment paused' : 'Collecting data…';
  }
}

tick();
setInterval(tick, 800);