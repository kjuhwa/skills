const data={name:'root',children:[
  {name:'images',size:4200,color:'#6ee7b7',children:[{name:'thumbs',size:1200,color:'#6ee7b7'},{name:'originals',size:2400,color:'#34d399'},{name:'webp',size:600,color:'#a7f3d0'}]},
  {name:'logs',size:3100,color:'#f472b6',children:[{name:'access',size:1800,color:'#f472b6'},{name:'error',size:900,color:'#ec4899'},{name:'audit',size:400,color:'#f9a8d4'}]},
  {name:'backups',size:5500,color:'#60a5fa',children:[{name:'daily',size:2000,color:'#60a5fa'},{name:'weekly',size:2500,color:'#3b82f6'},{name:'monthly',size:1000,color:'#93c5fd'}]},
  {name:'videos',size:2800,color:'#fbbf24',children:[{name:'raw',size:1800,color:'#fbbf24'},{name:'encoded',size:1000,color:'#f59e0b'}]},
  {name:'docs',size:900,color:'#a78bfa'}
]};
const map=document.getElementById('map'),info=document.getElementById('info'),bc=document.getElementById('breadcrumb');
let current=data,path=['root'];
function totalSize(n){return n.children?n.children.reduce((s,c)=>s+totalSize(c),0):n.size;}
function layout(nodes,x,y,w,h){
  const total=nodes.reduce((s,n)=>s+totalSize(n),0);
  let offset=0;const vertical=w<h;
  nodes.forEach(n=>{const frac=totalSize(n)/total;let nx,ny,nw,nh;
    if(vertical){nx=x;ny=y+offset*h;nw=w;nh=h*frac;offset+=frac;}
    else{nx=x+offset*w;ny=y;nw=w*frac;nh=h;offset+=frac;}
    n._rect={x:nx,y:ny,w:nw,h:nh};});
}
function render(node){
  map.innerHTML='';const items=node.children||[{name:node.name,size:node.size,color:node.color}];
  layout(items,0,0,700,420);
  items.forEach(n=>{const d=document.createElement('div');d.className='cell';
    const r=n._rect;d.style.cssText=`left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;background:${n.color||'#6ee7b7'}44;`;
    const sz=totalSize(n);d.textContent=r.w>50&&r.h>25?`${n.name}\n${sz} MB`:'';
    d.addEventListener('mouseenter',()=>info.textContent=`${n.name}: ${sz} MB — ${n.children?n.children.length+' sub-buckets':'leaf object'}`);
    d.addEventListener('mouseleave',()=>info.textContent='');
    if(n.children)d.addEventListener('click',()=>{current=n;path.push(n.name);bc.textContent='/ '+path.join(' / ');render(n);});
    map.appendChild(d);});
}
bc.addEventListener('click',()=>{if(path.length>1){path.pop();current=data;path.slice(1).forEach(p=>{current=current.children.find(c=>c.name===p);});bc.textContent='/ '+path.join(' / ');render(current);}});
render(data);