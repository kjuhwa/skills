const canvas=document.getElementById('arena'),ctx=canvas.getContext('2d'),boardEl=document.getElementById('board');
let W,H;
function resize(){W=canvas.width=canvas.offsetWidth*2;H=canvas.height=canvas.offsetHeight*2}
resize();window.addEventListener('resize',resize);
const colors=['#6ee7b7','#7dd3fc','#c084fc','#fbbf24','#fb923c'];
const racers=[
  {name:'ws://fast-api',delivered:0,speed:1.8,x:0,particles:[]},
  {name:'ws://chat-relay',delivered:0,speed:1.4,x:0,particles:[]},
  {name:'ws://data-feed',delivered:0,speed:2.2,x:0,particles:[]},
  {name:'ws://event-bus',delivered:0,speed:1.1,x:0,particles:[]},
  {name:'ws://live-sync',delivered:0,speed:1.6,x:0,particles:[]}
];
const laneH=H/racers.length,finishX=W-60;
function emit(r){
  const jitter=(Math.random()-.5)*0.6;
  r.particles.push({x:50,v:r.speed+jitter+Math.random()*0.8,alpha:1});
}
function updateBoard(){
  boardEl.innerHTML='';
  const sorted=[...racers].sort((a,b)=>b.delivered-a.delivered);
  sorted.forEach((r,i)=>{
    const d=document.createElement('div');d.className='card';
    d.style.borderColor=colors[racers.indexOf(r)];
    d.innerHTML=`<div class="name">#${i+1} ${r.name}</div><div class="val">${r.delivered}</div><div class="meta">msgs delivered</div>`;
    boardEl.appendChild(d);
  });
}
function draw(){
  ctx.clearRect(0,0,W,H);
  racers.forEach((r,i)=>{
    const y=i*laneH,cy=y+laneH/2,col=colors[i];
    ctx.fillStyle='#ffffff06';ctx.fillRect(0,y,W,laneH);
    ctx.strokeStyle='#2a2d37';ctx.beginPath();ctx.moveTo(0,y+laneH);ctx.lineTo(W,y+laneH);ctx.stroke();
    ctx.fillStyle=col;ctx.font='20px sans-serif';ctx.textAlign='left';ctx.globalAlpha=.6;
    ctx.fillText(r.name,8,cy+5);ctx.globalAlpha=1;
    ctx.strokeStyle='#6ee7b744';ctx.setLineDash([4,8]);
    ctx.beginPath();ctx.moveTo(finishX,y+4);ctx.lineTo(finishX,y+laneH-4);ctx.stroke();ctx.setLineDash([]);
    r.particles=r.particles.filter(p=>{
      p.x+=p.v*2.5;p.alpha=Math.max(0,1-(p.x/finishX));
      if(p.x>=finishX){r.delivered++;return false}
      ctx.beginPath();ctx.arc(p.x,cy,4,0,Math.PI*2);
      ctx.fillStyle=col;ctx.globalAlpha=p.alpha*.8;ctx.fill();ctx.globalAlpha=1;
      return true;
    });
  });
  requestAnimationFrame(draw);
}
setInterval(()=>{racers.forEach(r=>{if(Math.random()<.7)emit(r)})},200);
setInterval(updateBoard,1000);
updateBoard();draw();