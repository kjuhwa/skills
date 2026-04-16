const statsDom=document.getElementById('stats'),queueDom=document.getElementById('queue'),logDom=document.getElementById('log');
const canvas=document.getElementById('chartCanvas'),ctx=canvas.getContext('2d');
let produced=0,delivered=0,failed=0,pending=0,history=new Array(30).fill(0),queue=[];

const metrics=[
  {id:'produced',label:'Produced'},{id:'delivered',label:'Delivered'},
  {id:'pending',label:'Pending'},{id:'failed',label:'Failed'}
];
metrics.forEach(m=>{
  statsDom.innerHTML+=`<div class="stat"><div class="val" id="s-${m.id}">0</div><div class="label">${m.label}</div></div>`;
});

function updateStats(){
  document.getElementById('s-produced').textContent=produced;
  document.getElementById('s-delivered').textContent=delivered;
  document.getElementById('s-pending').textContent=pending;
  document.getElementById('s-failed').textContent=failed;
}

function drawChart(){
  canvas.width=canvas.clientWidth;canvas.height=160;
  const w=canvas.width,h=canvas.height,max=Math.max(...history,1);
  ctx.clearRect(0,0,w,h);
  ctx.strokeStyle='#2a2d37';ctx.beginPath();
  for(let y=0;y<h;y+=40){ctx.moveTo(0,y);ctx.lineTo(w,y)}ctx.stroke();
  ctx.beginPath();ctx.strokeStyle='#6ee7b7';ctx.lineWidth=2;
  history.forEach((v,i)=>{
    const x=(i/(history.length-1))*w,y=h-((v/max)*(h-20))-10;
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.stroke();
  ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();
  ctx.fillStyle='rgba(110,231,183,0.08)';ctx.fill();
}

function addLog(msg,type){
  const ts=new Date().toLocaleTimeString();
  logDom.innerHTML=`<div class="log-line"><span class="ts">${ts}</span> <span class="ev">[${type}]</span> ${msg}</div>`+logDom.innerHTML;
  if(logDom.children.length>50)logDom.lastChild.remove();
}

function renderQueue(){
  queueDom.innerHTML=queue.slice(0,20).map(q=>
    `<div class="q-item"><span>${q.id} - ${q.type}</span><span class="status">${q.status}</span></div>`
  ).join('');
}

const evTypes=['order.created','payment.captured','shipment.dispatched','user.signup','inventory.reserved'];
function tick(){
  const batch=Math.floor(Math.random()*4)+1;
  for(let i=0;i<batch;i++){
    produced++;pending++;
    const ev={id:`msg-${produced}`,type:evTypes[Math.floor(Math.random()*evTypes.length)],status:'pending'};
    queue.unshift(ev);
    addLog(`${ev.id} → outbox (${ev.type})`,'WRITE');
  }
  history.push(batch);history.shift();
  setTimeout(()=>{
    const poll=Math.min(queue.filter(q=>q.status==='pending').length,Math.floor(Math.random()*3)+1);
    for(let i=0;i<poll;i++){
      const item=queue.find(q=>q.status==='pending');
      if(!item)break;
      if(Math.random()>.1){item.status='delivered';delivered++;addLog(`${item.id} delivered`,'POLL');}
      else{item.status='failed';failed++;addLog(`${item.id} FAILED`,'ERROR');}
      pending--;
    }
    queue=queue.filter(q=>q.status==='pending').concat(queue.filter(q=>q.status!=='pending').slice(0,10));
    renderQueue();updateStats();drawChart();
  },600);
}

setInterval(tick,2000);tick();drawChart();