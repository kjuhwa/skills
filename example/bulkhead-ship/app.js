```js
const canvas=document.getElementById('c');
const ctx=canvas.getContext('2d');
const statusEl=document.getElementById('status');
canvas.width=760;canvas.height=340;

const COMPS=[
  {x:80,w:120,label:'Bow',water:0,breached:false},
  {x:210,w:120,label:'Cargo A',water:0,breached:false},
  {x:340,w:120,label:'Engine',water:0,breached:false},
  {x:470,w:120,label:'Cargo B',water:0,breached:false},
  {x:600,w:100,label:'Stern',water:0,breached:false}
];
const HULL_Y=80,HULL_H=180,WATER_RATE=0.004;

function drawHull(){
  ctx.beginPath();
  ctx.moveTo(40,HULL_Y);ctx.lineTo(720,HULL_Y);
  ctx.lineTo(740,HULL_Y+HULL_H);ctx.quadraticCurveTo(380,HULL_Y+HULL_H+60,20,HULL_Y+HULL_H);
  ctx.closePath();
  ctx.strokeStyle='#6ee7b744';ctx.lineWidth=2;ctx.stroke();
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawHull();
  COMPS.forEach(c=>{
    ctx.fillStyle='#1a1d2788';
    ctx.fillRect(c.x,HULL_Y,c.w,HULL_H);
    ctx.strokeStyle='#6ee7b766';ctx.lineWidth=1.5;
    ctx.strokeRect(c.x,HULL_Y,c.w,HULL_H);
    if(c.water>0){
      const wh=c.water*HULL_H;
      const grad=ctx.createLinearGradient(0,HULL_Y+HULL_H-wh,0,HULL_Y+HULL_H);
      grad.addColorStop(0,'#3b82f644');grad.addColorStop(1,'#3b82f6aa');
      ctx.fillStyle=grad;
      ctx.fillRect(c.x+1,HULL_Y+HULL_H-wh,c.w-2,wh);
    }
    ctx.fillStyle='#6ee7b7';ctx.lineWidth=3;
    ctx.fillRect(c.x-2,HULL_Y,4,HULL_H);
    ctx.fillStyle=c.breached?'#f87171':'#c9d1d9';
    ctx.font='bold 13px Segoe UI';ctx.textAlign='center';
    ctx.fillText(c.label,c.x+c.w/2,HULL_Y+20);
    ctx.font='11px Segoe UI';ctx.fillStyle='#888';
    ctx.fillText(Math.round(c.water*100)+'%',c.x+c.w/2,HULL_Y+38);
    if(c.breached){
      ctx.fillStyle='#f8717188';ctx.font='bold 11px Segoe UI';
      ctx.fillText('BREACH',c.x+c.w/2,HULL_Y+HULL_H-10);
    }
  });
  const last=COMPS[COMPS.length-1];
  ctx.fillStyle='#6ee7b7';ctx.fillRect(last.x+last.w-2,HULL_Y,4,HULL_H);
}

function update(){
  COMPS.forEach(c=>{if(c.breached&&c.water<1)c.water=Math.min(1,c.water+WATER_RATE);});
  const breached=COMPS.filter(c=>c.breached).length;
  statusEl.textContent=breached===0?'All compartments sealed':`${breached} breached — bulkheads holding ${COMPS.length-breached} dry`;
  statusEl.style.borderColor=breached?'#f87171':'#2a2d37';
  draw();requestAnimationFrame(update);
}

canvas.addEventListener('click',e=>{
  const rect=canvas.getBoundingClientRect();
  const sx=canvas.width/rect.width,sy=canvas.height/rect.height;
  const mx=(e.clientX-rect.left)*sx,my=(e.clientY-rect.top)*sy;
  COMPS.forEach(c=>{
    if(mx>=c.x&&mx<=c.x+c.w&&my>=HULL_Y&&my<=HULL_Y+HULL_H){
      c.breached=!c.breached;if(!c.breached)c.water=0;
    }
  });
});

update();
```