const canvas=document.getElementById('pulse'),ctx=canvas.getContext('2d');
const reasons=['Timeout','Schema mismatch','Auth expired','Rate limited','Malformed payload','Service unavailable'];
const queues=['orders','payments','notifications','analytics','user-events'];
let points=[],messages=[],total=0,rateCount=0;
for(let i=0;i<60;i++)points.push(0);

function addMessage(){
  const q=queues[Math.random()*queues.length|0],r=reasons[Math.random()*reasons.length|0];
  const sev=Math.random()<.3?'err':Math.random()<.6?'warn':'info';
  const ts=new Date().toLocaleTimeString();
  messages.unshift({ts,q,r,sev});
  if(messages.length>50)messages.pop();
  total++;rateCount++;
  renderFeed();
}

function renderFeed(){
  const feed=document.getElementById('feed');
  feed.innerHTML=messages.map(m=>`<div class="entry"><span class="${m.sev}">[${m.sev.toUpperCase()}]</span> ${m.ts} <b>${m.q}</b> — ${m.r}</div>`).join('');
  document.getElementById('total').textContent=total;
  document.getElementById('oldest').textContent=messages.length?messages[messages.length-1].ts:'-';
}

function drawPulse(){
  ctx.clearRect(0,0,900,220);
  ctx.strokeStyle='#6ee7b722';ctx.lineWidth=1;
  for(let y=0;y<220;y+=44){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(900,y);ctx.stroke();}
  const max=Math.max(...points,1);
  ctx.beginPath();ctx.strokeStyle='#6ee7b7';ctx.lineWidth=2;
  points.forEach((v,i)=>{const x=i*(900/59),y=210-((v/max)*190);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.stroke();
  ctx.lineTo(900,210);ctx.lineTo(0,210);ctx.closePath();
  ctx.fillStyle='#6ee7b710';ctx.fill();
}

setInterval(()=>{points.push(rateCount);points.shift();document.getElementById('rate').textContent=rateCount;rateCount=0;drawPulse();},1000);
setInterval(()=>{const n=Math.random()*4|0;for(let i=0;i<n;i++)addMessage();},600);
for(let i=0;i<15;i++)addMessage();
drawPulse();