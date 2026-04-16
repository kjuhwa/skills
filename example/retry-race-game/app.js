const strategies=[
  {name:'Fixed (1s)',color:'#6ee7b7',calc:()=>1000},
  {name:'Exponential',color:'#38bdf8',calc:(i)=>500*Math.pow(2,i)},
  {name:'Linear + Jitter',color:'#c084fc',calc:(i)=>800*(i+1)+Math.random()*400}
];
const lanesEl=document.getElementById('lanes'),scoreEl=document.getElementById('scoreboard');
const maxRetries=6,failRate=0.6;

function buildLanes(){
  lanesEl.innerHTML='';
  strategies.forEach((s,i)=>{
    const d=document.createElement('div');d.className='lane';
    d.innerHTML=`<div class="lane-label"><span style="color:${s.color}">${s.name}</span><span class="badge" id="status${i}" style="background:${s.color}">READY</span></div><div class="track"><div class="runner r${i}" id="runner${i}" style="width:0%"></div></div>`;
    lanesEl.appendChild(d);
  });
}

async function race(){
  document.getElementById('startBtn').disabled=true;
  scoreEl.textContent='Racing...';
  buildLanes();
  const results=[];
  const promises=strategies.map((s,si)=>new Promise(resolve=>{
    let attempt=0,totalTime=0;
    function tryOnce(){
      const delay=Math.round(s.calc(attempt));
      totalTime+=delay;
      attempt++;
      const pct=Math.min((attempt/maxRetries)*100,100);
      setTimeout(()=>{
        document.getElementById('runner'+si).style.width=pct+'%';
        const ok=Math.random()>failRate||attempt===maxRetries;
        if(ok){
          document.getElementById('status'+si).textContent='✓ '+attempt+' tries';
          resolve({name:s.name,attempts:attempt,time:totalTime});
        }else{
          document.getElementById('status'+si).textContent='Retry #'+attempt;
          tryOnce();
        }
      },Math.min(delay/3,400));
    }
    tryOnce();
  }));
  const all=await Promise.all(promises);
  all.sort((a,b)=>a.time-b.time);
  scoreEl.innerHTML=all.map((r,i)=>`<div>${i===0?'🏆':i===1?'🥈':'🥉'} ${r.name}: ${r.attempts} attempts, ~${r.time}ms total</div>`).join('');
  document.getElementById('startBtn').disabled=false;
}

document.getElementById('startBtn').onclick=race;
buildLanes();