const events=[
  {ver:'v3.8.1',time:'2026-04-16 14:32',status:'ok',tag:'Promoted',desc:'Canary promoted to 100% — all metrics nominal.',err:0.3,lat:42,rps:1240},
  {ver:'v3.8.1',time:'2026-04-16 13:10',status:'ok',tag:'50%',desc:'Scaled to 50%. Error rate stable at 0.4%.',err:0.4,lat:45,rps:620},
  {ver:'v3.8.1',time:'2026-04-16 12:05',status:'ok',tag:'10%',desc:'Initial canary deployment. Monitoring started.',err:0.2,lat:38,rps:124},
  {ver:'v3.8.0',time:'2026-04-15 17:50',status:'rollback',tag:'Rollback',desc:'Rolled back due to elevated p99 latency.',err:4.1,lat:320,rps:1180},
  {ver:'v3.8.0',time:'2026-04-15 16:30',status:'fail',tag:'Unhealthy',desc:'Error rate spiked to 4.1%. Auto-halt triggered.',err:4.1,lat:310,rps:590},
  {ver:'v3.8.0',time:'2026-04-15 15:00',status:'warn',tag:'Degraded',desc:'Latency creeping up after 25% rollout.',err:1.8,lat:190,rps:310},
  {ver:'v3.8.0',time:'2026-04-15 14:00',status:'ok',tag:'10%',desc:'Canary deployed. Initial metrics look good.',err:0.5,lat:50,rps:124},
  {ver:'v3.7.9',time:'2026-04-14 10:20',status:'ok',tag:'Promoted',desc:'Smooth rollout completed in 3 hours.',err:0.2,lat:35,rps:1250},
];
const tl=document.getElementById('timeline'),det=document.getElementById('detail');
const tagCls={Promoted:'tag-ok','50%':'tag-ok','10%':'tag-ok',Degraded:'tag-warn',Unhealthy:'tag-fail',Rollback:'tag-rb'};
events.forEach((e,i)=>{
  const div=document.createElement('div');
  div.className=`event ${e.status==='rollback'?'rollback':e.status}`;
  div.innerHTML=`<div class="ev-head"><span class="ev-ver">${e.ver}<span class="tag ${tagCls[e.tag]||'tag-ok'}">${e.tag}</span></span><span class="ev-time">${e.time}</span></div><div class="ev-desc">${e.desc}</div>`;
  div.onclick=()=>showDetail(e);
  tl.appendChild(div);
});
function showDetail(e){
  det.classList.remove('hidden');
  det.innerHTML=`<h3>${e.ver} — ${e.tag}</h3><div class="metric"><span>Error Rate</span><span style="color:${e.err>3?'#f87171':'#6ee7b7'}">${e.err}%</span></div><div class="metric"><span>p95 Latency</span><span>${e.lat} ms</span></div><div class="metric"><span>Requests/sec</span><span>${e.rps}</span></div><div class="metric"><span>Timestamp</span><span>${e.time}</span></div>`;
}
showDetail(events[0]);