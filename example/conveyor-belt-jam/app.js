const svg=document.getElementById('belt');
const processedEl=document.getElementById('processed'),queueEl=document.getElementById('queue');
const arrivalEl=document.getElementById('arrival'),statusEl=document.getElementById('status'),alertStat=document.getElementById('alertStat');

const W=900,H=260,BELT_Y=130,CAP=12,BOX_W=50;
let boxes=[],processed=0,arrivalRate=1.0,arrivalTimer=0,nextId=1;

function drawStatic(){
  svg.innerHTML='';
  const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
  defs.innerHTML=`<pattern id="belt-tex" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#252836"/><line x1="0" y1="0" x2="20" y2="20" stroke="#1a1d27" stroke-width="2"/></pattern>`;
  svg.appendChild(defs);
  const belt=document.createElementNS('http://www.w3.org/2000/svg','rect');
  belt.setAttribute('x',0);belt.setAttribute('y',BELT_Y-5);belt.setAttribute('width',W-120);belt.setAttribute('height',50);belt.setAttribute('fill','url(#belt-tex)');
  svg.appendChild(belt);
  const worker=document.createElementNS('http://www.w3.org/2000/svg','g');
  worker.innerHTML=`<rect x="${W-120}" y="50" width="120" height="160" fill="#1a1d27" stroke="#6ee7b7" stroke-width="2" rx="6"/><text x="${W-60}" y="130" text-anchor="middle" fill="#6ee7b7" font-size="14" font-family="sans-serif">PROCESSOR</text><text x="${W-60}" y="150" text-anchor="middle" fill="#64748b" font-size="11" font-family="sans-serif">(click boxes)</text>`;
  svg.appendChild(worker);
}

function renderBoxes(){
  document.querySelectorAll('.box-g').forEach(e=>e.remove());
  boxes.forEach(b=>{
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.classList.add('box-g');g.style.cursor='pointer';
    const overflow=boxes.length>CAP;
    const col=overflow?'#ef4444':boxes.length>CAP*0.7?'#f59e0b':'#6ee7b7';
    g.innerHTML=`<rect x="${b.x}" y="${BELT_Y-35}" width="${BOX_W}" height="40" fill="${col}" rx="4" opacity="0.9"/><text x="${b.x+BOX_W/2}" y="${BELT_Y-12}" text-anchor="middle" fill="#0f1117" font-size="13" font-weight="700">#${b.id}</text>`;
    g.onclick=()=>{boxes=boxes.filter(x=>x.id!==b.id);processed++;update()};
    svg.appendChild(g);
  });
}

function update(){
  const q=boxes.length;
  processedEl.textContent=processed;queueEl.textContent=q;arrivalEl.textContent=arrivalRate.toFixed(1);
  alertStat.className='stat alert';
  if(q>=CAP){statusEl.textContent='JAMMED';alertStat.classList.add('jammed')}
  else if(q>=CAP*0.7){statusEl.textContent='Backpressure';alertStat.classList.add('warning')}
  else statusEl.textContent='Flowing';
  renderBoxes();
}

let last=performance.now();
function loop(t){
  const dt=(t-last)/1000;last=t;
  arrivalTimer+=dt;
  if(arrivalTimer>=1/arrivalRate){arrivalTimer=0;if(boxes.length<CAP+3)boxes.push({id:nextId++,x:-BOX_W})}
  const jammed=boxes.length>=CAP;
  const speed=jammed?8:60;
  for(let i=boxes.length-1;i>=0;i--){
    const b=boxes[i],next=boxes[i+1];
    const limit=next?next.x-BOX_W-4:W-130;
    b.x=Math.min(limit,b.x+speed*dt);
  }
  update();
  requestAnimationFrame(loop);
}

document.getElementById('reset').onclick=()=>{boxes=[];processed=0;arrivalRate=1.0;nextId=1};
document.getElementById('faster').onclick=()=>arrivalRate=Math.min(5,arrivalRate+0.5);
document.getElementById('slower').onclick=()=>arrivalRate=Math.max(0.2,arrivalRate-0.5);

drawStatic();update();requestAnimationFrame(loop);