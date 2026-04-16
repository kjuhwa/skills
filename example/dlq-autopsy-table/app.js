const topics=['order.created','payment.process','email.send','inventory.update','user.signup','audit.log'];
const errors=['TimeoutException','NullPointerException','SerializationError','ConnectionRefused','SchemaValidationFailed','OutOfMemoryError'];
const tbody=document.getElementById('tbody'),search=document.getElementById('search'),toast=document.getElementById('toast');
let messages=[];

function rnd(a){return a[Math.floor(Math.random()*a.length)]}
function rid(){return 'msg-'+Math.random().toString(36).slice(2,10)}
function rage(){const m=Math.floor(Math.random()*120);return m<60?m+'m ago':Math.floor(m/60)+'h '+m%60+'m ago'}

for(let i=0;i<30;i++){
  messages.push({id:rid(),topic:rnd(topics),error:rnd(errors),retries:Math.floor(Math.random()*5)+1,age:rage(),
    payload:JSON.stringify({userId:Math.floor(Math.random()*9999),action:rnd(['buy','refund','register','update']),ts:Date.now()-Math.floor(Math.random()*1e7)}),
    selected:false});
}

function render(filter=''){
  const f=filter.toLowerCase();
  const rows=messages.filter(m=>!f||m.error.toLowerCase().includes(f)||m.topic.toLowerCase().includes(f));
  tbody.innerHTML=rows.map(m=>`<tr class="${m.selected?'selected':''}" data-id="${m.id}">
    <td><input type="checkbox" ${m.selected?'checked':''}></td>
    <td>${m.id}</td><td class="topic">${m.topic}</td><td class="err">${m.error}</td>
    <td class="retries">${m.retries}</td><td>${m.age}</td><td class="payload">${m.payload}</td></tr>`).join('');
}
render();

tbody.addEventListener('click',e=>{
  const row=e.target.closest('tr');if(!row)return;
  const id=row.dataset.id,m=messages.find(x=>x.id===id);if(!m)return;
  if(e.target.tagName==='INPUT'){m.selected=e.target.checked;render(search.value);return}
  if(e.target.classList.contains('payload')){e.target.classList.toggle('open');return}
});

document.getElementById('selAll').addEventListener('change',e=>{messages.forEach(m=>m.selected=e.target.checked);render(search.value)});
search.addEventListener('input',()=>render(search.value));

function showToast(msg){toast.textContent=msg;toast.style.opacity=1;setTimeout(()=>toast.style.opacity=0,2000)}

document.getElementById('btnRetry').onclick=()=>{
  const sel=messages.filter(m=>m.selected);
  if(!sel.length)return showToast('Nothing selected');
  messages=messages.filter(m=>!m.selected);render(search.value);
  showToast(`Retrying ${sel.length} message(s)...`);
};
document.getElementById('btnPurge').onclick=()=>{
  const sel=messages.filter(m=>m.selected);
  if(!sel.length)return showToast('Nothing selected');
  messages=messages.filter(m=>!m.selected);render(search.value);
  showToast(`Purged ${sel.length} message(s)`);
};