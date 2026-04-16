```js
let events=[],snapshots=[];
const seed=[
  {type:'Deposit',amount:1000,ts:Date.now()-50000},
  {type:'Deposit',amount:250,ts:Date.now()-40000},
  {type:'Withdraw',amount:80,ts:Date.now()-30000},
  {type:'Interest',amount:12.5,ts:Date.now()-20000},
  {type:'Transfer',amount:200,ts:Date.now()-10000},
];
seed.forEach(e=>events.push(e));

function fold(evts,from=0){
  let b=from;
  evts.forEach(e=>{
    if(e.type==='Deposit'||e.type==='Interest')b+=e.amount;
    else b-=e.amount;
  });
  return+b.toFixed(2);
}

function drawChart(){
  const c=document.getElementById('chart'),ctx=c.getContext('2d');
  c.width=c.clientWidth;c.height=140;
  ctx.clearRect(0,0,c.width,c.height);
  if(!events.length)return;
  const pts=[];let b=0;
  events.forEach(e=>{
    if(e.type==='Deposit'||e.type==='Interest')b+=e.amount;else b-=e.amount;
    pts.push(b);
  });
  const max=Math.max(...pts,1),min=Math.min(...pts,0);
  const h=c.height-20,w=c.width-20;
  ctx.beginPath();ctx.strokeStyle='#6ee7b7';ctx.lineWidth=2;
  pts.forEach((p,i)=>{
    const x=10+i/(pts.length-1||1)*w,y=10+h-(p-min)/(max-min||1)*h;
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.stroke();
  pts.forEach((p,i)=>{
    const x=10+i/(pts.length-1||1)*w,y=10+h-(p-min)/(max-min||1)*h;
    ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle='#6ee7b7';ctx.fill();
  });
}

function renderLog(){
  const log=document.getElementById('log');
  log.innerHTML='';
  [...events].reverse().forEach(e=>{
    const d=document.createElement('div');
    d.className='entry '+e.type.toLowerCase();
    const sign=e.type==='Deposit'||e.type==='Interest'?'+':'-';
    d.innerHTML=`<span>${e.type}: ${sign}$${e.amount.toFixed(2)}</span><span class="meta">${new Date(e.ts).toLocaleTimeString()}</span>`;
    log.appendChild(d);
  });
}

function refresh(){
  document.getElementById('bal').textContent='$'+fold(events).toFixed(2);
  drawChart();renderLog();
}

document.getElementById('exec').onclick=()=>{
  const type=document.getElementById('cmd').value;
  const amount=parseFloat(document.getElementById('amt').value)||0;
  if(amount<=0)return;
  events.push({type,amount,ts:Date.now()});
  refresh();
};

document.getElementById('takeSnap').onclick=()=>{
  const b=fold(events);
  snapshots.push({balance:b,eventCount:events.length,ts:Date.now()});
  document.getElementById('snap').textContent=`Snapshot #${snapshots.length}: $${b.toFixed(2)} @ ${events.length} events`;
};

refresh();
```