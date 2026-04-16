const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
const startBtn=document.getElementById('startBtn'),resetBtn=document.getElementById('resetBtn');
const speedEl=document.getElementById('speed'),yearEl=document.getElementById('year');
let running=false,year=0,roots=[],animId=null;
const HOST={x:300,y:460,trunkW:40,trunkH:200,canopyR:80};

function initRoots(){roots=[];for(let i=0;i<8;i++){const a=Math.random()*Math.PI*2;roots.push({angle:a,length:0,maxLen:120+Math.random()*100,width:2,growth:0.3+Math.random()*0.4,cx:HOST.x+Math.cos(a)*20,cy:HOST.y-HOST.trunkH/2+Math.sin(a)*60});}}
function drawHost(fade){const a=Math.max(0.2,1-fade*0.8);ctx.globalAlpha=a;ctx.fillStyle='#5a3a1a';ctx.fillRect(HOST.x-HOST.trunkW/2,HOST.y-HOST.trunkH,HOST.trunkW,HOST.trunkH);ctx.beginPath();ctx.arc(HOST.x,HOST.y-HOST.trunkH-10,HOST.canopyR,0,Math.PI*2);ctx.fillStyle='#2d5a1e';ctx.fill();ctx.globalAlpha=1;}
function drawRoots(){roots.forEach(r=>{const progress=r.length/r.maxLen;ctx.strokeStyle=`rgba(110,231,183,${0.4+progress*0.5})`;ctx.lineWidth=r.width+progress*3;ctx.beginPath();const ex=r.cx+Math.cos(r.angle+0.3)*r.length,ey=r.cy+Math.sin(r.angle*0.5+1)*r.length*0.5+r.length*0.6;ctx.moveTo(r.cx,r.cy);ctx.quadraticCurveTo(r.cx+Math.cos(r.angle)*r.length*0.5,r.cy+r.length*0.3,ex,ey);ctx.stroke();if(progress>0.5){ctx.beginPath();ctx.arc(ex,ey-10,progress*12,0,Math.PI*2);ctx.fillStyle='rgba(110,231,183,0.15)';ctx.fill();}});}
function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);const fade=Math.min(1,year/80);drawHost(fade);drawRoots();ctx.fillStyle='#1a1d27';ctx.fillRect(0,460,600,40);ctx.fillStyle='#3a2a0a';ctx.fillRect(0,458,600,4);}
function step(){const sp=parseInt(speedEl.value);roots.forEach(r=>{if(r.length<r.maxLen)r.length+=r.growth*sp*0.1;});year+=sp*0.05;yearEl.textContent='Year: '+Math.floor(year);draw();if(running)animId=requestAnimationFrame(step);}
function start(){if(!running){running=true;startBtn.textContent='Pause';step();}else{running=false;startBtn.textContent='Start Growth';cancelAnimationFrame(animId);}}
function reset(){running=false;startBtn.textContent='Start Growth';cancelAnimationFrame(animId);year=0;yearEl.textContent='Year: 0';initRoots();draw();}
startBtn.onclick=start;resetBtn.onclick=reset;
initRoots();draw();