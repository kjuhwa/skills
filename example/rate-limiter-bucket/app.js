const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
let maxTokens=15,refillPerSec=3,tokens=15,log=document.getElementById('log');
const bucketX=250,bucketY=60,bucketW=100,bucketH=220;

function draw(){
  ctx.clearRect(0,0,600,340);
  ctx.strokeStyle='#6ee7b7';ctx.lineWidth=2;
  ctx.strokeRect(bucketX,bucketY,bucketW,bucketH);
  const fillH=(tokens/maxTokens)*bucketH;
  ctx.fillStyle='rgba(110,231,183,0.25)';
  ctx.fillRect(bucketX+2,bucketY+bucketH-fillH,bucketW-4,fillH);
  for(let i=0;i<tokens;i++){
    const row=Math.floor(i/5),col=i%5;
    ctx.beginPath();
    ctx.arc(bucketX+14+col*18,bucketY+bucketH-14-row*20,7,0,Math.PI*2);
    ctx.fillStyle='#6ee7b7';ctx.fill();
  }
  ctx.fillStyle='#e2e8f0';ctx.font='14px monospace';ctx.textAlign='center';
  ctx.fillText(`${tokens} / ${maxTokens} tokens`,300,bucketY+bucketH+28);
  ctx.fillText(`refill: ${refillPerSec}/s`,300,bucketY+bucketH+48);
}

function addLog(msg,ok){
  const s=document.createElement('span');s.className=ok?'ok':'deny';
  s.textContent=`[${new Date().toLocaleTimeString()}] ${msg}\n`;
  log.prepend(s);
}

function sendRequest(){
  if(tokens>0){tokens--;addLog('✓ Request accepted',true);}
  else addLog('✗ Rate limited (429)',false);
  draw();
}

document.getElementById('sendReq').onclick=sendRequest;
document.getElementById('burst').onclick=()=>{for(let i=0;i<5;i++)sendRequest();};
document.getElementById('bucketSize').oninput=e=>{maxTokens=+e.target.value;document.getElementById('bucketVal').textContent=maxTokens;tokens=Math.min(tokens,maxTokens);draw();};
document.getElementById('refillRate').oninput=e=>{refillPerSec=+e.target.value;document.getElementById('refillVal').textContent=refillPerSec;};

setInterval(()=>{if(tokens<maxTokens){tokens++;draw();}},1000/refillPerSec*1||(1000));
draw();
setInterval(()=>{sendRequest();},800);