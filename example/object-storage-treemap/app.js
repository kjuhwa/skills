const accentPalette=['#6ee7b7','#7dd3fc','#fbbf24','#f87171','#c084fc','#fb923c'];
const data=[
  {bucket:'user-uploads',objects:[{key:'avatar.png',size:240},{key:'banner.jpg',size:1800},{key:'resume.pdf',size:420},{key:'photo_001.heic',size:3200},{key:'scan.pdf',size:890}]},
  {bucket:'backups',objects:[{key:'db-2026-04.sql.gz',size:14200},{key:'db-2026-03.sql.gz',size:13800},{key:'config.tar',size:320},{key:'env-snapshot.json',size:18}]},
  {bucket:'logs',objects:[{key:'access-04.log',size:9400},{key:'error-04.log',size:2100},{key:'audit.log',size:5800},{key:'cron.log',size:740}]},
  {bucket:'media',objects:[{key:'intro.mp4',size:48000},{key:'demo.webm',size:22000},{key:'thumbnail.png',size:85},{key:'podcast-ep12.mp3',size:38000}]},
  {bucket:'static-assets',objects:[{key:'bundle.js',size:320},{key:'style.css',size:45},{key:'favicon.ico',size:4},{key:'fonts.woff2',size:180},{key:'logo.svg',size:12}]}
];

const container=document.getElementById('container');
const tooltip=document.getElementById('tooltip');
const breadcrumb=document.getElementById('breadcrumb');
let currentView='root';

function fmt(kb){return kb>=1024?`${(kb/1024).toFixed(1)} MB`:`${kb} KB`}

function renderRoot(){
  currentView='root';breadcrumb.textContent='All Buckets';
  container.innerHTML='';
  const total=data.reduce((s,b)=>s+b.objects.reduce((a,o)=>a+o.size,0),0);
  container.style.gridTemplateColumns=data.map(b=>{
    const w=b.objects.reduce((a,o)=>a+o.size,0)/total;return`${Math.max(w*100,10)}fr`}).join(' ');
  container.style.gridTemplateRows='1fr';
  data.forEach((b,i)=>{
    const bSize=b.objects.reduce((a,o)=>a+o.size,0);
    const cell=document.createElement('div');cell.className='cell';
    cell.innerHTML=`<div class="name">${b.bucket}</div><div class="size">${fmt(bSize)} · ${b.objects.length} objects</div><div class="bar" style="width:${(bSize/total*100).toFixed(1)}%;background:${accentPalette[i]}"></div>`;
    cell.style.borderLeft=`3px solid ${accentPalette[i]}`;
    cell.onclick=()=>renderBucket(i);
    cell.onmouseenter=e=>showTip(e,`<b>${b.bucket}</b><br>${b.objects.length} objects<br>${fmt(bSize)} total`);
    cell.onmouseleave=hideTip;
    container.appendChild(cell);
  });
}

function renderBucket(idx){
  currentView='bucket';const b=data[idx];
  breadcrumb.innerHTML=`<span style="cursor:pointer;color:#6ee7b7" id="back">All Buckets</span> / ${b.bucket}`;
  document.getElementById('back').onclick=renderRoot;
  container.innerHTML='';
  const total=b.objects.reduce((a,o)=>a+o.size,0);
  const cols=Math.ceil(Math.sqrt(b.objects.length));
  container.style.gridTemplateColumns=`repeat(${cols},1fr)`;container.style.gridTemplateRows='';
  b.objects.forEach((o,j)=>{
    const cell=document.createElement('div');cell.className='cell';
    const pct=(o.size/total*100).toFixed(1);
    cell.innerHTML=`<div class="name">${o.key}</div><div class="size">${fmt(o.size)} (${pct}%)</div><div class="bar" style="width:${pct}%;background:${accentPalette[idx]}"></div>`;
    cell.style.minHeight='80px';
    cell.onmouseenter=e=>showTip(e,`<b>${o.key}</b><br>${fmt(o.size)}<br>${pct}% of bucket`);
    cell.onmouseleave=hideTip;
    container.appendChild(cell);
  });
}

function showTip(e,html){tooltip.innerHTML=html;tooltip.style.display='block';tooltip.style.left=e.clientX+12+'px';tooltip.style.top=e.clientY+12+'px'}
function hideTip(){tooltip.style.display='none'}
document.addEventListener('mousemove',e=>{if(tooltip.style.display==='block'){tooltip.style.left=e.clientX+12+'px';tooltip.style.top=e.clientY+12+'px'}});
renderRoot();