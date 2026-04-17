// Storm Elixir Composer — reagent → recipe calculator w/ seeded export.
const REAGENTS=[
  {id:"moss",      name:"Emerald Moss",      tags:["canopy","bitter"],    pot:6, vol:8},
  {id:"wick",      name:"Orchid Wickroot",   tags:["clockwork","floral"], pot:8, vol:5},
  {id:"sap",       name:"Serpent Sap",       tags:["jade","venom"],       pot:12,vol:4},
  {id:"thunder",   name:"Thunder Sugar",     tags:["storm","sweet"],      pot:14,vol:3},
  {id:"dew",       name:"Canopy Dew",        tags:["canopy","cool"],      pot:4, vol:14},
  {id:"ember",     name:"Ember Rind",        tags:["storm","hot"],        pot:10,vol:6},
  {id:"lull",      name:"Lullaby Resin",     tags:["dream","floral"],     pot:9, vol:5},
  {id:"cog",       name:"Brass Cog-Pollen",  tags:["clockwork","mineral"],pot:7, vol:4},
  {id:"gale",      name:"Gale Kelp",         tags:["storm","briny"],      pot:11,vol:7},
  {id:"fern",      name:"Ferntongue Oil",    tags:["canopy","oily"],      pot:8, vol:6},
  {id:"venom",     name:"Basilisk Venom",    tags:["jade","venom"],       pot:16,vol:2},
  {id:"nectar",    name:"Orchid Nectar",     tags:["floral","sweet"],     pot:5, vol:10}
];

function fnv1a(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function xorshift(seed){let x=seed||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return ((x>>>0)/4294967296);};}

let cauldron=[], bucketTokens=8;
const BUCKET_MAX=8;
setInterval(()=>{if(bucketTokens<BUCKET_MAX){bucketTokens+=1;renderStats();}},2500);

const ul=document.getElementById("reagents");
REAGENTS.forEach(r=>{
  const li=document.createElement("li");
  li.innerHTML=`<div>
    <span class="r-name">${r.name}</span>
    <span class="r-tag">tags: ${r.tags.join(", ")} · pot ${r.pot} · vol ${r.vol}</span>
  </div><button data-id="${r.id}">+</button>`;
  li.querySelector("button").addEventListener("click",()=>addReagent(r.id));
  ul.appendChild(li);
});

function addReagent(id){
  if(cauldron.length>=6){appendLog("cauldron full"); return;}
  cauldron.push(id); renderCauldron(); renderStats(); renderRecipe();
}

function renderCauldron(){
  const c=document.getElementById("cauldron");
  c.innerHTML="";
  cauldron.forEach((id,i)=>{
    const r=REAGENTS.find(x=>x.id===id);
    const t=document.createElement("span");
    t.className="token"; t.textContent=r.name;
    t.title="click to remove";
    t.addEventListener("click",()=>{cauldron.splice(i,1);renderCauldron();renderStats();renderRecipe();});
    c.appendChild(t);
  });
  if(!cauldron.length){c.innerHTML='<span style="color:var(--muted);font-size:11px">empty cauldron</span>';}
}
renderCauldron();

function computeStats(){
  if(!cauldron.length) return {pot:0,vol:0,grade:"—",notes:[]};
  const rs=cauldron.map(id=>REAGENTS.find(x=>x.id===id));
  const pot=rs.reduce((a,r)=>a+r.pot,0);
  const vol=rs.reduce((a,r)=>a+r.vol,0);
  // synergy: matching tag adds bonus, hot+cool cancel
  const tagCount={};
  rs.forEach(r=>r.tags.forEach(t=>tagCount[t]=(tagCount[t]||0)+1));
  let bonus=0, notes=[];
  Object.entries(tagCount).forEach(([t,n])=>{
    if(n>=2){bonus+=n*2; notes.push(`+${n*2} synergy(${t})`);}
  });
  if(tagCount.hot && tagCount.cool){bonus-=5; notes.push("-5 hot/cool clash");}
  if(tagCount.venom && !tagCount.floral){bonus-=3; notes.push("-3 raw venom");}
  const total=pot+bonus;
  const vguard=vol===0?1:vol; // divide-by-zero-rate-guard
  const density=(total/vguard).toFixed(2);
  let grade="Murky";
  if(total>=80) grade="Storm-born";
  else if(total>=55) grade="Emerald";
  else if(total>=30) grade="Jadeling";
  return {pot:total,vol,grade,density,notes};
}

function renderStats(){
  const s=computeStats();
  const pe=document.getElementById("potency");
  pe.textContent=s.pot;
  pe.className=s.pot>=80?"gold":s.pot>=55?"":s.pot>=30?"warn":"bad";
  document.getElementById("yield").textContent=s.vol+" ml";
  document.getElementById("grade").textContent=s.grade;
  document.getElementById("bucket").textContent=bucketTokens+"/"+BUCKET_MAX;
}
renderStats();

function truncHash(s,n){
  if(s.length<=n) return s;
  const h=(fnv1a(s)%46656).toString(36).padStart(3,"0");
  return s.slice(0,n-4)+"~"+h;
}

function renderRecipe(){
  const seed=document.getElementById("seed").value||"default";
  const s=computeStats();
  const rec={
    schema:"elixir.v1",
    id:truncHash("brew-"+seed+"-"+cauldron.join("-"),28),
    seed:fnv1a(seed),
    reagents:cauldron.map(id=>REAGENTS.find(x=>x.id===id).name),
    potency:s.pot, volumeMl:s.vol, grade:s.grade, density:s.density,
    notes:s.notes, headers:{orgId:"jade-canopy",producedAt:Date.now()},
    changed:{reagents:true,grade:true}
  };
  document.getElementById("recipe").textContent=JSON.stringify(rec,null,2);
}
renderRecipe();
document.getElementById("seed").addEventListener("input",renderRecipe);

function appendLog(msg){
  const li=document.createElement("li");
  li.textContent=new Date().toISOString().slice(11,19)+"  "+msg;
  const log=document.getElementById("log");
  log.prepend(li);
  while(log.children.length>40) log.lastChild.remove();
}

document.getElementById("brew").addEventListener("click",()=>{
  if(!cauldron.length){appendLog("nothing to brew"); return;}
  if(bucketTokens<=0){appendLog("bucket empty — wait for refill"); return;}
  bucketTokens--;
  const s=computeStats();
  appendLog(`brewed ${s.grade} · pot ${s.pot} · ${s.vol}ml`);
  drawPot(s);
  renderStats();
});

document.getElementById("copy").addEventListener("click",async()=>{
  try{ await navigator.clipboard.writeText(document.getElementById("recipe").textContent);
    appendLog("recipe copied"); }
  catch(e){ appendLog("clipboard unavailable"); }
});

const pot=document.getElementById("pot"), pctx=pot.getContext("2d");
let bubbles=[];
function drawPot(stats){
  const grade=stats?stats.grade:"Murky";
  const tint={"Storm-born":"#fbbf24","Emerald":"#6ee7b7","Jadeling":"#60a5fa","Murky":"#8892a6"}[grade]||"#6ee7b7";
  for(let i=0;i<12;i++){
    bubbles.push({x:pot.width/2+(Math.random()-0.5)*120, y:pot.height, r:2+Math.random()*4,
      vy:-0.4-Math.random()*0.8, life:60+Math.random()*40, c:tint});
  }
}
function animatePot(){
  pctx.fillStyle="rgba(15,17,23,0.35)";
  pctx.fillRect(0,0,pot.width,pot.height);
  bubbles=bubbles.filter(b=>b.life>0);
  for(const b of bubbles){
    b.y+=b.vy; b.life--;
    pctx.fillStyle=b.c; pctx.globalAlpha=Math.min(1,b.life/60);
    pctx.beginPath(); pctx.arc(b.x,b.y,b.r,0,Math.PI*2); pctx.fill();
  }
  pctx.globalAlpha=1;
  requestAnimationFrame(animatePot);
}
animatePot();
appendLog("forge warm. add reagents and brew.");