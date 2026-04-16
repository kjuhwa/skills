const source=[
  {name:'  alice  ',age:29,email:'alice@example.com'},
  {name:'BOB',age:17,email:'bob@test.io'},
  {name:' charlie',age:45,email:null},
  {name:'Dana  ',age:22,email:'dana@corp.net'},
  {name:null,age:33,email:'x@x.com'},
  {name:'  Eve',age:12,email:'eve@mail.com'},
  {name:'FRANK',age:68,email:'frank@legacy.org'},
  {name:'grace',age:30,email:'grace@startup.ai'}
];

const transforms={
  uppercase:{label:'UPPERCASE name',fn:r=>({...r,name:r.name?r.name.toUpperCase():r.name})},
  trim:{label:'TRIM whitespace',fn:r=>({...r,name:r.name?r.name.trim():r.name})},
  filterAdult:{label:'FILTER age ≥ 18',fn:r=>r.age>=18?r:null},
  addYear:{label:'ADD birth_year',fn:r=>({...r,birth_year:2026-r.age})},
  maskEmail:{label:'MASK email',fn:r=>({...r,email:r.email?r.email.replace(/(.).+(@.+)/,'$1***$2'):r.email})},
  dropNull:{label:'DROP null rows',fn:r=>Object.values(r).some(v=>v===null||v===undefined)?null:r},
  sortAge:{label:'SORT by age',batch:true,fn:rs=>[...rs].sort((a,b)=>a.age-b.age)}
};

let chain=[];

document.getElementById('source').textContent=JSON.stringify(source,null,2);

document.querySelectorAll('.chip').forEach(chip=>{
  chip.addEventListener('dragstart',e=>{
    e.dataTransfer.setData('type',chip.dataset.type);
  });
});

const drop=document.getElementById('chain');
drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('over');});
drop.addEventListener('dragleave',()=>drop.classList.remove('over'));
drop.addEventListener('drop',e=>{
  e.preventDefault();drop.classList.remove('over');
  const type=e.dataTransfer.getData('type');
  if(transforms[type]){chain.push(type);render();}
});

document.getElementById('clearChain').onclick=()=>{chain=[];render();};

function render(){
  drop.innerHTML='';
  chain.forEach((t,i)=>{
    const li=document.createElement('li');
    li.innerHTML=`<span>${i+1}. ${transforms[t].label}</span><button data-i="${i}">✕</button>`;
    drop.appendChild(li);
  });
  drop.querySelectorAll('button').forEach(b=>{
    b.onclick=()=>{chain.splice(+b.dataset.i,1);render();};
  });
  let rows=source.map(r=>({...r}));
  for(const t of chain){
    const T=transforms[t];
    if(T.batch){rows=T.fn(rows);}
    else{rows=rows.map(T.fn).filter(r=>r!==null);}
  }
  document.getElementById('output').textContent=JSON.stringify(rows,null,2);
  document.getElementById('count').textContent=`(${rows.length} rows)`;
}

render();