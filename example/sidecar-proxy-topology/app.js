const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d'),tip=document.getElementById('tooltip');
let W,H;function resize(){W=canvas.width=innerWidth-40;H=canvas.height=innerHeight-90}
resize();addEventListener('resize',resize);

const services=[
  {id:'api-gw',label:'API Gateway',x:0,y:0},
  {id:'user-svc',label:'User Service',x:0,y:0},
  {id:'order-svc',label:'Order Service',x:0,y:0},
  {id:'payment-svc',label:'Payment Service',x:0,y:0},
  {id:'inventory-svc',label:'Inventory Service',x:0,y:0},
];
const edges=[['api-gw','user-svc'],['api-gw','order-svc'],['order-svc','payment-svc'],['order-svc','inventory-svc'],['user-svc','order-svc']];

services.forEach((s,i)=>{const a=((Math.PI*2)/services.length)*i-Math.PI/2;s.x=W/2+Math.min(W,H)*0.32*Math.cos(a);s.y=H/2+Math.min(W,H)*0.32*Math.sin(a)});

let drag=null,selected=null,mx=0,my=0,particles=[];

function sidecarPos(s){return{x:s.x+28,y:s.y+28}}

function spawnParticle(a,b){particles.push({x:a.x,y:a.y,tx:b.x,ty:b.y,t:0,spd:.008+Math.random()*.012})}

setInterval(()=>{const e=edges[Math.random()*edges.length|0];const a=services.find(s=>s.id===e[0]),b=services.find(s=>s.id===e[1]);if(a&&b)spawnParticle(sidecarPos(a),sidecarPos(b))},400);

canvas.addEventListener('mousedown',e=>{const r=canvas.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top;for(const s of services){if(Math.hypot(s.x-mx,s.y-my)<26){drag=s;selected=s;canvas.style.cursor='grabbing';return}}selected=null});
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();const cx=e.clientX-r.left,cy=e.clientY-r.top;if(drag){drag.x+=cx-mx;drag.y+=cy-my;mx=cx;my=cy}else{let found=false;for(const s of services){if(Math.hypot(s.x-cx,s.y-cy)<26){tip.classList.remove('hidden');tip.style.left=e.clientX+14+'px';tip.style.top=e.clientY+14+'px';tip.innerHTML=`<b>${s.label}</b><br>Sidecar: Envoy<br>mTLS: enabled<br>RPS: ${(Math.random()*500+100)|0}`;found=true;break}}if(!found)tip.classList.add('hidden')}});
canvas.addEventListener('mouseup',()=>{drag=null;canvas.style.cursor='grab'});

function draw(){ctx.clearRect(0,0,W,H);
  edges.forEach(([a,b])=>{const sa=services.find(s=>s.id===a),sb=services.find(s=>s.id===b);const pa=sidecarPos(sa),pb=sidecarPos(sb);ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.strokeStyle='#2a2e3a';ctx.lineWidth=1.5;ctx.setLineDash([4,4]);ctx.stroke();ctx.setLineDash([])});

  particles=particles.filter(p=>{p.t+=p.spd;if(p.t>=1)return false;const x=p.x+(p.tx-p.x)*p.t,y=p.y+(p.ty-p.y)*p.t;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle=`rgba(110,231,183,${1-p.t})`;ctx.fill();return true});

  services.forEach(s=>{const isSel=s===selected;
    ctx.beginPath();ctx.arc(s.x,s.y,24,0,Math.PI*2);ctx.fillStyle=isSel?'#2d3748':'#1e2330';ctx.strokeStyle=isSel?'#6ee7b7':'#333';ctx.lineWidth=2;ctx.fill();ctx.stroke();
    const sp=sidecarPos(s);ctx.beginPath();ctx.arc(sp.x,sp.y,10,0,Math.PI*2);ctx.fillStyle='#6ee7b733';ctx.strokeStyle='#6ee7b7';ctx.lineWidth=1;ctx.fill();ctx.stroke();
    ctx.fillStyle='#c9d1d9';ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillText(s.label,s.x,s.y+40);
    ctx.fillStyle='#6ee7b7';ctx.font='8px system-ui';ctx.fillText('envoy',sp.x,sp.y+3);
  });
  requestAnimationFrame(draw)}
draw();