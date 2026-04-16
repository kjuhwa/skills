const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const state = {
  prod: 80, cons: 60, buf: 40, strategy: 'drop',
  queue: [], dropped: 0, delivered: 0, prodAcc: 0, consAcc: 0, t: 0,
};

const bind = (id, key, fn=parseFloat) => {
  const el = document.getElementById(id);
  const out = document.getElementById(id + 'Val');
  el.addEventListener('input', () => {
    state[key] = fn(el.value);
    if (out) out.textContent = el.value;
  });
};
bind('prod','prod'); bind('cons','cons'); bind('buf','buf');
document.getElementById('strategy').addEventListener('change', e => state.strategy = e.target.value);

function step(dt){
  state.prodAcc += state.prod * dt;
  while (state.prodAcc >= 1){
    state.prodAcc -= 1;
    if (state.queue.length < state.buf){
      state.queue.push({x:0, id: state.t++});
    } else {
      if (state.strategy === 'drop'){ state.dropped++; }
      else if (state.strategy === 'dropOld'){ state.queue.shift(); state.queue.push({x:0,id:state.t++}); state.dropped++; }
      else { state.prodAcc = 0; break; }
    }
  }
  state.consAcc += state.cons * dt;
  while (state.consAcc >= 1 && state.queue.length){
    state.consAcc -= 1;
    state.queue.shift();
    state.delivered++;
  }
  state.queue.forEach(p => p.x = Math.min(p.x + dt * 120, 800));
}

function draw(){
  ctx.fillStyle = '#0f1117'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = '#1a1d27'; ctx.fillRect(60, 110, 780, 60);
  ctx.strokeStyle = '#2a2f3d'; ctx.strokeRect(60,110,780,60);

  const fill = state.queue.length / state.buf;
  ctx.fillStyle = fill > .8 ? '#f87171' : fill > .5 ? '#fbbf24' : '#6ee7b7';
  ctx.fillRect(60, 110, 780 * fill, 60);

  ctx.fillStyle = '#6ee7b7';
  ctx.beginPath(); ctx.arc(30, 140, 18, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#0f1117'; ctx.font = 'bold 11px sans-serif';
  ctx.fillText('PROD', 12, 144);

  ctx.fillStyle = '#60a5fa';
  ctx.beginPath(); ctx.arc(870, 140, 18, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#0f1117';
  ctx.fillText('CONS', 854, 144);

  ctx.fillStyle = '#e6edf3';
  state.queue.forEach((p,i) => {
    const x = 70 + (i / state.buf) * 760;
    ctx.beginPath(); ctx.arc(x, 140, 4, 0, Math.PI*2); ctx.fill();
  });

  document.getElementById('inFlight').textContent = state.queue.length;
  document.getElementById('dropped').textContent = state.dropped;
  document.getElementById('delivered').textContent = state.delivered;
  document.getElementById('pressure').textContent = Math.round(fill*100)+'%';
}

let last = performance.now();
function loop(now){
  const dt = Math.min((now-last)/1000, .1); last = now;
  step(dt); draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);