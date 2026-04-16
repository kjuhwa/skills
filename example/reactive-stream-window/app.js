const slotsEl=document.getElementById('slots'),bufFill=document.getElementById('bufFill');
const rateEl=document.getElementById('rate'),requestBtn=document.getElementById('request');
const demandEl=document.getElementById('demand'),emittedEl=document.getElementById('emitted'),consumedEl=document.getElementById('consumed');
const logEl=document.getElementById('log');

const CAP=10;let buffer=[],demand=0,emitted=0,consumed=0,nextId=1,dropped=0;

function log(msg,cls=''){
  const d=document.createElement('div');
  if(cls)d.className=cls;
  d.textContent=`[${new Date().toLocaleTimeString()}] ${msg}`;
  logEl.prepend(d);
  while(logEl.children.length>40)logEl.lastChild.remove();
}

function render(){
  slotsEl.innerHTML='';
  for(let i=0;i<CAP;i++){
    const s=document.createElement('div');s.className='slot';
    if(buffer[i]!==undefined){s.classList.add('filled');s.textContent=buffer[i]}
    slotsEl.appendChild(s);
  }
  bufFill.textContent=`${buffer.length} / ${CAP}${dropped?` (dropped ${dropped})`:''}`;
  demandEl.textContent=demand;
  emittedEl.textContent=`Emitted: ${emitted}`;
  consumedEl.textContent=`Consumed: ${consumed}`;
}

function emit(){
  emitted++;
  if(buffer.length>=CAP){
    dropped++;
    const last=slotsEl.lastChild;
    if(last){last.classList.add('overflow');setTimeout(()=>last.classList.remove('overflow'),300)}
    log(`publisher dropped item #${nextId++} — buffer full (backpressure!)`,'err');
  }else{
    buffer.push(nextId++);
    log(`publisher emitted #${buffer[buffer.length-1]} → buffer`);
  }
  render();tryDeliver();
}

function tryDeliver(){
  while(demand>0&&buffer.length>0){
    const item=buffer.shift();
    demand--;consumed++;
    log(`subscriber consumed #${item}`,'ok');
  }
  render();
}

requestBtn.onclick=()=>{
  demand+=5;
  log(`subscriber called request(5). demand=${demand}`,'warn');
  tryDeliver();
};

let timer;
function schedule(){
  clearInterval(timer);
  const r=Math.max(50,Math.min(2000,+rateEl.value||300));
  timer=setInterval(emit,r);
}
rateEl.oninput=schedule;
schedule();render();
log('stream started. publisher emitting...','warn');