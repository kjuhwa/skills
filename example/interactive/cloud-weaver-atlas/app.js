const $ = s => document.querySelector(s);
const cvs = $('#stage'), ctx = cvs.getContext('2d');
let W=0,H=0,dpr=Math.max(1,devicePixelRatio||1);
function resize(){const r=cvs.getBoundingClientRect();W=r.width;H=r.height;cvs.width=W*dpr;cvs.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
addEventListener('resize',resize);resize();

// fnv1a-xorshift-text-to-procedural-seed
function fnv1a(s){let h=2166136261>>>0;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h;}
function xorshift(seed){let x=seed||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1e9)/1e9;};}
let rnd=xorshift(fnv1a($('#seed').value));

// Incommensurate sines for organic flicker
const phi=1.6180339887, pi=Math.PI;
function flicker(t,base){return Math.sin(t*base)*0.5+Math.sin(t*base*phi)*0.3+Math.sin(t*base*0.37)*0.2;}

// Entities
let storms=[],giants=[],flowers=[],stars=[],strands=[],loomNodes=[];
function rebuild(){
  rnd=xorshift(fnv1a($('#seed').value));
  storms=Array.from({length:9},()=>({x:rnd()*W,y:60+rnd()*(H*0.45),r:40+rnd()*60,state:['gather','spin','discharge','rest'][(rnd()*4)|0],charge:rnd(),hue:210+rnd()*40,bolts:[]}));
  giants=Array.from({length:5},()=>({x:rnd()*W,base:H-80-rnd()*60,w:140+rnd()*180,h:180+rnd()*140,hue:260+rnd()*40,dream:rnd()}));
  flowers=Array.from({length:120},()=>({x:rnd()*W,y:H-40-rnd()*50,ph:rnd()*pi*2,hue:300+rnd()*40,k:rnd()}));
  stars=Array.from({length:220},()=>{const a=rnd()*pi*2,r=60+rnd()*Math.min(W,H)*0.35;return{x:W/2+Math.cos(a)*r,y:H*0.3+Math.sin(a)*r*0.6,mag:rnd(),tw:rnd()};});
  strands=Array.from({length:40},()=>({a:rnd()*pi*2,life:rnd(),hue:190+rnd()*60,dst:rnd()}));
  loomNodes=storms.slice(0,6).map((s,i)=>({x:s.x,y:s.y,kind:'storm',idx:i,r:10,id:'loom-'+i}));
}
rebuild();

// Interaction: canvas-svg-dual-layer-hit-dispatch emulated via canvas hit-test
cvs.addEventListener('click',e=>{
  const r=cvs.getBoundingClientRect();const cx=(e.clientX-r.left);const cy=(e.clientY-r.top);
  // canvas-event-coord-devicepixel-rescale respected by using rect size directly
  for(const n of loomNodes){const dx=n.x-cx,dy=n.y-cy;if(dx*dx+dy*dy<n.r*n.r*2.5){openPanel(n);return;}}
});
function openPanel(n){
  const s=storms[n.idx];
  $('#panelTitle').textContent=`loom #${n.idx} · ${s.state}`;
  $('#panelBody').textContent=`charge: ${(s.charge*100|0)}%\nhue:   ${s.hue|0}\nradius:${s.r|0}\nbolts: ${s.bolts.length}\n\nFSM: gather→spin→discharge→rest\n(finite-state-machine-visualization-pattern)\n\nretry-strategy-visualization-pattern\nbackpressure-visualization-pattern`;
  $('#panel').classList.remove('hidden');
}
$('#closePanel').onclick=()=>$('#panel').classList.add('hidden');
$('#reseed').onclick=rebuild;
let paused=false;$('#pause').onclick=()=>{paused=!paused;$('#pause').textContent=paused?'resume':'pause';};

// FSM transitions — finite-state-machine-visualization-pattern
function tickStorm(s,dt,t){
  s.charge+=dt*(s.state==='gather'?0.15:s.state==='spin'?0.05:s.state==='discharge'?-0.6:-0.05);
  if(s.state==='gather'&&s.charge>0.7)s.state='spin';
  else if(s.state==='spin'&&s.charge>1)s.state='discharge';
  else if(s.state==='discharge'&&s.charge<0.1){s.state='rest';s.bolts=[];}
  else if(s.state==='rest'&&s.charge<0){s.state='gather';s.charge=0;}
  if(s.state==='discharge'&&rnd()<0.4){s.bolts.push({x:s.x,y:s.y,t:0,seg:Array.from({length:8},(_,i)=>({x:s.x+(rnd()-0.5)*60,y:s.y+i*20}))});}
  s.bolts=s.bolts.filter(b=>(b.t+=dt,b.t<0.5));
}

// parallax-sine-silhouette-horizon
function drawMountains(t){
  const layers=[{h:H-140,amp:40,col:'#13182a',k:0.004},{h:H-110,amp:60,col:'#1a2040',k:0.006},{h:H-80,amp:40,col:'#232a53',k:0.009}];
  layers.forEach((L,i)=>{
    ctx.beginPath();ctx.moveTo(0,H);
    for(let x=0;x<=W;x+=6){
      const y=L.h+Math.sin(x*L.k+t*0.03*(i+1))*L.amp*0.6+Math.sin(x*L.k*phi+t*0.02)*L.amp*0.4;
      ctx.lineTo(x,y);
    }
    ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=L.col;ctx.fill();
  });
}

function drawStars(t){
  stars.forEach(s=>{
    const a=0.2+s.mag*0.7*(0.6+0.4*Math.sin(t*(0.4+s.tw)));
    ctx.fillStyle=`rgba(253,230,138,${a.toFixed(3)})`;
    ctx.fillRect(s.x,s.y,1.4,1.4);
  });
}

function drawGiants(t){
  giants.forEach(g=>{
    const breathe=Math.sin(t*0.3+g.dream*pi)*6;
    ctx.save();
    const grd=ctx.createLinearGradient(g.x,g.base-g.h,g.x,g.base);
    grd.addColorStop(0,`hsla(${g.hue},40%,30%,0.75)`);
    grd.addColorStop(1,`hsla(${g.hue},30%,15%,0.95)`);
    ctx.fillStyle=grd;
    ctx.beginPath();
    ctx.moveTo(g.x-g.w/2,g.base);
    ctx.quadraticCurveTo(g.x-g.w*0.3,g.base-g.h*0.8+breathe,g.x,g.base-g.h+breathe);
    ctx.quadraticCurveTo(g.x+g.w*0.3,g.base-g.h*0.8+breathe,g.x+g.w/2,g.base);
    ctx.closePath();ctx.fill();
    // dream pulse — raft-consensus term tick
    ctx.globalAlpha=0.2+0.2*Math.sin(t*0.8+g.dream*pi);
    ctx.strokeStyle='#b18cf6';ctx.stroke();
    ctx.restore();
  });
}

function drawStorms(t){
  storms.forEach((s,i)=>{
    const fl=flicker(t+i,1.3);
    const col={gather:'#506fa6',spin:'#8fa7ff',discharge:'#dce4ff',rest:'#394a78'}[s.state];
    const r=s.r*(1+0.1*fl);
    const g=ctx.createRadialGradient(s.x,s.y,2,s.x,s.y,r);
    g.addColorStop(0,col);g.addColorStop(1,'rgba(143,167,255,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(s.x,s.y,r,0,pi*2);ctx.fill();
    // loom node glow — layout-stable inset-style halo
    ctx.strokeStyle=s.state==='discharge'?'#fff':'rgba(143,167,255,0.5)';
    ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(s.x,s.y,10,0,pi*2);ctx.stroke();
    s.bolts.forEach(b=>{
      ctx.strokeStyle=`rgba(220,228,255,${(1-b.t/0.5).toFixed(2)})`;
      ctx.beginPath();ctx.moveTo(b.x,b.y);b.seg.forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();
    });
  });
}

// silver tapestry — echarts-style markArea strands driven by flow field
function drawStrands(t){
  strands.forEach(s=>{
    s.life+=0.003;if(s.life>1)s.life=0;
    const x0=W/2+Math.cos(s.a)*40,y0=H*0.25;
    const x1=W/2+Math.cos(s.a+s.life*pi)*300*s.dst;
    const y1=y0+120+Math.sin(t+s.a)*40;
    const grd=ctx.createLinearGradient(x0,y0,x1,y1);
    grd.addColorStop(0,`hsla(${s.hue},70%,80%,${(0.1+s.life*0.5).toFixed(2)})`);
    grd.addColorStop(1,'rgba(110,231,183,0)');
    ctx.strokeStyle=grd;ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(x0,y0);ctx.quadraticCurveTo((x0+x1)/2,y0-60,x1,y1);ctx.stroke();
  });
}

function drawFlowers(t){
  flowers.forEach(f=>{
    const sing=Math.sin(t*(0.6+f.k)+f.ph)*0.5+0.5;
    ctx.fillStyle=`hsla(${f.hue},60%,${55+sing*20}%,${0.3+sing*0.5})`;
    ctx.beginPath();ctx.arc(f.x,f.y-sing*3,1.6+sing*1.4,0,pi*2);ctx.fill();
  });
}

let last=performance.now();
function loop(now){
  const dt=Math.min(0.05,(now-last)/1000);last=now;const t=now/1000;
  if(!paused)storms.forEach(s=>tickStorm(s,dt,t));
  // canvas-trail-fade-vs-clear: alpha rect overpaint
  ctx.fillStyle='rgba(15,17,23,0.25)';ctx.fillRect(0,0,W,H);
  const layer=$('#layer').value;
  if(layer==='all'||layer==='stars')drawStars(t);
  if(layer==='all'||layer==='storm'){drawStrands(t);drawStorms(t);}
  drawMountains(t);
  if(layer==='all'||layer==='giant')drawGiants(t);
  if(layer==='all'||layer==='meadow')drawFlowers(t);
  $('#stat').textContent=`looms:${storms.length}  giants:${giants.length}  strands:${strands.length}  t:${t.toFixed(1)}s  fsm:${storms.map(s=>s.state[0]).join('')}`;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
addEventListener('keydown',e=>{if(e.key===' '){paused=!paused;e.preventDefault();}if(e.key==='r')rebuild();});