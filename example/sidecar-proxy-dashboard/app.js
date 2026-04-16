const svcs=['api-gateway','user-service','order-service','payment-service','inventory-service','auth-service'];
const latData=Array(60).fill(0).map(()=>20+Math.random()*30);
const rpsData=Array(60).fill(0).map(()=>200+Math.random()*300);

function $(s){return document.querySelector(s)}
function updateClock(){$('#clock').textContent=new Date().toLocaleTimeString()}
setInterval(updateClock,1000);updateClock();

function renderStats(){
  const totalRps=rpsData[rpsData.length-1]|0;
  const avgLat=latData[latData.length-1]|0;
  const active=svcs.length;
  const errRate=(Math.random()*2).toFixed(2);
  $('#stats').innerHTML=[
    ['Total RPS',totalRps],['Avg Latency',avgLat+'ms'],['Active Sidecars',active],['Error Rate',errRate+'%']
  ].map(([l,v])=>`<div class="stat"><div class="val">${v}</div><div class="lbl">${l}</div></div>`).join('');
}

function drawChart(id,data,color){
  const cv=document.getElementById(id),c=cv.getContext('2d');
  cv.width=cv.parentElement.clientWidth-24;cv.height=120;
  const w=cv.width,h=cv.height,max=Math.max(...data)*1.2,step=w/data.length;
  c.clearRect(0,0,w,h);
  c.beginPath();c.moveTo(0,h);
  data.forEach((v,i)=>c.lineTo(i*step,h-v/max*h));
  c.lineTo(w,h);c.closePath();
  const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,color+'44');g.addColorStop(1,color+'05');
  c.fillStyle=g;c.fill();
  c.beginPath();data.forEach((v,i)=>{const m=i===0?'moveTo':'lineTo';c[m](i*step,h-v/max*h)});
  c.strokeStyle=color;c.lineWidth=2;c.stroke();
}

function renderTable(){
  const tb=$('#table tbody');
  tb.innerHTML=svcs.map(s=>{
    const ok=Math.random()>.1;const warn=!ok&&Math.random()>.5;
    const cls=ok?'st-ok':warn?'st-warn':'st-err';
    const st=ok?'HEALTHY':warn?'DEGRADED':'UNHEALTHY';
    const conn=(Math.random()*200+50)|0;
    const p99=(Math.random()*80+10)|0;
    const err=(Math.random()*(ok?.5:5)).toFixed(1);
    return `<tr><td>${s}</td><td class="${cls}">${st}</td><td>${conn}</td><td>${p99}</td><td>${err}%</td></tr>`;
  }).join('');
}

function tick(){
  latData.push(15+Math.random()*40);latData.shift();
  rpsData.push(180+Math.random()*350);rpsData.shift();
  renderStats();
  drawChart('latChart',latData,'#6ee7b7');
  drawChart('rpsChart',rpsData,'#60a5fa');
  renderTable();
}
tick();setInterval(tick,1500);
addEventListener('resize',tick);