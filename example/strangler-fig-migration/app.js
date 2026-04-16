const modules=[
  {name:'Auth Service',desc:'Login, tokens, sessions',traffic:15},
  {name:'User Profiles',desc:'CRUD user data',traffic:10},
  {name:'Billing',desc:'Invoices & payments',traffic:18},
  {name:'Notifications',desc:'Email, SMS, push',traffic:8},
  {name:'Search',desc:'Full-text indexing',traffic:12},
  {name:'Analytics',desc:'Event tracking & reports',traffic:14},
  {name:'File Storage',desc:'Upload & retrieval',traffic:11},
  {name:'API Gateway',desc:'Rate limiting & routing',traffic:12}
];
let migratedSet=new Set();
const monoCol=document.getElementById('monolith');
const svcCol=document.getElementById('services');
const svg=document.getElementById('arrows');

function render(){
  monoCol.querySelectorAll('.mod').forEach(e=>e.remove());
  svcCol.querySelectorAll('.mod').forEach(e=>e.remove());
  svg.innerHTML='';
  modules.forEach((m,i)=>{
    const d=document.createElement('div');d.className='mod'+(migratedSet.has(i)?' done':'');
    d.innerHTML=`<strong>${m.name}</strong><br><span style="color:#555">${m.desc}</span>`;
    if(!migratedSet.has(i))d.onclick=()=>migrate(i);
    monoCol.appendChild(d);
    if(migratedSet.has(i)){
      const s=document.createElement('div');s.className='mod svc';
      s.innerHTML=`<strong>${m.name}</strong><br><span style="color:#6ee7b7aa">● Running</span>`;
      svcCol.appendChild(s);
      const y1=58+i*52,y2=58+migratedSet.size*52-52+26;
      const line=document.createElementNS('http://www.w3.org/2000/svg','path');
      line.setAttribute('d',`M0,${y1} C60,${y1} 60,${y2} 120,${y2}`);
      line.setAttribute('stroke','#6ee7b7');line.setAttribute('stroke-width','1.5');
      line.setAttribute('fill','none');line.setAttribute('opacity','0.4');
      svg.appendChild(line);
    }
  });
  const pct=modules.reduce((s,m,i)=>s+(migratedSet.has(i)?m.traffic:0),0);
  document.getElementById('migrated').textContent=migratedSet.size;
  document.getElementById('traffic').textContent=pct;
  document.getElementById('barFill').style.width=pct+'%';
}

function migrate(i){migratedSet.add(i);render()}
render();