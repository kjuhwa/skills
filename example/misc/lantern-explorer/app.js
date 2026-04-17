const cv=document.getElementById('view'),ctx=cv.getContext('2d');
let W,H;
function resize(){W=cv.width=innerWidth;H=cv.height=innerHeight}
resize();addEventListener('resize',resize);

const CELL=40,COLS=40,ROWS=30;
let map,player,crystals,pools,oil,found,keys={},running=true;

function genMap(){
  const m=Array.from({length:ROWS},()=>Array(COLS).fill(1));
  // drunken-walk carve
  let cx=COLS/2|0,cy=ROWS/2|0;
  for(let i=0;i<1800;i++){
    m[cy][cx]=0;
    const d=Math.floor(Math.random()*4);
    cx=Math.max(1,Math.min(COLS-2,cx+[0,1,0,-1][d]));
    cy=Math.max(1,Math.min(ROWS-2,cy+[1,0,-1,0][d]));
  }
  return m;
}

function emptyCell(){
  while(true){
    const x=Math.floor(Math.random()*COLS),y=Math.floor(Math.random()*ROWS);
    if(map[y][x]===0)return{x,y};
  }
}

function reset(){
  map=genMap();
  const p=emptyCell();
  player={x:p.x*CELL+CELL/2,y:p.y*CELL+CELL/2};
  crystals=Array.from({length:5},()=>{const c=emptyCell();return{x:c.x*CELL+CELL/2,y:c.y*CELL+CELL/2,t:Math.random()*Math.PI*2}});
  pools=Array.from({length:4},()=>{const c=emptyCell();return{x:c.x*CELL+CELL/2,y:c.y*CELL+CELL/2}});
  oil=100;found=0;running=true;
  document.getElementById('overlay').classList.add('hidden');
}
reset();
document.getElementById('again').onclick=reset;

addEventListener('keydown',e=>keys[e.key.toLowerCase()]=true);
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

function canMove(nx,ny){
  const r=12;
  for(const[dx,dy]of[[-r,-r],[r,-r],[-r,r],[r,r]]){
    const cx=Math.floor((nx+dx)/CELL),cy=Math.floor((ny+dy)/CELL);
    if(cy<0||cx<0||cy>=ROWS||cx>=COLS||map[cy][cx]===1)return false;
  }
  return true;
}

function endGame(win){
  running=false;
  document.getElementById('end-title').textContent=win?'You found the light!':'The lantern flickers out…';
  document.getElementById('end-msg').textContent=win?`All 5 crystals recovered from the dark.`:`You found ${found} of 5 crystals.`;
  document.getElementById('overlay').classList.remove('hidden');
}

function update(){
  if(!running)return;
  let dx=0,dy=0;
  if(keys.w||keys.arrowup)dy-=2.3;
  if(keys.s||keys.arrowdown)dy+=2.3;
  if(keys.a||keys.arrowleft)dx-=2.3;
  if(keys.d||keys.arrowright)dx+=2.3;
  if(canMove(player.x+dx,player.y))player.x+=dx;
  if(canMove(player.x,player.y+dy))player.y+=dy;

  oil-=0.06;
  if(oil<=0){oil=0;endGame(false);return}

  crystals=crystals.filter(c=>{
    if(Math.hypot(c.x-player.x,c.y-player.y)<20){found++;return false}
    c.t+=0.1;return true;
  });
  pools.forEach(p=>{if(Math.hypot(p.x-player.x,p.y-player.y)<22)oil=Math.min(100,oil+0.8)});
  if(found>=5)endGame(true);
}

function draw(){
  ctx.fillStyle='#050608';ctx.fillRect(0,0,W,H);
  const camX=player.x-W/2,camY=player.y-H/2;
  const light=120+oil*1.2;

  // tiles
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    const sx=x*CELL-camX,sy=y*CELL-camY;
    if(sx<-CELL||sy<-CELL||sx>W||sy>H)continue;
    const d=Math.hypot(sx+CELL/2-W/2,sy+CELL/2-H/2);
    if(d>light+40)continue;
    const alpha=Math.max(0,1-d/light);
    if(map[y][x]===1){
      ctx.fillStyle=`rgba(40,44,58,${alpha})`;
      ctx.fillRect(sx,sy,CELL,CELL);
      ctx.strokeStyle=`rgba(60,64,78,${alpha*0.5})`;
      ctx.strokeRect(sx,sy,CELL,CELL);
    }else{
      ctx.fillStyle=`rgba(20,22,30,${alpha*0.8})`;
      ctx.fillRect(sx,sy,CELL,CELL);
    }
  }

  // pools
  pools.forEach(p=>{
    const sx=p.x-camX,sy=p.y-camY;
    const d=Math.hypot(sx-W/2,sy-H/2);if(d>light)return;
    ctx.fillStyle=`rgba(110,231,183,${0.4*(1-d/light)})`;
    ctx.beginPath();ctx.arc(sx,sy,14,0,Math.PI*2);ctx.fill();
  });

  // crystals
  crystals.forEach(c=>{
    const sx=c.x-camX,sy=c.y-camY;
    const d=Math.hypot(sx-W/2,sy-H/2);if(d>light)return;
    const pulse=1+Math.sin(c.t)*0.3;
    ctx.fillStyle='#a7f3ff';
    ctx.shadowBlur=20;ctx.shadowColor='#a7f3ff';
    ctx.beginPath();ctx.arc(sx,sy,5*pulse,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
  });

  // lantern glow
  const glow=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,light);
  glow.addColorStop(0,'rgba(255,200,100,0.15)');
  glow.addColorStop(0.6,'rgba(255,150,50,0.05)');
  glow.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=glow;
  ctx.globalCompositeOperation='screen';
  ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation='source-over';

  // player
  ctx.fillStyle='#6ee7b7';
  ctx.beginPath();ctx.arc(W/2,H/2,7,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffb938';
  ctx.shadowBlur=15;ctx.shadowColor='#ffb938';
  ctx.beginPath();ctx.arc(W/2,H/2-2,3,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;

  // dark vignette
  const vg=ctx.createRadialGradient(W/2,H/2,light*0.6,W/2,H/2,light);
  vg.addColorStop(0,'rgba(0,0,0,0)');
  vg.addColorStop(1,'rgba(5,6,8,1)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);

  document.getElementById('oil').style.width=oil+'%';
  document.getElementById('found').textContent=`${found} / 5`;
}

function loop(){update();draw();requestAnimationFrame(loop)}
loop();