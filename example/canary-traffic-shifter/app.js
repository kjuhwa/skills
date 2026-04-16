const slider = document.getElementById('trafficSlider');
const stablePct = document.getElementById('stablePct');
const canaryPct = document.getElementById('canaryPct');
const canvas = document.getElementById('stream');
const ctx = canvas.getContext('2d');
const verdict = document.getElementById('verdict');

let canary = 5;
const particles = [];

function updateSliderBg(v){
  slider.style.background = `linear-gradient(90deg,#60a5fa 0%,#60a5fa ${100-v}%,#6ee7b7 ${100-v}%,#6ee7b7 100%)`;
}

function setCanary(v){
  canary = v;
  slider.value = v;
  stablePct.textContent = (100-v)+'%';
  canaryPct.textContent = v+'%';
  updateSliderBg(v);
}

slider.addEventListener('input', e => setCanary(+e.target.value));
document.querySelectorAll('.presets button[data-v]').forEach(b =>
  b.addEventListener('click', () => setCanary(+b.dataset.v)));
document.getElementById('rollback').addEventListener('click', () => {
  setCanary(0);
  flashVerdict('Rolled back to stable','warn');
});

function flashVerdict(msg,cls){
  verdict.textContent = msg;
  verdict.className = 'verdict '+cls;
}

function spawnRequest(){
  const isCanary = Math.random()*100 < canary;
  particles.push({x:0,y:30+Math.random()*160,v:2+Math.random()*2,canary:isCanary,life:1});
}

function metric(id,valId,val,unit,max){
  document.getElementById(id).style.width = Math.min(100,val/max*100)+'%';
  document.getElementById(valId).textContent = val.toFixed(unit==='%'?2:0)+unit;
}

let tick = 0;
function loop(){
  ctx.fillStyle='#0f1117'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#2a2f3d'; ctx.beginPath(); ctx.moveTo(0,110); ctx.lineTo(canvas.width,110); ctx.stroke();
  if(tick%3===0) spawnRequest();
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    p.x += p.v;
    ctx.fillStyle = p.canary?'#6ee7b7':'#60a5fa';
    ctx.globalAlpha = p.life;
    ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill();
    if(p.x>canvas.width){ particles.splice(i,1); }
  }
  ctx.globalAlpha=1;

  const sErr = 0.15+Math.random()*0.15;
  const cErr = 0.15+Math.random()*0.25+(canary>50?0.1:0);
  const sLat = 115+Math.random()*15;
  const cLat = 105+Math.random()*20;
  metric('stableErr','stableErrVal',sErr,'%',2);
  metric('canaryErr','canaryErrVal',cErr,'%',2);
  metric('stableLat','stableLatVal',sLat,'ms',200);
  metric('canaryLat','canaryLatVal',cLat,'ms',200);

  if(canary===0) flashVerdict('Canary offline','warn');
  else if(cErr>sErr*1.8) flashVerdict('Canary error rate spike detected','bad');
  else if(canary===100) flashVerdict('Full rollout complete','ok');
  else flashVerdict('Canary is healthy','ok');

  tick++;
  requestAnimationFrame(loop);
}

updateSliderBg(canary);
loop();