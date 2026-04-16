const canvas=document.getElementById('chart');
const ctx=canvas.getContext('2d');
const sidebar=document.getElementById('sidebar');
const pipelines=['Orders ETL','Clickstream','User Sync','Logs Agg'];
const data=pipelines.map(()=>Array.from({length:30},()=>Math.floor(Math.random()*800+200)));
const colors=['#6ee7b7','#60a5fa','#fbbf24','#f87171'];
function drawChart(){
  ctx.clearRect(0,0,600,260);
  ctx.fillStyle='#1a1d27';ctx.fillRect(0,0,600,260);
  const pad={l:50,r:20,t:20,b:30};
  const w=600-pad.l-pad.r,h=260-pad.t-pad.b;
  ctx.strokeStyle='#262a36';ctx.lineWidth=1;
  for(let i=0;i<=4;i++){
    const y=pad.t+h-i*(h/4);
    ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+w,y);ctx.stroke();
    ctx.fillStyle='#8b949e';ctx.font='10px Segoe UI';ctx.textAlign='right';
    ctx.fillText(i*250,pad.l-6,y+3);
  }
  data.forEach((series,si)=>{
    ctx.strokeStyle=colors[si];ctx.lineWidth=2;ctx.beginPath();
    series.forEach((v,xi)=>{
      const x=pad.l+xi*(w/(series.length-1));
      const y=pad.t+h-v/1000*h;
      xi===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.stroke();
  });
}
function updateSidebar(){
  sidebar.innerHTML='<h3>Pipeline Health</h3>'+pipelines.map((p,i)=>{
    const last=data[i][data[i].length-1];const pct=Math.min(100,last/10);
    return`<div class="metric"><label>${p}</label><span class="val">${last} rec/s</span><div class="bar"><div class="fill" style="width:${pct}%;background:${colors[i]}"></div></div></div>`;
  }).join('');
}
function tick(){
  data.forEach(s=>{s.shift();s.push(Math.max(50,s[s.length-1]+Math.floor(Math.random()*200-100)))});
  drawChart();updateSidebar();
}
drawChart();updateSidebar();setInterval(tick,1000);