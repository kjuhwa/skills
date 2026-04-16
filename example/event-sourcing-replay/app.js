const products=['Laptop','Mouse','Keyboard','Monitor','Cable','Adapter'];
const evtColors={AddItem:'#6ee7b7',RemoveItem:'#f87171',Checkout:'#fbbf24',Cancel:'#f87171'};
let events=[], cursor=0;
const slider=document.getElementById('slider');

function addEvt(type){
  const data=type==='AddItem'?{item:products[Math.random()*products.length|0],price:+(10+Math.random()*200).toFixed(2)}:
    type==='RemoveItem'?{item:products[Math.random()*products.length|0]}:{};
  events.push({type,data,ts:new Date().toISOString().slice(11,19),id:events.length+1});
  slider.max=events.length;slider.value=events.length;cursor=events.length;render();
}

function project(n){
  const order={status:'open',items:{},total:0};
  for(let i=0;i<n;i++){
    const e=events[i];
    if(e.type==='AddItem'){order.items[e.data.item]=(order.items[e.data.item]||0)+1;order.total+=e.data.price;}
    if(e.type==='RemoveItem'&&order.items[e.data.item]){order.items[e.data.item]--;order.total=Math.max(0,order.total-50);if(!order.items[e.data.item])delete order.items[e.data.item];}
    if(e.type==='Checkout') order.status='completed';
    if(e.type==='Cancel') order.status='cancelled';
  }
  order.total=+order.total.toFixed(2);
  return order;
}

function render(){
  document.getElementById('pos').textContent=`${cursor} / ${events.length}`;
  document.getElementById('evtList').innerHTML=events.map((e,i)=>{
    const cls=i<cursor?(i===cursor-1?'ev active':'ev'):'ev future';
    return`<div class="${cls}"><span class="t">#${e.id} ${e.ts}</span> <b style="color:${evtColors[e.type]}">${e.type}</b> ${e.data.item||''}</div>`;
  }).join('');
  const s=project(cursor);
  const statusCol=s.status==='open'?'#6ee7b7':s.status==='completed'?'#fbbf24':'#f87171';
  let snap=`<b>Status:</b> <span style="color:${statusCol}">${s.status}</span>\n<b>Total:</b>  $${s.total}\n<b>Items:</b>`;
  Object.entries(s.items).forEach(([k,v])=>{snap+=`\n  ${k}: ×${v}`;});
  if(!Object.keys(s.items).length) snap+='\n  (empty cart)';
  document.getElementById('snapshot').innerHTML=snap;
  drawViz();
}

function drawViz(){
  const c=document.getElementById('viz');c.width=c.clientWidth*2;c.height=c.clientHeight*2;
  const ctx=c.getContext('2d');ctx.scale(2,2);
  const w=c.clientWidth,h=c.clientHeight;ctx.clearRect(0,0,w,h);
  const totals=[];let t=0;
  events.forEach(e=>{if(e.type==='AddItem')t+=e.data.price;if(e.type==='RemoveItem')t=Math.max(0,t-50);totals.push(t);});
  if(!totals.length)return;
  const max=Math.max(...totals,1);
  totals.forEach((v,i)=>{
    const x=10+i*((w-20)/totals.length),bh=v/max*(h-20);
    ctx.fillStyle=i<cursor?evtColors[events[i].type]:'#2a2d37';
    ctx.fillRect(x,h-10-bh,Math.max(((w-20)/totals.length)-2,3),bh);
  });
  if(cursor>0){ctx.strokeStyle='#6ee7b7';ctx.lineWidth=1;ctx.setLineDash([4,3]);
    const cx=10+(cursor-1)*((w-20)/totals.length)+((w-20)/totals.length)/2;
    ctx.beginPath();ctx.moveTo(cx,5);ctx.lineTo(cx,h-5);ctx.stroke();ctx.setLineDash([]);}
  ctx.fillStyle='#64748b';ctx.font='10px sans-serif';ctx.fillText('Running total · cursor ▾',10,12);
}

slider.oninput=()=>{cursor=+slider.value;render();};

// seed
[{type:'AddItem',data:{item:'Laptop',price:999}},{type:'AddItem',data:{item:'Mouse',price:29.99}},
 {type:'AddItem',data:{item:'Keyboard',price:74.5}},{type:'RemoveItem',data:{item:'Mouse'}},
 {type:'AddItem',data:{item:'Monitor',price:349}},{type:'AddItem',data:{item:'Cable',price:12}},
 {type:'Checkout',data:{}}].forEach(e=>{events.push({...e,ts:new Date().toISOString().slice(11,19),id:events.length+1});});
slider.max=events.length;slider.value=events.length;cursor=events.length;render();