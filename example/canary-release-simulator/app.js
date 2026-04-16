const canvas=document.getElementById('c'),ctx=canvas.getContext('2d'),info=document.getElementById('info');
const N=100,cols=10,rows=10,gap=68,padX=45,padY=30;
let nodes=[],autoTimer=null;
for(let i=0;i<N;i++){const col=i%cols,row=Math.floor(i/cols);
  nodes.push({x:padX+col*gap,y:padY+row*gap,canary:false,pulse:0})}

function countCanary(){return nodes.filter(n=>n.canary).length}
function draw(){
  ctx.clearRect(0,0,760,420);
  nodes.forEach(n=>{
    const r=22+Math.sin(n.pulse)*3;n.pulse+=n.canary?0.12:0.03;
    ctx.beginPath();ctx.arc(n.x+gap/2,n.y+gap/2,r,0,Math.PI*2);
    ctx.fillStyle=n.canary?'#fbbf24':'#6ee7b7';ctx.globalAlpha=0.15;ctx.fill();
    ctx.globalAlpha=1;ctx.beginPath();ctx.arc(n.x+gap/2,n.y+gap/2,10,0,Math.PI*2);
    ctx.fillStyle=n.canary?'#fbbf24':'#6ee7b7';ctx.fill();
  });
  info.textContent=`${countCanary()} / ${N} canary`;
  requestAnimationFrame(draw);
}
function promoteRandom(count){
  const stable=nodes.filter(n=>!n.canary);
  for(let i=0;i<Math.min(count,stable.length);i++){
    const idx=Math.floor(Math.random()*stable.length);stable[idx].canary=true;stable.splice(idx,1)}
}
canvas.onclick=e=>{
  const rect=canvas.getBoundingClientRect(),mx=e.clientX-rect.left,my=e.clientY-rect.top;
  const hit=nodes.find(n=>Math.hypot(n.x+gap/2-mx,n.y+gap/2-my)<18);
  if(hit&&!hit.canary){hit.canary=true;
    nodes.filter(n=>!n.canary&&Math.hypot(n.x-hit.x,n.y-hit.y)<gap*1.6).slice(0,2).forEach(n=>n.canary=true)}
};
document.getElementById('stepBtn').onclick=()=>promoteRandom(5);
document.getElementById('autoBtn').onclick=()=>{
  if(autoTimer){clearInterval(autoTimer);autoTimer=null;return}
  autoTimer=setInterval(()=>{if(countCanary()>=N){clearInterval(autoTimer);autoTimer=null;return}promoteRandom(5)},600)};
document.getElementById('resetBtn').onclick=()=>{clearInterval(autoTimer);autoTimer=null;nodes.forEach(n=>n.canary=false)};
promoteRandom(3);draw();