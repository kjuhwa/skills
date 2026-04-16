const algos=[
  {name:"Round Robin",fn:rr,idx:0},
  {name:"Least Connections",fn:lc},
  {name:"Weighted Random",fn:wr}
];
const SRV=5,TOTAL=200,colors=["#6ee7b7","#67e8f9","#a78bfa","#fbbf24","#f87171"];
const weights=[3,2,2,1,1];
let lanes=[],running=false;

function init(){
  const grid=document.getElementById("grid");grid.innerHTML="";lanes=[];
  algos.forEach((a,ai)=>{
    const d=document.createElement("div");d.className="lane";
    d.innerHTML=`<h2>${a.name}</h2><div class="stats" id="st${ai}">Waiting...</div>`;
    const srvs=[];
    for(let i=0;i<SRV;i++){
      const w=document.createElement("div");w.className="bar-wrap";
      w.innerHTML=`<span class="bar-label">S${i+1}</span><div class="bar-bg"><div class="bar-fill" id="bf${ai}_${i}" style="width:0;background:${colors[i]}"></div><span class="bar-val" id="bv${ai}_${i}">0</span></div>`;
      d.appendChild(w);srvs.push(0);
    }
    d.innerHTML+=`<div class="score" id="sc${ai}"></div>`;
    grid.appendChild(d);lanes.push({algo:a,counts:srvs,sent:0});
  });
}

function rr(counts,i){return i%SRV}
function lc(counts){let m=0;counts.forEach((c,i)=>{if(c<counts[m])m=i});return m}
function wr(counts){const total=weights.reduce((a,b)=>a+b,0);let r=Math.random()*total,s=0;
  for(let i=0;i<SRV;i++){s+=weights[i];if(r<=s)return i}return SRV-1}

function step(){
  let allDone=true;
  lanes.forEach((l,ai)=>{
    if(l.sent>=TOTAL)return;allDone=false;
    const target=l.algo.fn(l.counts,l.sent);
    l.counts[target]++;l.sent++;
    for(let i=0;i<SRV;i++){
      const pct=(l.counts[i]/TOTAL)*100;
      document.getElementById(`bf${ai}_${i}`).style.width=pct+"%";
      document.getElementById(`bv${ai}_${i}`).textContent=l.counts[i];
    }
    const avg=TOTAL/SRV,variance=l.counts.reduce((s,c)=>s+Math.pow(c-avg,2),0)/SRV;
    document.getElementById(`st${ai}`).textContent=`${l.sent}/${TOTAL} sent | variance: ${variance.toFixed(1)}`;
    if(l.sent>=TOTAL){
      document.getElementById(`sc${ai}`).textContent="σ² = "+variance.toFixed(1);
    }
  });
  if(!allDone)setTimeout(step,25);else running=false;
}

document.getElementById("start").onclick=()=>{if(!running){running=true;init();setTimeout(step,300)}};
document.getElementById("reset").onclick=()=>{running=false;init()};
init();