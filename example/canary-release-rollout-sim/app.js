let rollout=0,faultActive=false,errHistory=[],latHistory=[];
const MAX=60;
function rnd(a,b){return a+Math.random()*(b-a)}
function sim(){
  const baseErr=faultActive?rnd(8,18):rnd(0.1,1.5);
  const err=rollout===0?0:baseErr*(rollout/100);
  const lat=rollout===0?0:rnd(40,80)+(faultActive?rnd(100,300):0);
  errHistory.push(err);latHistory.push(lat);
  if(errHistory.length>MAX){errHistory.shift();latHistory.shift()}
  document.getElementById('rolloutPct').textContent=rollout+'%';
  document.getElementById('rolloutBar').style.width=rollout+'%';
  document.getElementById('errRate').textContent=err.toFixed(1)+'%';
  document.getElementById('latency').textContent=Math.round(lat)+' ms';
  const st=document.getElementById('status');
  if(err>10){st.textContent='CRITICAL';st.className='big status-bad'}
  else if(err>3){st.textContent='DEGRADED';st.className='big status-warn'}
  else{st.textContent='HEALTHY';st.className='big status-ok'}
  drawChart();
}
function drawChart(){
  const svg=document.getElementById('chart');
  const w=600,h=160,pad=30;
  let html=`<text x="${pad}" y="14" fill="#94a3b8" font-size="10">Error Rate Over Time</text>`;
  const maxE=Math.max(20,...errHistory);
  errHistory.forEach((v,i)=>{
    const x=pad+i*((w-pad*2)/MAX),y=h-pad-(v/maxE)*(h-pad*2);
    if(i===0)html+=`<polyline fill="none" stroke="#6ee7b7" stroke-width="1.5" points="`;
    html+=`${x},${y} `;
  });
  html+=`"/>`; 
  errHistory.forEach((v,i)=>{
    const x=pad+i*((w-pad*2)/MAX),y=h-pad-(v/maxE)*(h-pad*2);
    html+=`<circle cx="${x}" cy="${y}" r="2" fill="${v>10?'#f87171':v>3?'#fbbf24':'#6ee7b7'}"/>`;
  });
  html+=`<line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="#2a2d37"/>`;
  svg.innerHTML=html;
}
function doStep(action){
  if(action==='advance'){rollout=Math.min(100,rollout+10);faultActive=false}
  else if(action==='rollback'){rollout=0;faultActive=false}
  else if(action==='inject')faultActive=true;
  else{rollout=0;faultActive=false;errHistory=[];latHistory=[]}
}
setInterval(sim,800);sim();