const c=document.getElementById('canvas'),ctx=c.getContext('2d');
c.width=760;c.height=480;
const clients=[
  {x:80,y:60,label:'Web App',color:'#60a5fa',bff:0},
  {x:80,y:200,label:'Mobile App',color:'#f472b6',bff:1},
  {x:80,y:340,label:'IoT Device',color:'#fbbf24',bff:2}
];
const bffs=[
  {x:330,y:60,label:'Web BFF',color:'#6ee7b7'},
  {x:330,y:200,label:'Mobile BFF',color:'#6ee7b7'},
  {x:330,y:340,label:'IoT BFF',color:'#6ee7b7'}
];
const services=[
  {x:600,y:80,label:'User Svc'},
  {x:600,y:200,label:'Order Svc'},
  {x:600,y:320,label:'Inventory Svc'}
];
const bffToSvc=[[0,1],[1,2],[0,2]];
let particles=[];let active=-1;

function drawBox(x,y,w,h,label,col,glow){
  if(glow){ctx.shadowColor=col;ctx.shadowBlur=18}
  ctx.fillStyle=col+'22';ctx.strokeStyle=col;ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect(x-w/2,y-h/2,w,h,8);ctx.fill();ctx.stroke();
  ctx.shadowBlur=0;ctx.fillStyle='#e2e8f0';ctx.font='bold 13px system-ui';
  ctx.textAlign='center';ctx.fillText(label,x,y+5);
}
function lerp(a,b,t){return a+(b-a)*t}
function spawnParticles(from,to,col){
  for(let i=0;i<6;i++) particles.push({fx:from.x+50,fy:from.y,tx:to.x-50,ty:to.y,t:-i*0.08,col,speed:.012+Math.random()*.006});
}
function draw(){
  ctx.clearRect(0,0,c.width,c.height);
  // draw lines
  ctx.setLineDash([4,4]);ctx.lineWidth=1;ctx.strokeStyle='#334155';
  clients.forEach((cl,i)=>{ctx.beginPath();ctx.moveTo(cl.x+50,cl.y);ctx.lineTo(bffs[cl.bff].x-50,bffs[cl.bff].y);ctx.stroke()});
  bffs.forEach((_,bi)=>bffToSvc[bi].forEach(si=>{ctx.beginPath();ctx.moveTo(bffs[bi].x+50,bffs[bi].y);ctx.lineTo(services[si].x-55,services[si].y);ctx.stroke()}));
  ctx.setLineDash([]);
  // draw nodes
  clients.forEach((n,i)=>drawBox(n.x,n.y,100,40,n.label,n.color,active===i));
  bffs.forEach(n=>drawBox(n.x,n.y,100,40,n.label,n.color,false));
  services.forEach(n=>drawBox(n.x,n.y,110,40,n.label,'#94a3b8',false));
  // particles
  particles=particles.filter(p=>{
    p.t+=p.speed;if(p.t>1.1)return false;if(p.t<0)return true;
    const x=lerp(p.fx,p.tx,p.t),y=lerp(p.fy,p.ty,p.t);
    ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle=p.col;ctx.shadowColor=p.col;ctx.shadowBlur=10;ctx.fill();ctx.shadowBlur=0;
    return true;
  });
  requestAnimationFrame(draw);
}
c.addEventListener('click',e=>{
  const r=c.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
  clients.forEach((cl,i)=>{
    if(Math.abs(mx-cl.x)<50&&Math.abs(my-cl.y)<20){
      active=i;const b=bffs[cl.bff];
      spawnParticles(cl,b,cl.color);
      setTimeout(()=>bffToSvc[cl.bff].forEach(si=>spawnParticles(b,services[si],'#6ee7b7')),500);
    }
  });
});
draw();