// Timeline SVG
const svg=document.getElementById('timeline');
const stages=['Created','5% Traffic','25% Traffic','50% Traffic','100% GA'];
const progress=3;
stages.forEach((s,i)=>{
  const x=30+i*135,done=i<progress,active=i===progress-1;
  if(i>0){const line=`<line x1="${x-105}" y1="40" x2="${x-30}" y2="40" stroke="${done?'#6ee7b7':'#334155'}" stroke-width="3"/>`;svg.innerHTML+=line}
  svg.innerHTML+=`<circle cx="${x}" cy="40" r="${active?10:7}" fill="${done?'#6ee7b7':'#334155'}" ${active?'stroke="#6ee7b7" stroke-width="3" fill="#0f1117"':''}/>`
    +`<text x="${x}" y="70" text-anchor="middle" fill="${done?'#e2e8f0':'#64748b'}" font-size="10">${s}</text>`;
});

// Latency chart
const lCtx=document.getElementById('latencyChart').getContext('2d');
const stableData=[],canaryData=[];
for(let i=0;i<40;i++){stableData.push(45+Math.random()*15);canaryData.push(48+Math.random()*20)}
function drawLatency(){
  const W=280,H=130;lCtx.clearRect(0,0,W,H);
  const draw=(data,color)=>{lCtx.beginPath();lCtx.strokeStyle=color;lCtx.lineWidth=2;
    data.forEach((v,i)=>{const x=i*(W/40),y=H-v*1.2;i?lCtx.lineTo(x,y):lCtx.moveTo(x,y)});lCtx.stroke()};
  draw(stableData,'#3b82f6');draw(canaryData,'#6ee7b7');
  lCtx.fillStyle='#64748b';lCtx.font='10px system-ui';lCtx.fillText('— stable  — canary',170,12);
}
drawLatency();
setInterval(()=>{stableData.shift();stableData.push(45+Math.random()*15);canaryData.shift();canaryData.push(48+Math.random()*20);drawLatency()},800);

// Error budget ring
const ringDiv=document.getElementById('budgetRing');
const pct=72;
ringDiv.innerHTML=`<svg width="100" height="100" viewBox="0 0 100 100">
<circle cx="50" cy="50" r="40" fill="none" stroke="#252833" stroke-width="8"/>
<circle cx="50" cy="50" r="40" fill="none" stroke="#6ee7b7" stroke-width="8"
  stroke-dasharray="${pct*2.51} 251" stroke-linecap="round" transform="rotate(-90 50 50)"/>
<text x="50" y="54" text-anchor="middle" fill="#e2e8f0" font-size="18" font-weight="bold">${pct}%</text>
</svg>`;

// Event log
const logEl=document.getElementById('log');
const events=['Canary v2.4.1 deployed','Traffic shifted to 5%','Health check passed','Traffic shifted to 25%','Latency within SLO','Traffic shifted to 50%','Monitoring active'];
events.forEach((e,i)=>{const li=document.createElement('li');
  li.innerHTML=`<span class="ts">${String(9+Math.floor(i*0.5)).padStart(2,'0')}:${String(i*7%60).padStart(2,'0')}</span>${e}`;logEl.appendChild(li)});

setInterval(()=>{const li=document.createElement('li');
  const msgs=['Health check OK','Metrics nominal','No anomalies','CPU 34%','p99 within budget'];
  li.innerHTML=`<span class="ts">${new Date().toLocaleTimeString().slice(0,5)}</span>${msgs[Math.floor(Math.random()*msgs.length)]}`;
  logEl.prepend(li);if(logEl.children.length>20)logEl.lastChild.remove()},3000);