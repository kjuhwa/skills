const services=[
  {name:'Order Service',action:'Create Order',comp:'Cancel Order'},
  {name:'Inventory',action:'Reserve Stock',comp:'Release Stock'},
  {name:'Payment',action:'Charge Card',comp:'Refund'},
  {name:'Fraud Check',action:'Verify Transaction',comp:'Clear Flag'},
  {name:'Shipping',action:'Book Courier',comp:'Cancel Booking'},
  {name:'Notification',action:'Send Confirmation',comp:'Send Cancellation'}
];
const chainEl=document.getElementById('chain'),slider=document.getElementById('slider'),statusEl=document.getElementById('status');

function render(failAt){
  chainEl.innerHTML='';
  services.forEach((s,i)=>{
    if(i>0){const ar=document.createElement('span');ar.className='arrow'+(i<failAt?' active':i===failAt?' back':'');ar.textContent=i<failAt?'→':'·';chainEl.appendChild(ar);}
    const step=document.createElement('div');step.className='step';
    let cls='idle';if(i<failAt)cls='done';if(i===failAt&&failAt<services.length)cls='fail';
    const compText=failAt<=i?'':i<failAt?'':'';
    let showComp='';
    if(failAt<services.length&&i<failAt)showComp=s.comp;
    step.innerHTML=`<div class="box ${cls}">${s.action}</div><div class="comp-label">${showComp?'↩ '+showComp:''}</div>`;
    chainEl.appendChild(step);
  });
  if(failAt>=services.length){statusEl.innerHTML='<span class="ok">✓ All steps completed — saga succeeded</span>';}
  else{statusEl.innerHTML=`<span class="err">✗ Failed at step ${failAt+1} (${services[failAt].name}) — compensating ${failAt} step${failAt!==1?'s':''}</span>`;}
}
slider.oninput=()=>render(parseInt(slider.value));
render(5);