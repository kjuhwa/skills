const tables={users:['id','name','email','role'],orders:['id','user_id','total','status']};
const mock={users:[{id:1,name:'Alice',email:'alice@co.io',role:'admin'},{id:2,name:'Bob',email:'bob@co.io',role:'user'},{id:3,name:'Carol',email:'carol@co.io',role:'user'}],orders:[{id:101,user_id:1,total:59.99,status:'shipped'},{id:102,user_id:2,total:124.5,status:'pending'}]};
let events=[],current=0,activeTable='users';
function genEvent(){
  const ops=['UPDATE','INSERT','DELETE'],op=ops[Math.random()*3|0],tbl=activeTable,cols=tables[tbl],rows=mock[tbl];
  const idx=Math.random()*rows.length|0,before=JSON.parse(JSON.stringify(rows));
  if(op==='UPDATE'){const c=cols[1+(Math.random()*(cols.length-1)|0)];rows[idx][c]=typeof rows[idx][c]==='number'?+(Math.random()*200).toFixed(2):rows[idx][c]+'_v';}
  else if(op==='INSERT'){const nr={};cols.forEach((c,i)=>nr[c]=i===0?rows.length+100+events.length:c==='total'?+(Math.random()*200).toFixed(2):'new_'+c);rows.push(nr);}
  else if(op==='DELETE'&&rows.length>1){rows.splice(idx,1);}
  return{op,table:tbl,before,after:JSON.parse(JSON.stringify(rows))};
}
function renderTable(el,data,cols,diff,side){
  let h='<tr>'+cols.map(c=>'<th>'+c+'</th>').join('')+'</tr>';
  data.forEach((r,ri)=>{h+='<tr>'+cols.map(c=>{
    let cls='';if(diff){const other=side==='after'?diff.before:diff.after;
    const match=other.find(o=>o.id===r.id);if(!match)cls=side==='after'?'added':'removed';
    else if(JSON.stringify(match[c])!==JSON.stringify(r[c]))cls='changed';}
    return`<td class="${cls}">${r[c]}</td>`;}).join('')+'</tr>';});
  el.innerHTML=h;
}
function render(){
  const ev=events[current];if(!ev)return;
  renderTable(document.getElementById('before'),ev.before,tables[ev.table],ev,'before');
  renderTable(document.getElementById('after'),ev.after,tables[ev.table],ev,'after');
  document.querySelectorAll('.dot').forEach((d,i)=>{d.classList.toggle('active',i===current)});
}
function addDot(ev,i){
  const d=document.createElement('div');d.className='dot';
  d.style.color=ev.op==='INSERT'?'#7ec8e3':ev.op==='DELETE'?'#f07178':'#6ee7b7';
  d.style.background=d.style.color;d.onclick=()=>{current=i;render()};
  document.getElementById('timeline').appendChild(d);
}
const sel=document.getElementById('tableSel');
Object.keys(tables).forEach(t=>{const o=document.createElement('option');o.value=o.textContent=t;sel.appendChild(o)});
sel.onchange=()=>{activeTable=sel.value};
document.getElementById('nextBtn').onclick=()=>{const ev=genEvent();events.push(ev);addDot(ev,events.length-1);current=events.length-1;render()};
for(let i=0;i<3;i++)document.getElementById('nextBtn').click();