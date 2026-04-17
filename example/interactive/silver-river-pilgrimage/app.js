const map=document.getElementById('map');
const ctx=map.getContext('2d');
const W=map.width,H=map.height;
const HEX=38;
const COLS=12,ROWS=10;

const CONS=['Hollow Lantern','Vesper Moth','Drowned Bridge','Silver Reed','Moss Crown','Ember Doe','Twilight Weir','Bloom Shepherd'];
const state={turn:1,ink:9,oil:12,rep:0,player:{q:1,r:1},grid:[],events:[]};

function hexToPx(q,r){
  const x=60+q*HEX*1.5;
  const y=50+r*HEX*1.8+(q%2?HEX*.9:0);
  return[x,y];
}
function pxToHex(x,y){
  let best=null,bd=1e9;
  for(let q=0;q<COLS;q++)for(let r=0;r<ROWS;r++){
    const[hx,hy]=hexToPx(q,r);
    const d=(hx-x)**2+(hy-y)**2;
    if(d<bd){bd=d;best={q,r};}
  }
  return bd<HEX*HEX?best:null;
}
function neighbors(q,r){
  const odd=q%2;
  return[[q+1,r+(odd?0:-1)],[q+1,r+(odd?1:0)],[q-1,r+(odd?0:-1)],[q-1,r+(odd?1:0)],[q,r-1],[q,r+1]]
    .filter(([a,b])=>a>=0&&a<COLS&&b>=0&&b<ROWS);
}

function genMap(){
  state.grid=[];state.events=[];
  for(let q=0;q<COLS;q++){
    state.grid[q]=[];
    for(let r=0;r<ROWS;r++){
      const t=Math.random();
      let kind='meadow';
      if(t<0.10)kind='ruin';
      else if(t<0.20)kind='river';
      else if(t<0.28)kind='bloom';
      state.grid[q][r]={kind,visited:false,sketched:false,stars:Math.floor(Math.random()*5)+2};
    }
  }
  state.grid[state.player.q][state.player.r].visited=true;
  journal('Pilgrimage begins: moss-draped ruins ahead, silver rivers murmur softly.','good');
}

function draw(){
  ctx.clearRect(0,0,W,H);
  for(let q=0;q<COLS;q++)for(let r=0;r<ROWS;r++){
    const[x,y]=hexToPx(q,r);
    const t=state.grid[q][r];
    const isPlayer=state.player.q==q&&state.player.r==r;
    const adj=neighbors(state.player.q,state.player.r).some(([a,b])=>a==q&&b==r);
    hexPath(x,y);
    if(!t.visited&&!adj){ctx.fillStyle='#12151c';ctx.fill();ctx.strokeStyle='#1e2330';ctx.stroke();continue;}
    const col={meadow:'#1d2a24',ruin:'#2a2f3d',river:'#263548',bloom:'#2b1f33'}[t.kind];
    ctx.fillStyle=col;ctx.fill();
    ctx.strokeStyle=adj&&!isPlayer?'#6ee7b755':'#2a3244';
    ctx.lineWidth=adj?2:1;ctx.stroke();
    // feature icons
    ctx.fillStyle='#e6ecf5';ctx.font='10px ui-monospace';
    if(t.kind==='ruin'){ctx.fillStyle='#7c8aa4';ctx.fillText('⌂',x-4,y+4);}
    else if(t.kind==='river'){ctx.fillStyle='#c8d4ea';ctx.fillText('~',x-3,y+3);}
    else if(t.kind==='bloom'){ctx.fillStyle='#b089c7';ctx.fillText('✿',x-5,y+4);}
    if(t.sketched){ctx.fillStyle='#6ee7b7';ctx.fillText('★',x+8,y-8);}
    if(t.visited&&!isPlayer){ctx.fillStyle='#6ee7b733';ctx.beginPath();ctx.arc(x,y,3,0,7);ctx.fill();}
    if(isPlayer){
      // lantern glow
      const g=ctx.createRadialGradient(x,y,4,x,y,HEX);
      g.addColorStop(0,'#f4c27599');g.addColorStop(1,'#f4c27500');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,HEX,0,7);ctx.fill();
      ctx.fillStyle='#f4c275';ctx.beginPath();ctx.arc(x,y,6,0,7);ctx.fill();
    }
  }
}
function hexPath(x,y){
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a=Math.PI/3*i+Math.PI/6;
    const px=x+HEX*.9*Math.cos(a),py=y+HEX*.9*Math.sin(a);
    if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);
  }
  ctx.closePath();
}

function journal(msg,cls){
  const ol=document.getElementById('journal');
  const li=document.createElement('li');
  li.textContent=`T${state.turn}: ${msg}`;
  if(cls)li.className=cls;
  ol.insertBefore(li,ol.firstChild);
  state.events.push({turn:state.turn,msg});
}

function move(q,r){
  if(state.oil<=0){journal('lantern oil gone — pilgrimage ends.','warn');return;}
  const adj=neighbors(state.player.q,state.player.r).some(([a,b])=>a==q&&b==r);
  if(!adj)return;
  state.player={q,r};
  state.oil--;state.turn++;
  const t=state.grid[q][r];
  if(!t.visited){
    t.visited=true;
    if(t.kind==='ruin'){state.ink++;journal('moss-draped ruin — salvaged ink from a forgotten well.','good');}
    else if(t.kind==='river'){state.oil++;journal('silver river murmurs — refill oil by the bank.','good');}
    else if(t.kind==='bloom'){state.rep++;journal('twilight meadow bloom — reputation +1.','bloom');}
    else journal('wandered into soft meadow grass.');
  } else journal('retread old ground.');
  if(state.turn%7===0)triggerBloom();
  update();
}

function triggerBloom(){
  const q=Math.floor(Math.random()*COLS),r=Math.floor(Math.random()*ROWS);
  state.grid[q][r].kind='bloom';
  journal(`a new bloom opens at (${q},${r}) — meadow softly brightens.`,'bloom');
}

function sketch(){
  const t=state.grid[state.player.q][state.player.r];
  if(t.sketched){journal('already sketched here.','warn');return;}
  if(state.ink<2){journal('not enough ink to chart a constellation.','warn');return;}
  state.ink-=2;t.sketched=true;
  const name=CONS[Math.floor(Math.random()*CONS.length)];
  const gain=t.stars;
  state.rep+=gain;state.turn++;state.oil--;
  journal(`charted "${name}" — ${t.stars} stars traced, rep +${gain}.`,'good');
  update();
}

function rest(){
  if(state.grid[state.player.q][state.player.r].kind!=='river'){journal('must rest beside a silver river.','warn');return;}
  state.oil=Math.min(state.oil+3,20);state.ink=Math.min(state.ink+1,15);state.turn++;
  journal('rested beside the river — oil +3, ink +1.','good');
  update();
}

function update(){
  document.getElementById('turn').textContent=state.turn;
  document.getElementById('ink').textContent=state.ink;
  document.getElementById('oil').textContent=state.oil;
  document.getElementById('rep').textContent=state.rep;
  draw();
}

map.addEventListener('click',e=>{
  const r=map.getBoundingClientRect();
  const x=(e.clientX-r.left)/r.width*W;
  const y=(e.clientY-r.top)/r.height*H;
  const h=pxToHex(x,y);if(h)move(h.q,h.r);
});
document.getElementById('sketch').onclick=sketch;
document.getElementById('rest').onclick=rest;
document.getElementById('reseed').onclick=()=>{
  state.turn=1;state.ink=9;state.oil=12;state.rep=0;state.player={q:1,r:1};
  document.getElementById('journal').innerHTML='';
  genMap();update();
};
window.addEventListener('keydown',e=>{
  if(e.key==='s'||e.key==='S')sketch();
  if(e.key==='r'||e.key==='R')rest();
});

genMap();update();