const names=['user_sync','order_ingest','log_archive','product_feed','event_stream','metrics_agg'];
const statuses=['success','success','success','success','failed','running'];
const jobList=document.getElementById('job-list');
const chartCanvas=document.getElementById('chart');
const cCtx=chartCanvas.getContext('2d');
let history=Array.from({length:30},()=>Math.floor(Math.random()*500+200));
let tput=0,succCount=0,totalCount=0;

function addJob(){
  const name=names[Math.floor(Math.random()*names.length)];
  const status=statuses[Math.floor(Math.random()*statuses.length)];
  const rows=Math.floor(Math.random()*50000+1000);
  const li=document.createElement('li');
  const cls=status==='success'?'ok':status==='failed'?'fail':'run';
  li.innerHTML=`<span>${name}</span><span>${rows.toLocaleString()} rows</span><span class="tag ${cls}">${status}</span>`;
  jobList.prepend(li);
  if(jobList.children.length>20)jobList.lastChild.remove();
  totalCount++;if(status==='success')succCount++;
  history.push(rows);history.shift();
  tput+=Math.floor(rows/60);
}

function drawChart(){
  const W=chartCanvas.width=chartCanvas.offsetWidth,H=chartCanvas.height=180;
  cCtx.clearRect(0,0,W,H);
  const max=Math.max(...history,1),step=W/(history.length-1);
  cCtx.beginPath();cCtx.moveTo(0,H);
  history.forEach((v,i)=>{cCtx.lineTo(i*step,H-v/max*(H-20))});
  cCtx.lineTo(W,H);cCtx.closePath();
  const grad=cCtx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#6ee7b744');grad.addColorStop(1,'#6ee7b700');
  cCtx.fillStyle=grad;cCtx.fill();
  cCtx.beginPath();history.forEach((v,i)=>{const m=i?'lineTo':'moveTo';cCtx[m](i*step,H-v/max*(H-20))});
  cCtx.strokeStyle='#6ee7b7';cCtx.lineWidth=2;cCtx.stroke();
}

function updateKPI(){
  document.getElementById('tput').textContent=Math.floor(tput/Math.max(totalCount,1));
  document.getElementById('rate').textContent=totalCount?Math.round(succCount/totalCount*100)+'%':'0%';
}

for(let i=0;i<8;i++)addJob();drawChart();updateKPI();
setInterval(()=>{addJob();drawChart();updateKPI()},2000);