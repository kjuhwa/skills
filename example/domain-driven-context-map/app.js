const svg=document.getElementById('map'),panel=document.getElementById('info-panel');
const contexts=[
  {id:'order',label:'Order',x:120,y:100,r:70,desc:'Handles order lifecycle, pricing, and fulfillment tracking.'},
  {id:'inventory',label:'Inventory',x:350,y:80,r:60,desc:'Stock levels, warehouse locations, reorder policies.'},
  {id:'shipping',label:'Shipping',x:600,y:120,r:65,desc:'Carrier selection, tracking, delivery confirmation.'},
  {id:'billing',label:'Billing',x:200,y:340,r:62,desc:'Invoices, payments, refunds, tax calculation.'},
  {id:'customer',label:'Customer',x:500,y:350,r:68,desc:'Profiles, preferences, loyalty program.'},
  {id:'catalog',label:'Catalog',x:750,y:300,r:58,desc:'Products, categories, search indexing.'}
];
const rels=[
  {from:'order',to:'inventory',type:'Partnership',color:'#6ee7b7'},
  {from:'order',to:'shipping',type:'Customer-Supplier',color:'#f59e0b'},
  {from:'order',to:'billing',type:'Conformist',color:'#ef4444'},
  {from:'customer',to:'order',type:'Shared Kernel',color:'#8b5cf6'},
  {from:'catalog',to:'inventory',type:'Anti-Corruption Layer',color:'#3b82f6'},
  {from:'customer',to:'billing',type:'Published Language',color:'#ec4899'}
];
let drag=null,ox,oy;
function render(){
  svg.innerHTML='';
  const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
  defs.innerHTML='<marker id="ah" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#555"/></marker>';
  svg.appendChild(defs);
  rels.forEach(r=>{
    const a=contexts.find(c=>c.id===r.from),b=contexts.find(c=>c.id===r.to);
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    Object.entries({x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:r.color+'88','stroke-width':2,'stroke-dasharray':'6,4','marker-end':'url(#ah)'}).forEach(([k,v])=>line.setAttribute(k,v));
    line.style.cursor='pointer';
    line.addEventListener('click',()=>{panel.innerHTML=`<h3>${r.type}</h3><p>${r.from} → ${r.to}</p>`;panel.classList.add('show');setTimeout(()=>panel.classList.remove('show'),2500)});
    svg.appendChild(line);
  });
  contexts.forEach(c=>{
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.style.cursor='grab';
    const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
    Object.entries({cx:c.x,cy:c.y,r:c.r,fill:'#6ee7b710',stroke:'#6ee7b744','stroke-width':1.5}).forEach(([k,v])=>circle.setAttribute(k,v));
    const text=document.createElementNS('http://www.w3.org/2000/svg','text');
    Object.entries({x:c.x,y:c.y+5,fill:'#6ee7b7','text-anchor':'middle','font-size':'13','font-weight':'600'}).forEach(([k,v])=>text.setAttribute(k,v));
    text.textContent=c.label;
    g.appendChild(circle);g.appendChild(text);
    g.addEventListener('mousedown',e=>{drag=c;ox=e.clientX-c.x;oy=e.clientY-c.y;e.preventDefault()});
    g.addEventListener('click',()=>{panel.innerHTML=`<h3>${c.label}</h3><p>${c.desc}</p>`;panel.classList.add('show');setTimeout(()=>panel.classList.remove('show'),3000)});
    svg.appendChild(g);
  });
}
document.addEventListener('mousemove',e=>{if(!drag)return;const rect=svg.getBoundingClientRect();drag.x=e.clientX-rect.left;drag.y=e.clientY-rect.top;render()});
document.addEventListener('mouseup',()=>{drag=null});
render();