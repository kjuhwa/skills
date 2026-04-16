const ids=['strat','base','cap','max','jitter'];
const jitterSpan=document.getElementById('jitterVal');

function compute(){
  const s=document.getElementById('strat').value;
  const base=+document.getElementById('base').value;
  const cap=+document.getElementById('cap').value;
  const max=+document.getElementById('max').value;
  const jPct=+document.getElementById('jitter').value;
  jitterSpan.textContent=jPct;

  const points=[];let prev=base;
  for(let i=0;i<max;i++){
    let d;
    if(s==='exp')d=base*Math.pow(2,i);
    else if(s==='lin')d=base*(i+1);
    else if(s==='fix')d=base;
    else d=Math.random()*Math.max(base,prev*3);// decorrelated
    d=Math.min(d,cap);
    const lo=d*(1-jPct/100),hi=d*(1+jPct/100);
    points.push({attempt:i+1,delay:Math.round(d),lo:Math.round(lo),hi:Math.round(hi)});
    prev=d;
  }
  drawChart(points,cap);
  drawTable(points);
}

function drawChart(pts,cap){
  const svg=document.getElementById('chart');
  const w=700,h=300,pad=50,pw=w-pad*2,ph=h-pad*2;
  const maxD=Math.max(cap,...pts.map(p=>p.hi));
  let html=`<rect width="${w}" height="${h}" fill="#0f1117"/>`;
  // grid
  for(let i=0;i<=4;i++){
    const y=pad+ph-ph*(i/4);const v=Math.round(maxD*i/4);
    html+=`<line x1="${pad}" y1="${y}" x2="${w-pad}" y2="${y}" stroke="#21262d"/>`;
    html+=`<text x="${pad-6}" y="${y+4}" fill="#484f58" font-size="10" text-anchor="end">${v}</text>`;
  }
  // jitter band
  let band=`M`;
  pts.forEach((p,i)=>{const x=pad+pw*(i/(pts.length-1||1));const y=pad+ph-ph*(p.hi/maxD);band+=(i?'L':'')+`${x},${y}`;});
  for(let i=pts.length-1;i>=0;i--){const p=pts[i];const x=pad+pw*(i/(pts.length-1||1));const y=pad+ph-ph*(p.lo/maxD);band+=`L${x},${y}`;}
  html+=`<path d="${band}Z" fill="#6ee7b722"/>`;
  // line
  let line='M';
  pts.forEach((p,i)=>{const x=pad+pw*(i/(pts.length-1||1));const y=pad+ph-ph*(p.delay/maxD);line+=(i?'L':'')+`${x},${y}`;});
  html+=`<path d="${line}" fill="none" stroke="#6ee7b7" stroke-width="2.5"/>`;
  // dots
  pts.forEach((p,i)=>{
    const x=pad+pw*(i/(pts.length-1||1));const y=pad+ph-ph*(p.delay/maxD);
    html+=`<circle cx="${x}" cy="${y}" r="5" fill="#6ee7b7"/>`;
    html+=`<text x="${x}" y="${h-pad+18}" fill="#8b949e" font-size="10" text-anchor="middle">#${p.attempt}</text>`;
  });
  html+=`<text x="${w/2}" y="${h-6}" fill="#484f58" font-size="11" text-anchor="middle">Attempt</text>`;
  html+=`<text x="12" y="${h/2}" fill="#484f58" font-size="11" text-anchor="middle" transform="rotate(-90,12,${h/2})">Delay (ms)</text>`;
  svg.innerHTML=html;
}

function drawTable(pts){
  let cumulative=0;
  let rows=pts.map(p=>{cumulative+=p.delay;return`<tr><td>${p.attempt}</td><td>${p.delay}</td><td>${p.lo}–${p.hi}</td><td>${cumulative}</td></tr>`;}).join('');
  document.getElementById('table').innerHTML=`<table><tr><th>#</th><th>Delay</th><th>Jitter Range</th><th>Cumulative</th></tr>${rows}</table>`;
}

ids.forEach(id=>document.getElementById(id).addEventListener('input',compute));
compute();