const lanesEl=document.getElementById('lanes');
const strategies=[
  {name:'Fixed (500ms)',delay:()=>500},
  {name:'Exponential',delay:(a)=>Math.min(200*Math.pow(2,a),8000)},
  {name:'Jittered Exponential',delay:(a)=>Math.min(200*Math.pow(2,a),8000)*(.5+Math.random()*.5)}
];
function race(){
  const succeedAt=2+Math.floor(Math.random()*4);
  lanesEl.innerHTML='';
  strategies.forEach((s,si)=>{
    const lane=document.createElement('div');lane.className='lane';
    lane.innerHTML=`<div class="lane-title"><span>${s.name}</span></div><div class="timeline" id="tl${si}"></div><div class="result" id="res${si}"></div>`;
    lanesEl.appendChild(lane);
    animateLane(si,s,succeedAt);
  });
}
function animateLane(idx,strat,succeedAt){
  const tl=document.getElementById('tl'+idx),res=document.getElementById('res'+idx);
  let attempt=0,totalTime=0;
  function step(){
    const isFail=attempt<succeedAt;
    const callTime=80+Math.random()*120;
    totalTime+=callTime;
    const block=document.createElement('div');block.className='block '+(isFail?'fail':'ok');
    block.style.width='0px';block.textContent=isFail?'✗':'✓';
    tl.appendChild(block);
    setTimeout(()=>block.style.width=Math.max(28,callTime/20)+'px',10);
    if(!isFail){res.textContent=`Completed in ${attempt+1} attempts, ~${Math.round(totalTime)}ms total`;return}
    attempt++;
    if(attempt>6){res.textContent='Gave up after 6 retries';return}
    const wait=strat.delay(attempt-1);totalTime+=wait;
    setTimeout(()=>{
      const wb=document.createElement('div');wb.className='block wait';wb.style.width='0';wb.textContent=Math.round(wait)+'ms';
      tl.appendChild(wb);setTimeout(()=>wb.style.width=Math.max(36,wait/40)+'px',10);
      setTimeout(step,300);
    },300);
  }
  setTimeout(step,si*200);
}
document.getElementById('raceBtn').onclick=race;race();