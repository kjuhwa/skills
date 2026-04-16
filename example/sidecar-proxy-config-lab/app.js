const FILTER_DEFS = {
  retry:     { label:'Retry x3',      color:'#6ee7b7', effect:'pass'   },
  timeout:   { label:'Timeout 2s',    color:'#6ee7b7', effect:'pass'   },
  ratelimit: { label:'Rate 100/s',    color:'#f87171', effect:'reject' },
  mtls:      { label:'mTLS Verify',   color:'#6ee7b7', effect:'pass'   },
  header:    { label:'Header Mutate', color:'#fbbf24', effect:'mutate' },
};
let chain = [
  { type:'mtls' },
  { type:'header' },
  { type:'retry' },
];

const chainEl = document.getElementById('chain');
const preview = document.getElementById('preview');
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

function renderChain() {
  chainEl.innerHTML = '';
  chain.forEach((f, i) => {
    const def = FILTER_DEFS[f.type];
    const li = document.createElement('li');
    li.innerHTML = `<div><span class="tag">${i+1}</span>${def.label}</div>`;
    const rm = document.createElement('button');
    rm.textContent = '×';
    rm.onclick = () => { chain.splice(i,1); renderChain(); };
    li.appendChild(rm);
    chainEl.appendChild(li);
  });
  preview.textContent = JSON.stringify({ filters: chain.map(f => f.type) }, null, 2);
  drawStage();
}

document.getElementById('addBtn').onclick = () => {
  chain.push({ type: document.getElementById('ftype').value });
  renderChain();
};

function drawStage(progress = null, outcome = null) {
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#0f1117'; ctx.fillRect(0,0,w,h);
  const cx = 60, rx = w-60;
  ctx.strokeStyle = '#232632'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, h/2); ctx.lineTo(rx, h/2); ctx.stroke();

  const steps = chain.length;
  const gap = steps ? (rx - cx) / (steps + 1) : 0;
  chain.forEach((f, i) => {
    const def = FILTER_DEFS[f.type];
    const x = cx + gap * (i+1);
    ctx.fillStyle = '#1a1d27';
    ctx.strokeStyle = def.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x-44, h/2-26, 88, 52, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '11px monospace'; ctx.textAlign = 'center';
    ctx.fillText(def.label, x, h/2+4);
  });

  ctx.fillStyle = '#6ee7b7';
  ctx.beginPath(); ctx.arc(cx, h/2, 10, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#232632';
  ctx.beginPath(); ctx.arc(rx, h/2, 10, 0, Math.PI*2); ctx.fill();

  if (progress != null) {
    const x = cx + (rx - cx) * progress;
    const color = outcome === 'reject' ? '#f87171' : outcome === 'mutate' ? '#fbbf24' : '#6ee7b7';
    ctx.fillStyle = color;
    ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(x, h/2, 8, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
  }
}

async function fireRequest() {
  if (!chain.length) return;
  const total = chain.length + 1;
  let outcome = 'pass';
  for (let i = 0; i <= chain.length; i++) {
    if (i < chain.length) {
      const eff = FILTER_DEFS[chain[i].type].effect;
      if (eff === 'reject' && Math.random() < 0.5) { outcome = 'reject';
        await animateTo(i/total, (i+0.5)/total, outcome);
        return;
      }
      if (eff === 'mutate') outcome = outcome === 'pass' ? 'mutate' : outcome;
    }
    await animateTo(i/total, (i+1)/total, outcome);
  }
}

function animateTo(from, to, outcome) {
  return new Promise(res => {
    const start = performance.now(), dur = 400;
    const step = now => {
      const t = Math.min(1, (now-start)/dur);
      drawStage(from + (to-from)*t, outcome);
      if (t<1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
}

document.getElementById('fire').onclick = fireRequest;
renderChain();