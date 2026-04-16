const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
let W,H;function resize(){W=canvas.width=Math.min(900,innerWidth-20);H=canvas.height=Math.min(500,innerHeight-120)}
resize();addEventListener('resize',resize);

const queues=[
  {label:'Producer',x:.08,y:.5,color:'#6ee7b7'},
  {label:'Main Queue',x:.35,y:.5,color:'#58a6ff'},
  {label:'Consumer',x:.62,y:.35,color:'#d2a8ff'},
  {label:'DLQ',x:.62,y:.72,color:'#f85149'}
];
let particles=[],processed=0,failed=0;

function addParticle(forceFail){
  particles.push({x:queues[0].x*W,y:queues[0].y*H,stage:0,t:0,fail:forceFail||Math.random()<.3,opacity:1});
}

document.getElementById('btnSend').onclick=()=>addParticle(false);
document.getElementById('btnFail').onclick=()=>addParticle(true);

// seed
for(let i=0;i<5;i++) setTimeout(()=>addParticle(false),i*400);

function lerp(a,b,t){return a+(b-a)*t}

function drawNode(q){
  const x=q.x*W,y=q.y*H;
  ctx.fillStyle=q.color+'22';ctx.strokeStyle=q.color;ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect(x-44,y-20,88,40,10);ctx.fill();ctx.stroke();
  ctx.fillStyle=q.color;ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(q.label,x,y);
}

function drawArrow(ax,ay,bx,by,col){
  ctx.strokeStyle=col+'55';ctx.lineWidth=1.5;ctx.setLineDash([4,4]);
  ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();ctx.setLineDash([]);
}

function update(){
  particles.forEach(p=>{
    p.t+=.018;
    if(p.t>=1){p.t=0;p.stage++;
      if(p.stage===2&&!p.fail){processed++;p.stage=9;}
      if(p.stage===2&&p.fail){p.stage=3;}
      if(p.stage===4){failed++;p.stage=9;}
    }
    if(p.stage===9) p.opacity-=.04;
  });
  particles=particles.filter(p=>p.opacity>0);
}

function draw(){
  ctx.clearRect(0,0,W,H);
  // arrows
  drawArrow(queues[0].x*W+44,queues[0].y*H,queues[1].x*W-44,queues[1].y*H,'#6ee7b7');
  drawArrow(queues[1].x*W+44,queues[1].y*H-8,queues[2].x*W-44,queues[2].y*H,'#58a6ff');
  drawArrow(queues[1].x*W+44,queues[1].y*H+8,queues[3].x*W-44,queues[3].y*H,'#f85149');

  queues.forEach(drawNode);

  particles.forEach(p=>{
    let sx,sy,ex,ey;
    const pairs=[[0,1],[1,p.fail?3:2],[p.fail?3:2,p.fail?3:2]];
    const pair=pairs[Math.min(p.stage,2)];
    if(p.stage>2){sx=ex=queues[pair[1]].x*W;sy=ey=queues[pair[1]].y*H;}
    else{sx=queues[pair[0]].x*W+44;sy=queues[pair[0]].y*H;ex=queues[pair[1]].x*W-44;ey=queues[pair[1]].y*H;}
    const px=lerp(sx,ex,p.t),py=lerp(sy,ey,p.t);
    ctx.globalAlpha=p.opacity;
    ctx.fillStyle=p.fail?'#f85149':'#6ee7b7';
    ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  });

  document.getElementById('stats').textContent=`Processed: ${processed} | Dead-lettered: ${failed}`;
  requestAnimationFrame(draw);
}
setInterval(()=>addParticle(false),1800);
function frame(){update();draw();requestAnimationFrame(frame)}
frame();