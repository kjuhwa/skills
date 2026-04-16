const versions = [
  {v:"v1",status:"sunset",color:"#f87171",weight:5},
  {v:"v2",status:"deprecated",color:"#fbbf24",weight:25},
  {v:"v3",status:"stable",color:"#6ee7b7",weight:55},
  {v:"v4-beta",status:"beta",color:"#60a5fa",weight:15}
];
const endpoints = ["/users","/orders","/payments","/webhooks","/auth/token"];

const history = versions.map(()=>Array(60).fill(0));
const totals = versions.map(()=>0);
let grandTotal = 0;

const statsEl = document.getElementById("stats");
versions.forEach((v,i)=>{
  const d = document.createElement("div");
  d.className = "stat";
  d.style.borderTopColor = v.color;
  d.innerHTML = `<h4>${v.v} · ${v.status}</h4><div class="num" id="num${i}" style="color:${v.color}">0</div><div class="pct" id="pct${i}">0%</div>`;
  statsEl.appendChild(d);
});

function pickVersion(){
  const total = versions.reduce((s,v)=>s+v.weight,0);
  let r = Math.random()*total;
  for(const v of versions){ if((r-=v.weight)<=0) return v; }
  return versions[0];
}

function tick(){
  const counts = versions.map(()=>0);
  const reqs = 8 + Math.floor(Math.random()*20);
  for(let i=0;i<reqs;i++){
    const v = pickVersion();
    const idx = versions.indexOf(v);
    counts[idx]++;
    totals[idx]++;
    grandTotal++;
    if(Math.random()<0.3) logReq(v);
  }
  counts.forEach((c,i)=>{
    history[i].push(c);
    history[i].shift();
    document.getElementById("num"+i).textContent = totals[i];
    const pct = grandTotal? ((totals[i]/grandTotal)*100).toFixed(1):"0";
    document.getElementById("pct"+i).textContent = pct + "% of traffic";
  });
  draw();
}

function logReq(v){
  const log = document.getElementById("log");
  const ep = endpoints[Math.floor(Math.random()*endpoints.length)];
  const code = v.status==="sunset" && Math.random()<0.4 ? 410 : (Math.random()<0.92?200:500);
  const div = document.createElement("div");
  div.className = "entry " + v.status;
  div.innerHTML = `<span class="tag" style="background:${v.color};color:#0f1117">${v.v}</span>
    <span class="path">${ep}</span><span class="status">${code}</span>`;
  log.prepend(div);
  while(log.children.length>40) log.lastChild.remove();
}

function draw(){
  const c = document.getElementById("chart");
  const ctx = c.getContext("2d");
  const W = c.width, H = c.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = "#1a1d27";
  ctx.fillRect(0,0,W,H);

  const max = Math.max(5, ...history.flat());
  ctx.strokeStyle = "#2a2f3e";
  ctx.lineWidth = 1;
  for(let g=1;g<5;g++){
    const y = (H/5)*g;
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
  }

  versions.forEach((v,i)=>{
    ctx.strokeStyle = v.color;
    ctx.fillStyle = v.color + "22";
    ctx.lineWidth = 2;
    ctx.beginPath();
    history[i].forEach((val,j)=>{
      const x = (j/(history[i].length-1))*W;
      const y = H - (val/max)*H*0.95;
      if(j===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
    ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();

    ctx.fillStyle = v.color;
    ctx.font = "12px monospace";
    ctx.fillText(v.v, 10, 20 + i*16);
  });
}

setInterval(tick, 900);
tick();