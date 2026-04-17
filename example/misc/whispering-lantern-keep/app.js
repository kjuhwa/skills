// Whispering Lantern Keep — deterministic seeded puzzle.
// Uses `circuit-breaker-data-simulation` pattern: shadow propagation is a state
// machine (clean → whispered → shadow) with thresholds that trip when a region
// loses illumination, much like closed/half-open/open transitions.
const N = 10;
const boardEl = document.getElementById('board');
const turnEl = document.getElementById('turn');
const litEl = document.getElementById('lit');
const shadowEl = document.getElementById('shadow');
const seedEl = document.getElementById('seed');
const statusEl = document.getElementById('status');
const nPulseEl = document.getElementById('nPulse');
const nWardenEl = document.getElementById('nWarden');
const nBeaconEl = document.getElementById('nBeacon');

const LANTERN = {
  pulse:  { radius:1, decay:3, unlimited:true },
  warden: { radius:2, decay:1, stock:3 },
  beacon: { radius:3, decay:99, stock:1, oneShot:true }
};

let state, history = [], tool = 'pulse', seed = 0;

function rand(s){ let x=Math.sin(s)*10000; return x-Math.floor(x); }

function fresh(s){
  seed = s;
  seedEl.textContent = '#'+String(s).padStart(4,'0');
  const cells = Array.from({length:N*N},()=>({
    shadow:false, lit:0, lantern:null
  }));
  // seeded shadow pockets
  for(let i=0;i<12;i++){
    const k = Math.floor(rand(s*31+i)*N*N);
    cells[k].shadow = true;
  }
  state = {
    cells, turn:0,
    stock:{pulse:Infinity,warden:3,beacon:1},
    done:false
  };
  history = [];
  tool = 'pulse';
  updateTools();
  render();
}

function cloneState(){
  return {
    cells: state.cells.map(c=>({...c})),
    turn: state.turn,
    stock: {...state.stock},
    done: state.done
  };
}

function neighbors(i){
  const r = i/N|0, c = i%N;
  const out = [];
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
    if(!dr&&!dc) continue;
    const nr=r+dr, nc=c+dc;
    if(nr>=0&&nr<N&&nc>=0&&nc<N) out.push(nr*N+nc);
  }
  return out;
}

function radiusCells(i, radius){
  const r = i/N|0, c = i%N;
  const out=[i];
  for(let dr=-radius;dr<=radius;dr++)for(let dc=-radius;dc<=radius;dc++){
    if(!dr&&!dc) continue;
    if(Math.abs(dr)+Math.abs(dc) > radius+1) continue;
    const nr=r+dr, nc=c+dc;
    if(nr>=0&&nr<N&&nc>=0&&nc<N) out.push(nr*N+nc);
  }
  return out;
}

function recomputeLight(){
  state.cells.forEach(c=>c.lit=0);
  state.cells.forEach((c,i)=>{
    if(!c.lantern) return;
    const spec = LANTERN[c.lantern.kind];
    radiusCells(i, spec.radius).forEach(j=> state.cells[j].lit++);
  });
}

function place(i){
  if(state.done) return;
  const c = state.cells[i];
  if(c.lantern || c.shadow) { flash('blocked'); return; }
  if(state.stock[tool]<=0){ flash('out of stock'); return; }
  history.push(cloneState());
  c.lantern = { kind:tool, life:LANTERN[tool].decay };
  if(state.stock[tool]!==Infinity) state.stock[tool]--;
  recomputeLight();
  render();
}

function endTurn(){
  if(state.done) return;
  history.push(cloneState());
  state.turn++;
  // decay lanterns
  state.cells.forEach(c=>{
    if(c.lantern){
      c.lantern.life--;
      if(c.lantern.life<=0) c.lantern=null;
    }
  });
  recomputeLight();
  // shadow propagation — circuit breaker style state transition
  const spread=[];
  state.cells.forEach((c,i)=>{
    if(c.shadow) return;
    if(c.lit>0) return;
    const shadowNeighbors = neighbors(i).filter(j=>state.cells[j].shadow).length;
    if(shadowNeighbors>=2) spread.push(i);
  });
  spread.forEach(i=> state.cells[i].shadow = true);
  checkEnd();
  render();
}

function checkEnd(){
  const shadow = state.cells.filter(c=>c.shadow).length;
  if(shadow===0){ state.done=true; statusEl.textContent='Keep reclaimed. Shadow banished.'; statusEl.className='status win'; }
  else if(state.turn>=20){ state.done=true; statusEl.textContent='Dawn broke — shadow endured.'; statusEl.className='status lose'; }
  else if(shadow>80){ state.done=true; statusEl.textContent='Keep consumed.'; statusEl.className='status lose'; }
}

function undo(){
  if(!history.length) return;
  state = history.pop();
  recomputeLight();
  render();
}

function flash(msg){ statusEl.textContent = msg; statusEl.className='status'; }

function updateTools(){
  document.querySelectorAll('.tool').forEach(b=>{
    const k = b.dataset.kind;
    b.disabled = state.stock[k]<=0;
    b.classList.toggle('active', k===tool);
  });
  nPulseEl.textContent = state.stock.pulse===Infinity?'∞':state.stock.pulse;
  nWardenEl.textContent = state.stock.warden;
  nBeaconEl.textContent = state.stock.beacon;
}

function render(){
  boardEl.innerHTML='';
  state.cells.forEach((c,i)=>{
    const el = document.createElement('div');
    el.className = 'cell';
    if(c.shadow) el.classList.add('shadow');
    if(c.lit>0 && !c.shadow) el.classList.add('lit');
    if(c.lantern){
      el.classList.add('lantern', c.lantern.kind);
      if(c.lantern.life===1) el.classList.add('dying');
      el.title = `${c.lantern.kind} · life ${c.lantern.life}`;
    }
    el.addEventListener('click', ()=>place(i));
    boardEl.appendChild(el);
  });
  turnEl.textContent = state.turn;
  litEl.textContent = state.cells.filter(c=>c.lit>0).length;
  shadowEl.textContent = state.cells.filter(c=>c.shadow).length;
  updateTools();
  if(!state.done){ statusEl.className='status'; }
}

document.querySelectorAll('.tool').forEach(b=>{
  b.addEventListener('click', ()=>{
    if(b.disabled) return;
    tool = b.dataset.kind;
    updateTools();
  });
});
document.getElementById('end').addEventListener('click', endTurn);
document.getElementById('undo').addEventListener('click', undo);
document.getElementById('reset').addEventListener('click', ()=> fresh(Math.floor(Math.random()*9999)));
document.addEventListener('keydown', e=>{
  if(e.code==='Space'){ endTurn(); e.preventDefault(); }
  if(e.key==='z') undo();
  if(e.key==='n') fresh(Math.floor(Math.random()*9999));
  if(e.key==='1') { tool='pulse'; updateTools(); }
  if(e.key==='2' && state.stock.warden>0) { tool='warden'; updateTools(); }
  if(e.key==='3' && state.stock.beacon>0) { tool='beacon'; updateTools(); }
});

fresh(Math.floor(Math.random()*9999));