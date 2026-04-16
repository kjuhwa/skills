const timelineEl=document.getElementById('timeline'),detailEl=document.getElementById('detail');
let steps=[],version=1;
const PHASES=[
  {name:'Build & Push',icon:'green',desc:'Image v{v} built and pushed to registry',detail:'Docker image sha256:{h} pushed. Size: {s}MB. Layers cached: 4/7.'},
  {name:'Canary Deploy (5%)',icon:'yellow',desc:'5% traffic routed to v{v}',detail:'2 of 40 pods running v{v}. Avg latency: {l}ms. Error rate: 0.02%.'},
  {name:'Monitor (5 min)',icon:'blue',desc:'Watching error rate & latency',detail:'p99 latency: {l2}ms. Error budget consumed: {e}%. CPU: {c}%. Memory: {m}MB.'},
  {name:'Promote to 25%',icon:'yellow',desc:'Scaling canary to 25%',detail:'10 of 40 pods now on v{v}. Rolling restart in progress. ETA: 45s.'},
  {name:'Promote to 100%',icon:'green',desc:'Full rollout of v{v}',detail:'All 40 pods healthy on v{v}. Old revision scaled to 0. Rollout complete.'}
];
function rHex(){return Math.random().toString(16).slice(2,14)}
function rInt(a,b){return Math.floor(a+Math.random()*(b-a))}
function buildSteps(v){
  return PHASES.map(p=>({...p,
    desc:p.desc.replace(/\{v\}/g,v),
    detail:p.detail.replace(/\{v\}/g,v).replace('{h}',rHex()).replace('{s}',rInt(80,200))
      .replace('{l}',rInt(12,30)).replace('{l2}',rInt(40,90)).replace('{e}',rInt(1,8))
      .replace('{c}',rInt(20,65)).replace('{m}',rInt(200,512)),
    ts:new Date(Date.now()-rInt(0,300000))}));
}
function render(){
  timelineEl.innerHTML=steps.map((s,i)=>`<div class="step" onclick="showDetail(${i})">
    <div class="dot ${s.icon}"></div>${i<steps.length-1?'<div class="line"></div>':''}
    <div class="body"><h3>${s.name}</h3><p>${s.desc}</p></div></div>`).join('');
  if(steps.length)showDetail(steps.length-1);
}
window.showDetail=i=>{
  const s=steps[i];
  detailEl.innerHTML=`<strong style="color:#6ee7b7">${s.name}</strong><br><br>${s.detail}<br><br><span style="color:#475569">${s.ts.toLocaleTimeString()}</span>`;
};
window.startRollout=()=>{version++;steps=buildSteps('1.'+version);render()};
window.triggerRollback=()=>{
  if(!steps.length)return;
  steps.push({name:'⚠ Rollback',icon:'red',desc:'Reverted to previous stable version',
    detail:'Canary v1.'+version+' rolled back. Reason: error rate exceeded 2% threshold. All traffic restored to v1.'+(version-1)+'.',
    ts:new Date()});
  render();
};
steps=buildSteps('1.1');render();