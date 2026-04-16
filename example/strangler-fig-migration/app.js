const SERVICES=[
  {name:'Auth Service',team:'Platform',lines:12400,status:'migrated',progress:100},
  {name:'User Profiles',team:'Identity',lines:8300,status:'migrated',progress:100},
  {name:'Payment Gateway',team:'Billing',lines:22100,status:'inprogress',progress:67},
  {name:'Order Processing',team:'Commerce',lines:18900,status:'inprogress',progress:42},
  {name:'Inventory Mgmt',team:'Warehouse',lines:15600,status:'inprogress',progress:23},
  {name:'Notification Hub',team:'Platform',lines:6700,status:'legacy',progress:5},
  {name:'Report Engine',team:'Analytics',lines:31200,status:'legacy',progress:0},
  {name:'Admin Console',team:'Internal',lines:9400,status:'legacy',progress:0},
];
const container=document.getElementById('services');
function render(){
  container.innerHTML='';
  let m=0,ip=0,l=0,totalP=0;
  SERVICES.forEach((s,i)=>{
    if(s.status==='migrated')m++;else if(s.status==='inprogress')ip++;else l++;
    totalP+=s.progress;
    const d=document.createElement('div');
    d.className='svc '+s.status;
    d.innerHTML=`<div class="name">${s.name}</div><div class="meta">${s.team} · ${(s.lines/1000).toFixed(1)}k LOC · ${s.progress}%</div><div class="pbar"><div class="pfill" style="width:${s.progress}%"></div></div>`;
    d.onclick=()=>advance(i);
    container.appendChild(d);
  });
  document.getElementById('migrated').textContent=m;
  document.getElementById('inprogress').textContent=ip;
  document.getElementById('legacy').textContent=l;
  document.getElementById('progressBar').style.width=(totalP/(SERVICES.length*100)*100).toFixed(1)+'%';
}
function advance(i){
  const s=SERVICES[i];
  if(s.progress>=100)return;
  s.progress=Math.min(100,s.progress+Math.floor(Math.random()*15)+8);
  s.status=s.progress>=100?'migrated':s.progress>0?'inprogress':'legacy';
  render();
}
render();