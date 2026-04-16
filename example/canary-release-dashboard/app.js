const errData={s:[],c:[]},latData={s:[],c:[]},MAX=40;
let canaryPct=5,phase=0,logs=[];
function rnd(a,b){return a+Math.random()*(b-a)}
function addPoint(){
  errData.s.push(rnd(.1,.6));errData.c.push(rnd(.2,phase>60?3:1));
  latData.s.push(rnd(40,70));latData.c.push(rnd(45,phase>60?150:80));
  if(errData.s.length>MAX){errData.s.shift();errData.c.shift();latData.s.shift();latData.c.shift()}
  if(phase%10===0&&canaryPct<50)canaryPct=Math.min(canaryPct+5,50);
  phase++;
}
function drawLine(svgId,stableArr,canaryArr,maxY){
  const svg=document.getElementById(svgId);svg.innerHTML='';
  const w=300,h=120,pad=5;
  [['#3b82f6',stableArr],['#6ee7b7',canaryArr]].forEach(([col,arr])=>{
    if(!arr.length)return;
    const pts=arr.map((v,i)=>`${pad+i*(w-2*pad)/(MAX-1)},${h-pad-(v/maxY)*(h-2*pad)}`).join(' ');
    const el=document.createElementNS('http://www.w3.org/2000/svg','polyline');
    el.setAttribute('points',pts);el.setAttribute('fill','none');
    el.setAttribute('stroke',col);el.setAttribute('stroke-width','2');svg.appendChild(el);
  });
}
function renderDeploy(){
  const d=document.getElementById('deploy');
  d.innerHTML=`<div class="bar"><div class="stable" style="width:${100-canaryPct}%">stable ${100-canaryPct}%</div><div class="canary" style="width:${canaryPct}%">canary ${canaryPct}%</div></div>
  <span style="font-size:.75rem;color:#94a3b8">Phase ${phase} · Auto-promoting every 10 ticks</span>`;
}
function addLog(){
  const msgs=[['ok','✓ Health check passed'],['warn','⚠ Latency spike detected'],['bad','✗ Error rate above threshold']];
  const m=msgs[Math.random()<.6?0:Math.random()<.5?1:2];
  logs.unshift(`<div class="${m[0]}">[${new Date().toLocaleTimeString()}] ${m[1]}</div>`);
  if(logs.length>30)logs.pop();
  document.getElementById('log').innerHTML=logs.join('');
}
function tick(){
  addPoint();
  drawLine('errChart',errData.s,errData.c,4);
  drawLine('latChart',latData.s,latData.c,180);
  renderDeploy();addLog();
  document.getElementById('clock').textContent=new Date().toLocaleTimeString();
}
tick();setInterval(tick,1500);