const views = [
  {name:'mv_daily_sales', sla:60, rows:'1.2K'},
  {name:'mv_user_ltv', sla:300, rows:'82K'},
  {name:'mv_inventory_snap', sla:30, rows:'450K'},
  {name:'mv_region_kpi', sla:120, rows:'48'},
  {name:'mv_funnel_daily', sla:600, rows:'90'},
  {name:'mv_fraud_score', sla:15, rows:'12M'},
  {name:'mv_search_index', sla:180, rows:'6.4M'},
  {name:'mv_top_products', sla:240, rows:'500'}
].map(v=>({...v, lastRefresh: Date.now() - Math.random()*v.sla*1000*1.5}));

const history = Array(120).fill(0);
let paused = false;

function render(){
  const grid = document.getElementById('grid');
  grid.innerHTML = views.map((v,i)=>{
    const age = Math.floor((Date.now() - v.lastRefresh)/1000);
    const ratio = Math.min(age/v.sla, 1.5);
    const state = ratio < 0.7 ? 'fresh' : ratio < 1 ? 'warn' : 'stale';
    const pct = Math.min(ratio*100, 100);
    return `<div class="tile ${state}" data-i="${i}">
      <div class="pulse"></div>
      <div class="sla">SLA ${v.sla}s</div>
      <h3>${v.name}</h3>
      <div class="meta">${v.rows} rows</div>
      <div class="age">${age}s</div>
      <div class="bar"><span style="width:${pct}%"></span></div>
    </div>`;
  }).join('');
  grid.querySelectorAll('.tile').forEach(el=>{
    el.onclick = ()=>refresh(+el.dataset.i);
  });
}

function refresh(i){
  views[i].lastRefresh = Date.now();
  const el = document.querySelector(`[data-i="${i}"]`);
  if(el){ el.classList.add('refreshing'); setTimeout(()=>el.classList.remove('refreshing'),800); }
  render();
}

document.getElementById('refreshAll').onclick = ()=>views.forEach((_,i)=>refresh(i));
document.getElementById('pause').onchange = e=>paused = e.target.checked;

const ctx = document.getElementById('chart').getContext('2d');
function drawChart(){
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = '#11141c'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = '#252935'; ctx.lineWidth = 1;
  for(let y=0;y<h;y+=28){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
  const max = Math.max(...history, 10);
  ctx.strokeStyle = '#6ee7b7'; ctx.lineWidth = 2; ctx.beginPath();
  history.forEach((v,i)=>{
    const x = (i/history.length)*w;
    const y = h - (v/max)*h*0.9 - 5;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();
  ctx.fillStyle = 'rgba(110,231,183,.15)';
  ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6ee7b7'; ctx.font = '11px ui-monospace';
  ctx.fillText(`avg stale: ${history[history.length-1].toFixed(1)}s`, 10, 16);
}

setInterval(()=>{
  document.getElementById('clock').textContent = new Date().toLocaleTimeString();
  if(paused) return;
  const avg = views.reduce((s,v)=>s + (Date.now()-v.lastRefresh)/1000, 0)/views.length;
  history.push(avg); history.shift();
  if(Math.random() < 0.15){
    const i = Math.floor(Math.random()*views.length);
    views[i].lastRefresh -= 5000;
  }
  render(); drawChart();
}, 1000);

render(); drawChart();