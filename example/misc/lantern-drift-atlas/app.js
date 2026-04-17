// Lantern Drift Atlas — applies `rate-limiter-data-simulation` (Poisson arrivals
// for lantern releases) and `baseline-historical-comparison-threshold` (heat
// metric compared against rolling baseline with AVG aggregation).
const sky = document.getElementById('sky');
const ctx = sky.getContext('2d');
const countEl = document.getElementById('count');
const heatEl  = document.getElementById('heat');
const hoverEl = document.getElementById('hover');
const metaEl  = document.getElementById('meta');
const tEl = document.getElementById('time');
const dEl = document.getElementById('density');
const regen = document.getElementById('regen');

const KINDS = ['wish','memory','vow','prayer'];
const COLORS = {wish:'#6ee7b7',memory:'#f59e0b',vow:'#a78bfa',prayer:'#f472b6'};
const ORIGINS = ['Pingxi','Chiang Mai','Hội An','Varanasi','Kyoto','Taipei','Ayutthaya','Dali'];
const WORDS = ['courage','return','forgive','bloom','steady','wander','rest','begin','answer','stay'];

let lanterns = [], pinned = null, paused = false, heatBaseline = 8, heatHistory = [];

// Poisson-style arrival stream — rate-limiter-data-simulation pattern
function poissonGap(rate){ return -Math.log(1-Math.random())/rate; }

function spawn(n){
  lanterns = [];
  const w = sky.width, h = sky.height;
  let t = 0;
  for(let i=0;i<n;i++){
    t += poissonGap(0.8);
    const kind = KINDS[Math.floor(Math.random()*KINDS.length)];
    lanterns.push({
      id: 'L-' + (1000+i),
      x: Math.random()*w,
      y: h + Math.random()*200,
      vx: (Math.random()-.5)*0.25,
      vy: -0.35 - Math.random()*0.55,
      r: 4 + Math.random()*4,
      flicker: Math.random()*Math.PI*2,
      kind,
      color: COLORS[kind],
      origin: ORIGINS[Math.floor(Math.random()*ORIGINS.length)],
      wish: WORDS[Math.floor(Math.random()*WORDS.length)],
      released: Math.floor(t*1000),
      trail: []
    });
  }
}

function draw(){
  const w = sky.width, h = sky.height;
  ctx.fillStyle = 'rgba(15,17,23,0.22)';
  ctx.fillRect(0,0,w,h);

  const window = tEl.value / 100;
  let visible = 0;
  for(const l of lanterns){
    if(!paused){
      l.x += l.vx; l.y += l.vy;
      l.flicker += 0.08 + Math.random()*0.04;
      if(l.y < -20){ l.y = h + 20; l.x = Math.random()*w; l.trail = []; }
      l.trail.push({x:l.x,y:l.y});
      if(l.trail.length>40) l.trail.shift();
    }
    const ageNorm = 1 - (l.y/h);
    if(ageNorm > window) continue;
    visible++;

    // trail (only for pinned)
    if(pinned && pinned.id === l.id){
      ctx.strokeStyle = 'rgba(110,231,183,0.5)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      l.trail.forEach((p,i)=> i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
      ctx.stroke();
    }

    const glow = 0.55 + 0.45*Math.sin(l.flicker);
    const grad = ctx.createRadialGradient(l.x,l.y,0,l.x,l.y,l.r*6);
    grad.addColorStop(0, l.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.35*glow;
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(l.x,l.y,l.r*6,0,Math.PI*2); ctx.fill();

    ctx.globalAlpha = glow;
    ctx.fillStyle = l.color;
    ctx.beginPath(); ctx.arc(l.x,l.y,l.r,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // baseline-historical-comparison-threshold: heat vs rolling avg
  heatHistory.push(visible);
  if(heatHistory.length>60) heatHistory.shift();
  heatBaseline = heatHistory.reduce((a,b)=>a+b,0)/heatHistory.length;
  const delta = Math.round(((visible-heatBaseline)/Math.max(1,heatBaseline))*100);
  heatEl.textContent = (delta>0?'+':'') + delta + '%';
  heatEl.style.color = delta>25?'#f472b6':delta<-25?'#6b7280':'#6ee7b7';
  countEl.textContent = visible;

  requestAnimationFrame(draw);
}

function pick(mx,my){
  let best=null, bd=Infinity;
  for(const l of lanterns){
    const d=(l.x-mx)**2+(l.y-my)**2;
    if(d<bd && d<400){bd=d; best=l;}
  }
  return best;
}

function renderMeta(l){
  if(!l){ metaEl.innerHTML=''; return; }
  metaEl.innerHTML = `
    <dt>id</dt><dd>${l.id}</dd>
    <dt>kind</dt><dd style="color:${l.color}">${l.kind}</dd>
    <dt>origin</dt><dd>${l.origin}</dd>
    <dt>inscription</dt><dd>"${l.wish}"</dd>
    <dt>released</dt><dd>t+${l.released}ms</dd>
    <dt>altitude</dt><dd>${Math.round((1-l.y/sky.height)*100)}%</dd>`;
}

sky.addEventListener('mousemove', e=>{
  const r = sky.getBoundingClientRect();
  const mx = (e.clientX-r.left) * (sky.width/r.width);
  const my = (e.clientY-r.top)  * (sky.height/r.height);
  const hit = pick(mx,my);
  hoverEl.textContent = hit ? hit.id+' · '+hit.kind : '—';
});
sky.addEventListener('click', e=>{
  const r = sky.getBoundingClientRect();
  const mx = (e.clientX-r.left) * (sky.width/r.width);
  const my = (e.clientY-r.top)  * (sky.height/r.height);
  pinned = pick(mx,my);
  renderMeta(pinned);
});
dEl.addEventListener('input', ()=> spawn(+dEl.value));
regen.addEventListener('click', ()=> spawn(+dEl.value));
document.addEventListener('keydown', e=>{
  if(e.code==='Space'){ paused=!paused; e.preventDefault(); }
  if(e.key==='r') spawn(+dEl.value);
});

spawn(+dEl.value);
draw();