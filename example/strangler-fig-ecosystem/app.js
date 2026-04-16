const c=document.getElementById('c'),ctx=c.getContext('2d');
let W,H,mx=0,my=0;
function resize(){W=c.width=innerWidth;H=c.height=innerHeight}
resize();window.onresize=resize;
c.onmousemove=e=>{mx=e.clientX;my=e.clientY};

const species=[
  {name:'Fig Wasp',color:'#f0c040',r:3,count:12},
  {name:'Fruit Bat',color:'#c084fc',r:6,count:5},
  {name:'Tree Frog',color:'#34d399',r:4,count:8},
  {name:'Orchid',color:'#f472b6',r:5,count:6},
  {name:'Beetle',color:'#fb923c',r:3,count:10},
  {name:'Bird',color:'#60a5fa',r:5,count:7}
];

let organisms=[];
function init(){
  organisms=[];
  const cx=W/2,cy=H/2;
  species.forEach(sp=>{
    for(let i=0;i<sp.count;i++){
      const a=Math.random()*Math.PI*2, d=80+Math.random()*200;
      organisms.push({
        x:cx+Math.cos(a)*d, y:cy+Math.sin(a)*d,
        vx:(Math.random()-.5)*1.5, vy:(Math.random()-.5)*1.5,
        sp, phase:Math.random()*Math.PI*2
      });
    }
  });
}
init();

function drawTree(){
  const cx=W/2,cy=H/2;
  ctx.fillStyle='#1e3a2a';
  ctx.beginPath();ctx.ellipse(cx,cy,140,180,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#2d5a40';ctx.lineWidth=2;
  for(let i=0;i<12;i++){
    const a=Math.PI*2*i/12,r1=60,r2=140+Math.random()*20;
    ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);
    ctx.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2);ctx.stroke();
  }
  ctx.fillStyle='#6ee7b744';
  ctx.beginPath();ctx.arc(cx,cy,80,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#c9cdd510';
  ctx.font='10px system-ui';ctx.textAlign='center';
  ctx.fillText('Strangler Fig',cx,cy+4);
}

let hovered=null;
function update(){
  const cx=W/2,cy=H/2;
  hovered=null;
  organisms.forEach(o=>{
    o.phase+=.02;
    o.x+=o.vx+Math.sin(o.phase)*.3;
    o.y+=o.vy+Math.cos(o.phase)*.3;
    const dx=o.x-cx,dy=o.y-cy,dist=Math.sqrt(dx*dx+dy*dy);
    if(dist>280){o.vx-=dx*.002;o.vy-=dy*.002}
    if(dist<60){o.vx+=dx*.003;o.vy+=dy*.003}
    o.vx*=.99;o.vy*=.99;
    const dmx=o.x-mx,dmy=o.y-my;
    if(Math.sqrt(dmx*dmx+dmy*dmy)<o.sp.r+10)hovered=o;
  });
}

function draw(){
  ctx.fillStyle='#0f1117';ctx.fillRect(0,0,W,H);
  drawTree();
  organisms.forEach(o=>{
    ctx.fillStyle=o===hovered?'#fff':o.sp.color;
    ctx.beginPath();ctx.arc(o.x,o.y,o===hovered?o.sp.r+3:o.sp.r,0,Math.PI*2);ctx.fill();
    if(o===hovered){
      ctx.strokeStyle=o.sp.color;ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(o.x,o.y,o.sp.r+8,0,Math.PI*2);ctx.stroke();
    }
  });
  document.getElementById('hover').textContent=hovered?
    `${hovered.sp.name} — one of ${hovered.sp.count} nearby`:'Hover over an organism';
  update();
  requestAnimationFrame(draw);
}

document.getElementById('stats').innerHTML=species.map(s=>
  `<div class="st"><span><span class="dot" style="background:${s.color}"></span>${s.name}</span><span>${s.count}</span></div>`
).join('');
draw();