const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
const slider=document.getElementById('slider'),pctEl=document.getElementById('pct');
const toggleBtn=document.getElementById('toggleBtn'),statsEl=document.getElementById('stats');
let running=false,particles=[],stable={ok:0,err:0},canary={ok:0,err:0};
slider.oninput=()=>pctEl.textContent=slider.value+'%';
toggleBtn.onclick=()=>{running=!running;toggleBtn.textContent=running?'⏸ Pause':'▶ Start'};
function spawn(){
  const p=+slider.value/100,isCanary=Math.random()<p;
  particles.push({x:50,y:210,vx:2+Math.random()*2,vy:(Math.random()-.5)*1.5,
    isCanary,age:0,done:false,err:isCanary&&Math.random()<.08});
}
function tick(){
  if(running&&Math.random()<.4)spawn();
  for(const p of particles){if(p.done)continue;p.x+=p.vx;p.age++;
    const tgt=p.isCanary?320:140;p.vy+=(tgt-p.y)*.002;p.vy*=.98;p.y+=p.vy;
    if(p.x>820){p.done=true;const b=p.isCanary?canary:stable;p.err?b.err++:b.ok++}}
  particles=particles.filter(p=>!p.done||p.age<120);
}
function draw(){
  ctx.clearRect(0,0,900,420);
  ctx.fillStyle='#22263a';ctx.fillRect(730,30,140,160);ctx.fillRect(730,240,140,160);
  ctx.fillStyle='#6ee7b7';ctx.font='bold 13px system-ui';
  ctx.fillText('Stable v1.0',760,60);ctx.fillText('Canary v1.1',760,270);
  ctx.fillStyle='#334155';ctx.fillRect(30,195,40,30);
  ctx.fillStyle='#94a3b8';ctx.font='11px system-ui';ctx.fillText('LB',40,214);
  for(const p of particles){
    ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);
    ctx.fillStyle=p.err?'#f87171':p.isCanary?'#6ee7b7':'#60a5fa';ctx.fill()}
  statsEl.innerHTML=`Stable: <span>${stable.ok}</span> ok / <span style="color:#f87171">${stable.err}</span> err &nbsp;|&nbsp; Canary: <span>${canary.ok}</span> ok / <span style="color:#f87171">${canary.err}</span> err`;
}
(function loop(){tick();draw();requestAnimationFrame(loop)})();