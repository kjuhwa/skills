const canvas=document.getElementById('dag'),ctx=canvas.getContext('2d'),tooltip=document.getElementById('tooltip');
const nodes=[
  {id:'orders',type:'table',label:'orders',x:0,y:0,row:'80K rows'},
  {id:'products',type:'table',label:'products',x:0,y:0,row:'2.4K rows'},
  {id:'users',type:'table',label:'users',x:0,y:0,row:'12K rows'},
  {id:'mv_sales',type:'mv',label:'mv_daily_sales',x:0,y:0,row:'365 rows',deps:['orders','products'],query:'SELECT date, SUM(total)…',stale:false},
  {id:'mv_top',type:'mv',label:'mv_top_products',x:0,y:0,row:'50 rows',deps:['orders','products'],query:'SELECT pid, COUNT(*)…',stale:true},
  {id:'mv_cohort',type:'mv',label:'mv_user_cohorts',x:0,y:0,row:'24 rows',deps:['users','orders'],query:'SELECT cohort, AVG(ltv)…',stale:false},
  {id:'dashboard',type:'view',label:'dashboard_view',x:0,y:0,row:'live',deps:['mv_sales','mv_top','mv_cohort']}
];
const edges=[];
nodes.forEach(n=>{(n.deps||[]).forEach(d=>edges.push({from:d,to:n.id}))});
let W,H,dragging=null,mx=0,my=0,hovered=null;
function resize(){W=canvas.width=innerWidth;H=canvas.height=innerHeight-49;layout()}
function layout(){
  const cols={table:1,mv:2,view:3},groups={};
  nodes.forEach(n=>{const c=cols[n.type];(groups[c]=groups[c]||[]).push(n)});
  Object.entries(groups).forEach(([c,arr])=>{const cx=W*c/4;arr.forEach((n,i)=>{n.x=cx;n.y=H*(i+1)/(arr.length+1)})});
}
function drawArrow(x1,y1,x2,y2,color){
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
  const ex=x2-ux*32,ey=y2-uy*32,sx=x1+ux*32,sy=y1+uy*32;
  ctx.beginPath();ctx.moveTo(sx,sy);
  const midX=(sx+ex)/2+dy*.15,midY=(sy+ey)/2-dx*.15;
  ctx.quadraticCurveTo(midX,midY,ex,ey);
  ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();
  const a=Math.atan2(ey-midY,ex-midX);
  ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex-10*Math.cos(a-.3),ey-10*Math.sin(a-.3));ctx.lineTo(ex-10*Math.cos(a+.3),ey-10*Math.sin(a+.3));ctx.fillStyle=color;ctx.fill();
}
function drawNode(n){
  const r=28,colors={table:'#3b82f6',mv:'#6ee7b7',view:'#f59e0b'};
  const c=colors[n.type],isH=hovered===n;
  ctx.save();
  if(n.type==='mv'&&n.stale){ctx.shadowColor='#ef4444';ctx.shadowBlur=16}
  else if(isH){ctx.shadowColor=c;ctx.shadowBlur=20}
  ctx.beginPath();ctx.arc(n.x,n.y,r,0,Math.PI*2);
  ctx.fillStyle=isH?c+'33':'#1a1d27';ctx.fill();
  ctx.strokeStyle=n.stale?'#ef4444':c;ctx.lineWidth=2;ctx.stroke();
  ctx.restore();
  ctx.fillStyle=c;ctx.font='bold 10px system-ui';ctx.textAlign='center';
  ctx.fillText(n.label,n.x,n.y+r+14);
  ctx.fillStyle='#888';ctx.font='9px system-ui';ctx.fillText(n.row,n.x,n.y+r+26);
  if(n.stale){ctx.fillStyle='#ef4444';ctx.font='bold 8px system-ui';ctx.fillText('STALE',n.x,n.y-r-6)}
}
function draw(){
  ctx.clearRect(0,0,W,H);
  edges.forEach(e=>{const f=nodes.find(n=>n.id===e.from),t=nodes.find(n=>n.id===e.to);
    drawArrow(f.x,f.y,t.x,t.y,hovered&&(hovered===f||hovered===t)?'#6ee7b7':'#2a2d37')});
  nodes.forEach(drawNode);
  requestAnimationFrame(draw);
}
function findNode(x,y){return nodes.find(n=>Math.hypot(n.x-x,n.y-y)<30)}
canvas.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY-49;
  if(dragging){dragging.x=mx;dragging.y=my;return}
  const n=findNode(mx,my);hovered=n;
  if(n){tooltip.style.opacity=1;tooltip.style.left=e.clientX+12+'px';tooltip.style.top=e.clientY+12+'px';
    tooltip.innerHTML=`<b>${n.label}</b><br>Type: ${n.type}<br>${n.row}${n.query?'<br>'+n.query:''}${n.stale?'<br><span style="color:#ef4444">⚠ Needs refresh</span>':''}`}
  else tooltip.style.opacity=0});
canvas.addEventListener('mousedown',e=>{dragging=findNode(mx,my)});
canvas.addEventListener('mouseup',()=>{dragging=null});
document.getElementById('refreshBtn').onclick=()=>{nodes.forEach(n=>{if(n.type==='mv')n.stale=false});setTimeout(()=>nodes.find(n=>n.id==='mv_top').stale=true,4000)};
document.getElementById('resetBtn').onclick=layout;
addEventListener('resize',resize);resize();draw();