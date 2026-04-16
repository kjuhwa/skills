const routes = [
  {path:'/auth/login',base:40,rps:12,err:0.01},
  {path:'/users/:id',base:28,rps:45,err:0.005},
  {path:'/orders',base:80,rps:30,err:0.02},
  {path:'/payments',base:120,rps:18,err:0.04},
  {path:'/search',base:150,rps:22,err:0.015}
];
const breakers = routes.map(r=>({path:r.path,state:'closed',fails:0,threshold:5}));
const history = {p50:[],p95:[],up:[],err:[]};
const MAX=80;

function sampleLat(base){
  const jitter = Math.random()<0.05 ? base*3 : 0;
  return base + jitter + (Math.random()-0.5)*base*0.4;
}

function percentile(arr,p){
  if(!arr.length)return 0;
  const s=[...arr].sort((a,b)=>a-b);
  return s[Math.floor((s.length-1)*p)];
}

function tick(){
  const allLat=[];let totalReq=0,totalErr=0;
  const tbody=document.querySelector('#routes tbody');
  tbody.innerHTML='';
  routes.forEach((r,i)=>{
    const reqs=Math.max(1,Math.round(r.rps*(0.8+Math.random()*0.4)));
    const lats=[];let errs=0;
    for(let k=0;k<reqs;k++){
      const l=sampleLat(r.base);
      lats.push(l);
      if(Math.random()<r.err)errs++;
    }
    allLat.push(...lats);
    totalReq+=reqs;totalErr+=errs;
    const p50=Math.round(percentile(lats,0.5));
    const p95=Math.round(percentile(lats,0.95));
    const errPct=(errs/reqs*100);
    const b=breakers[i];
    if(errPct>10){b.fails++;}else{b.fails=Math.max(0,b.fails-1);}
    if(b.fails>=b.threshold&&b.state==='closed'){b.state='open';setTimeout(()=>b.state='half',3000);}
    else if(b.state==='half'&&errPct<5){b.state='closed';b.fails=0;}
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${r.path}</td><td>${reqs}</td><td>${p50}ms</td><td class="${p95>300?'bad':''}">${p95}ms</td><td class="${errPct>5?'bad':''}">${errPct.toFixed(1)}%</td>`;
    tbody.appendChild(tr);
  });
  const p50=Math.round(percentile(allLat,0.5));
  const p95=Math.round(percentile(allLat,0.95));
  history.p50.push(p50);history.p95.push(p95);
  history.up.push(totalReq);history.err.push(totalErr);
  [history.p50,history.p95,history.up,history.err].forEach(a=>{if(a.length>MAX)a.shift();});
  renderKPIs(p50,p95,totalReq,totalErr);
  renderBreakers();
  drawChart();
}

function renderKPIs(p50,p95,req,err){
  document.getElementById('kpis').innerHTML=`
    <div class="kpi"><div class="label">p50 latency</div><div class="val">${p50}ms</div><div class="delta ${p50<80?'down':'up'}">target &lt;80ms</div></div>
    <div class="kpi"><div class="label">p95 latency</div><div class="val">${p95}ms</div><div class="delta ${p95<250?'down':'up'}">target &lt;250ms</div></div>
    <div class="kpi"><div class="label">requests/s</div><div class="val">${req}</div><div class="delta down">gateway throughput</div></div>
    <div class="kpi"><div class="label">error rate</div><div class="val">${(err/req*100).toFixed(2)}%</div><div class="delta ${err/req<0.03?'down':'up'}">SLO 3%</div></div>`;
}

function renderBreakers(){
  const ul=document.getElementById('breakers');
  ul.innerHTML='';
  breakers.forEach(b=>{
    const li=document.createElement('li');
    li.className=b.state==='open'?'open':b.state==='half'?'half':'';
    li.innerHTML=`<span>${b.path}</span><span class="badge ${b.state==='open'?'open':b.state==='half'?'half':''}">${b.state.toUpperCase()}</span>`;
    ul.appendChild(li);
  });
}

function drawChart(){
  const c=document.getElementById('chart');
  const ctx=c.getContext('2d');
  const W=c.width,H=c.height;
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle='#252836';ctx.lineWidth=1;
  for(let i=1;i<5;i++){const y=H*i/5;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  const max=Math.max(400,...history.p95,1);
  function plot(arr,color,fill){
    ctx.strokeStyle=color;ctx.fillStyle=fill;ctx.lineWidth=2;
    ctx.beginPath();
    arr.forEach((v,i)=>{
      const x=(i/(MAX-1))*W;
      const y=H-(v/max)*H;
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.stroke();
    if(fill){
      ctx.lineTo((arr.length-1)/(MAX-1)*W,H);
      ctx.lineTo(0,H);
      ctx.closePath();
      ctx.fill();
    }
  }
  plot(history.p95,'#60a5fa','rgba(96,165,250,0.08)');
  plot(history.p50,'#6ee7b7','rgba(110,231,183,0.1)');
  ctx.fillStyle='#9ca3af';ctx.font='10px ui-monospace';
  ctx.fillText(max+'ms',4,12);
  ctx.fillText('0',4,H-4);
}

tick();
setInterval(tick,900);