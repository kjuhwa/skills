const stableEl = document.getElementById('stablePods');
const canaryEl = document.getElementById('canaryPods');
const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');
const badge = document.getElementById('badge');
const msg = document.getElementById('msg');

const STABLE_COUNT = 24, CANARY_COUNT = 8;
let history = [];
let rolledBack = false;

for(let i=0;i<STABLE_COUNT;i++){
  const d = document.createElement('div');
  d.className = 'pod healthy';
  stableEl.appendChild(d);
}
const canaryNodes = [];
for(let i=0;i<CANARY_COUNT;i++){
  const d = document.createElement('div');
  d.className = 'pod canary-healthy';
  canaryEl.appendChild(d);
  canaryNodes.push(d);
}

const errInj = document.getElementById('errInj');
const latInj = document.getElementById('latInj');
const cpuInj = document.getElementById('cpuInj');
const errVal = document.getElementById('errVal');
const latVal = document.getElementById('latVal');
const cpuVal = document.getElementById('cpuVal');

[errInj,latInj,cpuInj].forEach(el=>el.addEventListener('input',updateKnobs));
document.getElementById('reset').onclick = ()=>{
  errInj.value=0; latInj.value=0; cpuInj.value=20;
  rolledBack=false; history=[];
  canaryNodes.forEach(n=>n.className='pod canary-healthy');
  updateKnobs();
};

function updateKnobs(){
  errVal.textContent = (+errInj.value).toFixed(1)+'%';
  latVal.textContent = latInj.value+'ms';
  cpuVal.textContent = cpuInj.value+'%';
}
updateKnobs();

function simulate(){
  const errBase = 0.3 + (+errInj.value) + Math.random()*0.3;
  const latBase = 120 + (+latInj.value) + Math.random()*20;
  const cpuBase = (+cpuInj.value) + Math.random()*8;

  history.push({err:errBase,lat:latBase,cpu:cpuBase});
  if(history.length>80) history.shift();

  // pod health coloring
  canaryNodes.forEach((n,i)=>{
    if(rolledBack){ n.className='pod'; return; }
    const r = Math.random();
    if(errBase>5 && r<0.4) n.className='pod bad';
    else if(errBase>2 || latBase>300) n.className='pod warn';
    else n.className='pod canary-healthy';
  });

  // Verdict
  if(rolledBack){
    badge.className='status-badge bad'; badge.textContent='ROLLED BACK';
    msg.textContent='Canary removed · traffic 100% on stable. Hit Reset to redeploy.';
  } else if(errBase>5 || latBase>500 || cpuBase>90){
    rolledBack = true;
    badge.className='status-badge bad'; badge.textContent='ROLLBACK TRIGGERED';
    msg.textContent=`Guardrail breach · err=${errBase.toFixed(1)}% lat=${latBase.toFixed(0)}ms cpu=${cpuBase.toFixed(0)}%`;
  } else if(errBase>2 || latBase>300 || cpuBase>85){
    badge.className='status-badge warn'; badge.textContent='DEGRADED';
    msg.textContent=`Approaching guardrail · holding promotion`;
  } else {
    badge.className='status-badge ok'; badge.textContent='HEALTHY';
    msg.textContent='Canary meets all guardrails · promoting in 4m 30s';
  }

  drawChart();
}

function drawChart(){
  const w=canvas.width, h=canvas.height;
  ctx.fillStyle='#0f1117'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#2a2f3d'; ctx.lineWidth=1;
  for(let i=0;i<5;i++){ const y=i*h/4; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

  if(history.length<2) return;
  const N = history.length;
  const step = w/80;

  // err line
  ctx.strokeStyle='#ef4444'; ctx.lineWidth=2; ctx.beginPath();
  history.forEach((p,i)=>{
    const x=i*step; const y=h-(p.err/10)*h;
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  }); ctx.stroke();

  // lat line
  ctx.strokeStyle='#fbbf24'; ctx.beginPath();
  history.forEach((p,i)=>{
    const x=i*step; const y=h-(p.lat/600)*h;
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  }); ctx.stroke();

  // cpu line
  ctx.strokeStyle='#6ee7b7'; ctx.beginPath();
  history.forEach((p,i)=>{
    const x=i*step; const y=h-(p.cpu/100)*h;
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  }); ctx.stroke();

  // legend
  ctx.font='11px monospace';
  ctx.fillStyle='#ef4444'; ctx.fillText('● error %',10,16);
  ctx.fillStyle='#fbbf24'; ctx.fillText('● p95 latency',90,16);
  ctx.fillStyle='#6ee7b7'; ctx.fillText('● cpu %',200,16);
}

setInterval(simulate, 400);
simulate();