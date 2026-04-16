const state={splits:[{subset:'v1',weight:80},{subset:'v2',weight:20}]};
const colors=['#6ee7b7','#fbbf24','#60a5fa','#c084fc','#f472b6'];
function renderSplits(){const c=document.getElementById('splits');c.innerHTML='';state.splits.forEach((s,i)=>{const d=document.createElement('div');d.className='split';d.innerHTML=`<span style="color:${colors[i%5]}">●</span><input value="${s.subset}" data-i="${i}" data-k="subset"><input type="number" min="0" max="100" value="${s.weight}" data-i="${i}" data-k="weight"><span>%</span><button class="rm" data-i="${i}">×</button>`;c.appendChild(d)});
  c.querySelectorAll('input').forEach(inp=>inp.oninput=e=>{const i=+e.target.dataset.i,k=e.target.dataset.k;state.splits[i][k]=k==='weight'?+e.target.value:e.target.value;update()});
  c.querySelectorAll('.rm').forEach(b=>b.onclick=e=>{state.splits.splice(+e.target.dataset.i,1);renderSplits();update()})}
document.getElementById('addSplit').onclick=()=>{state.splits.push({subset:'v'+(state.splits.length+1),weight:0});renderSplits();update()};
function yaml(){const host=document.getElementById('host').value,gw=document.getElementById('gateway').value,hname=document.getElementById('hname').value,hval=document.getElementById('hval').value,timeout=document.getElementById('timeout').value,retries=document.getElementById('retries').value,delay=document.getElementById('delayPct').value,abort=document.getElementById('abortPct').value;
  let y=`apiVersion: networking.istio.io/v1beta1\nkind: VirtualService\nmetadata:\n  name: ${host.split('.')[0]}-vs\nspec:\n  hosts:\n    - ${host}\n  gateways:\n    - ${gw}\n  http:\n    - `;
  if(hname&&hval)y+=`match:\n        - headers:\n            ${hname}:\n              exact: ${hval}\n      `;
  y+=`route:\n`;state.splits.forEach(s=>{y+=`        - destination:\n            host: ${host}\n            subset: ${s.subset}\n          weight: ${s.weight}\n`});
  y+=`      timeout: ${timeout}\n      retries:\n        attempts: ${retries}\n        perTryTimeout: 2s\n`;
  if(+delay>0||+abort>0){y+=`      fault:\n`;if(+delay>0)y+=`        delay:\n          percentage:\n            value: ${delay}\n          fixedDelay: 5s\n`;if(+abort>0)y+=`        abort:\n          percentage:\n            value: ${abort}\n          httpStatus: 503\n`}
  return y}
function renderPie(){const cv=document.getElementById('pie');cv.width=300;cv.height=300;const ctx=cv.getContext('2d');ctx.clearRect(0,0,300,300);const total=state.splits.reduce((s,x)=>s+x.weight,0)||1;let a=-Math.PI/2;state.splits.forEach((s,i)=>{const slice=(s.weight/total)*Math.PI*2;ctx.beginPath();ctx.moveTo(150,150);ctx.arc(150,150,120,a,a+slice);ctx.closePath();ctx.fillStyle=colors[i%5];ctx.fill();ctx.strokeStyle='#1a1d27';ctx.lineWidth=3;ctx.stroke();a+=slice});ctx.beginPath();ctx.arc(150,150,50,0,Math.PI*2);ctx.fillStyle='#1a1d27';ctx.fill();
  document.getElementById('legend').innerHTML=state.splits.map((s,i)=>`<div><span class="sw" style="background:${colors[i%5]}"></span>${s.subset}: ${s.weight}%</div>`).join('')}
function update(){document.getElementById('yaml').textContent=yaml();renderPie()}
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));t.classList.add('active');document.getElementById(t.dataset.t+'View').classList.add('active');if(t.dataset.t==='viz')renderPie()});
document.getElementById('copy').onclick=()=>{navigator.clipboard.writeText(yaml());document.getElementById('copy').textContent='Copied!';setTimeout(()=>document.getElementById('copy').textContent='Copy',1200)};
document.getElementById('delayPct').oninput=e=>{document.getElementById('delayVal').textContent=e.target.value+'%';update()};
document.getElementById('abortPct').oninput=e=>{document.getElementById('abortVal').textContent=e.target.value+'%';update()};
['host','gateway','hname','hval','timeout','retries'].forEach(id=>document.getElementById(id).oninput=update);
document.getElementById('runTest').onclick=()=>{const total=state.splits.reduce((s,x)=>s+x.weight,0)||1;const counts={};state.splits.forEach(s=>counts[s.subset]=0);for(let i=0;i<100;i++){let r=Math.random()*total,acc=0;for(const s of state.splits){acc+=s.weight;if(r<=acc){counts[s.subset]++;break}}}
  document.getElementById('results').innerHTML=Object.entries(counts).map(([k,v])=>`<div>${k}</div><div class="bar"><div class="fill" style="width:${v}%"></div><span>${v} requests</span></div>`).join('')};
renderSplits();update();