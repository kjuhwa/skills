const svg=document.getElementById('eco'),tip=document.getElementById('tooltip');
const NS='http://www.w3.org/2000/svg';
const species=[
  {id:'fig',label:'Strangler Fig',x:350,y:200,r:32,color:'#6ee7b7',
    info:'Ficus sp. — keystone species providing fruit year-round for dozens of animals.'},
  {id:'host',label:'Host Tree',x:350,y:340,r:24,color:'#8B6914',
    info:'The host tree slowly declines as the fig encases its trunk.'},
  {id:'hornbill',label:'Hornbill',x:180,y:120,r:16,color:'#f9a825',
    info:'Disperses fig seeds across the canopy via droppings.'},
  {id:'bat',label:'Fruit Bat',x:520,y:100,r:16,color:'#ab47bc',
    info:'Nocturnal seed disperser — eats figs and roosts in the crown.'},
  {id:'monkey',label:'Macaque',x:150,y:260,r:16,color:'#ef5350',
    info:'Feeds on ripe figs; breaks branches aiding light penetration.'},
  {id:'ant',label:'Ant Colony',x:500,y:300,r:14,color:'#ff7043',
    info:'Nests in hollow roots; protects fig from herbivores.'},
  {id:'wasp',label:'Fig Wasp',x:250,y:80,r:12,color:'#fdd835',
    info:'Obligate pollinator — each fig species has its own wasp.'},
  {id:'epiphyte',label:'Epiphytes',x:540,y:230,r:14,color:'#66bb6a',
    info:'Orchids and ferns colonize fig branches for light access.'},
  {id:'fungi',label:'Mycorrhizae',x:420,y:410,r:14,color:'#8d6e63',
    info:'Fungal network links fig roots to surrounding trees.'}
];
const links=[
  ['fig','host','parasitism'],['wasp','fig','pollination'],['hornbill','fig','seed dispersal'],
  ['bat','fig','seed dispersal'],['monkey','fig','frugivory'],['ant','fig','mutualism'],
  ['epiphyte','fig','commensalism'],['fungi','fig','symbiosis'],['fungi','host','nutrient exchange']
];
let activeId=null;

function el(tag,attrs){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e}

// draw links
links.forEach(([a,b,type])=>{
  const sa=species.find(s=>s.id===a),sb=species.find(s=>s.id===b);
  const line=el('line',{x1:sa.x,y1:sa.y,x2:sb.x,y2:sb.y,stroke:'#2a2d37','stroke-width':1.5,
    'data-a':a,'data-b':b,class:'link'});
  svg.appendChild(line);
  const mx=(sa.x+sb.x)/2,my=(sa.y+sb.y)/2;
  const lbl=el('text',{x:mx,y:my-5,fill:'#444','font-size':'9',class:'link-label','text-anchor':'middle','data-a':a,'data-b':b});
  lbl.textContent=type;svg.appendChild(lbl);
});

// draw nodes
species.forEach(s=>{
  const g=el('g',{cursor:'pointer','data-id':s.id});
  g.appendChild(el('circle',{cx:s.x,cy:s.y,r:s.r,fill:s.color+'33',stroke:s.color,'stroke-width':2}));
  const t=el('text',{x:s.x,y:s.y+s.r+14,fill:'#c9d1d9','font-size':'11','text-anchor':'middle'});
  t.textContent=s.label;g.appendChild(t);
  g.addEventListener('mouseenter',e=>{
    tip.style.display='block';tip.innerHTML=`<strong style="color:${s.color}">${s.label}</strong><br>${s.info}`;
    tip.style.left=e.clientX-tip.parentElement.getBoundingClientRect().left+12+'px';
    tip.style.top=e.clientY-tip.parentElement.getBoundingClientRect().top-10+'px';
  });
  g.addEventListener('mouseleave',()=>tip.style.display='none');
  g.addEventListener('click',()=>highlight(s.id));
  svg.appendChild(g);
});

function highlight(id){
  activeId=activeId===id?null:id;
  svg.querySelectorAll('.link').forEach(l=>{
    const on=!activeId||l.dataset.a===activeId||l.dataset.b===activeId;
    l.setAttribute('stroke',on?'#6ee7b7':'#2a2d37');l.setAttribute('stroke-width',on?2.5:1.5);l.setAttribute('opacity',on?1:.2);
  });
  svg.querySelectorAll('.link-label').forEach(l=>{
    const on=!activeId||l.dataset.a===activeId||l.dataset.b===activeId;
    l.setAttribute('fill',on?'#6ee7b7':'#333');
  });
}