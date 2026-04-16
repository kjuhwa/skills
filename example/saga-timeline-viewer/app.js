const sagas=[
  {id:'S-1001',name:'Order #4821',status:'ok',events:[
    {t:'10:00:01',svc:'OrderSvc',action:'CreateOrder',s:'ok'},{t:'10:00:02',svc:'InventorySvc',action:'ReserveItems',s:'ok'},
    {t:'10:00:03',svc:'PaymentSvc',action:'ChargeCard',s:'ok'},{t:'10:00:05',svc:'ShippingSvc',action:'ScheduleDelivery',s:'ok'}]},
  {id:'S-1002',name:'Order #4822',status:'fail',events:[
    {t:'10:01:00',svc:'OrderSvc',action:'CreateOrder',s:'ok'},{t:'10:01:01',svc:'InventorySvc',action:'ReserveItems',s:'ok'},
    {t:'10:01:03',svc:'PaymentSvc',action:'ChargeCard',s:'fail'},{t:'10:01:04',svc:'PaymentSvc',action:'→ Refund issued',s:'comp'},
    {t:'10:01:05',svc:'InventorySvc',action:'→ Stock released',s:'comp'},{t:'10:01:06',svc:'OrderSvc',action:'→ Order cancelled',s:'comp'}]},
  {id:'S-1003',name:'Order #4823',status:'ok',events:[
    {t:'10:02:00',svc:'OrderSvc',action:'CreateOrder',s:'ok'},{t:'10:02:02',svc:'InventorySvc',action:'ReserveItems',s:'ok'},
    {t:'10:02:04',svc:'PaymentSvc',action:'ChargeCard',s:'ok'},{t:'10:02:06',svc:'ShippingSvc',action:'ScheduleDelivery',s:'ok'}]},
  {id:'S-1004',name:'Order #4824',status:'fail',events:[
    {t:'10:03:00',svc:'OrderSvc',action:'CreateOrder',s:'ok'},{t:'10:03:02',svc:'InventorySvc',action:'ReserveItems',s:'fail'},
    {t:'10:03:03',svc:'InventorySvc',action:'→ Reservation rolled back',s:'comp'},{t:'10:03:04',svc:'OrderSvc',action:'→ Order cancelled',s:'comp'}]},
];
const listEl=document.getElementById('list'),tlEl=document.getElementById('timeline');
const colors={ok:'#6ee7b7',fail:'#f87171',comp:'#fbbf24'};
function renderList(){
  listEl.innerHTML='';sagas.forEach((s,i)=>{
    const d=document.createElement('div');d.className='saga-card';d.innerHTML=`<h3>${s.name}</h3><span>${s.id}</span> <span class="tag ${s.status}">${s.status==='ok'?'Completed':'Failed'}</span>`;
    d.onclick=()=>{document.querySelectorAll('.saga-card').forEach(c=>c.classList.remove('active'));d.classList.add('active');renderTimeline(s);};listEl.appendChild(d);
  });
}
function renderTimeline(s){
  tlEl.innerHTML=`<h3 style="color:#6ee7b7;margin-bottom:12px">${s.name} — ${s.id}</h3>`;
  s.events.forEach(e=>{
    const div=document.createElement('div');div.className='evt';
    div.innerHTML=`<span class="dot" style="background:${colors[e.s]}"></span><div class="evt-body"><b>${e.svc}</b> ${e.action}<br><span class="ts">${e.t}</span></div>`;
    tlEl.appendChild(div);
  });
}
renderList();renderTimeline(sagas[0]);document.querySelector('.saga-card').classList.add('active');