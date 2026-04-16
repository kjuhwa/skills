const throughputCanvas=document.getElementById('throughput'),srcCanvas=document.getElementById('sources');
const tc=throughputCanvas.getContext('2d'),sc=srcCanvas.getContext('2d');
const logEl=document.getElementById('log');
const srcs=['iot-sensors','app-metrics','infra-agent','cdn-logs','db-stats'];
const srcColors=['#6ee7b7','#60a5fa','#c084fc','#fbbf24','#f87171'];
let history=[],srcData=srcs.map(()=>Math.floor(Math.random()*200)+50);
let totalPoints=0,storageMB=0,seconds=0;

function resizeCanvas(c){const r=c.getBoundingClientRect();c.width=r.width*devicePixelRatio;c.height=r.height*devicePixelRatio}
function resize(){resizeCanvas(throughputCanvas);resizeCanvas(srcCanvas)}
window.addEventListener('resize',resize);resize();

function drawThroughput(){
  const c=tc,w=throughputCanvas.width/devicePixelRatio,h=throughputCanvas.height/devicePixelRatio;
  c.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);c.clearRect(0,0,w,h);
  if(history.length<2)return;
  const mx=Math.max(...history,100),pad={l:40,r:10,t:10,b:20},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
  const x=i=>pad.l+(i/(history.length-1))*pw,y=v=>pad.t+(1-v/mx)*ph;

  c.beginPath();c.moveTo(x(0),y(history[0]));
  for(let i=1;i<history.length;i++)c.lineTo(x(i),y(history[i]));
  c.strokeStyle='#6ee7b7';c.lineWidth=2;c.stroke();

  c.lineTo(x(history.length-1),h-pad.b);c.lineTo(x(0),h-pad.b);c.closePath();
  const g=c.createLinearGradient(0,pad.t,0,h-pad.b);g.addColorStop(0,'#6ee7b722');g.addColorStop(1,'transparent');
  c.fillStyle=g;c.fill();

  c.fillStyle='#484f58';c.font='10px monospace';c.textAlign='right';
  for(let i=0;i<4;i++){const v=mx*i/3;c.fillText(Math.round(v),pad.l-6,y(v)+3)}
}

function drawSources(){
  const c=sc,w=srcCanvas.width/devicePixelRatio,h=srcCanvas.height/devicePixelRatio;
  c.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);c.clearRect(0,0,w,h);
  const total=srcData.reduce((a,b)=>a+b,1);
  const barH=22,gap=8,startY=(h-srcs.length*(barH+gap))/2;

  srcs.forEach((name,i)=>{
    const y=startY+i*(barH+gap),bw=(srcData[i]/total)*(w-120);
    c.fillStyle=srcColors[i]+'33';c.fillRect(80,y,w-120,barH);
    c.fillStyle=srcColors[i];c.fillRect(80,y,bw,barH);
    c.fillStyle='#8b949e';c.font='10px monospace';c.textAlign='right';c.fillText(name,75,y+15);
    c.fillStyle='#fff';c.textAlign='left';c.fillText(srcData[i],85+bw,y+15);
  });
}

function addLog(msg,cls='ok'){
  const t=new Date().toLocaleTimeString();
  logEl.innerHTML=`<div class="${cls}">[${t}] ${msg}</div>`+logEl.innerHTML;
  if(logEl.children.length>40)logEl.lastChild.remove();
}

function tick(){
  seconds++;
  const rate=Math.floor(Math.random()*800)+200;
  const burst=Math.random()>.92;
  const finalRate=burst?rate*3:rate;
  totalPoints+=finalRate;storageMB+=finalRate*0.00012;
  history.push(finalRate);if(history.length>60)history.shift();

  srcData=srcData.map(v=>Math.max(10,v+Math.floor(Math.random()*40-18)));

  document.getElementById('writeRate').textContent=finalRate.toLocaleString();
  document.getElementById('cardinality').textContent=srcData.reduce((a,b)=>a+b).toLocaleString();
  document.getElementById('storage').textContent=storageMB.toFixed(1);
  document.getElementById('uptime').textContent=seconds+'s';

  if(burst)addLog(`⚠ Burst detected: ${finalRate} pts/sec`,'warn');
  else if(Math.random()>.85)addLog(`Ingested ${finalRate} points from ${srcs[Math.floor(Math.random()*5)]}`);
  if(Math.random()>.95)addLog('Compaction triggered on shard-'+Math.floor(Math.random()*8),'warn');
  if(Math.random()>.98)addLog('Write timeout on replica-2','err');

  drawThroughput();drawSources();
}

setInterval(tick,1000);tick();