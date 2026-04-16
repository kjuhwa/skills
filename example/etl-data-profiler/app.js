const cols=[{name:'user_id',type:'INT'},{name:'email',type:'VARCHAR'},{name:'signup_date',type:'DATE'},{name:'revenue',type:'FLOAT'},{name:'country',type:'VARCHAR'},{name:'is_active',type:'BOOL'}];
const rows=[];
const countries=['US','DE','JP','BR','KR','GB','FR'];
for(let i=0;i<40;i++){rows.push({user_id:1000+i,email:Math.random()>.12?`user${i}@mail.com`:null,signup_date:`2025-${String(Math.ceil(Math.random()*12)).padStart(2,'0')}-${String(Math.ceil(Math.random()*28)).padStart(2,'0')}`,revenue:Math.random()>.1?+(Math.random()*500).toFixed(2):null,country:countries[Math.floor(Math.random()*7)],is_active:Math.random()>.3})}

// Type list
const tl=document.getElementById('typeList');
cols.forEach(c=>{const d=document.createElement('div');d.innerHTML=`<span>${c.name}</span><span>${c.type}</span>`;tl.appendChild(d)});

// Quality donut
(function(){
  const cv=document.getElementById('qualityChart'),cx=cv.getContext('2d'),total=rows.length*cols.length;
  let nulls=0;rows.forEach(r=>cols.forEach(c=>{if(r[c.name]===null)nulls++}));
  const pct=((total-nulls)/total*100).toFixed(1);
  const ang=((total-nulls)/total)*Math.PI*2;
  cx.lineWidth=18;cx.beginPath();cx.arc(140,100,60,0,Math.PI*2);cx.strokeStyle='#333';cx.stroke();
  cx.beginPath();cx.arc(140,100,60,-Math.PI/2,-Math.PI/2+ang);cx.strokeStyle='#6ee7b7';cx.stroke();
  cx.fillStyle='#c9d1d9';cx.font='bold 22px system-ui';cx.textAlign='center';cx.fillText(pct+'%',140,106);
  cx.font='11px system-ui';cx.fillStyle='#888';cx.fillText('completeness',140,124);
})();

// Null bar chart
(function(){
  const cv=document.getElementById('nullChart'),cx=cv.getContext('2d');
  const counts=cols.map(c=>({name:c.name,n:rows.filter(r=>r[c.name]===null).length}));
  const max=Math.max(...counts.map(c=>c.n),1),bw=36,gap=10,ox=10;
  counts.forEach((c,i)=>{
    const h=(c.n/max)*130,x=ox+i*(bw+gap),y=155-h;
    cx.fillStyle=c.n>0?'#ef444488':'#6ee7b744';cx.fillRect(x,y,bw,h);
    cx.fillStyle='#888';cx.font='9px system-ui';cx.save();cx.translate(x+bw/2,170);cx.rotate(-0.5);cx.fillText(c.name,0,0);cx.restore();
    if(c.n>0){cx.fillStyle='#ef4444';cx.textAlign='center';cx.fillText(c.n,x+bw/2,y-4)}
  });
})();

// Volume sparkline
(function(){
  const cv=document.getElementById('volChart'),cx=cv.getContext('2d');
  const pts=Array.from({length:24},()=>Math.floor(Math.random()*800+200));
  cx.beginPath();cx.strokeStyle='#6ee7b7';cx.lineWidth=2;
  pts.forEach((v,i)=>{const x=10+i*(260/23),y=170-(v/1000)*150;i===0?cx.moveTo(x,y):cx.lineTo(x,y)});
  cx.stroke();cx.lineTo(270,170);cx.lineTo(10,170);cx.fillStyle='#6ee7b710';cx.fill();
  cx.fillStyle='#888';cx.font='10px system-ui';cx.fillText('24h ingestion volume',80,16);
})();

// Table preview
const tbl=document.getElementById('preview');
let html='<tr>'+cols.map(c=>`<th>${c.name}</th>`).join('')+'</tr>';
rows.slice(0,12).forEach(r=>{html+='<tr>'+cols.map(c=>{const v=r[c.name];return v===null?'<td class="null-val">NULL</td>':`<td>${v}</td>`}).join('')+'</tr>'});
tbl.innerHTML=html;