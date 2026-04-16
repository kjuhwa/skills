const data=[
  {name:'Auth',route:'/api/auth'},{name:'Users',route:'/api/users'},
  {name:'Orders',route:'/api/orders'},{name:'Payments',route:'/api/payments'},
  {name:'Inventory',route:'/api/inventory'},{name:'Reports',route:'/api/reports'},
  {name:'Notifications',route:'/api/notify'},{name:'Search',route:'/api/search'}
];
let migrated=new Set();
const $m=document.getElementById('modules'),
      $r=document.getElementById('routes'),
      $s=document.getElementById('services');

function render(){
  $m.innerHTML='';$r.innerHTML='';$s.innerHTML='';
  data.forEach((d,i)=>{
    const done=migrated.has(i);
    const el=document.createElement('div');
    el.className='mod '+(done?'done':'legacy');
    el.textContent=d.name+(done?' ✓':'');
    if(!done)el.onclick=()=>migrate(i);
    $m.appendChild(el);
    const rt=document.createElement('div');
    rt.className='route'+(done?' new':'');
    rt.textContent=d.route+' → '+(done?'new service':'monolith');
    $r.appendChild(rt);
    if(done){
      const sv=document.createElement('div');
      sv.className='svc';sv.textContent=d.name+' Service';
      $s.appendChild(sv);
    }
  });
  const pct=Math.round(migrated.size/data.length*100);
  document.getElementById('fill').style.width=pct+'%';
  document.getElementById('pct').textContent=pct+'% migrated';
}

function migrate(i){migrated.add(i);render()}
render();