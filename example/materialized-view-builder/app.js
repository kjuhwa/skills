const REGIONS=["NA","EU","APAC","SA"];
const PRODUCTS=["Widget","Gadget","Gizmo","Doohickey"];
const STATUSES=["paid","pending","refunded"];
let source=[];
let mv=[];
let stale=true;

function rand(arr){return arr[Math.floor(Math.random()*arr.length)];}
function seed(){
  for(let i=1;i<=40;i++){
    source.push({id:i,region:rand(REGIONS),product:rand(PRODUCTS),status:rand(STATUSES),amount:Math.floor(Math.random()*500)+20});
  }
}

function renderSource(){
  const t=document.getElementById("sourceTable");
  t.innerHTML="<tr><th>id</th><th>region</th><th>product</th><th>status</th><th>amount</th></tr>"+
    source.slice(-30).reverse().map(r=>`<tr class="${r._new?'new':''}"><td>${r.id}</td><td>${r.region}</td><td>${r.product}</td><td>${r.status}</td><td>$${r.amount}</td></tr>`).join("");
  source.forEach(r=>r._new=false);
}

function renderMv(){
  const t=document.getElementById("mvTable");
  if(!mv.length){t.innerHTML='<tr><td style="color:var(--muted);padding:20px;text-align:center;">No view materialized yet</td></tr>';return;}
  const cols=Object.keys(mv[0]);
  t.innerHTML=`<tr>${cols.map(c=>`<th>${c}</th>`).join("")}</tr>`+
    mv.map(r=>`<tr>${cols.map(c=>`<td>${typeof r[c]==='number'?r[c].toLocaleString():r[c]}</td>`).join("")}</tr>`).join("");
}

function setStatus(){
  const s=document.getElementById("status");
  if(stale){s.textContent="Stale — source has changed since last materialize";s.className="status stale";}
  else{s.textContent=`Fresh — ${mv.length} rows materialized at ${new Date().toLocaleTimeString()}`;s.className="status fresh";}
}

function materialize(){
  const g=document.getElementById("groupBy").value;
  const a=document.getElementById("agg").value;
  const f=document.getElementById("filter").value;
  const data=f?source.filter(r=>r.status===f):source;
  const groups={};
  data.forEach(r=>{(groups[r[g]]=groups[r[g]]||[]).push(r);});
  mv=Object.entries(groups).map(([k,rows])=>{
    const amounts=rows.map(r=>r.amount);
    let val;
    if(a==="sum")val=amounts.reduce((s,x)=>s+x,0);
    else if(a==="avg")val=Math.round(amounts.reduce((s,x)=>s+x,0)/amounts.length);
    else if(a==="count")val=rows.length;
    else if(a==="max")val=Math.max(...amounts);
    return {[g]:k,[a]:val,rows:rows.length};
  }).sort((a,b)=>b[document.getElementById("agg").value]-a[document.getElementById("agg").value]);
  stale=false;
  renderMv();setStatus();
}

document.getElementById("materialize").onclick=materialize;
document.getElementById("addRow").onclick=()=>{
  source.push({id:source.length+1,region:rand(REGIONS),product:rand(PRODUCTS),status:rand(STATUSES),amount:Math.floor(Math.random()*500)+20,_new:true});
  stale=true;renderSource();setStatus();
};

seed();renderSource();renderMv();setStatus();