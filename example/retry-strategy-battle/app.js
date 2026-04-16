const strategies=[
  {name:'Exponential',fn:(b,i)=>b*Math.pow(2,i)},
  {name:'Linear',fn:(b,i)=>b*(i+1)},
  {name:'Fixed',fn:(b)=>b}
];
const BASE=400,MAX=7;
let failures,running=false;

function genFailures(){
  return Array.from({length:MAX},()=>Math.random()<0.65);
}

function buildLanes(){
  const arena=document.getElementById('arena');arena.innerHTML='';
  return strategies.map(s=>{
    const lane=document.createElement('div');lane.className='lane';
    lane.innerHTML=`<div class="lane-header"><h2>${s.name}</h2><span class="status">Waiting</span></div><div class="pips"></div>`;
    arena.appendChild(lane);
    const pips=lane.querySelector('.pips');
    const pipEls=[];
    for(let i=0;i<MAX;i++){const p=document.createElement('div');p.className='pip';p.textContent=i+1;pips.appendChild(p);pipEls.push(p);}
    return{lane,pips:pipEls,statusEl:lane.querySelector('.status'),strat:s};
  });
}

function race(){
  if(running)return;running=true;
  failures=genFailures();
  document.getElementById('verdict').textContent='Racing...';
  const lanes=buildLanes();
  const results=[];

  lanes.forEach(l=>{
    let attempt=0,elapsed=0;
    function tick(){
      if(attempt>=MAX){l.statusEl.textContent=`Exhausted (${elapsed}ms)`;results.push({name:l.strat.name,time:Infinity});checkDone();return;}
      const fail=failures[attempt];
      const pip=l.pips[attempt];
      if(attempt>0){const delay=l.strat.fn(BASE,attempt-1);elapsed+=delay;}
      pip.classList.add('wait');
      setTimeout(()=>{
        pip.classList.remove('wait');
        if(fail){pip.classList.add('fail');attempt++;tick();}
        else{pip.classList.add('ok');l.statusEl.textContent=`Done in ${elapsed}ms`;results.push({name:l.strat.name,time:elapsed});checkDone();}
      },200);
    }
    tick();
  });

  function checkDone(){
    if(results.length<3)return;
    running=false;
    const best=results.filter(r=>r.time<Infinity).sort((a,b)=>a.time-b.time);
    document.getElementById('verdict').textContent=best.length?`🏆 Winner: ${best[0].name} (${best[0].time}ms)`:'All strategies exhausted!';
  }
}

document.getElementById('raceBtn').addEventListener('click',race);
race();