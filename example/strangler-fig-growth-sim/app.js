const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
const btnStart=document.getElementById('btnStart'),btnReset=document.getElementById('btnReset');
const speedEl=document.getElementById('speed'),yearEl=document.getElementById('year');
let running=false,year=0,roots=[],hostHealth=1,animId=null;
const HOST_X=350,HOST_Y=400,HOST_W=40,HOST_H=200;

function seedRoots(){
  roots=[];
  for(let i=0;i<6;i++){
    const angle=Math.PI*2*i/6;
    roots.push({x:HOST_X+Math.cos(angle)*5,y:160+Math.random()*30,
      tx:HOST_X+Math.cos(angle)*(22+Math.random()*30),ty:HOST_Y+20,
      progress:0,thickness:1+Math.random()*1.5,wiggle:Math.random()*10});
  }
}

function reset(){running=false;year=0;hostHealth=1;seedRoots();yearEl.textContent='Year: 0';btnStart.textContent='Start';cancelAnimationFrame(animId);draw()}

function draw(){
  ctx.clearRect(0,0,700,500);
  // sky
  const grd=ctx.createLinearGradient(0,0,0,500);
  grd.addColorStop(0,'#0f1117');grd.addColorStop(1,'#1a1d27');
  ctx.fillStyle=grd;ctx.fillRect(0,0,700,500);
  // ground
  ctx.fillStyle='#1e2a1e';ctx.fillRect(0,420,700,80);
  // host tree
  const h=HOST_H*hostHealth;
  ctx.fillStyle=`rgb(${80+40*hostHealth},${60+20*hostHealth},${30})`;
  ctx.fillRect(HOST_X-HOST_W/2,HOST_Y-h,HOST_W,h);
  // canopy
  if(hostHealth>.1){ctx.fillStyle=`rgba(40,${100+80*hostHealth},50,${hostHealth})`;
    ctx.beginPath();ctx.ellipse(HOST_X,HOST_Y-h-20,50*hostHealth,35*hostHealth,0,0,Math.PI*2);ctx.fill()}
  // strangler roots
  const p=Math.min(year/80,1);
  roots.forEach(r=>{
    const prog=Math.min(p*1.3+r.wiggle*.005,1);
    const cx=r.x+(r.tx-r.x)*prog,cy=r.y+(r.ty-r.y)*prog;
    ctx.strokeStyle=`rgba(110,231,183,${0.4+prog*0.5})`;
    ctx.lineWidth=r.thickness+prog*3;ctx.beginPath();
    ctx.moveTo(r.x,r.y);
    const mx=(r.x+cx)/2+Math.sin(r.wiggle+year*.05)*8;
    const my=(r.y+cy)/2;
    ctx.quadraticCurveTo(mx,my,cx,cy);ctx.stroke();
  });
  // fig canopy on top
  if(p>.2){ctx.fillStyle=`rgba(110,231,183,${Math.min(p*.7,.55)})`;
    ctx.beginPath();ctx.ellipse(HOST_X,150-p*15,35+p*40,25+p*25,0,0,Math.PI*2);ctx.fill()}
  // label
  ctx.fillStyle='#555';ctx.font='11px system-ui';ctx.fillText('Host tree',HOST_X-20,HOST_Y+15);
}

function tick(){
  if(!running)return;
  const spd=+speedEl.value;
  year+=spd*0.15;
  hostHealth=Math.max(0,1-year/90);
  yearEl.textContent='Year: '+Math.floor(year);
  draw();
  animId=requestAnimationFrame(tick);
}

btnStart.onclick=()=>{running=!running;btnStart.textContent=running?'Pause':'Start';if(running)tick()};
btnReset.onclick=reset;
seedRoots();draw();