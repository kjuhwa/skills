const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
const info=document.getElementById('info');
const THRESHOLD=5,TIMEOUT=3000;
let state='closed',failures=0,openedAt=0,particles=[];

const nodes={
  closed:{x:140,y:210,color:'#6ee7b7',label:'CLOSED'},
  open:{x:560,y:210,color:'#f87171',label:'OPEN'},
  halfOpen:{x:350,y:80,color:'#fbbf24',label:'HALF-OPEN'}
};

function drawArrow(x1,y1,x2,y2,label,active){
  const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy);
  const ux=dx/len,uy=dy/len;
  const sx=x1+ux*48,sy=y1+uy*48,ex=x2-ux*48,ey=y2-uy*48;
  ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(ex,ey);
  ctx.strokeStyle=active?'#6ee7b7':'#2a2d37';ctx.lineWidth=active?2.5:1.5;ctx.stroke();
  const ax=ex-ux*10+uy*5,ay=ey-uy*10-ux*5;
  const bx=ex-ux*10-uy*5,by=ey-uy*10+ux*5;
  ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ax,ay);ctx.lineTo(bx,by);ctx.fill();
  ctx.fillStyle='#8b949e';ctx.font='11px Segoe UI';
  ctx.fillText(label,(sx+ex)/2-20,(sy+ey)/2-8);
}

function draw(){
  ctx.clearRect(0,0,700,420);
  drawArrow(nodes.closed.x,nodes.closed.y,nodes.open.x,nodes.open.y,`${THRESHOLD} failures`,state==='open');
  drawArrow(nodes.open.x,nodes.open.y,nodes.halfOpen.x,nodes.halfOpen.y,'timeout',state==='halfOpen');
  drawArrow(nodes.halfOpen.x,nodes.halfOpen.y,nodes.closed.x,nodes.closed.y,'success',state==='closed'&&failures===0);
  drawArrow(nodes.halfOpen.x,nodes.halfOpen.y,nodes.open.x,nodes.open.y,'failure',false);

  for(const[k,n]of Object.entries(nodes)){
    const active=state===k||(k==='halfOpen'&&state==='halfOpen');
    ctx.beginPath();ctx.arc(n.x,n.y,42,0,Math.PI*2);
    ctx.fillStyle=active?n.color+'22':'#1a1d27';ctx.fill();
    ctx.strokeStyle=active?n.color:'#2a2d37';ctx.lineWidth=active?3:1.5;ctx.stroke();
    ctx.fillStyle=active?n.color:'#555';ctx.font='bold 13px Segoe UI';ctx.textAlign='center';
    ctx.fillText(n.label,n.x,n.y+5);
  }
  particles.forEach((p,i)=>{p.life-=.02;if(p.life<=0){particles.splice(i,1);return;}
    ctx.beginPath();ctx.arc(p.x,p.y,3*p.life,0,Math.PI*2);ctx.fillStyle=p.color;ctx.globalAlpha=p.life;ctx.fill();ctx.globalAlpha=1;
    p.x+=p.vx;p.y+=p.vy;});
  info.textContent=`State: ${state.toUpperCase()} | Failures: ${failures}/${THRESHOLD}`;
}

function burst(x,y,color){for(let i=0;i<12;i++)particles.push({x,y,vx:(Math.random()-.5)*3,vy:(Math.random()-.5)*3,life:1,color});}

function transition(newState){
  const n=nodes[newState]||nodes.closed;
  burst(n.x,n.y,n.color);state=newState;
}

document.getElementById('btnSuccess').onclick=()=>{
  if(state==='open')return;
  if(state==='halfOpen'){failures=0;transition('closed');}
};
document.getElementById('btnFail').onclick=()=>{
  if(state==='open')return;
  failures++;
  if(state==='halfOpen'||failures>=THRESHOLD){failures=0;openedAt=Date.now();transition('open');}
};
document.getElementById('btnReset').onclick=()=>{state='closed';failures=0;openedAt=0;};

setInterval(()=>{if(state==='open'&&Date.now()-openedAt>TIMEOUT)transition('halfOpen');draw();},50);
draw();