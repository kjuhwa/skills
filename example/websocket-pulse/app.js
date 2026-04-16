const canvas=document.getElementById('pulse'),ctx=canvas.getContext('2d');
const logEl=document.getElementById('log');
let pts=[],msgCount=0,total=0;
function resize(){canvas.width=canvas.clientWidth*2;canvas.height=canvas.clientHeight*2}
resize();window.addEventListener('resize',resize);
function addPoint(){
  const lat=Math.floor(Math.random()*80+5);
  pts.push(lat);if(pts.length>120)pts.shift();
  document.getElementById('latency').textContent=lat;
  msgCount++;total++;
}
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#6ee7b7';ctx.lineWidth=2;ctx.beginPath();
  const step=canvas.width/(pts.length-1||1);
  pts.forEach((p,i)=>{const y=canvas.height-p/100*canvas.height;i===0?ctx.moveTo(0,y):ctx.lineTo(i*step,y)});
  ctx.stroke();
  ctx.strokeStyle='rgba(110,231,183,0.1)';ctx.fillStyle='rgba(110,231,183,0.05)';
  ctx.lineTo((pts.length-1)*step,canvas.height);ctx.lineTo(0,canvas.height);ctx.closePath();ctx.fill();
  requestAnimationFrame(draw);
}
const types=['ping','pong','data','subscribe','ack','heartbeat'];
function mockMsg(){
  const out=Math.random()>0.4;const t=types[Math.random()*types.length|0];
  const d=document.createElement('div');d.className=out?'out':'in';
  d.textContent=`${new Date().toLocaleTimeString()} ${out?'→':'←'} ${t} (${Math.floor(Math.random()*512)}B)`;
  logEl.prepend(d);if(logEl.children.length>50)logEl.lastChild.remove();
  addPoint();
}
setInterval(()=>{document.getElementById('msgs').textContent=msgCount;msgCount=0},1000);
setInterval(mockMsg,300);
setInterval(()=>{const s=document.getElementById('status');
  if(Math.random()>0.95){s.textContent='RECONNECTING';s.style.color='#fbbf24';setTimeout(()=>{s.textContent='CONNECTED';s.style.color='#6ee7b7'},1500)}},2000);
draw();