const BUDGET_MAX=50;let budgetUsed=0,dist=new Array(7).fill(0),logLines=[];
const ring=document.getElementById('ring'),budgetText=document.getElementById('budgetText'),logEl=document.getElementById('log'),histCanvas=document.getElementById('hist'),hctx=histCanvas.getContext('2d');
function drawRing(){
  const pct=budgetUsed/BUDGET_MAX,r=65,cx=80,cy=80,lw=14;
  ring.innerHTML='';
  const circ=2*Math.PI*r;
  ring.innerHTML=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#2d333b" stroke-width="${lw}"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${pct>.8?'#f87171':'#6ee7b7'}" stroke-width="${lw}"
    stroke-dasharray="${circ*pct} ${circ*(1-pct)}" stroke-dashoffset="${circ*.25}" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>
  <text x="${cx}" y="${cy+6}" text-anchor="middle" fill="#c9d1d9" font-size="22" font-weight="700">${budgetUsed}</text>`;
  budgetText.textContent=`${budgetUsed} / ${BUDGET_MAX} retries used (${Math.round(pct*100)}%)`;
}
function drawHist(){
  hctx.clearRect(0,0,700,160);hctx.fillStyle='#1a1d27';hctx.fillRect(0,0,700,160);
  const max=Math.max(...dist,1);
  dist.forEach((v,i)=>{const bw=60,gap=20,x=40+i*(bw+gap),h=v/max*120,y=140-h;
    hctx.fillStyle=i===0?'#6ee7b7':'#3b82f6';hctx.beginPath();hctx.roundRect(x,y,bw,h,4);hctx.fill();
    hctx.fillStyle='#8b949e';hctx.font='11px sans-serif';hctx.textAlign='center';
    hctx.fillText(i===0?'1st try':i+'ret',x+bw/2,155);if(v)hctx.fillText(v,x+bw/2,y-6);
  });
}
function addLog(ep,attempts,ok){
  logLines.unshift({ep,attempts,ok,time:new Date().toLocaleTimeString()});
  if(logLines.length>30)logLines.pop();
  logEl.innerHTML=logLines.map(l=>`<div class="log-line"><span>${l.time} ${l.ep}</span><span class="${l.ok?'ok':'err'}">${l.ok?'OK':'FAIL'} (${l.attempts})</span></div>`).join('');
}
const endpoints=['/api/users','/api/orders','/api/payments','/api/search','/api/auth'];
function tick(){
  const ep=endpoints[Math.floor(Math.random()*endpoints.length)];
  const failChance=.55;let attempts=0,ok=false;
  while(attempts<6){
    if(Math.random()>failChance){ok=true;break}
    attempts++;budgetUsed=Math.min(budgetUsed+1,BUDGET_MAX);
  }
  dist[attempts]++;addLog(ep,attempts+1,ok);drawRing();drawHist();
  if(budgetUsed>=BUDGET_MAX){budgetUsed=Math.floor(BUDGET_MAX*.2);} // reset window
  setTimeout(tick,600+Math.random()*800);
}
drawRing();drawHist();tick();