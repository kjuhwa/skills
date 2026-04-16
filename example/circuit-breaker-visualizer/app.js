const arc=document.getElementById('arc'),stateLabel=document.getElementById('stateLabel'),subLabel=document.getElementById('subLabel'),log=document.getElementById('log');
const THRESHOLD=5,TIMEOUT=4000,HALF_OPEN_MAX=2;
let state='CLOSED',failures=0,successes=0,timer=null;
const colors={CLOSED:'#6ee7b7',OPEN:'#f87171',HALF_OPEN:'#fbbf24'};

function updateUI(){
  stateLabel.textContent=state.replace('_',' ');
  stateLabel.style.fill=colors[state];
  arc.style.stroke=colors[state];
  let ratio=state==='CLOSED'?failures/THRESHOLD:state==='OPEN'?1:(HALF_OPEN_MAX-successes)/HALF_OPEN_MAX;
  arc.style.strokeDashoffset=502-(ratio*502);
  subLabel.textContent=state==='CLOSED'?`${failures} / ${THRESHOLD} failures`:state==='OPEN'?'Waiting to half-open…':`${successes} / ${HALF_OPEN_MAX} successes needed`;
}

function addLog(msg,cls){
  const s=document.createElement('span');s.className=cls;s.textContent=`[${new Date().toLocaleTimeString()}] ${msg}`;
  log.prepend(s);
}

function transition(next){state=next;updateUI();addLog(`State → ${state}`,state==='OPEN'?'fail':'warn');}

function onSuccess(){
  if(state==='OPEN')return addLog('Blocked — circuit OPEN','fail');
  if(state==='HALF_OPEN'){successes++;addLog('Half-open success '+successes,'ok');if(successes>=HALF_OPEN_MAX){failures=0;successes=0;transition('CLOSED');}}
  else{addLog('Request succeeded','ok');}
  updateUI();
}

function onFailure(){
  if(state==='OPEN')return addLog('Blocked — circuit OPEN','fail');
  if(state==='HALF_OPEN'){successes=0;transition('OPEN');startTimer();return;}
  failures++;addLog('Request failed ('+failures+')','fail');
  if(failures>=THRESHOLD){transition('OPEN');startTimer();}
  updateUI();
}

function startTimer(){clearTimeout(timer);timer=setTimeout(()=>{successes=0;transition('HALF_OPEN');},TIMEOUT);}

function reset(){clearTimeout(timer);state='CLOSED';failures=0;successes=0;updateUI();addLog('Circuit reset','warn');}

document.getElementById('btnSuccess').onclick=onSuccess;
document.getElementById('btnFailure').onclick=onFailure;
document.getElementById('btnReset').onclick=reset;
updateUI();
[1,1,0,1,0,0].forEach((v,i)=>setTimeout(()=>v?onSuccess():onFailure(),i*400));