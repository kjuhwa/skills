const queries={
  'avg(temperature)':{metric:'temperature',fn:'avg',unit:'°C'},
  'max(cpu_usage)':{metric:'cpu_usage',fn:'max',unit:'%'},
  'sum(requests)':{metric:'requests',fn:'sum',unit:'req'},
  'min(latency)':{metric:'latency',fn:'min',unit:'ms'}
};

function generateData(metric,fn,n=12){
  const now=Date.now(),rows=[];
  for(let i=n-1;i>=0;i--){
    const t=new Date(now-i*300000);
    let v;
    if(metric==='temperature')v=20+Math.sin(i/3)*5+Math.random()*3;
    else if(metric==='cpu_usage')v=40+Math.cos(i/2)*25+Math.random()*10;
    else if(metric==='requests')v=Math.floor(800+Math.sin(i)*400+Math.random()*200);
    else v=Math.floor(12+Math.random()*30+Math.sin(i/4)*10);
    rows.push({time:t.toLocaleTimeString(),value:+v.toFixed(2)});
  }
  return rows;
}

function parseQuery(q){
  const m=q.match(/(avg|max|min|sum|count)\((\w+)\)/i);
  if(!m)return{metric:'temperature',fn:'avg',unit:'°C'};
  return{metric:m[2],fn:m[1],unit:queries['avg(temperature)']?.unit||''};
}

function renderTable(rows){
  const w=document.getElementById('table-wrap');
  w.innerHTML=`<table><thead><tr><th>Time</th><th>Value</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.time}</td><td>${r.value}</td></tr>`).join('')}</tbody></table>`;
}

function renderChart(rows){
  const svg=document.getElementById('svg');
  const w=400,h=200,pad=30;
  const vals=rows.map(r=>r.value),mn=Math.min(...vals),mx=Math.max(...vals),rng=mx-mn||1;
  const pts=rows.map((r,i)=>{
    const x=pad+i*(w-pad*2)/(rows.length-1);
    const y=h-pad-(r.value-mn)/rng*(h-pad*2);
    return`${x},${y}`;
  });
  svg.innerHTML=`
    <rect width="${w}" height="${h}" fill="#1a1d27" rx="4"/>
    ${[0,.25,.5,.75,1].map(f=>`<line x1="${pad}" x2="${w-pad}" y1="${pad+f*(h-pad*2)}" y2="${pad+f*(h-pad*2)}" stroke="#ffffff08"/><text x="2" y="${pad+f*(h-pad*2)+4}" fill="#64748b" font-size="8">${(mx-f*rng).toFixed(1)}</text>`).join('')}
    <polyline points="${pts.join(' ')}" fill="none" stroke="#6ee7b7" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="${pts.join(' ')} ${w-pad},${h-pad} ${pad},${h-pad}" fill="#6ee7b715"/>
    ${pts.map((p,i)=>`<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="3" fill="#6ee7b7"><title>${rows[i].time}: ${rows[i].value}</title></circle>`).join('')}`;
}

function run(){
  const q=document.getElementById('query').value;
  const{metric,fn}=parseQuery(q);
  const t0=performance.now();
  const rows=generateData(metric,fn);
  const elapsed=(performance.now()-t0).toFixed(1);
  renderTable(rows);renderChart(rows);
  document.getElementById('info-text').textContent=`${rows.length} rows returned in ${elapsed}ms | fn=${fn} metric=${metric}`;
}

document.getElementById('run').onclick=run;
document.getElementById('query').addEventListener('keydown',e=>{if(e.ctrlKey&&e.key==='Enter')run()});
run();