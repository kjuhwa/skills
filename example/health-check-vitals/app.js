const vitals = {
  heart: { value: 72, min: 60, max: 100, history: [], ideal: [60, 90] },
  oxygen: { value: 98, min: 92, max: 100, history: [], ideal: [95, 100] },
  temp: { value: 36.7, min: 35.5, max: 38, history: [], ideal: [36.2, 37.2] },
  stress: { value: 32, min: 0, max: 100, history: [], ideal: [0, 50] }
};

function jitter(v, key) {
  const spec = vitals[key];
  const range = (spec.max - spec.min) * 0.04;
  let next = v + (Math.random() - 0.5) * range;
  next = Math.max(spec.min, Math.min(spec.max, next));
  return key === 'temp' ? +next.toFixed(1) : Math.round(next);
}

function pushHistory(key, v) {
  vitals[key].history.push(v);
  if (vitals[key].history.length > 40) vitals[key].history.shift();
}

function drawSpark(canvas, history, spec) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (history.length < 2) return;
  const min = spec.min, max = spec.max;
  ctx.strokeStyle = '#6ee7b7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  history.forEach((v, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - ((v - min) / (max - min)) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  const last = history[history.length - 1];
  const lx = w, ly = h - ((last - min) / (max - min)) * h;
  ctx.fillStyle = '#6ee7b7';
  ctx.beginPath();
  ctx.arc(lx - 3, ly, 3, 0, Math.PI * 2);
  ctx.fill();
}

function inRange(v, range) {
  return v >= range[0] && v <= range[1];
}

function computeScore() {
  let score = 0;
  Object.keys(vitals).forEach(k => {
    if (inRange(vitals[k].value, vitals[k].ideal)) score += 25;
    else score += 10;
  });
  return score;
}

function updateVerdict(score) {
  const v = document.getElementById('verdict');
  if (score >= 90) v.textContent = "You're in excellent shape today. Keep it up!";
  else if (score >= 70) v.textContent = 'Overall healthy. Some vitals outside ideal range.';
  else if (score >= 50) v.textContent = 'Moderate concerns. Consider rest and hydration.';
  else v.textContent = 'Multiple vitals flagged. Consult a healthcare provider.';
}

function tick() {
  Object.keys(vitals).forEach(k => {
    const next = jitter(vitals[k].value, k);
    vitals[k].value = next;
    pushHistory(k, next);
    document.getElementById(k).textContent = next;
    const card = document.querySelector(`[data-vital="${k}"] .spark`);
    drawSpark(card, vitals[k].history, vitals[k]);
  });
  const score = computeScore();
  document.getElementById('score-text').textContent = score;
  const arc = document.getElementById('score-arc');
  arc.setAttribute('stroke-dashoffset', 440 - (score / 100) * 440);
  updateVerdict(score);
}

for (let i = 0; i < 30; i++) {
  Object.keys(vitals).forEach(k => pushHistory(k, jitter(vitals[k].value, k)));
}
tick();
setInterval(tick, 1500);