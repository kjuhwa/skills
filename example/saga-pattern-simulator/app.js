const svcData=[
  {name:'Order Service',action:'CreateOrder',comp:'CancelOrder',healthy:true},
  {name:'Inventory',action:'ReserveItems',comp:'ReleaseItems',healthy:true},
  {name:'Payment',action:'ChargeCard',comp:'RefundCard',healthy:true},
  {name:'Shipping',action:'ScheduleShip',comp:'CancelShip',healthy:true},
  {name:'Notification',action:'SendConfirm',comp:'SendApology',healthy:true}
];
const container=document.getElementById('services'),evDiv=document.getElementById('events');
let running=false,sagaCount=0;

function renderServices(){
  container.innerHTML='';
  svcData.forEach((s,i)=>{
    const d=document.createElement('div');
    d.className='svc'+(s.healthy?'':' fail');
    d.innerHTML=`<div class="name">${s.name}</div><div class="st">${s.healthy?'Healthy':'Will Fail'}</div>`;
    d.onclick=()=>{if(!running){s.healthy=!s.healthy;renderServices()}};
    container.appendChild(d);
  });
}

function addEvent(msg,cls){
  const d=document.createElement('div');d.className='ev '+cls;
  d.textContent=`[${new Date().toLocaleTimeString()}] ${msg}`;evDiv.prepend(d);
}

async function dispatch(){
  if(running)return;running=true;sagaCount++;
  const id=`SAGA-${String(sagaCount).padStart(4,'0')}`;
  addEvent(`${id} dispatched`,'ev-fwd');
  const completed=[];
  let failed=false,failIdx=-1;
  for(let i=0;i<svcData.length;i++){
    const s=svcData[i];
    addEvent(`${id} → ${s.action}...`,'ev-fwd');
    await delay(300+Math.random()*400);
    if(!s.healthy){
      addEvent(`${id} ✗ ${s.action} FAILED`,'ev-fail');
      failed=true;failIdx=i;break;
    }
    addEvent(`${id} ✓ ${s.action} OK`,'ev-fwd');
    completed.push(i);
  }
  if(failed){
    addEvent(`${id} initiating compensation (${completed.length} steps)...`,'ev-comp');
    for(let j=completed.length-1;j>=0;j--){
      const s=svcData[completed[j]];
      addEvent(`${id} ← ${s.comp}...`,'ev-comp');
      await delay(200+Math.random()*300);
      addEvent(`${id} ✓ ${s.comp} done`,'ev-comp');
    }
    addEvent(`${id} fully compensated.`,'ev-fail');
  }else{
    addEvent(`${id} committed successfully!`,'ev-done');
  }
  running=false;
}

function delay(ms){return new Promise(r=>setTimeout(r,ms))}
document.getElementById('dispatch').onclick=dispatch;
renderServices();