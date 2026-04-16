const svg=document.getElementById('map'),tip=document.getElementById('tooltip');
const ns='http://www.w3.org/2000/svg';
const nodes=[
  {id:'producer',label:'Producers',x:80,y:250,r:32,color:'#60a5fa',dlq:0},
  {id:'exchange',label:'Exchange',x:300,y:250,r:28,color:'#fbbf24',dlq:0},
  {id:'q-orders',label:'orders',x:520,y:100,r:24,color:'#6ee7b7',dlq:3},
  {id:'q-payments',label:'payments',x:520,y:250,r:24,color:'#6ee7b7',dlq:7},
  {id:'q-notif',label:'notifications',x:520,y:400,r:24,color:'#6ee7b7',dlq:1},
  {id:'dlq-orders',label:'DLQ orders',x:740,y:60,r:20,color:'#f87171',dlq:3},
  {id:'dlq-payments',label:'DLQ payments',x:740,y:210,r:20,color:'#f87171',dlq:7},
  {id:'dlq-notif',label:'DLQ notif',x:740,y:360,r:20,color:'#f87171',dlq:1},
  {id:'consumers',label:'Consumers',x:740,y:470,r:30,color:'#a78bfa',dlq:0},
];
const edges=[
  ['producer','exchange'],['exchange','q-orders'],['exchange','q-payments'],['exchange','q-notif'],
  ['q-orders','dlq-orders'],['q-payments','dlq-payments'],['q-notif','dlq-notif'],
  ['q-orders','consumers'],['q-payments','consumers'],['q-notif','consumers'],
];
const reasons={
  'dlq-orders':['Schema v2 mismatch','Null orderId','Timeout after 30s'],
  'dlq-payments':['Insufficient funds retry exceeded','Gateway 503','Idempotency conflict','Duplicate key','TLS handshake fail','Payload >1MB','Currency parse error'],
  'dlq-notif':['Invalid email format'],
};

function el(tag,attrs){const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;}

edges.forEach(([a,b])=>{
  const na=nodes.find(n=>n.id===a),nb=nodes.find(n=>n.id===b);
  const isDlq=b.startsWith('dlq');
  const line=el('line',{x1:na.x,y1:na.y,x2:nb.x,y2:nb.y,stroke:isDlq?'#f8717144':'#ffffff15','stroke-width':isDlq?2:1,'stroke-dasharray':isDlq?'6,4':''});
  svg.appendChild(line);
});

let particles=[];
function addParticle(){
  const e=edges[Math.random()*edges.length|0];
  const na=nodes.find(n=>n.id===e[0]),nb=nodes.find(n=>n.id===e[1]);
  const isDlq=e[1].startsWith('dlq');
  const c=el('circle',{r:3,fill:isDlq?'#f87171':'#6ee7b7',opacity:'0.8'});
  svg.appendChild(c);
  particles.push({el:c,x1:na.x,y1:na.y,x2:nb.x,y2:nb.y,t:0,speed:0.008+Math.random()*0.012});
}

function animateParticles(){
  particles=particles.filter(p=>{
    p.t+=p.speed;
    if(p.t>=1){p.el.remove();return false;}
    p.el.setAttribute('cx',p.x1+(p.x2-p.x1)*p.t);
    p.el.setAttribute('cy',p.y1+(p.y2-p.y1)*p.t);
    return true;
  });
  if(Math.random()<0.3)addParticle();
  requestAnimationFrame(animateParticles);
}

nodes.forEach(n=>{
  const g=el('g',{});
  const pulse=n.dlq>0?el('circle',{cx:n.x,cy:n.y,r:n.r+6,fill:'none',stroke:n.color,opacity:'0.2','stroke-width':2}):null;
  if(pulse){g.appendChild(pulse);pulse.innerHTML=`<animate attributeName="r" from="${n.r}" to="${n.r+14}" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite"/>`;}
  g.appendChild(el('circle',{cx:n.x,cy:n.y,r:n.r,fill:n.color+'22',stroke:n.color,'stroke-width':2}));
  const txt=el('text',{x:n.x,y:n.y+4,'text-anchor':'middle',fill:'#c9d1d9','font-size':'10','font-family':'system-ui'});
  txt.textContent=n.dlq>0?`${n.label} (${n.dlq})`:n.label;
  g.appendChild(txt);
  g.addEventListener('mouseenter',e=>{
    const r=reasons[n.id];
    tip.style.display='block';tip.style.left=(e.pageX+12)+'px';tip.style.top=(e.pageY-20)+'px';
    tip.innerHTML=r?`<b>${n.label}</b><br>${n.dlq} dead letters:<br>${r.map(s=>'• '+s).join('<br>')}`:`<b>${n.label}</b><br>No dead letters`;
  });
  g.addEventListener('mouseleave',()=>{tip.style.display='none';});
  svg.appendChild(g);
});

setInterval(()=>{
  const dlqs=nodes.filter(n=>n.id.startsWith('dlq'));
  const pick=dlqs[Math.random()*dlqs.length|0];
  if(Math.random()<0.4){pick.dlq++;reasons[pick.id].length<10&&reasons[pick.id].push(['Retry exhausted','Parse error','Null pointer','Connection reset'][Math.random()*4|0]);}
  else if(pick.dlq>0)pick.dlq--;
  svg.querySelectorAll('g').forEach(g=>{const t=g.querySelector('text');if(!t)return;const n=nodes.find(nd=>nd.label===t.textContent.split(' (')[0]);if(n)t.textContent=n.dlq>0?`${n.label} (${n.dlq})`:n.label;});
},2500);
animateParticles();