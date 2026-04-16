const palette = ['#6ee7b7','#fca5a5','#93c5fd','#fcd34d','#c4b5fd','#fdba74','#5eead4','#f9a8d4','#a3e635','#67e8f9'];
const KEYS = Array.from({length:200}, (_,i)=>'k'+i);
let nodes = ['n0','n1','n2','n3'];
let prevMod = {}, prevCon = {};

function h32(s){
  let h = 2166136261>>>0;
  for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h,16777619); }
  return h>>>0;
}

function modAssign(){
  const out = {};
  for(const k of KEYS){ out[k] = nodes[h32(k)%nodes.length]; }
  return out;
}

function buildRing(){
  const ring = [];
  nodes.forEach((n,idx)=>{
    for(let v=0;v<80;v++) ring.push({pos:h32(n+'#'+v), node:n, idx});
  });
  ring.sort((a,b)=>a.pos-b.pos);
  return ring;
}

function conAssign(){
  const ring = buildRing();
  const out = {};
  for(const k of KEYS){
    const p = h32(k);
    let chosen = ring[0];
    for(const r of ring){ if(r.pos>=p){ chosen=r; break; } }
    out[k] = chosen.node;
  }
  return out;
}

function nodeColor(n){
  const i = nodes.indexOf(n);
  return palette[(i<0?0:i) % palette.length];
}

function render(){
  const mod = modAssign(), con = conAssign();
  const modGrid = document.getElementById('modGrid');
  const conGrid = document.getElementById('conGrid');
  modGrid.innerHTML=''; conGrid.innerHTML='';
  let modMoved=0, conMoved=0;

  for(const k of KEYS){
    const cm = document.createElement('div');
    cm.className='cell'; cm.style.background = nodeColor(mod[k]);
    cm.textContent = mod[k].slice(1);
    if(prevMod[k] && prevMod[k]!==mod[k]){ cm.classList.add('moved'); modMoved++; }
    modGrid.appendChild(cm);

    const cc = document.createElement('div');
    cc.className='cell'; cc.style.background = nodeColor(con[k]);
    cc.textContent = con[k].slice(1);
    if(prevCon[k] && prevCon[k]!==con[k]){ cc.classList.add('moved'); conMoved++; }
    conGrid.appendChild(cc);
  }
  document.getElementById('modMoved').textContent = modMoved;
  document.getElementById('conMoved').textContent = conMoved;
  document.getElementById('total').textContent = KEYS.length;
  document.getElementById('total2').textContent = KEYS.length;
  document.getElementById('nList').textContent = nodes.join(', ');
  prevMod = mod; prevCon = con;
}

document.getElementById('add').onclick = ()=>{
  nodes.push('n'+nodes.length); render();
};
document.getElementById('rm').onclick = ()=>{
  if(nodes.length>1){ nodes.pop(); render(); }
};
document.getElementById('reset').onclick = ()=>{
  nodes = ['n0','n1','n2','n3']; prevMod={}; prevCon={}; render();
};
render();