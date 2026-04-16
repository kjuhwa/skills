const canvas=document.getElementById('flow'),ctx=canvas.getContext('2d');
let W,H;
function resize(){W=canvas.width=innerWidth;H=canvas.height=innerHeight}
window.addEventListener('resize',resize);resize();

const TYPES={upload:{color:'#6ee7b7',dx:1},download:{color:'#60a5fa',dx:-1},delete:{color:'#f472b6',dx:0}};
const bucketNames=['media','uploads','logs','backups','cdn'];
const particles=[];
const bucketY=[];
bucketNames.forEach((_,i)=>bucketY.push(80+i*(H>400?(H-160)/bucketNames.length:50)));

function spawn(){
  const types=Object.keys(TYPES);
  const type=types[Math.random()*3|0];
  const bi=Math.random()*bucketNames.length|0;
  const y=bucketY[bi]||(80+bi*60);
  const t=TYPES[type];
  particles.push({
    x:type==='download'?W/2:40,
    y:y+Math.random()*20-10,
    tx:type==='upload'?W/2:type==='download'?W-40:W/2,
    ty:y+Math.random()*20-10,
    progress:0,
    speed:.008+Math.random()*.012,
    type,color:t.color,size:Math.random()*3+2,
    bucket:bi
  });
}

let ups=0,dns=0,dels=0;
function draw(){
  ctx.fillStyle='rgba(15,17,23,.15)';ctx.fillRect(0,0,W,H);
  // draw storage node
  ctx.fillStyle='#1a1d27';ctx.strokeStyle='#6ee7b744';ctx.lineWidth=2;
  const sx=W/2-30,sy=40,sw=60,sh=H-80;
  ctx.beginPath();ctx.roundRect(sx,sy,sw,sh,8);ctx.fill();ctx.stroke();
  ctx.fillStyle='#6ee7b7';ctx.font='11px sans-serif';ctx.textAlign='center';
  ctx.fillText('STORE',W/2,sy+sh/2);
  // bucket labels
  ctx.textAlign='left';ctx.fillStyle='#6b7280';ctx.font='10px sans-serif';
  bucketNames.forEach((n,i)=>{
    const y=bucketY[i]||80+i*60;
    ctx.fillText(n,8,y+4);
  });
  // spawn
  if(Math.random()<.3)spawn();
  // update
  let u=0,d=0,de=0;
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.progress+=p.speed;
    if(p.progress>=1){particles.splice(i,1);continue}
    const t=p.progress;
    const x=p.x+(p.tx-p.x)*t;
    const yOff=Math.sin(t*Math.PI)*-20;
    const y=p.y+(p.ty-p.y)*t+yOff;
    ctx.globalAlpha=t<.1?t*10:t>.85?(1-t)*6.67:1;
    ctx.fillStyle=p.color;
    ctx.beginPath();ctx.arc(x,y,p.size,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
    if(p.type==='upload')u++;else if(p.type==='download')d++;else de++;
  }
  ups+=(u-ups)*.1;dns+=(d-dns)*.1;dels+=(de-dels)*.1;
  document.getElementById('up-count').textContent=Math.round(ups*2);
  document.getElementById('dn-count').textContent=Math.round(dns*2);
  document.getElementById('del-count').textContent=Math.round(dels);
  document.getElementById('tp').textContent=((ups+dns)*1.4).toFixed(1);
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);