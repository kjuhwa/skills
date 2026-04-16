const slider=document.getElementById('slider');
const pctLabel=document.getElementById('pctLabel');
const stablePct=document.getElementById('stablePct');
const canaryPct=document.getElementById('canaryPct');
const stableErr=document.getElementById('stableErr');
const canaryErr=document.getElementById('canaryErr');
const statusEl=document.getElementById('status');
const logEl=document.getElementById('log');
const pieCtx=document.getElementById('pie').getContext('2d');
const chartCtx=document.getElementById('chart').getContext('2d');

let canaryTraffic=5, autoPilot=false;
const history={stable:[],canary:[]};

function log(msg,err=false){
  const li=document.createElement('li');
  if(err)li.className='err';
  const t=new Date().toLocaleTimeString();
  li.innerHTML=`<span class="t">[${t}]</span>${msg}`;
  logEl.prepend(li);
  while(logEl.children.length>30)logEl.lastChild.remove();
}

function drawPie(){
  const cx=120,cy=120,r=95;
  pieCtx.clearRect(0,0,240,240);
  const canaryAngle=(canaryTraffic/100)*Math.PI*2;
  pieCtx.beginPath();pieCtx.moveTo(cx,cy);
  pieCtx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+canaryAngle);
  pieCtx.fillStyle='#fbbf24';pieCtx.fill();
  pieCtx.beginPath();pieCtx.moveTo(cx,cy);
  pieCtx.arc(cx,cy,r,-Math.PI/2+canaryAngle,-Math.PI*2.5);
  pieCtx.fillStyle='#6ee7b7';pieCtx.fill();
  pieCtx.beginPath();pieCtx.arc(cx,cy,40,0,Math.PI*2);
  pieCtx.fillStyle='#1a1d27';pieCtx.fill();
  pieCtx.fillStyle='#e4e6ed';pieCtx.font='bold 22px sans-serif';
  pieCtx.textAlign='center';pieCtx.fillText(canaryTraffic+'%',cx,cy+8);
}

function drawChart(){
  const w=480,h=220;
  chartCtx.clearRect(0,0,w,h);
  chartCtx.strokeStyle='#2a2f3d';chartCtx.lineWidth=1;
  for(let i=0;i<5;i++){
    const y=i*(h/4);
    chartCtx.beginPath();chartCtx.moveTo(0,y);chartCtx.lineTo(w,y);chartCtx.stroke();
  }
  const draw=(arr,color)=>{
    if(arr.length<2)return;
    chartCtx.strokeStyle=color;chartCtx.lineWidth=2;chartCtx.beginPath();
    arr.forEach((v,i)=>{
      const x=(i/(arr.length-1))*w;
      const y=h-(v/10)*h;
      i?chartCtx.lineTo(x,y):chartCtx.moveTo(x,y);
    });
    chartCtx.stroke();
  };
  draw(history.stable,'#6ee7b7');
  draw(history.canary,'#fbbf24');
}

function tick(){
  const stab=Math.max(0,0.3+Math.random()*0.4);
  const cany=Math.max(0,0.5+Math.random()*(canaryTraffic>20?2:1.2)+(canaryTraffic>50?Math.random()*3:0));
  history.stable.push(stab);history.canary.push(cany);
  if(history.stable.length>60){history.stable.shift();history.canary.shift();}
  stableErr.textContent=stab.toFixed(2);
  canaryErr.textContent=cany.toFixed(2);
  if(cany>4){statusEl.textContent='Danger';statusEl.className='status danger';
    if(autoPilot&&canaryTraffic>0){log('AutoPilot: rolling back due to high errors',true);canaryTraffic=Math.max(0,canaryTraffic-10);update();}
  }else if(cany>2){statusEl.textContent='Warning';statusEl.className='status warn';
  }else{statusEl.textContent=canaryTraffic===0?'Stable':'Healthy';statusEl.className='status ok';
    if(autoPilot&&canaryTraffic<100&&Math.random()<0.2){canaryTraffic=Math.min(100,canaryTraffic+5);log('AutoPilot: increasing canary to '+canaryTraffic+'%');update();}
  }
  drawChart();
}

function update(){
  slider.value=canaryTraffic;
  pctLabel.textContent=canaryTraffic;
  stablePct.textContent=(100-canaryTraffic)+'%';
  canaryPct.textContent=canaryTraffic+'%';
  drawPie();
}

slider.addEventListener('input',e=>{canaryTraffic=+e.target.value;update();log('Traffic shifted to canary='+canaryTraffic+'%');});
document.getElementById('promote').addEventListener('click',()=>{canaryTraffic=Math.min(100,canaryTraffic+10);update();log('Promoted canary → '+canaryTraffic+'%');});
document.getElementById('rollback').addEventListener('click',()=>{canaryTraffic=0;update();log('Manual rollback to 0%',true);});
document.getElementById('auto').addEventListener('click',e=>{autoPilot=!autoPilot;e.target.classList.toggle('active');log('AutoPilot '+(autoPilot?'ENABLED':'disabled'));});

log('Canary release controller initialized');
update();
setInterval(tick,800);