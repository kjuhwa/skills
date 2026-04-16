const canvas=document.getElementById('galaxy'),ctx=canvas.getContext('2d');
const buckets=['images','backups','logs','videos','documents'];
const colors=['#6ee7b7','#7dd3fc','#fbbf24','#f87171','#c084fc'];
let W,H,objects=[],mouse={x:-1,y:-1},hovered=null;

function resize(){W=canvas.width=innerWidth;H=canvas.height=innerHeight}
window.addEventListener('resize',resize);resize();

function rand(a,b){return Math.random()*(b-a)+a}
const exts=['png','jpg','mp4','log','sql','tar.gz','pdf','csv'];

for(let b=0;b<buckets.length;b++){
  const cx=W*(0.2+b*0.15),cy=H*0.5,n=12+Math.floor(Math.random()*10);
  for(let i=0;i<n;i++){
    const angle=rand(0,Math.PI*2),dist=rand(30,140);
    objects.push({
      x:cx+Math.cos(angle)*dist,y:cy+Math.sin(angle)*dist,
      r:rand(2,5),bucket:b,phase:rand(0,6.28),speed:rand(0.003,0.01),
      name:`${buckets[b]}/${['file','data','obj','asset'][b%4]}_${i}.${exts[Math.floor(rand(0,exts.length))]}`,
      size:Math.floor(rand(1,9999)),date:`2026-0${Math.floor(rand(1,5))}-${String(Math.floor(rand(1,29))).padStart(2,'0')}`,
      cx,cy,angle,dist
    });
  }
}

canvas.addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY});
canvas.addEventListener('mouseleave',()=>{mouse.x=-1;mouse.y=-1});

function draw(t){
  ctx.fillStyle='rgba(15,17,23,0.15)';ctx.fillRect(0,0,W,H);
  hovered=null;let minD=30;
  objects.forEach(o=>{
    o.angle+=o.speed;
    o.x=o.cx+Math.cos(o.angle)*o.dist;
    o.y=o.cy+Math.sin(o.angle)*o.dist;
    const pulse=1+0.3*Math.sin(t*0.002+o.phase);
    const dx=mouse.x-o.x,dy=mouse.y-o.y,d=Math.sqrt(dx*dx+dy*dy);
    if(d<minD){minD=d;hovered=o}
    ctx.beginPath();ctx.arc(o.x,o.y,o.r*pulse,0,6.28);
    ctx.fillStyle=colors[o.bucket];ctx.globalAlpha=d<30?1:0.7;ctx.fill();
    ctx.globalAlpha=0.15;ctx.arc(o.x,o.y,o.r*pulse+4,0,6.28);ctx.fill();
    ctx.globalAlpha=1;
  });
  const info=document.getElementById('hover-info');
  const det=document.getElementById('details');
  if(hovered){
    info.textContent='Object found:';
    det.innerHTML=`<span>Key:</span> ${hovered.name}<br><span>Size:</span> ${hovered.size} KB<br><span>Modified:</span> ${hovered.date}<br><span>Bucket:</span> ${buckets[hovered.bucket]}`;
  }else{info.textContent='Hover over a star to inspect an object';det.innerHTML=''}
  document.getElementById('stats').textContent=`${objects.length} objects across ${buckets.length} buckets`;
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);