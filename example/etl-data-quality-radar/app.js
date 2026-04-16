const datasets={
  sales:{
    rows:1240,
    scores:{Completeness:92,Uniqueness:88,Validity:76,Consistency:81,Timeliness:95,Accuracy:84},
    issues:['3 rows missing customer_id','7 duplicate order_id detected','12 prices <= 0','date_format mismatch: 2026/04 vs 2026-04']
  },
  users:{
    rows:8420,
    scores:{Completeness:68,Uniqueness:99,Validity:72,Consistency:55,Timeliness:40,Accuracy:70},
    issues:['1204 rows missing phone','email_verified null for 890 users','last_login stale > 90d for 412','country codes mixed (US vs USA)']
  },
  events:{
    rows:52100,
    scores:{Completeness:99,Uniqueness:94,Validity:91,Consistency:88,Timeliness:99,Accuracy:96},
    issues:['24 duplicate event_ids in 10s window','session_id null for 31 events','malformed user_agent: 8 rows']
  }
};

const svg=document.getElementById('radar');
const metricsUl=document.getElementById('metrics');
const issuesUl=document.getElementById('issues');
const scoreEl=document.getElementById('score');
const gradeEl=document.getElementById('grade');

function grade(v){return v>=90?'A':v>=80?'B':v>=70?'C':v>=60?'D':'F';}
function cls(v){return v>=85?'good':v>=70?'warn':'bad';}

function draw(key){
  const d=datasets[key];
  const keys=Object.keys(d.scores);
  const cx=200,cy=200,R=150;
  const N=keys.length;
  let html='';
  for(let lvl=1;lvl<=5;lvl++){
    let pts='';
    for(let i=0;i<N;i++){
      const a=-Math.PI/2 + i*2*Math.PI/N;
      const r=R*lvl/5;
      pts+=`${cx+Math.cos(a)*r},${cy+Math.sin(a)*r} `;
    }
    html+=`<polygon class="grid" points="${pts}"/>`;
  }
  for(let i=0;i<N;i++){
    const a=-Math.PI/2 + i*2*Math.PI/N;
    html+=`<line class="axis" x1="${cx}" y1="${cy}" x2="${cx+Math.cos(a)*R}" y2="${cy+Math.sin(a)*R}"/>`;
    const lx=cx+Math.cos(a)*(R+22),ly=cy+Math.sin(a)*(R+22);
    html+=`<text class="label" x="${lx}" y="${ly}" text-anchor="middle" dy="4">${keys[i]}</text>`;
  }
  let pts='';let dots='';
  keys.forEach((k,i)=>{
    const a=-Math.PI/2 + i*2*Math.PI/N;
    const r=R*(d.scores[k]/100);
    const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
    pts+=`${x},${y} `;
    dots+=`<circle class="dot" cx="${x}" cy="${y}" r="4"/>`;
  });
  html+=`<polygon class="shape" points="${pts}"/>${dots}`;
  svg.innerHTML=html;

  metricsUl.innerHTML='';
  let total=0;
  keys.forEach(k=>{
    const v=d.scores[k];total+=v;
    const li=document.createElement('li');
    li.innerHTML=`<span>${k}</span><span class="pct ${cls(v)}">${v}% ${grade(v)}</span>`;
    metricsUl.appendChild(li);
  });
  const avg=Math.round(total/keys.length);
  scoreEl.textContent=avg;
  scoreEl.className='score '+cls(avg);
  gradeEl.textContent=`Quality · Grade ${grade(avg)} · ${d.rows.toLocaleString()} rows`;

  issuesUl.innerHTML='';
  d.issues.forEach(i=>{
    const li=document.createElement('li');li.textContent='• '+i;issuesUl.appendChild(li);
  });
}

document.getElementById('dataset').addEventListener('change',e=>draw(e.target.value));
document.getElementById('rescan').addEventListener('click',()=>{
  const key=document.getElementById('dataset').value;
  const d=datasets[key];
  Object.keys(d.scores).forEach(k=>{
    d.scores[k]=Math.max(30,Math.min(99,d.scores[k]+Math.round((Math.random()-0.5)*10)));
  });
  draw(key);
});

draw('sales');