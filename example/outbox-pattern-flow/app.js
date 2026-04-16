const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
const log=document.getElementById('log');
let W,H,auto=false,particles=[];
const nodes=[
  {id:'svc',label:'Service',x:.12,y:.45,color:'#58a6ff'},
  {id:'db',label:'DB + Outbox',x:.35,y:.45,color:'#f0ad4e'},
  {id:'relay',label:'Relay',x:.58,y:.45,color:'#da70d6'},
  {id:'broker',label:'Broker',x:.82,y:.45,color:'#6ee7b7'}
];
function resize(){W=canvas.width=Math.min(900,innerWidth-40);H=canvas.height=320}
resize();window.onresize=resize;
function addLog(msg,cls='ok'){const d=document.createElement('div');d.className=cls;d.textContent=`[${new Date().toLocaleTimeString()}] ${msg}`;log.prepend(d);if(log.children.length>40)log.lastChild.remove()}
function nx(n){return n.x*W}
function ny(n){return n.y*H}
function drawArrow(x1,y1,x2,y2){
  ctx.beginPath();ctx.moveTo(x1+50,y1);ctx.lineTo(x2-50,y2);
  ctx.strokeStyle='#6ee7b733';ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.stroke();ctx.setLineDash([]);
  const a=Math.atan2(y2-y1,x2-x1-100);const ex=x2-50;
  ctx.beginPath();ctx.moveTo(ex,y2);ctx.lineTo(ex-10*Math.cos(a-0.4),y2-10*Math.sin(a-0.4));ctx.lineTo(ex-10*Math.cos(a+0.4),y2-10*Math.sin(a+0.4));ctx.fillStyle='#6ee7b744';ctx.fill();
}
function drawNode(n){
  const x=nx(n),y=ny(n);
  ctx.fillStyle=n.color+'22';ctx.strokeStyle=n.color;ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect(x-45,y-28,90,56,10);ctx.fill();ctx.stroke();
  ctx.fillStyle=n.color;ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText(n.label,x,y+5);
}
function spawnParticle(fromIdx,toIdx,label){
  particles.push({from:fromIdx,to:toIdx,t:0,label,color:nodes[toIdx].color});
}
function sendEvent(){
  spawnParticle(0,1,'write');
  addLog('Service writes event to Outbox table (in same DB tx)');
  setTimeout(()=>addLog('Row inserted: status=PENDING',),300);
}
function runRelay(){
  spawnParticle(1,2,'poll');
  addLog('Relay polls outbox for PENDING rows','warn');
  setTimeout(()=>{spawnParticle(2,3,'pub');addLog('Relay publishes to broker & marks SENT')},800);
}
document.getElementById('sendBtn').onclick=sendEvent;
document.getElementById('relayBtn').onclick=runRelay;
document.getElementById('autoBtn').onclick=function(){auto=!auto;this.classList.toggle('active');this.textContent=auto?'Stop Auto':'Auto Mode'};
let tick=0;
function frame(){
  ctx.clearRect(0,0,W,H);
  for(let i=0;i<nodes.length-1;i++)drawArrow(nx(nodes[i]),ny(nodes[i]),nx(nodes[i+1]),ny(nodes[i+1]));
  nodes.forEach(drawNode);
  particles=particles.filter(p=>{
    p.t+=0.018;if(p.t>1)return false;
    const f=nodes[p.from],t=nodes[p.to];
    const x=nx(f)+(nx(t)-nx(f))*p.t, y=ny(f)+(ny(t)-ny(f))*p.t+Math.sin(p.t*Math.PI)*-30;
    ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fillStyle=p.color;ctx.fill();
    ctx.fillStyle='#fff';ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText(p.label,x,y-12);
    return true;
  });
  tick++;if(auto&&tick%120===0){sendEvent();setTimeout(runRelay,600)}
  requestAnimationFrame(frame);
}
frame();
addLog('Ready — click Send Event then Run Relay');