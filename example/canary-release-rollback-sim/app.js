const canvas=document.getElementById('chart'),ctx=canvas.getContext('2d');
const btnStart=document.getElementById('btnStart'),btnInject=document.getElementById('btnInject');
const btnRollback=document.getElementById('btnRollback'),btnPromote=document.getElementById('btnPromote');
const alertEl=document.getElementById('alert'),phaseEl=document.getElementById('phase'),uptimeEl=document.getElementById('uptime');
const W=760,H=220,MAX=120;
let running=false,faultActive=false,rolledBack=false,tick=0;
let stableErr=[],canaryErr=[];

function reset(){stableErr=[];canaryErr=[];tick=0;faultActive=false;rolledBack=false;alertEl.classList.add('hidden');alertEl.classList.remove('success')}

btnStart.addEventListener('click',()=>{
  reset();running=true;phaseEl.textContent='Canary Active';
  btnStart.disabled=true;btnInject.disabled=false;btnRollback.disabled=false;btnPromote.disabled=false;
});

btnInject.addEventListener('click',()=>{faultActive=true;btnInject.disabled=true;
  alertEl.textContent='⚠ Fault injected — error rate spiking on canary!';alertEl.classList.remove('hidden','success')});

btnRollback.addEventListener('click',()=>{rolledBack=true;faultActive=false;phaseEl.textContent='Rolled Back';
  alertEl.textContent='Rollback complete — all traffic on stable.';alertEl.className='alert success';
  btnInject.disabled=true;btnPromote.disabled=true;btnRollback.disabled=true;
  setTimeout(()=>{running=false;btnStart.disabled=false},2000)});

btnPromote.addEventListener('click',()=>{
  if(faultActive){alertEl.textContent='Cannot promote while errors are high!';alertEl.classList.remove('hidden','success');return}
  phaseEl.textContent='Promoted to GA';alertEl.textContent='Canary promoted — v2.4.1 is now stable.';alertEl.className='alert success';
  running=false;btnInject.disabled=true;btnPromote.disabled=true;btnRollback.disabled=true;btnStart.disabled=false});

function sample(){
  if(!running)return;
  tick++;uptimeEl.textContent=tick+'s';
  const sErr=0.5+Math.random()*1.5;
  let cErr=rolledBack?0:1+Math.random()*2;
  if(faultActive)cErr=12+Math.random()*10;
  stableErr.push(sErr);canaryErr.push(cErr);
  if(stableErr.length>MAX){stableErr.shift();canaryErr.shift()}
}

function draw(){
  ctx.clearRect(0,0,W,H);
  const pad=40,gw=W-pad*2,gh=H-50;
  ctx.fillStyle='#252833';ctx.fillRect(0,0,W,H);
  // grid
  ctx.strokeStyle='#1e2130';ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const y=20+gh/4*i;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-pad,y);ctx.stroke();
    ctx.fillStyle='#64748b';ctx.font='10px system-ui';ctx.fillText((20-i*5)+'%',5,y+4)}
  ctx.fillText('Error %',5,12);
  const drawLine=(data,color)=>{if(!data.length)return;ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=2;
    data.forEach((v,i)=>{const x=pad+i*(gw/MAX),y=20+gh-v*(gh/20);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()};
  drawLine(stableErr,'#3b82f6');drawLine(canaryErr,'#6ee7b7');
  // threshold
  ctx.setLineDash([4,4]);ctx.strokeStyle='#f87171';ctx.beginPath();
  const ty=20+gh-10*(gh/20);ctx.moveTo(pad,ty);ctx.lineTo(W-pad,ty);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#f87171';ctx.font='10px system-ui';ctx.fillText('threshold',W-pad-50,ty-4);
  // legend
  ctx.fillStyle='#3b82f6';ctx.fillRect(pad,H-14,10,10);ctx.fillStyle='#94a3b8';ctx.fillText('Stable',pad+14,H-5);
  ctx.fillStyle='#6ee7b7';ctx.fillRect(pad+70,H-14,10,10);ctx.fillStyle='#94a3b8';ctx.fillText('Canary',pad+84,H-5);
  requestAnimationFrame(draw);
}
setInterval(sample,500);
draw();