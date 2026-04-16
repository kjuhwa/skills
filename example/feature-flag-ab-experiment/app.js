const TRUE_CTRL = 0.082;
const TRUE_TRT = 0.094;
const state = {c:{v:0,k:0},t:{v:0,k:0},history:[],elapsed:0,running:true};

const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');

function tick(){
  if(!state.running) return;
  const speed = +document.getElementById('speed').value;
  for(let i=0;i<speed;i++){
    if(Math.random()<0.5){state.c.v++;if(Math.random()<TRUE_CTRL) state.c.k++}
    else{state.t.v++;if(Math.random()<TRUE_TRT) state.t.k++}
  }
  state.elapsed++;
  const cr = state.c.v?state.c.k/state.c.v:0;
  const tr = state.t.v?state.t.k/state.t.v:0;
  state.history.push({cr,tr});
  if(state.history.length>200) state.history.shift();
  render();
}

function zScore(){
  const {c,t} = state;
  if(c.v<30||t.v<30) return 0;
  const p1=c.k/c.v, p2=t.k/t.v;
  const p=(c.k+t.k)/(c.v+t.v);
  const se=Math.sqrt(p*(1-p)*(1/c.v+1/t.v));
  return se===0?0:(p2-p1)/se;
}

function render(){
  const cr = state.c.v?state.c.k/state.c.v*100:0;
  const tr = state.t.v?state.t.k/state.t.v*100:0;
  document.getElementById('cRate').textContent = cr.toFixed(2);
  document.getElementById('tRate').textContent = tr.toFixed(2);
  document.getElementById('cVis').textContent = state.c.v;
  document.getElementById('tVis').textContent = state.t.v;
  document.getElementById('cConv').textContent = state.c.k;
  document.getElementById('tConv').textContent = state.t.k;
  document.getElementById('elapsed').textContent = state.elapsed;

  const z = zScore();
  const v = document.getElementById('verdict');
  v.classList.remove('significant','negative');
  if(Math.abs(z)<1.96) v.textContent = `Collecting data… z=${z.toFixed(2)} (need |z|≥1.96 for 95% confidence)`;
  else if(z>0){v.classList.add('significant');v.textContent=`✓ Treatment wins · z=${z.toFixed(2)} · lift ${((tr-cr)).toFixed(2)} pts`}
  else{v.classList.add('negative');v.textContent=`✗ Treatment worse · z=${z.toFixed(2)} · drop ${((cr-tr)).toFixed(2)} pts`}

  ctx.fillStyle='#0f1117';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#2a2f3d';ctx.lineWidth=1;
  for(let i=1;i<4;i++){const y=i*canvas.height/4;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke()}
  drawLine('#9ca3af', state.history.map(h=>h.cr));
  drawLine('#6ee7b7', state.history.map(h=>h.tr));
  ctx.fillStyle='#9ca3af';ctx.font='11px system-ui';ctx.fillText('— Control',10,16);
  ctx.fillStyle='#6ee7b7';ctx.fillText('— Treatment',80,16);
}

function drawLine(color, data){
  if(data.length<2) return;
  const max = 0.15;
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();
  data.forEach((v,i)=>{
    const x = (i/(data.length-1))*canvas.width;
    const y = canvas.height - (v/max)*canvas.height;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();
}

document.getElementById('pause').onclick = e=>{state.running=!state.running;e.target.textContent=state.running?'Pause':'Resume'};
document.getElementById('reset').onclick = ()=>{state.c={v:0,k:0};state.t={v:0,k:0};state.history=[];state.elapsed=0;render()};

setInterval(tick, 200);
render();