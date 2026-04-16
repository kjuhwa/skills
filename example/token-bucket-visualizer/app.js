const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
let bucketMax=15,tokens=15,refillRate=3,particles=[];
const log=document.getElementById('log');
function addLog(msg,ok){const d=document.createElement('div');d.className=ok?'ok':'deny';d.textContent=`[${new Date().toLocaleTimeString()}] ${msg}`;log.prepend(d);if(log.children.length>30)log.lastChild.remove()}
document.getElementById('bucketSize').oninput=e=>{bucketMax=+e.target.value;document.getElementById('bucketSizeVal').textContent=bucketMax;tokens=Math.min(tokens,bucketMax)};
document.getElementById('refillRate').oninput=e=>{refillRate=+e.target.value;document.getElementById('refillRateVal').textContent=refillRate};
function tryRequest(){if(tokens>=1){tokens--;particles.push({x:350,y:200,vx:(Math.random()-.5)*4,vy:-Math.random()*3-2,life:1,ok:true});addLog('Request ALLOWED — token consumed',true)}else{particles.push({x:350,y:60,vx:(Math.random()-.5)*3,vy:(Math.random()-.5)*3,life:1,ok:false});addLog('Request DENIED — bucket empty',false)}}
document.getElementById('sendRequest').onclick=tryRequest;
document.getElementById('burstBtn').onclick=()=>{for(let i=0;i<5;i++)setTimeout(tryRequest,i*80)};
setInterval(()=>{tokens=Math.min(tokens+refillRate/20,bucketMax)},50);
function draw(){ctx.clearRect(0,0,700,400);
const bx=250,by=100,bw=200,bh=250,fill=tokens/bucketMax;
ctx.strokeStyle='#6ee7b7';ctx.lineWidth=2;ctx.strokeRect(bx,by,bw,bh);
ctx.fillStyle='rgba(110,231,183,0.25)';const fh=bh*fill;ctx.fillRect(bx+2,by+bh-fh,bw-4,fh);
ctx.fillStyle='#6ee7b7';ctx.font='bold 28px system-ui';ctx.textAlign='center';ctx.fillText(Math.floor(tokens),350,by+bh/2+10);
ctx.font='12px system-ui';ctx.fillStyle='#94a3b8';ctx.fillText(`capacity: ${bucketMax}`,350,by-10);ctx.fillText(`refill: ${refillRate}/s`,350,by+bh+20);
particles=particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.life-=.018;ctx.beginPath();ctx.arc(p.x,p.y,4*p.life,0,Math.PI*2);ctx.fillStyle=p.ok?`rgba(110,231,183,${p.life})`:`rgba(248,113,113,${p.life})`;ctx.fill();return p.life>0});
requestAnimationFrame(draw)}
draw();
setInterval(tryRequest,1200);