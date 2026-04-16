const EXPERIMENTS=[
  {id:'lat',name:'Latency Spike',desc:'Inject 500ms delay to DB calls',effect:{lat:8,err:1.2,thr:0.7}},
  {id:'kill',name:'Kill Instance',desc:'Terminate random app instance',effect:{lat:3,err:4,thr:0.4}},
  {id:'net',name:'Network Partition',desc:'Block traffic between zones',effect:{lat:5,err:6,thr:0.3}},
  {id:'cpu',name:'CPU Stress',desc:'Saturate CPU on worker nodes',effect:{lat:4,err:1.5,thr:0.5}},
  {id:'dns',name:'DNS Failure',desc:'Corrupt DNS resolution',effect:{lat:10,err:8,thr:0.2}}
];
const BASE={lat:42,err:0.2,thr:1200};
const HIST_LEN=60;
let history={lat:[],err:[],thr:[]};
let active=new Set();

function initHistory(){for(let k of['lat','err','thr']){history[k]=[];for(let i=0;i<HIST_LEN;i++)history[k].push(BASE[k]*(0.95+Math.random()*0.1))}}

function renderExperiments(){
  const el=document.getElementById('expList');el.innerHTML='';
  EXPERIMENTS.forEach(exp=>{
    const card=document.createElement('div');
    card.className='exp-card'+(active.has(exp.id)?' active':'');
    card.innerHTML=`<h3>${active.has(exp.id)?'🔴 ':''}${exp.name}</h3><p>${exp.desc}</p>`;
    card.onclick=()=>{active.has(exp.id)?active.delete(exp.id):active.add(exp.id);renderExperiments();addLog(active.has(exp.id)?'Started: '+exp.name:'Stopped: '+exp.name,active.has(exp.id)?'err':'ok')};
    el.appendChild(card);
  });
}

function addLog(msg,type='warn'){
  const el=document.getElementById('logEntries');
  const t=new Date().toLocaleTimeString();
  el.innerHTML=`<div class="log-${type}">[${t}] ${msg}</div>`+el.innerHTML;
  if(el.children.length>30)el.removeChild(el.lastChild);
}

function computeMetrics(){
  let eff={lat:1,err:1,thr:1};
  active.forEach(id=>{const e=EXPERIMENTS.find(x=>x.id===id).effect;eff.lat*=e.lat;eff.err*=e.err;eff.thr*=e.thr});
  const jitter=()=>0.9+Math.random()*0.2;
  return{
    lat:Math.min(9999,BASE.lat*eff.lat*jitter()),
    err:Math.min(100,BASE.err*eff.err*jitter()),
    thr:Math.max(0,BASE.thr*eff.thr*jitter())
  };
}

function drawChart(canvasId,data,max,color){
  const c=document.getElementById(canvasId),ctx=c.getContext('2d');
  c.width=c.clientWidth*devicePixelRatio;c.height=80*devicePixelRatio;
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  const w=c.clientWidth,h=80;
  ctx.clearRect(0,0,w,h);
  ctx.beginPath();
  data.forEach((v,i)=>{const x=(i/(data.length-1))*w,y=h-(v/max)*h*0.85;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)});
  ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();
  ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();
  ctx.fillStyle=color+'18';ctx.fill();
}

function tick(){
  const m=computeMetrics();
  history.lat.push(m.lat);history.err.push(m.err);history.thr.push(m.thr);
  if(history.lat.length>HIST_LEN){history.lat.shift();history.err.shift();history.thr.shift()}
  drawChart('cLatency',history.lat,10000,'#f97316');
  drawChart('cErrors',history.err,100,'#ef4444');
  drawChart('cThroughput',history.thr,1500,'#6ee7b7');
  document.getElementById('vLat').textContent=m.lat.toFixed(0);
  document.getElementById('vErr').textContent=m.err.toFixed(1);
  document.getElementById('vThr').textContent=m.thr.toFixed(0);
  if(active.size>0&&Math.random()<0.15)addLog(['Connection timeout on shard-3','Retry storm detected','Health check failing on node-2','Circuit breaker OPEN','Failover triggered'][Math.random()*5|0]);
}

initHistory();renderExperiments();setInterval(tick,500);tick();