const svg=document.getElementById('canvas'),ns='http://www.w3.org/2000/svg';
let nodes=[],links=[],dragNode=null,off={x:0,y:0},idCounter=0;
const colors={extract:'#3b82f6',transform:'#f59e0b',load:'#6ee7b7'};

function initSvg(){
  const defs=el('defs');
  const marker=el('marker',{id:'arrow',viewBox:'0 0 10 10',refX:10,refY:5,markerWidth:6,markerHeight:6,orient:'auto-start-reverse'});
  marker.appendChild(el('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'#6ee7b7'}));
  defs.appendChild(marker);svg.appendChild(defs);
}
function el(tag,attrs={}){const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e}

function addNode(type){
  const id=idCounter++,x=100+nodes.length*180,y=200+Math.random()*100;
  const g=el('g',{class:'node',transform:`translate(${x},${y})`});
  g.appendChild(el('rect',{width:120,height:50,fill:colors[type],opacity:.18,stroke:colors[type],'stroke-width':1.5}));
  const t=el('text',{x:60,y:30,'text-anchor':'middle'});t.textContent=type.toUpperCase()+' '+id;
  g.appendChild(t);svg.appendChild(g);
  const node={id,type,x,y,g};nodes.push(node);
  if(nodes.length>1) addLink(nodes[nodes.length-2],node);
  g.addEventListener('mousedown',e=>{dragNode=node;off={x:e.clientX-node.x,y:e.clientY-node.y}});
}

function addLink(a,b){
  const line=el('line',{class:'link'});svg.insertBefore(line,svg.firstChild.nextSibling);
  links.push({from:a,to:b,el:line});updateLinks();
}

function updateLinks(){links.forEach(l=>{l.el.setAttribute('x1',l.from.x+120);l.el.setAttribute('y1',l.from.y+25);l.el.setAttribute('x2',l.to.x);l.el.setAttribute('y2',l.to.y+25)})}

document.addEventListener('mousemove',e=>{if(!dragNode)return;dragNode.x=e.clientX-off.x;dragNode.y=e.clientY-off.y;dragNode.g.setAttribute('transform',`translate(${dragNode.x},${dragNode.y})`);updateLinks()});
document.addEventListener('mouseup',()=>dragNode=null);

function runPipeline(){
  links.forEach((l,i)=>{setTimeout(()=>{l.el.classList.add('pulse');l.el.setAttribute('stroke-dasharray','10 10');setTimeout(()=>{l.el.classList.remove('pulse');l.el.removeAttribute('stroke-dasharray')},1200)},i*800)});
}
initSvg();addNode('extract');addNode('transform');addNode('load');