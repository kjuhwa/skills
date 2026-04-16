const flags = [
  {id:'auth_v2', name:'Auth v2', enabled:true, deps:[], x:120, y:90},
  {id:'new_ui', name:'New UI Shell', enabled:true, deps:['auth_v2'], x:340, y:90},
  {id:'dark_mode', name:'Dark Mode', enabled:true, deps:['new_ui'], x:560, y:60},
  {id:'dashboard_v2', name:'Dashboard v2', enabled:false, deps:['new_ui'], x:560, y:180},
  {id:'realtime', name:'Realtime Sync', enabled:true, deps:[], x:120, y:280},
  {id:'collab', name:'Live Collab', enabled:false, deps:['realtime','auth_v2'], x:340, y:280},
  {id:'ai_suggest', name:'AI Suggestions', enabled:true, deps:['collab','dashboard_v2'], x:560, y:340},
  {id:'beta_exp', name:'Beta Exports', enabled:true, deps:['dashboard_v2'], x:340, y:430}
];

const svg = document.getElementById('graph');
let selected = null;

function isActive(f){
  if(!f.enabled) return false;
  return f.deps.every(d=>{const p=flags.find(x=>x.id===d);return p&&isActive(p)});
}

function isBlocked(f){
  return f.enabled && !isActive(f);
}

function renderList(){
  const ul = document.getElementById('flagList');
  ul.innerHTML = '';
  flags.forEach(f=>{
    const li = document.createElement('li');
    const state = isActive(f) ? 'on' : (isBlocked(f) ? 'blocked' : 'off');
    li.innerHTML = `<span class="dot ${state}"></span>${f.name}`;
    if(selected===f.id) li.classList.add('selected');
    li.onclick = ()=>{selected=f.id;f.enabled=!f.enabled;renderAll()};
    ul.appendChild(li);
  });
}

function renderGraph(){
  svg.innerHTML = `<defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#4b5563"/></marker></defs>`;
  flags.forEach(f=>{
    f.deps.forEach(d=>{
      const p = flags.find(x=>x.id===d);
      const active = isActive(p) && f.enabled;
      svg.innerHTML += `<line class="edge ${active?'active':''}" x1="${p.x}" y1="${p.y}" x2="${f.x}" y2="${f.y}"/>`;
    });
  });
  flags.forEach(f=>{
    const color = isActive(f)?'#6ee7b7':(isBlocked(f)?'#f87171':'#4b5563');
    const sel = selected===f.id ? 'stroke="#6ee7b7" stroke-width="3"' : 'stroke="#2a2f3d" stroke-width="2"';
    svg.innerHTML += `<circle class="node-circle" cx="${f.x}" cy="${f.y}" r="22" fill="${color}" ${sel} data-id="${f.id}"/>`;
    svg.innerHTML += `<text class="node-label" x="${f.x}" y="${f.y+40}">${f.name}</text>`;
  });
  [...svg.querySelectorAll('.node-circle')].forEach(c=>{
    c.onclick = ()=>{const id=c.getAttribute('data-id');const f=flags.find(x=>x.id===id);selected=id;f.enabled=!f.enabled;renderAll()};
  });
}

function renderDetail(){
  const el = document.getElementById('detail');
  if(!selected){el.textContent='Select a flag to inspect.';return}
  const f = flags.find(x=>x.id===selected);
  const state = isActive(f) ? 'ACTIVE' : (isBlocked(f) ? 'BLOCKED by deps' : 'OFF');
  const deps = f.deps.length ? f.deps.join(', ') : 'none';
  const dependents = flags.filter(x=>x.deps.includes(f.id)).map(x=>x.id).join(', ') || 'none';
  el.innerHTML = `<b>${f.name}</b> — status: <b>${state}</b><br>depends on: ${deps}<br>unlocks: ${dependents}`;
}

function renderAll(){renderList();renderGraph();renderDetail()}
renderAll();