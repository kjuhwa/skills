const logNon=document.getElementById('log-non'),logIdem=document.getElementById('log-idem');
const totalNon=document.getElementById('total-non'),totalIdem=document.getElementById('total-idem');
const canvas=document.getElementById('chart'),ctx=canvas.getContext('2d');
let nonCount=0,idemCount=0,nonEffects=0,idemEffects=0,idemKey='txn-abc-001';

function addLog(el,msg,cls){const d=document.createElement('div');d.textContent=msg;d.className=cls;el.prepend(d)}

document.getElementById('btn-non').onclick=()=>{
  nonCount++;nonEffects++;
  addLog(logNon,`#${nonCount} → 201 Created  (+$50 charged)`,'ok');
  totalNon.textContent=nonEffects*50;drawChart();
};
document.getElementById('btn-idem').onclick=()=>{
  idemCount++;
  if(idemEffects===0){idemEffects=1;addLog(logIdem,`#${idemCount} → 201 Created  (+$50 charged)  key=${idemKey}`,'ok');
  }else{addLog(logIdem,`#${idemCount} → 200 OK (duplicate, no charge)  key=${idemKey}`,'dup');}
  totalIdem.textContent=idemEffects*50;drawChart();
};

function drawChart(){
  ctx.clearRect(0,0,600,200);
  const data=[[nonCount,nonEffects,'Non-Idem'],[idemCount,idemEffects,'Idempotent']];
  const max=Math.max(nonCount,nonEffects,idemCount,1);
  data.forEach(([req,eff,label],i)=>{
    const y=40+i*80;
    ctx.fillStyle='#8b949e';ctx.font='12px sans-serif';ctx.fillText(label,10,y-8);
    ctx.fillStyle='#374151';ctx.fillRect(100,y,400,20);
    ctx.fillStyle='#6ee7b7';ctx.fillRect(100,y,400*(req/max),20);
    ctx.fillStyle='#374151';ctx.fillRect(100,y+28,400,20);
    ctx.fillStyle=eff>1?'#f87171':'#6ee7b7';ctx.fillRect(100,y+28,400*(eff/max),20);
    ctx.fillStyle='#c9d1d9';ctx.font='11px monospace';
    ctx.fillText(`Requests: ${req}`,510,y+14);ctx.fillText(`Effects: ${eff}`,510,y+42);
  });
}
drawChart();