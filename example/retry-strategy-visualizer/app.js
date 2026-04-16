const canvas=document.getElementById('chart'),ctx=canvas.getContext('2d');
const stratEl=document.getElementById('strategy'),baseEl=document.getElementById('baseDelay'),maxEl=document.getElementById('maxRetries'),jitterEl=document.getElementById('jitter'),logEl=document.getElementById('log');
baseEl.oninput=()=>document.getElementById('baseVal').textContent=baseEl.value;
maxEl.oninput=()=>document.getElementById('maxVal').textContent=maxEl.value;

function calcDelays(){
  const s=stratEl.value,base=+baseEl.value,max=+maxEl.value,j=jitterEl.checked;
  const delays=[];
  for(let i=0;i<max;i++){
    let d=s==='fixed'?base:s==='exponential'?base*Math.pow(2,i):base*(i+1);
    if(j)d+=Math.random()*d*0.3;
    delays.push(Math.round(d));
  }
  return delays;
}

function draw(delays,results){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const pad={t:30,b:40,l:60,r:20},w=canvas.width-pad.l-pad.r,h=canvas.height-pad.t-pad.b;
  const maxD=Math.max(...delays,1);
  ctx.strokeStyle='#333';ctx.lineWidth=1;ctx.font='11px monospace';ctx.fillStyle='#888';
  for(let i=0;i<=4;i++){
    const y=pad.t+h-h*(i/4);
    ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+w,y);ctx.stroke();
    ctx.fillText(Math.round(maxD*i/4)+'ms',4,y+4);
  }
  const bw=Math.min(50,w/delays.length-10);
  delays.forEach((d,i)=>{
    const x=pad.l+i*(w/delays.length)+((w/delays.length)-bw)/2;
    const bh=(d/maxD)*h;
    const y=pad.t+h-bh;
    const grad=ctx.createLinearGradient(x,y,x,y+bh);
    grad.addColorStop(0,results[i]?'#6ee7b7':'#f87171');
    grad.addColorStop(1,results[i]?'#065f46':'#7f1d1d');
    ctx.fillStyle=grad;
    ctx.beginPath();ctx.roundRect(x,y,bw,bh,[4,4,0,0]);ctx.fill();
    ctx.fillStyle='#e2e8f0';ctx.fillText('#'+(i+1),x+bw/2-8,pad.t+h+16);
    ctx.fillStyle='#aaa';ctx.fillText(d+'ms',x+bw/2-14,y-6);
  });
}

function run(){
  const delays=calcDelays();
  const results=delays.map(()=>Math.random()>0.55);
  const firstSuccess=results.indexOf(true);
  if(firstSuccess>=0)for(let i=firstSuccess+1;i<results.length;i++)results[i]=true;
  draw(delays,results);
  logEl.innerHTML='';
  let cum=0;
  delays.forEach((d,i)=>{
    cum+=d;
    const cls=results[i]?'success':'fail';
    logEl.innerHTML+=`<div class="${cls}">Attempt ${i+1}: wait ${d}ms (total ${cum}ms) → ${results[i]?'SUCCESS':'FAIL'}</div>`;
  });
}

document.getElementById('runBtn').onclick=run;
run();