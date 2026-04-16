const QUEUES=[
  {name:'order-events',maxSize:500},{name:'email-notifications',maxSize:300},
  {name:'payment-processing',maxSize:200},{name:'audit-log',maxSize:1000},
  {name:'user-activity',maxSize:400},{name:'inventory-sync',maxSize:250}
];
const state=QUEUES.map(q=>({...q,size:Math.floor(Math.random()*q.maxSize*.6),produced:Math.floor(Math.random()*10000),consumed:Math.floor(Math.random()*9500),errors:Math.floor(Math.random()*20),rate:0}));
function renderStats(){
  const total=state.reduce((a,q)=>a+q.size,0),errs=state.reduce((a,q)=>a+q.errors,0);
  const prod=state.reduce((a,q)=>a+q.produced,0),cons=state.reduce((a,q)=>a+q.consumed,0);
  document.getElementById('stats').innerHTML=
    `<div class="stat"><div class="label">Total Depth</div><div class="value">${total}</div></div>`+
    `<div class="stat"><div class="label">Produced</div><div class="value">${prod.toLocaleString()}</div></div>`+
    `<div class="stat"><div class="label">Consumed</div><div class="value">${cons.toLocaleString()}</div></div>`+
    `<div class="stat"><div class="label">Errors</div><div class="value" style="color:#ef4444">${errs}</div></div>`;
}
function renderQueues(){
  document.getElementById('grid').innerHTML=state.map(q=>{
    const pct=Math.round(q.size/q.maxSize*100);
    const color=pct>80?'#ef4444':pct>50?'#facc15':'#6ee7b7';
    return `<div class="queue-card"><h3>${q.name}<span>${q.size}/${q.maxSize}</span></h3>`+
      `<div class="bar-wrap"><div class="bar" style="width:${pct}%;background:${color}"></div></div>`+
      `<div class="row"><span>Rate: ${q.rate} msg/s</span><span>Errors: ${q.errors}</span></div></div>`;
  }).join('');
}
function tick(){
  state.forEach(q=>{
    const add=Math.floor(Math.random()*15);const rem=Math.floor(Math.random()*18);
    q.produced+=add;q.consumed+=rem;q.size=Math.max(0,Math.min(q.maxSize,q.size+add-rem));
    q.rate=add-rem;if(Math.random()>.97)q.errors++;
  });
  renderStats();renderQueues();
}
tick();setInterval(tick,1000);