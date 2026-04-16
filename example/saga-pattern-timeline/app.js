const svg=document.getElementById('svg'),detail=document.getElementById('detail');
const services=['OrderSvc','InventorySvc','PaymentSvc','ShippingSvc','NotifySvc'];
const sagas=[
  {id:'S-1001',steps:[{s:0,st:'committed',ms:120},{s:1,st:'committed',ms:85},{s:2,st:'committed',ms:200},{s:3,st:'committed',ms:150},{s:4,st:'committed',ms:60}]},
  {id:'S-1002',steps:[{s:0,st:'committed',ms:95},{s:1,st:'committed',ms:110},{s:2,st:'failed',ms:340},{s:1,st:'compensated',ms:90},{s:0,st:'compensated',ms:70}]},
  {id:'S-1003',steps:[{s:0,st:'committed',ms:80},{s:1,st:'committed',ms:70},{s:2,st:'committed',ms:180},{s:3,st:'failed',ms:420},{s:2,st:'compensated',ms:95},{s:1,st:'compensated',ms:60},{s:0,st:'compensated',ms:55}]},
  {id:'S-1004',steps:[{s:0,st:'pending',ms:0},{s:1,st:'pending',ms:0}]},
];
const colors={committed:'#6ee7b7',pending:'#38bdf8',failed:'#f87171',compensated:'#fbbf24'};
const laneH=70,topPad=50,leftPad=110;

function render(){
  let h='';
  // service lanes
  services.forEach((s,i)=>{
    const y=topPad+i*laneH;
    h+=`<line x1="${leftPad}" y1="${y}" x2="840" y2="${y}" stroke="#6ee7b711" stroke-width="1"/>`;
    h+=`<text x="10" y="${y+5}" fill="#6ee7b799" font-size="11" font-family="system-ui">${s}</text>`;
  });
  // sagas
  sagas.forEach((saga,si)=>{
    const baseX=leftPad+30+si*175;
    saga.steps.forEach((step,j)=>{
      const x=baseX+j*22, y=topPad+step.s*laneH;
      const c=colors[step.st];
      h+=`<circle cx="${x}" cy="${y}" r="8" fill="${c}33" stroke="${c}" stroke-width="2" class="node" data-saga="${si}" data-step="${j}" style="cursor:pointer"/>`;
      if(j>0){
        const px=baseX+(j-1)*22,py=topPad+saga.steps[j-1].s*laneH;
        const isComp=step.st==='compensated';
        h+=`<line x1="${px}" y1="${py}" x2="${x}" y2="${y}" stroke="${isComp?'#fbbf2466':'#6ee7b744'}" stroke-width="1.5" ${isComp?'stroke-dasharray="4,3"':''}/>`;
      }
    });
    h+=`<text x="${baseX}" y="${topPad+services.length*laneH+10}" fill="#8b95a5" font-size="10" text-anchor="middle" font-family="monospace">${saga.id}</text>`;
  });
  svg.innerHTML=h;
  svg.querySelectorAll('.node').forEach(n=>n.addEventListener('click',e=>{
    const si=+e.target.dataset.saga,sti=+e.target.dataset.step;
    const saga=sagas[si],step=saga.steps[sti];
    detail.innerHTML=`<span style="color:#6ee7b7">${saga.id}</span> → Step ${sti+1} | Service: <b>${services[step.s]}</b> | Status: <span style="color:${colors[step.st]}">${step.st}</span> | Latency: ${step.ms}ms`;
  }));
}
render();