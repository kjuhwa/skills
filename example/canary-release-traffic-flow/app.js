const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const pctSlider=document.getElementById('pct'),pctVal=document.getElementById('pctVal');
const toggleBtn=document.getElementById('toggleBtn');
let running=true,canaryPct=10,particles=[];
function resize(){cv.width=cv.offsetWidth*devicePixelRatio;cv.height=cv.offsetHeight*devicePixelRatio;ctx.scale(devicePixelRatio,devicePixelRatio)}
window.addEventListener('resize',resize);resize();
pctSlider.oninput=()=>{canaryPct=+pctSlider.value;pctVal.textContent=canaryPct+'%'};
toggleBtn.onclick=()=>{running=!running;toggleBtn.textContent=running?'Pause':'Play'};
const W=()=>cv.offsetWidth,H=()=>cv.offsetHeight;
const LB_X=()=>W()*0.18,LB_Y=()=>H()*0.5;
const S_X=()=>W()*0.72,S_Y=()=>H()*0.35;
const C_X=()=>W()*0.72,C_Y=()=>H()*0.65;
function spawn(){
  const isCanary=Math.random()*100<canaryPct;
  const hasErr=isCanary?Math.random()<0.08:Math.random()<0.02;
  const tx=isCanary?C_X():S_X(),ty=isCanary?C_Y():S_Y();
  particles.push({x:40,y:LB_Y(),tx:LB_X(),ty:LB_Y(),phase:0,isCanary,hasErr,
    fx:tx,fy:ty,alpha:1,r:3});
}
function draw(){
  ctx.clearRect(0,0,W(),H());
  ctx.strokeStyle='#2a2d37';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(LB_X(),LB_Y());ctx.lineTo(S_X(),S_Y());ctx.stroke();
  ctx.beginPath();ctx.moveTo(LB_X(),LB_Y());ctx.lineTo(C_X(),C_Y());ctx.stroke();
  [['LB',LB_X(),LB_Y(),'#a78bfa'],['Stable',S_X(),S_Y(),'#60a5fa'],['Canary',C_X(),C_Y(),'#6ee7b7']].forEach(([l,x,y,c])=>{
    ctx.fillStyle=c+'33';ctx.beginPath();ctx.arc(x,y,30,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=c;ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(l,x,y+4);
  });
  particles.forEach(p=>{
    if(p.phase===0){p.x+=(p.tx-p.x)*0.06;p.y+=(p.ty-p.y)*0.06;if(Math.abs(p.x-p.tx)<2)p.phase=1;}
    else if(p.phase===1){p.x+=(p.fx-p.x)*0.05;p.y+=(p.fy-p.y)*0.05;if(Math.abs(p.x-p.fx)<2)p.phase=2;}
    else{p.alpha-=0.03}
    ctx.globalAlpha=Math.max(0,p.alpha);
    ctx.fillStyle=p.hasErr?'#f87171':p.isCanary?'#6ee7b7':'#60a5fa';
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha=1;
  particles=particles.filter(p=>p.alpha>0);
}
let tick=0;
(function loop(){
  requestAnimationFrame(loop);
  if(!running)return;
  if(++tick%4===0)spawn();
  draw();
})();