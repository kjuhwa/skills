const TOPICS=['orders.v1','payments.v2','users.signup','inventory.sync','email.outbound'];
const REASONS=[['timeout','Connection timeout'],['parse','JSON parse error'],['auth','401 Unauthorized'],['schema','Schema validation failed']];
const messages=[];
const selected=new Set();
let activeId=null;
let reasonFilters=new Set(REASONS.map(r=>r[0]));

function rand(arr){return arr[Math.floor(Math.random()*arr.length)]}
function genMessage(){
  const[rk,rl]=rand(REASONS);
  const id='msg_'+Math.random().toString(36).slice(2,9);
  return{id,topic:rand(TOPICS),reasonKey:rk,reasonLabel:rl,retries:Math.floor(Math.random()*5)+1,
    age:Math.floor(Math.random()*3600),payload:JSON.stringify({id,user:'u_'+Math.floor(Math.random()*999),amount:(Math.random()*500).toFixed(2),ts:Date.now()},null,2)};
}

for(let i=0;i<40;i++)messages.push(genMessage());

function renderReasons(){
  const c=document.getElementById('reasons');
  c.innerHTML=REASONS.map(([k,l])=>`<label><input type="checkbox" value="${k}" checked> ${l}</label>`).join('');
  c.querySelectorAll('input').forEach(i=>i.onchange=()=>{
    i.checked?reasonFilters.add(i.value):reasonFilters.delete(i.value);render();
  });
}

function render(){
  const q=document.getElementById('search').value.toLowerCase();
  const tb=document.querySelector('#queue tbody');
  const filtered=messages.filter(m=>reasonFilters.has(m.reasonKey)&&(!q||m.payload.toLowerCase().includes(q)));
  tb.innerHTML=filtered.map(m=>`<tr data-id="${m.id}" class="${activeId===m.id?'active':''}">
    <td><input type="checkbox" ${selected.has(m.id)?'checked':''}></td>
    <td>${m.id.slice(0,10)}</td><td>${m.topic}</td>
    <td><span class="reason-tag ${m.reasonKey}">${m.reasonLabel}</span></td>
    <td>${m.retries}</td><td>${m.age}s</td></tr>`).join('');
  tb.querySelectorAll('tr').forEach(tr=>{
    const id=tr.dataset.id;
    tr.querySelector('input').onchange=e=>{e.stopPropagation();selected.has(id)?selected.delete(id):selected.add(id);update()};
    tr.onclick=()=>{activeId=id;const m=messages.find(x=>x.id===id);document.getElementById('detail').textContent=m.payload;render()};
  });
  update();
}

function update(){
  document.getElementById('total').textContent=messages.length;
  document.getElementById('selected').textContent=selected.size;
}

document.getElementById('search').oninput=render;
document.getElementById('replay').onclick=()=>{
  [...selected].forEach(id=>{const i=messages.findIndex(m=>m.id===id);if(i>=0)messages.splice(i,1)});
  selected.clear();render();
};
document.getElementById('purge').onclick=()=>{
  [...selected].forEach(id=>{const i=messages.findIndex(m=>m.id===id);if(i>=0)messages.splice(i,1)});
  selected.clear();render();
};

setInterval(()=>{if(Math.random()>.6){messages.unshift(genMessage());if(messages.length>80)messages.pop();render()}},3000);

renderReasons();render();