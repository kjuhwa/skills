const rpsCanvas=document.getElementById('rpsChart'),failCanvas=document.getElementById('failChart');
const rpsCtx=rpsCanvas.getContext('2d'),failCtx=failCanvas.getContext('2d');
const arc=document.getElementById('arc'),stateText=document.getElementById('stateText'),statsEl=document.getElementById('stats');
const HIST=40;let rpsData=Array(HIST).fill(0),failData=Array(HIST).fill(0);
let faultActive=false,circuitState='CLOSED',failCount=0,successCount=0,retryTotal=0,halfOpenTimer=0;
const THRESHOLD=5,HALF_OPEN_WAIT=8;

function injectFault(){faultActive=true}
function clearFault(){faultActive=false}
window.injectFault=injectFault;window.clearFault=clearFault;

function tick(){
  const rps=12+Math.random()*8|0;
  let fails=0,retries=0;
  for(let i=0;i<rps;i++){
    if(circuitState==='OPEN'){retries++;continue}
    const fail=faultActive?Math.random()<0.8:Math.random()<0.08;
    if(fail){fails++;failCount++;retries++}else{successCount++;if(circuitState==='HALF_OPEN'){circuitState='CLOSED';failCount=0;}}
  }
  retryTotal+=retries;
  if(circuitState==='CLOSED'&&failCount>=THRESHOLD){circuitState='OPEN';halfOpenTimer=HALF_OPEN_WAIT;}
  if(circuitState==='OPEN'){halfOpenTimer--;if(halfOpenTimer<=0){circuitState='HALF_OPEN';failCount=0;}}
  rpsData.push(rps);rpsData.shift();
  failData.push(rps?fails/rps:0);failData.shift();
  render();
}

function drawLine(ctx,data,w,h,color,maxV){
  ctx.clearRect(0,0,w,h);
  ctx.strokeStyle='#333';ctx.lineWidth=1;
  for(let y=0;y<h;y+=h/3){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=2;
  data.forEach((v,i)=>{const x=i*(w/(HIST-1)),y=h-((v/maxV)*h);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.stroke();
}

function render(){
  drawLine(rpsCtx,rpsData,280,100,'#6ee7b7',30);
  drawLine(failCtx,failData,280,100,'#f87171',1);
  const colors={CLOSED:'#6ee7b7',OPEN:'#f87171',HALF_OPEN:'#fbbf24'};
  stateText.style.color=colors[circuitState];stateText.textContent=circuitState.replace('_',' ');
  arc.setAttribute('stroke',colors[circuitState]);
  const health=circuitState==='CLOSED'?264:circuitState==='OPEN'?0:132;
  arc.setAttribute('stroke-dashoffset',264-health);
  statsEl.innerHTML=`<div class="label">Stats</div>
    <div>✓ Success: ${successCount}</div>
    <div style="color:#f87171">✗ Failures: ${failCount}</div>
    <div>↻ Total retries: ${retryTotal}</div>
    <div>⚡ Fault: ${faultActive?'<span style="color:#f87171">ACTIVE</span>':'none'}</div>`;
}

setInterval(tick,800);tick();