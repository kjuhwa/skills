const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
const btnStart=document.getElementById('btnStart'),btnStop=document.getElementById('btnStop');
const intensityEl=document.getElementById('intensity'),killCountEl=document.getElementById('killCount'),logEl=document.getElementById('log');
let nodes=[],kills=0,running=false,timer=null;
const NAMES=['api-gw','auth','users','orders','payments','inventory','notify','search','cache','logs','metrics','cdn'];
function resize(){canvas.width=canvas.clientWidth;canvas.height=canvas.clientHeight}
window.addEventListener('resize',resize);resize();
function init(){nodes=NAMES.map((n,i)=>{const angle=(i/NAMES.length)*Math.PI*2;const cx=canvas.width/2,cy=canvas.height/2,r=Math.min(cx,cy)*0.6;return{name:n,x:cx+Math.cos(angle)*r,y:cy+Math.sin(angle)*r,alive:true,respawnAt:0,pulse:0}})}
function log(msg,cls){const d=document.createElement('div');d.className=cls;d.textContent=`[${new Date().toLocaleTimeString()}] ${msg}`;logEl.prepend(d);if(logEl.children.length>50)logEl.lastChild.remove()}
function killRandom(){const alive=nodes.filter(n=>n.alive);if(!alive.length)return;const count=Math.min(parseInt(intensityEl.value),alive.length);for(let i=0;i<count;i++){const idx=Math.floor(Math.random()*alive.length);const n=alive.splice(idx,1)[0];n.alive=false;n.respawnAt=Date.now()+2000+Math.random()*3000;n.pulse=1;kills++;killCountEl.textContent=`Kills: ${kills}`;log(`☠ Killed ${n.name}`,'log-kill')}}
function update(){const now=Date.now();nodes.forEach(n=>{if(!n.alive&&now>=n.respawnAt){n.alive=true;n.pulse=1;log(`✓ Recovered ${n.name}`,'log-recover')}if(n.pulse>0)n.pulse=Math.max(0,n.pulse-0.02)})}
function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);const cx=canvas.width/2,cy=canvas.height/2;nodes.forEach((a,i)=>{nodes.forEach((b,j)=>{if(j<=i)return;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=a.alive&&b.alive?'#6ee7b720':'#f8717120';ctx.lineWidth=1;ctx.stroke()})});nodes.forEach(n=>{const r=n.alive?18:14;if(n.pulse>0){ctx.beginPath();ctx.arc(n.x,n.y,r+n.pulse*20,0,Math.PI*2);ctx.fillStyle=n.alive?`rgba(110,231,183,${n.pulse*0.3})`:`rgba(248,113,113,${n.pulse*0.3})`;ctx.fill()}ctx.beginPath();ctx.arc(n.x,n.y,r,0,Math.PI*2);ctx.fillStyle=n.alive?'#6ee7b7':'#f87171';ctx.fill();ctx.fillStyle='#0f1117';ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n.name,n.x,n.y)})}
function loop(){update();draw();requestAnimationFrame(loop)}
btnStart.onclick=()=>{running=true;btnStart.disabled=true;btnStop.disabled=false;timer=setInterval(killRandom,1500)};
btnStop.onclick=()=>{running=false;btnStart.disabled=false;btnStop.disabled=true;clearInterval(timer)};
init();loop();