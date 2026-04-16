const rawBar=document.getElementById('rawBar'),dsBar=document.getElementById('dsBar'),aggBar=document.getElementById('aggBar');
const rawCount=document.getElementById('rawCount'),dsCount=document.getElementById('dsCount'),aggCount=document.getElementById('aggCount');
const svg=document.getElementById('timeline');
let ticks=0,raw=[],ds=[],agg=[],expired=0,events=[];

function getRawTTL(){return+document.getElementById('rawTTL').value}
function getDsTTL(){return+document.getElementById('dsTTL').value}
function getSpeed(){return+document.getElementById('speed').value}

function addEvent(msg,color){events.push({msg,color,tick:ticks});if(events.length>12)events.shift()}

function renderBars(){
  const mk=(arr,cls)=>arr.map((_,i)=>{const age=ticks-_.born;const ttl=cls==='raw'?getRawTTL():getDsTTL();
    return`<div class="block ${cls}${age>ttl*.8?' expiring':''}"></div>`}).join('');
  rawBar.innerHTML=mk(raw,'raw');dsBar.innerHTML=mk(ds,'ds');aggBar.innerHTML=mk(agg,'agg');
  rawCount.textContent=raw.length;dsCount.textContent=ds.length;aggCount.textContent=agg.length;
}

function renderTimeline(){
  const w=svg.clientWidth,h=100;
  let html=`<rect width="${w}" height="${h}" fill="#1a1d27"/>`;
  const cols={ingest:'#6ee7b7',downsample:'#60a5fa',aggregate:'#c084fc',expire:'#f87171'};
  events.forEach((e,i)=>{
    const y=12+i*8;
    html+=`<text x="8" y="${y}" fill="${cols[e.color]||'#8b949e'}" font-size="10" font-family="monospace">t=${e.tick} ${e.msg}</text>`;
  });
  svg.innerHTML=html;
}

function tick(){
  // ingest raw points
  const n=Math.floor(Math.random()*4)+1;
  for(let i=0;i<n;i++)raw.push({born:ticks,v:Math.random()*100});
  if(n>0)addEvent(`+${n} raw points ingested`,'ingest');

  // downsample: every 5 ticks, oldest raw → ds
  if(ticks%5===0&&raw.length>=5){
    const batch=raw.splice(0,5);
    const avg=batch.reduce((s,b)=>s+b.v,0)/batch.length;
    ds.push({born:ticks,v:avg});
    addEvent(`5 raw → 1 downsample (avg=${avg.toFixed(1)})`,'downsample');
  }

  // aggregate: every 12 ticks, oldest ds → agg
  if(ticks%12===0&&ds.length>=3){
    const batch=ds.splice(0,3);
    agg.push({born:ticks,v:Math.max(...batch.map(b=>b.v))});
    addEvent(`3 ds → 1 aggregate`,'aggregate');
  }

  // expire raw
  const rawTTL=getRawTTL();
  const before=raw.length;raw=raw.filter(r=>ticks-r.born<rawTTL);
  const exp=before-raw.length;if(exp>0){expired+=exp;addEvent(`${exp} raw expired (TTL=${rawTTL})`,'expire')}

  // expire ds
  const dsTTL=getDsTTL();
  const before2=ds.length;ds=ds.filter(d=>ticks-d.born<dsTTL);
  const exp2=before2-ds.length;if(exp2>0){expired+=exp2;addEvent(`${exp2} ds expired (TTL=${dsTTL})`,'expire')}

  ticks++;renderBars();renderTimeline();
}

document.getElementById('reset').onclick=()=>{ticks=0;raw=[];ds=[];agg=[];expired=0;events=[];renderBars();renderTimeline()};
setInterval(()=>tick(),()=>1000/getSpeed());
setInterval(tick,400);
renderBars();renderTimeline();