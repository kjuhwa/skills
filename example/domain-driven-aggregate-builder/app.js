const board=document.getElementById('board'),detail=document.getElementById('detail'),palette=document.getElementById('palette');
let nodes=[],sel=null,idSeq=0,dragOff=null;
const labels={root:'AggregateRoot',entity:'Entity',vo:'ValueObject',event:'DomainEvent'};
function addNode(type,x,y,name){
  const id=++idSeq;const n={id,type,name:name||labels[type]+id,x,y,fields:['id: string']};
  nodes.push(n);render();select(n);return n;
}
function render(){
  board.innerHTML='';
  nodes.forEach(n=>{
    const el=document.createElement('div');el.className=`node ${n.type}${sel&&sel.id===n.id?' selected':''}`;
    el.style.left=n.x+'px';el.style.top=n.y+'px';el.textContent=n.name;
    el.onmousedown=e=>{select(n);dragOff={x:e.clientX-n.x,y:e.clientY-n.y};
      const move=ev=>{n.x=ev.clientX-dragOff.x;n.y=ev.clientY-dragOff.y;el.style.left=n.x+'px';el.style.top=n.y+'px'};
      const up=()=>{document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up)};
      document.addEventListener('mousemove',move);document.addEventListener('mouseup',up);
    };
    board.appendChild(el);
  });
}
function select(n){sel=n;render();showProps()}
function showProps(){
  if(!sel){detail.textContent='Select an element';return}
  detail.innerHTML=`<div><b>Name</b><input id="pname" value="${sel.name}"></div><div style="margin-top:8px"><b>Type:</b> ${sel.type}</div><div style="margin-top:8px"><b>Fields</b></div>`;
  sel.fields.forEach((f,i)=>{
    const inp=document.createElement('input');inp.value=f;inp.style.marginTop='4px';
    inp.oninput=()=>{sel.fields[i]=inp.value};detail.appendChild(inp);
  });
  const btn=document.createElement('button');btn.textContent='+ Field';btn.style.cssText='margin-top:6px;background:#262a36;border:1px solid #2d333b;color:#6ee7b7;padding:4px 8px;border-radius:4px;cursor:pointer';
  btn.onclick=()=>{sel.fields.push('field: type');showProps()};detail.appendChild(btn);
  document.getElementById('pname').oninput=e=>{sel.name=e.target.value;render()};
}
palette.addEventListener('click',e=>{const t=e.target.dataset.type;if(t)addNode(t,80+Math.random()*200,60+Math.random()*200)});
addNode('root',120,60,'Order');addNode('entity',100,180,'LineItem');addNode('vo',300,80,'Money');addNode('event',300,200,'OrderPlaced');