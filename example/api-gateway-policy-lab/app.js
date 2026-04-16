const catalog = [
  {id:'auth',name:'Authenticate',run:r=>r.token&&r.token.includes('valid')?{ok:true,msg:'JWT verified'}:{ok:false,msg:'401 invalid token'}},
  {id:'rate',name:'Rate Limit 5/s',run:r=>{const c=(r.ctx.rate=(r.ctx.rate||0)+1);return c<=5?{ok:true,msg:`bucket ${c}/5`}:{ok:false,msg:'429 rate limited'};}},
  {id:'size',name:'Body < 100KB',run:r=>r.size<=100?{ok:true,msg:`${r.size}KB accepted`}:{ok:false,msg:'413 payload too large'}},
  {id:'cors',name:'CORS Inject',run:_=>({ok:true,msg:'Access-Control headers added'})},
  {id:'log',name:'Audit Log',run:r=>({ok:true,msg:`logged ${r.method} ${r.path}`})},
  {id:'cache',name:'Cache Lookup',run:r=>r.method==='GET'&&Math.random()<0.4?{ok:true,msg:'cache HIT — short-circuit',stop:true}:{ok:true,msg:'cache MISS'}},
  {id:'trans',name:'Transform Path',run:r=>{r.path=r.path.replace(/^\/orders/,'/v2/orders');return{ok:true,msg:`rewritten → ${r.path}`};}},
  {id:'acl',name:'Path ACL',run:r=>r.path.includes('/admin')?{ok:false,msg:'403 forbidden path'}:{ok:true,msg:'path allowed'}},
  {id:'route',name:'Route to Service',run:r=>({ok:true,msg:`→ orders-svc (${r.path})`})}
];

let pipeline = ['auth','rate','cache','route'];

function renderPipeline(){
  const el=document.getElementById('pipeline');
  el.innerHTML='';
  if(!pipeline.length){el.innerHTML='<div style="color:#6b7280;font-size:12px;text-align:center;padding:40px">Add policies from below</div>';return;}
  pipeline.forEach((id,i)=>{
    const p=catalog.find(c=>c.id===id);
    const d=document.createElement('div');
    d.className='chip';
    d.innerHTML=`<span>${p.name}</span><span><span class="up" data-i="${i}">↑</span><span class="x" data-i="${i}">✕</span></span>`;
    el.appendChild(d);
  });
  el.querySelectorAll('.x').forEach(b=>b.onclick=e=>{pipeline.splice(+e.target.dataset.i,1);renderPipeline();});
  el.querySelectorAll('.up').forEach(b=>b.onclick=e=>{
    const i=+e.target.dataset.i;
    if(i>0){[pipeline[i-1],pipeline[i]]=[pipeline[i],pipeline[i-1]];renderPipeline();}
  });
}

function renderPalette(){
  const el=document.getElementById('palette');
  el.innerHTML='';
  catalog.forEach(p=>{
    const b=document.createElement('span');
    b.className='pitem';
    b.textContent='+ '+p.name;
    b.onclick=()=>{pipeline.push(p.id);renderPipeline();};
    el.appendChild(b);
  });
}

document.getElementById('send').onclick=()=>{
  const req={
    method:document.getElementById('method').value,
    path:document.getElementById('path').value,
    token:document.getElementById('token').value,
    size:+document.getElementById('size').value,
    ctx:{}
  };
  const trace=document.getElementById('trace');
  trace.innerHTML='';
  for(const id of pipeline){
    const p=catalog.find(c=>c.id===id);
    const res=p.run(req);
    const li=document.createElement('li');
    li.className=res.ok?'pass':'rej';
    li.textContent=`${p.name} — ${res.msg}`;
    trace.appendChild(li);
    if(!res.ok){
      const fin=document.createElement('li');
      fin.className='rej';
      fin.textContent='GATEWAY RESPONSE — request rejected';
      trace.appendChild(fin);
      return;
    }
    if(res.stop){
      const fin=document.createElement('li');
      fin.className='pass';
      fin.textContent='GATEWAY RESPONSE — cached 200 OK';
      trace.appendChild(fin);
      return;
    }
  }
  const fin=document.createElement('li');
  fin.className='pass';
  fin.textContent='GATEWAY RESPONSE — 200 OK from upstream';
  trace.appendChild(fin);
};

renderPipeline();
renderPalette();