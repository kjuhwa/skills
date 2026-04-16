const VIEWS=[
  {id:"mv_users",label:"User Aggregates",cost:800},
  {id:"mv_orders",label:"Order Totals",cost:1200},
  {id:"mv_metrics",label:"Hourly Metrics",cost:600},
  {id:"mv_geo",label:"Geo Roll-up",cost:1500},
  {id:"mv_funnel",label:"Funnel Stats",cost:1000},
  {id:"mv_top",label:"Top Products",cost:700},
];
const STATE={};
let score=0,hits=0,misses=0,latencies=[];
const TTL=8000;

VIEWS.forEach(v=>{STATE[v.id]={...v,age:0,refreshing:false,refreshEnds:0};});

function renderGrid(){
  const g=document.getElementById("grid");
  g.innerHTML=VIEWS.map(v=>{
    const s=STATE[v.id];
    const pct=s.refreshing?Math.min(100,((Date.now()-(s.refreshEnds-s.cost))/s.cost)*100):Math.max(0,100-(s.age/TTL)*100);
    const cls=s.refreshing?"refreshing":(s.age>TTL?"dead":(s.age>TTL*0.6?"stale":""));
    const status=s.refreshing?"refreshing":(s.age>TTL?"expired":(s.age>TTL*0.6?"stale":"fresh"));
    return `<div class="view-card ${cls}" data-id="${v.id}">
      <span class="status">${status}</span>
      <h4>${v.label}</h4>
      <div class="meta">${v.id} · cost ${v.cost}ms</div>
      <div class="bar"><div style="width:${pct}%"></div></div>
      <div class="meta" style="margin-top:6px;">${s.refreshing?'refreshing...':'click to refresh'}</div>
    </div>`;
  }).join("");
  g.querySelectorAll(".view-card").forEach(el=>el.onclick=()=>refresh(el.dataset.id));
}

function refresh(id){
  const s=STATE[id];
  if(s.refreshing)return;
  s.refreshing=true;
  s.refreshEnds=Date.now()+s.cost;
  setTimeout(()=>{s.refreshing=false;s.age=0;s.refreshEnds=0;},s.cost);
}

function query(){
  const v=VIEWS[Math.floor(Math.random()*VIEWS.length)];
  const s=STATE[v.id];
  const fresh=!s.refreshing&&s.age<TTL;
  let lat;
  if(fresh){lat=20+Math.floor(Math.random()*30);hits++;score+=10;}
  else{lat=400+Math.floor(Math.random()*600);misses++;score=Math.max(0,score-5);}
  latencies.push(lat);if(latencies.length>20)latencies.shift();
  const ul=document.getElementById("qlist");
  const li=document.createElement("li");
  li.className=fresh?"hit":"miss";
  li.innerHTML=`<span>SELECT * FROM ${v.id}</span><span>${fresh?'HIT':'MISS'} · ${lat}ms</span>`;
  ul.prepend(li);
  while(ul.children.length>15)ul.removeChild(ul.lastChild);
  updateHud();
}

function updateHud(){
  document.getElementById("score").textContent=score;
  document.getElementById("hits").textContent=hits;
  document.getElementById("misses").textContent=misses;
  const avg=latencies.length?Math.round(latencies.reduce((a,b)=>a+b,0)/latencies.length):0;
  document.getElementById("lat").textContent=avg+"ms";
}

function tick(){
  Object.values(STATE).forEach(s=>{if(!s.refreshing)s.age+=200;});
  renderGrid();
}

document.getElementById("reset").onclick=()=>{
  score=0;hits=0;misses=0;latencies=[];
  Object.values(STATE).forEach(s=>{s.age=0;s.refreshing=false;});
  updateHud();
};

setInterval(tick,200);
setInterval(query,1500);
renderGrid();updateHud();