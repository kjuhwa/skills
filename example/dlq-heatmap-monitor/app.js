const topics = ['order.created','payment.process','user.signup','inventory.update','email.send','audit.log','report.generate','cache.invalidate'];
const hours = Array.from({ length: 24 }, (_, i) => i);
const cellW = 32, cellH = 28, padL = 130, padT = 30;

const grid = topics.map(() => hours.map(() => Math.random() < 0.35 ? (Math.random() * 14 | 0) : 0));

const svg = document.getElementById('heatmap');
const tooltip = document.getElementById('tooltip');
svg.setAttribute('width', padL + hours.length * cellW + 10);
svg.setAttribute('height', padT + topics.length * cellH + 10);

function heatColor(v) {
  const t = Math.min(v / 10, 1);
  const r = Math.round(15 + t * 95), g = Math.round(41 + t * 190), b = Math.round(34 + t * 149);
  return `rgb(${r},${g},${b})`;
}

function buildSVG() {
  let html = '';
  hours.forEach((h, ci) => {
    html += `<text x="${padL + ci * cellW + cellW / 2}" y="${padT - 8}" fill="#6ee7b7" font-size="10" text-anchor="middle">${String(h).padStart(2,'0')}</text>`;
  });
  topics.forEach((topic, ri) => {
    html += `<text x="${padL - 6}" y="${padT + ri * cellH + cellH / 2 + 4}" fill="#c9d1d9" font-size="11" text-anchor="end">${topic}</text>`;
    hours.forEach((h, ci) => {
      const v = grid[ri][ci];
      html += `<rect x="${padL + ci * cellW}" y="${padT + ri * cellH}" width="${cellW - 2}" height="${cellH - 2}" rx="3" fill="${heatColor(v)}" data-r="${ri}" data-c="${ci}" data-v="${v}"/>`;
    });
  });
  svg.innerHTML = html;
}

svg.addEventListener('mousemove', e => {
  const t = e.target;
  if (t.tagName === 'rect') {
    tooltip.classList.remove('hidden');
    tooltip.style.left = e.clientX + 12 + 'px';
    tooltip.style.top = e.clientY - 10 + 'px';
    tooltip.textContent = `${topics[t.dataset.r]} @ ${String(hours[t.dataset.c]).padStart(2,'0')}:00 → ${t.dataset.v} failures`;
  } else tooltip.classList.add('hidden');
});
svg.addEventListener('mouseleave', () => tooltip.classList.add('hidden'));

buildSVG();

setInterval(() => {
  const ri = Math.random() * topics.length | 0;
  const ci = Math.random() * hours.length | 0;
  grid[ri][ci] = Math.min(grid[ri][ci] + (Math.random() < 0.5 ? 1 : -1), 15);
  if (grid[ri][ci] < 0) grid[ri][ci] = 0;
  buildSVG();
}, 2000);