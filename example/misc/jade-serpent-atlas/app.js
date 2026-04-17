// Jade Serpent Atlas — force graph with seeded synthetic telemetry.
// fnv1a-xorshift-text-to-procedural-seed → stable seed from keyword.
const KEY = "Jungle alchemists brew storm-born elixirs while jade serpents coil around clockwork orchids humming forgotten lullabies beneath emerald canopies";
function fnv1a(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function xorshift(seed){let x=seed||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return ((x>>>0)/4294967296);};}
let rand = xorshift(fnv1a(KEY));

const TYPES = ["alchemist","serpent","orchid","storm"];
const COLOR = {alchemist:"#a78bfa",serpent:"#6ee7b7",orchid:"#fbbf24",storm:"#60a5fa"};
const LABELS = {
  alchemist:["Moss Distiller","Canopy Vintner","Lullaby Brewer","Dewlight Chymist","Ferntongue"],
  serpent:["Jade Coil","Emerald Basilisk","Lullaby Asp","Brume Viper","Ivy Wyrm"],
  orchid:["Clockwork Orchid","Gear-Pistil","Chrono-Petal","Brass Lily","Dial Orchis"],
  storm:["Storm-born Elixir","Thunder Tincture","Cumulus Draught","Squall Phial","Gale Decoct"]
};
const NARR = {
  alchemist:"Brews storm-born elixirs under dripping canopies.",
  serpent:"Coils around clockwork orchids, humming forgotten lullabies.",
  orchid:"Ticks in measured bloom cycles; petals anchor the ring.",
  storm:"Condensed elixir; half-life governed by pressure band."
};

function genNodes(n=42){
  const out=[];
  for(let i=0;i<n;i++){
    const t=TYPES[Math.floor(rand()*TYPES.length)];
    const name=LABELS[t][Math.floor(rand()*LABELS[t].length)]+" #"+(i+1);
    out.push({id:i,t,name,x:Math.random()*900,y:Math.random()*600,vx:0,vy:0,
      pulse:rand(),health:rand()>0.2?"ok":(rand()>0.5?"warn":"bad"),
      events:[]});
  }
  return out;
}
function genEdges(nodes){
  const e=[];
  for(const a of nodes){
    const k=1+Math.floor(rand()*3);
    for(let j=0;j<k;j++){
      const b=nodes[Math.floor(rand()*nodes.length)];
      if(b.id!==a.id) e.push({a:a.id,b:b.id,w:0.3+rand()*0.7});
    }
  }
  return e;
}

let nodes=genNodes(), edges=genEdges(nodes);
seedEvents();
function seedEvents(){
  const now=Date.now();
  for(const n of nodes){
    n.events=[];
    const k=2+Math.floor(rand()*5);
    for(let i=0;i<k;i++){
      n.events.push({
        t:new Date(now - Math.floor(rand()*3600e3)).toISOString().slice(11,19),
        msg:["pulse rx","elixir batch","coil realign","canopy hum","storm spike","orchid tick"][Math.floor(rand()*6)],
        v:(rand()*100).toFixed(1)
      });
    }
    n.events.sort((a,b)=>a.t<b.t?1:-1);
  }
}

const cvs=document.getElementById("graph"), ctx=cvs.getContext("2d");
let W=0,H=0,DPR=window.devicePixelRatio||1;
function resize(){
  const r=cvs.getBoundingClientRect();
  W=r.width; H=r.height;
  cvs.width=W*DPR; cvs.height=H*DPR;
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener("resize",resize); resize();

let hover=null, selected=null, paused=false, filter="", lens="all";
document.getElementById("q").addEventListener("input",e=>filter=e.target.value.toLowerCase());
document.getElementById("lens").addEventListener("change",e=>lens=e.target.value);
document.getElementById("reseed").addEventListener("click",()=>{
  rand=xorshift(fnv1a(KEY+Date.now())); nodes=genNodes(); edges=genEdges(nodes); seedEvents();
});
document.getElementById("pause").addEventListener("click",e=>{paused=!paused;e.target.textContent=paused?"resume":"pause";});

cvs.addEventListener("mousemove",e=>{
  const r=cvs.getBoundingClientRect();
  const mx=(e.clientX-r.left)*(W/r.width), my=(e.clientY-r.top)*(H/r.height);
  hover=null; let best=14;
  for(const n of visibleNodes()){
    const d=Math.hypot(n.x-mx,n.y-my);
    if(d<best){best=d;hover=n;}
  }
  cvs.style.cursor=hover?"pointer":"default";
});
cvs.addEventListener("click",()=>{ if(hover){selected=hover; renderInspector(hover);} });

function visibleNodes(){
  return nodes.filter(n=>{
    if(lens!=="all" && n.t!==lens) return false;
    if(filter && !n.name.toLowerCase().includes(filter) && !n.t.includes(filter)) return false;
    return true;
  });
}

function renderInspector(n){
  document.getElementById("iname").textContent=n.name;
  const chips=document.getElementById("ichips");
  chips.innerHTML="";
  [["type",n.t,"ok"],["health",n.health,n.health],["pulse",n.pulse.toFixed(2),"ok"]].forEach(([k,v,cls])=>{
    const s=document.createElement("span");
    s.className="chip "+(cls==="ok"?"ok":cls==="warn"?"warn":cls==="bad"?"bad":"");
    s.textContent=k+": "+v;
    chips.appendChild(s);
  });
  document.getElementById("idesc").textContent=NARR[n.t];
  const ul=document.getElementById("ievents");
  ul.innerHTML="";
  n.events.forEach(ev=>{
    const li=document.createElement("li");
    li.textContent=ev.t+"  "+ev.msg.padEnd(14)+"v="+ev.v;
    ul.appendChild(li);
  });
}

function tick(){
  if(!paused){
    // light force simulation
    for(const n of nodes){n.vx*=0.85;n.vy*=0.85;}
    for(const e of edges){
      const a=nodes[e.a], b=nodes[e.b];
      const dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy)||1;
      const target=120;
      const f=(d-target)*0.002*e.w;
      a.vx+=dx/d*f; a.vy+=dy/d*f; b.vx-=dx/d*f; b.vy-=dy/d*f;
    }
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i],b=nodes[j];
        const dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy)||1;
        if(d<80){ const f=(80-d)*0.01; a.vx-=dx/d*f; a.vy-=dy/d*f; b.vx+=dx/d*f; b.vy+=dy/d*f; }
      }
    }
    for(const n of nodes){
      n.x+=n.vx; n.y+=n.vy;
      n.x=Math.max(20,Math.min(W-20,n.x));
      n.y=Math.max(20,Math.min(H-20,n.y));
      n.pulse=(n.pulse+0.01+Math.sin(Date.now()/800+n.id)*0.003)%1;
    }
  }
  // trail fade
  ctx.fillStyle="rgba(15,17,23,0.25)";
  ctx.fillRect(0,0,W,H);
  // edges
  ctx.lineWidth=1;
  for(const e of edges){
    const a=nodes[e.a], b=nodes[e.b];
    if(!visibleNodes().includes(a)||!visibleNodes().includes(b)) continue;
    ctx.strokeStyle="rgba(110,231,183,"+(0.08+e.w*0.2)+")";
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
  }
  // nodes
  for(const n of visibleNodes()){
    const r=5+n.pulse*3;
    ctx.beginPath();
    ctx.fillStyle=COLOR[n.t];
    ctx.globalAlpha=0.2;
    ctx.arc(n.x,n.y,r*2.4,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
    ctx.beginPath(); ctx.arc(n.x,n.y,r,0,Math.PI*2); ctx.fill();
    if(n.health==="bad"){ctx.strokeStyle="#ef4444";ctx.lineWidth=2;ctx.stroke();}
    else if(n.health==="warn"){ctx.strokeStyle="#f59e0b";ctx.lineWidth=1.5;ctx.stroke();}
  }
  if(hover){
    ctx.fillStyle="#e7ecf3"; ctx.font="12px ui-sans-serif";
    ctx.fillText(hover.name, hover.x+10, hover.y-10);
  }
  document.getElementById("stats").textContent=
    `nodes ${visibleNodes().length}/${nodes.length} · edges ${edges.length} · ${paused?"paused":"live"}`;
  requestAnimationFrame(tick);
}
tick();
renderInspector(nodes[0]);