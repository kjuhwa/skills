const SERVICES = ['api-gateway','auth-svc','user-svc','order-svc','payment-svc','inventory-svc','notification-svc','cache-layer'];
const COLORS = ['#6ee7b7','#f472b6','#60a5fa','#fbbf24','#a78bfa','#fb923c','#34d399','#f87171'];

function uid() { return Math.random().toString(16).slice(2,10); }

function generateTrace() {
  const spans = [];
  const total = 80 + Math.random()*220;
  function addSpan(parent, start, depth) {
    if(depth > 4) return;
    const svc = SERVICES[Math.floor(Math.random()*SERVICES.length)];
    const dur = 5 + Math.random()*(total - start)*0.5;
    const id = uid();
    spans.push({ id, parent, service: svc, start, duration: Math.min(dur, total-start), depth, color: COLORS[SERVICES.indexOf(svc)] });
    const kids = depth===0 ? 3 : Math.floor(Math.random()*3);
    let offset = start + 1 + Math.random()*5;
    for(let i=0;i<kids;i++) {
      addSpan(id, offset, depth+1);
      offset += 5 + Math.random()*20;
    }
  }
  addSpan(null, 0, 0);
  return { traceId: uid()+uid(), spans, total };
}

function render(trace) {
  const wf = document.getElementById('waterfall');
  const tip = document.getElementById('tooltip');
  document.getElementById('traceId').textContent = 'trace:' + trace.traceId;
  wf.innerHTML = '';
  const axis = document.createElement('div');
  axis.className = 'time-axis';
  for(let i=0;i<=4;i++) { const s=document.createElement('span'); s.textContent=Math.round(trace.total/4*i)+'ms'; axis.appendChild(s); }
  wf.appendChild(axis);
  trace.spans.sort((a,b)=>a.start-b.start).forEach(sp => {
    const row = document.createElement('div');
    row.className = 'span-row';
    const lbl = document.createElement('div');
    lbl.className = 'span-label';
    lbl.style.paddingLeft = sp.depth*12+'px';
    lbl.textContent = sp.service;
    const track = document.createElement('div');
    track.className = 'span-track';
    const bar = document.createElement('div');
    bar.className = 'span-bar';
    bar.style.left = (sp.start/trace.total*100)+'%';
    bar.style.width = (sp.duration/trace.total*100)+'%';
    bar.style.background = sp.color;
    bar.addEventListener('mouseenter', e => {
      tip.classList.remove('hidden');
      tip.innerHTML = `<strong>${sp.service}</strong><br>Start: ${sp.start.toFixed(1)}ms<br>Duration: ${sp.duration.toFixed(1)}ms<br>ID: ${sp.id}`;
    });
    bar.addEventListener('mousemove', e => { tip.style.left=e.clientX+12+'px'; tip.style.top=e.clientY-10+'px'; });
    bar.addEventListener('mouseleave', ()=> tip.classList.add('hidden'));
    track.appendChild(bar);
    row.appendChild(lbl);
    row.appendChild(track);
    wf.appendChild(row);
  });
}

document.getElementById('btnGenerate').addEventListener('click', ()=> render(generateTrace()));
render(generateTrace());