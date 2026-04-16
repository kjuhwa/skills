const scopeData=[
  {id:'read:profile',label:'read:profile',desc:'Read user profile info'},
  {id:'write:profile',label:'write:profile',desc:'Update user profile'},
  {id:'read:email',label:'read:email',desc:'Access email address'},
  {id:'read:repos',label:'read:repos',desc:'List repositories'},
  {id:'write:repos',label:'write:repos',desc:'Create & edit repos'},
  {id:'delete:repos',label:'delete:repos',desc:'Delete repositories'},
  {id:'admin',label:'admin',desc:'Full admin access'},
  {id:'read:org',label:'read:org',desc:'Read organization data'}
];
const endpoints=[
  {method:'GET',path:'/user/profile',requires:['read:profile']},
  {method:'PUT',path:'/user/profile',requires:['write:profile']},
  {method:'GET',path:'/user/email',requires:['read:email']},
  {method:'GET',path:'/repos',requires:['read:repos']},
  {method:'POST',path:'/repos',requires:['write:repos']},
  {method:'DELETE',path:'/repos/:id',requires:['delete:repos']},
  {method:'GET',path:'/org/members',requires:['read:org']},
  {method:'POST',path:'/org/invite',requires:['admin']},
  {method:'GET',path:'/org/settings',requires:['admin','read:org']},
  {method:'PUT',path:'/org/settings',requires:['admin']},
  {method:'GET',path:'/repos/:id/stats',requires:['read:repos']},
  {method:'POST',path:'/repos/:id/deploy',requires:['write:repos','admin']}
];
let active=new Set(['read:profile','read:email']);
function render(){
  const sc=document.getElementById('scopes');
  sc.innerHTML='<h2 style="color:#6ee7b7;font-size:.9rem;margin-bottom:10px">Scopes</h2>';
  scopeData.forEach(s=>{
    const d=document.createElement('div');
    d.className='scope-item'+(active.has(s.id)?' active':'');
    d.innerHTML=`<div class="scope-toggle"></div><div><div class="scope-label">${s.label}</div><div class="scope-desc">${s.desc}</div></div>`;
    d.onclick=()=>{active.has(s.id)?active.delete(s.id):active.add(s.id);render();};
    sc.appendChild(d);
  });
  const ep=document.getElementById('endpoints');
  ep.innerHTML='<h2 style="color:#6ee7b7;font-size:.9rem;margin-bottom:10px">API Endpoints</h2>';
  endpoints.forEach(e=>{
    const ok=e.requires.every(r=>active.has(r));
    const d=document.createElement('div');
    d.className='ep '+(ok?'unlocked':'locked');
    d.innerHTML=`<div><span class="method">${e.method}</span> ${e.path}</div><span class="lock">${ok?'\u2713':'\u{1f512}'} ${ok?'':'needs: '+e.requires.filter(r=>!active.has(r)).join(', ')}</span>`;
    ep.appendChild(d);
  });
  document.getElementById('scopeStr').textContent=active.size?[...active].join(' '):'(none)';
}
render();