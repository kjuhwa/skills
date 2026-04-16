const sagaSteps=[
  {name:'Create Order',comp:'Cancel Order'},
  {name:'Reserve Inventory',comp:'Release Inventory'},
  {name:'Process Payment',comp:'Refund Payment'},
  {name:'Ship Package',comp:'Recall Shipment'}
];
let failAt=-1,running=false;

function render(){
  const c=document.getElementById('steps');
  c.innerHTML=sagaSteps.map((_,i)=>`<div class="step" id="s${i}"><div class="icon">•</div><div><div class="name">${_.name}</div><div class="bar"><div class="bar-fill"></div></div></div><div class="status">pending</div></div>`).join('');
}

function log(msg,cls='info'){
  const l=document.getElementById('log');
  l.innerHTML+=`<span class="${cls}">[${new Date().toLocaleTimeString()}] ${msg}</span>`;
  l.scrollTop=l.scrollHeight;
}

function setStep(i,state,label){
  const el=document.getElementById('s'+i);
  el.className='step '+state;
  el.querySelector('.status').textContent=label;
  el.querySelector('.icon').textContent=state==='done'?'✓':state==='failed'?'✗':state==='compensated'?'↩':'⟳';
}

async function runSaga(){
  if(running)return;running=true;
  document.getElementById('log').innerHTML='';render();
  log('Saga started');
  let completed=[];
  for(let i=0;i<sagaSteps.length;i++){
    setStep(i,'running','executing...');
    log(`Executing: ${sagaSteps[i].name}`);
    await new Promise(r=>setTimeout(r,700));
    if(i===failAt){
      setStep(i,'failed','failed');
      log(`FAILED: ${sagaSteps[i].name}`,'err');
      log('Starting compensation...','comp');
      for(let j=completed.length-1;j>=0;j--){
        setStep(completed[j],'compensated','compensating...');
        await new Promise(r=>setTimeout(r,500));
        setStep(completed[j],'compensated','compensated');
        log(`Compensated: ${sagaSteps[completed[j]].comp}`,'comp');
      }
      log('Saga rolled back','err');running=false;return;
    }
    setStep(i,'done','completed');
    log(`Completed: ${sagaSteps[i].name}`,'ok');
    completed.push(i);
  }
  log('Saga completed successfully!','ok');running=false;
}

document.getElementById('btnRun').onclick=()=>{failAt=-1;runSaga()};
document.getElementById('btnFail').onclick=()=>{failAt=Math.floor(Math.random()*3)+1;runSaga()};
document.getElementById('btnReset').onclick=()=>{running=false;render();document.getElementById('log').innerHTML=''};
render();