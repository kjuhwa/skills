const canvas = document.getElementById('grid');
const ctx = canvas.getContext('2d');
const COLS = 30, ROWS = 20, N = COLS * ROWS;
const CELL_W = canvas.width / COLS, CELL_H = canvas.height / ROWS;

const regions = ['NA','EU','APAC','SA'];
let users = [];
let prevStates = [];
let flipCount = 0;

function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0)/0xffffffff}

function makeUsers(){
  users = Array.from({length:N},(_,i)=>({
    id:'u_'+Math.random().toString(36).slice(2,8),
    tier: Math.random(),
    region: regions[Math.floor(Math.random()*regions.length)]
  }));
  prevStates = new Array(N).fill(false);
  flipCount = 0;
}

function evaluate(user, pct, strategy){
  if(strategy==='random') return Math.random()*100 < pct;
  if(strategy==='hash') return hash(user.id)*100 < pct;
  if(strategy==='geo'){
    const order = {NA:0,EU:25,APAC:50,SA:75};
    return order[user.region] < pct;
  }
  if(strategy==='canary') return user.tier > (1 - pct/100);
  return false;
}

function render(){
  const pct = +document.getElementById('pct').value;
  const strat = document.getElementById('strategy').value;
  document.getElementById('pctLabel').textContent = pct;
  let on=0;
  ctx.fillStyle = '#0f1117';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  users.forEach((u,i)=>{
    const enabled = evaluate(u,pct,strat);
    if(enabled !== prevStates[i]){flipCount++;prevStates[i]=enabled}
    if(enabled) on++;
    const x = (i%COLS)*CELL_W, y = Math.floor(i/COLS)*CELL_H;
    ctx.fillStyle = enabled ? '#6ee7b7' : '#2a2f3d';
    ctx.fillRect(x+1,y+1,CELL_W-2,CELL_H-2);
  });
  document.getElementById('onCount').textContent = on;
  document.getElementById('offCount').textContent = N-on;
  document.getElementById('flipCount').textContent = flipCount;
}

document.getElementById('pct').addEventListener('input', render);
document.getElementById('strategy').addEventListener('change', render);
document.getElementById('reshuffle').addEventListener('click', ()=>{makeUsers();render()});

makeUsers();
render();