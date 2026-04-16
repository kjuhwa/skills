const svg=document.getElementById('svg');
const ns='http://www.w3.org/2000/svg';
const nodes=[];const edges=[];
let linking=null;let idSeq=0;
const names=['Source','Filter','Map','Join','Aggregate','Sink','Dedupe','Enrich'];
function el(tag,attrs){const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e}
function addNode(x,y,name){
  x=x||100+Math.random()*600;y=y||60+Math.random()*280;
  name=name||names[idSeq%names.length];
  const id=idSeq++;const g=el('g',{transform:`translate(${x},${y})`});
  const r=el('rect',{x:-55,y:-20,width:110,height:40,rx:8,fill:'#262a36',stroke:'#6ee7b7','stroke-width':1.5,class:'node'});
  const t=el('text',{x:0,y:5,fill:'#c9d1d9','text-anchor':'middle','font-size':'12','font-family':'Segoe UI','pointer-events':'none'});
  t.textContent=name;
  const out=el('circle',{cx:55,cy:0,r:6,fill:'#6ee7b7',cursor:'pointer'});
  const inp=el('circle',{cx:-55,cy:0,r:6,fill:'#6ee7b7',opacity:.4,cursor:'pointer'});
  g.append(r,t,out,inp);svg.append(g);
  const node={id,x,y,name,g,rect:r};nodes.push(node);
  let drag=false,ox,oy;
  r.onmousedown=e=>{drag=true;ox=e.clientX-x;oy=e.clientY-y;e.stopPropagation()};
  window.addEventListener('mousemove',e=>{if(!drag)return;node.x=e.clientX-ox;node.y=e.clientY-oy;g.setAttribute('transform',`translate(${node.x},${node.y})`);redrawEdges()});
  window.addEventListener('mouseup',()=>{drag=false});
  out.onmousedown=e=>{e.stopPropagation();linking=node};
  inp.onmousedown=e=>{e.stopPropagation();if(linking&&linking.id!==node.id){edges.push({from:linking,to:node});redrawEdges()}linking=null};
  return node;
}
function redrawEdges(){
  svg.querySelectorAll('.edge').forEach(e=>e.remove());
  edges.forEach(({from,to})=>{
    const l=el('line',{x1:from.x+55,y1:from.y,x2:to.x-55,y2:to.y,stroke:'#6ee7b7','stroke-width':2,'stroke-dasharray':'6,3',class:'edge'});
    svg.prepend(l);
  });
}
function runPipeline(){
  let i=0;const order=[...new Set(edges.flatMap(e=>[e.from,e.to]))];
  if(!order.length){nodes.forEach(n=>order.push(n))}
  function step(){
    if(i>=order.length)return;
    const n=order[i];n.rect.setAttribute('fill','#1a4a3a');n.rect.setAttribute('stroke','#34d399');
    setTimeout(()=>{n.rect.setAttribute('fill','#143026');i++;step()},500);
  }
  nodes.forEach(n=>{n.rect.setAttribute('fill','#262a36');n.rect.setAttribute('stroke','#6ee7b7')});
  step();
}
const s=addNode(80,100,'Kafka Source');const f=addNode(260,70,'Validate');
const t=addNode(260,180,'Parse JSON');const e2=addNode(460,100,'Enrich');
const l=addNode(660,100,'Postgres Sink');
edges.push({from:s,to:f},{from:s,to:t},{from:f,to:e2},{from:t,to:e2},{from:e2,to:l});
redrawEdges();