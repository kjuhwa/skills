const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d'),logEl=document.getElementById('log');
const steps=[{name:'Create Order',comp:'Cancel Order'},{name:'Reserve Stock',comp:'Release Stock'},{name:'Charge Payment',comp:'Refund Payment'},{name:'Ship Package',comp:'Recall Shipment'}];
let state=[],animQueue=[],running=false,failAt=-1;

function drawNode(x,y,text,status){
  const w=160,h=50,r=8;ctx.beginPath();ctx.roundRect(x-w/2,y-h/2,w,h,r);
  ctx.fillStyle=status==='done'?'#065f46':status==='fail'?'#7f1d1d':status==='comp'?'#78350f':'#1a1d27';
  ctx.fill();ctx.strokeStyle=status==='done'?'#6ee7b7':status==='fail'?'#f87171':status==='comp'?'#fbbf24':'#374151';
  ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=status==='done'?'#6ee7b7':status==='fail'?'#f87171':status==='comp'?'#fbbf24':'#9ca3af';
  ctx.font='13px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x,y);
}
function drawArrow(x1,y1,x2,y2,color){
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
  const a=Math.atan2(y2-y1,x2-x1);ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-10*Math.cos(a-0.4),y2-10*Math.sin(a-0.4));ctx.lineTo(x2-10*Math.cos(a+0.4),y2-10*Math.sin(a+0.4));ctx.fillStyle=color;ctx.fill();
}
function render(){
  ctx.clearRect(0,0,900,420);
  ctx.fillStyle='#6ee7b7';ctx.font='bold 14px system-ui';ctx.textAlign='center';
  ctx.fillText('Forward Steps',450,30);ctx.fillStyle='#fbbf24';ctx.fillText('Compensations',450,230);
  steps.forEach((s,i)=>{
    const x=112+i*195,y1=80,y2=280;
    drawNode(x,y1,s.name,state[i]||'idle');drawNode(x,y2,s.comp,state[i]==='comp'?'comp':'idle');
    if(i<steps.length-1){drawArrow(x+85,y1,x+110,y1,state[i]==='done'?'#6ee7b7':'#374151');}
    if(state[i]==='fail')drawArrow(x,y1+28,x,y2-28,'#f87171');
    if(state[i]==='comp'&&i>0)drawArrow(x-85,y2,x-110,y2,'#fbbf24');
  });
  ctx.fillStyle='#374151';ctx.font='11px system-ui';ctx.fillText('Orchestrator controls the saga flow',450,400);
}
function log(msg,cls){logEl.innerHTML+=`<span class="${cls}">${new Date().toLocaleTimeString()} ${msg}</span><br>`;logEl.scrollTop=logEl.scrollHeight;}
async function wait(ms){return new Promise(r=>setTimeout(r,ms));}
async function runSaga(fail){
  if(running)return;running=true;state=[];render();logEl.innerHTML='';failAt=fail?Math.floor(Math.random()*3)+1:-1;
  log('▶ Saga started','ok');
  for(let i=0;i<steps.length;i++){
    if(i===failAt){state[i]='fail';render();log(`✗ ${steps[i].name} FAILED`,'err');
      for(let j=i-1;j>=0;j--){await wait(500);state[j]='comp';render();log(`↩ ${steps[j].comp}`,'comp');}
      log('⊘ Saga rolled back','err');running=false;return;}
    state[i]='done';render();log(`✓ ${steps[i].name}`,'ok');await wait(600);
  }
  log('★ Saga completed successfully','ok');running=false;
}
document.getElementById('btnRun').onclick=()=>runSaga(false);
document.getElementById('btnFail').onclick=()=>runSaga(true);
document.getElementById('btnReset').onclick=()=>{state=[];logEl.innerHTML='';running=false;render();};
render();