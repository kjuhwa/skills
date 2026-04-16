const c=document.getElementById('c'),ctx=c.getContext('2d');
let W,H,t=0,roots=[],speed=3;
const stages=['Seedling','Epiphyte','Wrapping','Strangling','Free-standing'];
function resize(){W=c.width=innerWidth;H=c.height=innerHeight}
resize();window.onresize=resize;
document.getElementById('speed').oninput=e=>speed=+e.target.value;
document.getElementById('reset').onclick=()=>{t=0;roots=[];initRoots()};

function initRoots(){
  roots=[];
  for(let i=0;i<8;i++){
    const a=Math.PI*2*i/8;
    roots.push({a,r:0,w:2+Math.random()*2,speed:.2+Math.random()*.3,wiggle:Math.random()*2});
  }
}
initRoots();

function drawTree(cx,cy,progress){
  // Host tree trunk
  const alpha=Math.max(0,1-progress*.8);
  ctx.fillStyle=`rgba(90,70,50,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(cx,cy+60,25-progress*8,120,0,0,Math.PI*2);
  ctx.fill();
  // Canopy
  if(alpha>.1){
    ctx.fillStyle=`rgba(40,100,60,${alpha})`;
    ctx.beginPath();ctx.arc(cx,cy-80,60,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(cx-30,cy-50,40,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(cx+30,cy-50,40,0,Math.PI*2);ctx.fill();
  }
}

function drawRoots(cx,cy,progress){
  roots.forEach(root=>{
    const len=progress*180*root.speed;
    const segs=Math.floor(len/4);
    ctx.beginPath();
    ctx.strokeStyle=`rgba(110,231,183,${.3+progress*.5})`;
    ctx.lineWidth=root.w*(.5+progress*.8);
    let x=cx+Math.cos(root.a)*20, y=cy-60;
    ctx.moveTo(x,y);
    for(let i=0;i<segs;i++){
      const t2=i/segs;
      x+=Math.cos(root.a+Math.sin(i*.1+root.wiggle)*.5)*3;
      y+=2.5;
      ctx.lineTo(x,y);
    }
    ctx.stroke();
  });
}

function draw(){
  ctx.fillStyle='#0f1117';ctx.fillRect(0,0,W,H);
  t+=speed*.001;
  const progress=Math.min(t,1);
  const stageIdx=Math.min(4,Math.floor(progress*5));
  document.getElementById('stage').textContent='Stage: '+stages[stageIdx];
  const cx=W/2,cy=H/2;
  drawTree(cx,cy,progress);
  drawRoots(cx,cy,progress);
  // Fig canopy grows
  if(progress>.4){
    const cp=(progress-.4)/.6;
    ctx.fillStyle=`rgba(110,231,183,${cp*.25})`;
    ctx.beginPath();ctx.arc(cx,cy-90,70*cp,0,Math.PI*2);ctx.fill();
  }
  requestAnimationFrame(draw);
}
draw();