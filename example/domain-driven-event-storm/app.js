const board=document.getElementById('board');
const typeLabels={event:'Domain Event',command:'Command',aggregate:'Aggregate',policy:'Policy'};
const mock=[
  {type:'command',text:'Place Order',x:40,y:30},
  {type:'event',text:'OrderPlaced',x:200,y:30},
  {type:'policy',text:'When OrderPlaced → Reserve Stock',x:360,y:30},
  {type:'command',text:'Reserve Stock',x:40,y:140},
  {type:'aggregate',text:'Inventory',x:200,y:140},
  {type:'event',text:'StockReserved',x:360,y:140},
  {type:'command',text:'Process Payment',x:40,y:250},
  {type:'event',text:'PaymentConfirmed',x:200,y:250},
  {type:'policy',text:'When PaymentConfirmed → Ship',x:360,y:250},
  {type:'aggregate',text:'Order',x:540,y:80},
  {type:'event',text:'OrderShipped',x:540,y:200}
];
let dragEl=null,offX,offY;
function createNote(type,text,x,y){
  const el=document.createElement('div');
  el.className='note';el.dataset.type=type;
  el.style.left=x+'px';el.style.top=y+'px';
  el.innerHTML=`<span class="type">${typeLabels[type]}</span><span>${text}</span>`;
  el.addEventListener('mousedown',e=>{dragEl=el;offX=e.offsetX;offY=e.offsetY;el.style.zIndex=99;e.preventDefault()});
  el.addEventListener('dblclick',()=>{const t=prompt('Edit text:',el.lastChild.textContent);if(t)el.lastChild.textContent=t});
  board.appendChild(el);
}
mock.forEach(m=>createNote(m.type,m.text,m.x,m.y));
document.addEventListener('mousemove',e=>{if(!dragEl)return;const r=board.getBoundingClientRect();dragEl.style.left=Math.max(0,e.clientX-r.left-offX)+'px';dragEl.style.top=Math.max(0,e.clientY-r.top-offY)+'px'});
document.addEventListener('mouseup',()=>{if(dragEl)dragEl.style.zIndex=1;dragEl=null});
document.querySelectorAll('.chip').forEach(chip=>{
  chip.addEventListener('dragstart',e=>e.dataTransfer.setData('type',chip.dataset.type));
  chip.draggable=true;
});
board.addEventListener('dragover',e=>e.preventDefault());
board.addEventListener('drop',e=>{
  e.preventDefault();const type=e.dataTransfer.getData('type');if(!type)return;
  const r=board.getBoundingClientRect();
  createNote(type,'New '+typeLabels[type],e.clientX-r.left-60,e.clientY-r.top-30);
});