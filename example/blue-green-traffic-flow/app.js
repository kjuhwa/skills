const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
const slider=document.getElementById('splitRange'),splitText=document.getElementById('splitText');
const bReqEl=document.getElementById('bReq'),gReqEl=document.getElementById('gReq');
const bLatEl=document.getElementById('bLat'),gLatEl=document.getElementById('gLat');
let particles=[];
const LB={x:400,y:60},BLUE={x:250,y:300},GREEN={x:550,y:300};
function spawn(){const bluePct=+slider.value;const goBlue=Math.random()*100<bluePct;const target=goBlue?BLUE:GREEN;const color=goBlue?'#60a5fa':'#34d399';particles.push({x:LB.x,y:LB.y,tx:target.x,ty:target.y,t:0,color,speed:.008+Math.random()*.012})}
function draw(){ctx.clearRect(0,0,800,400);
ctx.fillStyle='#2a2d37';ctx.strokeStyle='#444';
[[LB,'LB'],[BLUE,'Blue v3'],[GREEN,'Green v4']].forEach(([p,l])=>{ctx.beginPath();ctx.arc(p.x,p.y,30,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=p===BLUE?'#60a5fa':p===GREEN?'#34d399':'#6ee7b7';ctx.font='11px monospace';ctx.textAlign='center';ctx.fillText(l,p.x,p.y+4);ctx.fillStyle='#2a2d37'});
ctx.setLineDash([4,4]);ctx.strokeStyle='#333';
[[LB,BLUE],[LB,GREEN]].forEach(([a,b])=>{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()});
ctx.setLineDash([]);
particles.forEach(p=>{p.t+=p.speed;const x=p.x+(p.tx-p.x)*p.t,y=p.y+(p.ty-p.y)*p.t;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle=p.color;ctx.fill()});
particles=particles.filter(p=>p.t<1);
// users at top
for(let i=0;i<5;i++){const ux=300+i*50,uy=15;ctx.fillStyle='#555';ctx.fillText('👤',ux-6,uy+4)}
ctx.fillStyle='#666';ctx.font='10px monospace';ctx.fillText('Users',400,12)}
let bCount=0,gCount=0;
setInterval(()=>{for(let i=0;i<3;i++)spawn();particles.forEach(p=>{if(p.t>=.99){p.color==='#60a5fa'?bCount++:gCount++}})},100);
setInterval(()=>{bReqEl.textContent=bCount;gReqEl.textContent=gCount;bLatEl.textContent=(12+Math.random()*8|0);gLatEl.textContent=(10+Math.random()*10|0);bCount=0;gCount=0},1000);
slider.oninput=()=>{const v=+slider.value;splitText.textContent=v===100?'100% → Blue':v===0?'100% → Green':`${v}% Blue / ${100-v}% Green`};
function loop(){draw();requestAnimationFrame(loop)}loop();