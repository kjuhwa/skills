"use strict";
const $=s=>document.querySelector(s);
const rand=(s=>()=>((s=Math.imul(48271,s))>>>0)/2**32)(0xC1D0);
const R=(a,b)=>a+(b-a)*rand();
const cv=$("#sea"),ctx=cv.getContext("2d"),sv=$("#stars");
let W=0,H=0;
function fit(){W=cv.width=cv.clientWidth;H=cv.height=cv.clientHeight;sv.setAttribute("viewBox",`0 0 ${W} ${H}`)}
addEventListener("resize",fit);fit();

const THEMES=["velvet","paper-sea","forgotten","drifting","inkwell","whale","lantern","cartographer","constellation","drift","ember","tide"];
const STORIES={
  lantern:"A paper lantern hung from a cartographer's rigging. Fuel burns to ember at dawn.",
  whale:"An inkwell whale. Breaches release a spray of calligraphic ink across the page-sea.",
  star:"A forgotten star. Velvet-charted but uncited on any printed atlas."
};

let lanterns=[],whales=[],stars=[],drift=0.35,t0=performance.now();

function seed(nL,nW,nS){
  lanterns=[];whales=[];stars=[];
  for(let i=0;i<nL;i++) lanterns.push({x:R(0,W),y:R(60,H-80),r:R(6,11),ph:R(0,6.28),sp:R(.004,.012),hue:R(28,52)});
  for(let i=0;i<nW;i++) whales.push({x:R(100,W-100),y:R(H*.5,H-60),len:R(90,170),ph:R(0,6.28),sp:R(.0015,.004),dir:rand()<.5?1:-1,id:"W"+i,name:pickName("whale")});
  for(let i=0;i<28;i++) stars.push({x:R(0,W),y:R(20,H*.45),m:R(.6,2.2),tw:R(0,6.28),id:"S"+i,name:pickName("star")});
  drawStars();
}
function pickName(kind){
  const a=THEMES[(rand()*THEMES.length)|0], b=THEMES[(rand()*THEMES.length)|0];
  return `${a}-${b}-${kind}`;
}
function drawStars(){
  const lines=[];
  for(let i=0;i<stars.length-1;i++) if(rand()<.22) lines.push([i,(i+1+((rand()*3)|0))%stars.length]);
  sv.innerHTML=lines.map(([a,b])=>{
    const p=stars[a],q=stars[b];
    return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="rgba(110,231,183,.18)" stroke-width=".6"/>`;
  }).concat(stars.map(s=>
    `<circle data-id="${s.id}" cx="${s.x}" cy="${s.y}" r="${s.m}" fill="#6ee7b7" opacity="${.5+.5*Math.sin(s.tw)}"/>`
  )).join("");
}

function paperBand(y,amp,shade){
  ctx.beginPath();
  for(let x=0;x<=W;x+=14){
    const k=Math.sin((x*.006)+drift*.8+(y*.002)+((performance.now()-t0)*.00015))*amp;
    if(x===0) ctx.moveTo(x,y+k); else ctx.lineTo(x,y+k);
  }
  ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();
  ctx.fillStyle=shade;ctx.fill();
}

function draw(){
  const now=performance.now(),dt=(now-t0);t0=now;
  ctx.fillStyle="#0f1117";ctx.fillRect(0,0,W,H);
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"#0f1117");g.addColorStop(.45,"#141824");g.addColorStop(1,"#1a1d27");
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  paperBand(H*.55,14,"rgba(90,78,58,.22)");
  paperBand(H*.68,18,"rgba(110,95,68,.28)");
  paperBand(H*.82,22,"rgba(140,120,85,.34)");
  for(const s of stars){s.tw+=dt*.003}
  drawStars();
  for(const w of whales){
    w.ph+=w.sp*dt;
    const sy=Math.sin(w.ph)*18;
    drawWhale(w.x+Math.sin(w.ph*.3)*40*w.dir, w.y+sy, w.len, w.dir, sy);
  }
  for(const l of lanterns){
    l.ph+=l.sp*dt;
    const fx=l.x+Math.sin(l.ph*.7)*8, fy=l.y+Math.cos(l.ph*.9)*4;
    drawLantern(fx,fy,l.r,l.ph,l.hue);
  }
  requestAnimationFrame(draw);
}
function drawWhale(x,y,len,dir,sy){
  ctx.save();ctx.translate(x,y);ctx.scale(dir,1);
  ctx.fillStyle="rgba(20,22,30,.92)";
  ctx.beginPath();
  ctx.ellipse(0,0,len*.5,len*.18,0,0,6.28);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-len*.5,0);ctx.quadraticCurveTo(-len*.7,-len*.22,-len*.55,-len*.1);
  ctx.quadraticCurveTo(-len*.6,0,-len*.5,0);ctx.fill();
  ctx.fillStyle="rgba(143,163,199,.9)";
  ctx.beginPath();ctx.arc(len*.3,-len*.05,1.8,0,6.28);ctx.fill();
  if(sy<-6){
    ctx.strokeStyle="rgba(143,163,199,.45)";ctx.lineWidth=1;
    for(let i=0;i<5;i++){
      ctx.beginPath();ctx.moveTo(len*.22,-len*.2);
      ctx.quadraticCurveTo(len*.3,-len*.45-i*6,len*.28+i*4,-len*.5-i*8);ctx.stroke();
    }
  }
  ctx.restore();
}
function drawLantern(x,y,r,ph,hue){
  const flick=.7+.3*Math.sin(ph*2.3)+.1*Math.sin(ph*5.1);
  const grd=ctx.createRadialGradient(x,y,0,x,y,r*4.5);
  grd.addColorStop(0,`hsla(${hue},90%,65%,${.55*flick})`);
  grd.addColorStop(1,"hsla(30,80%,55%,0)");
  ctx.fillStyle=grd;ctx.beginPath();ctx.arc(x,y,r*4.5,0,6.28);ctx.fill();
  ctx.fillStyle=`hsl(${hue},85%,${55+flick*15}%)`;
  ctx.beginPath();ctx.ellipse(x,y,r*.7,r,0,0,6.28);ctx.fill();
  ctx.strokeStyle="rgba(40,30,15,.9)";ctx.lineWidth=.8;
  ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x,y-r-12);ctx.stroke();
}

function hit(mx,my){
  for(const w of whales){
    const dx=mx-w.x,dy=my-w.y;
    if(Math.abs(dx)<w.len*.5 && Math.abs(dy)<w.len*.22) return {kind:"whale",o:w};
  }
  for(const l of lanterns){
    const dx=mx-l.x,dy=my-l.y;
    if(dx*dx+dy*dy<(l.r*2)**2) return {kind:"lantern",o:l};
  }
  return null;
}
cv.addEventListener("click",e=>{
  const r=cv.getBoundingClientRect();
  const x=(e.clientX-r.left)*(W/r.width), y=(e.clientY-r.top)*(H/r.height);
  const h=hit(x,y);if(!h) return;
  show(h.kind.toUpperCase()+" · "+(h.o.name||h.o.id||"anon"),
    `kind: ${h.kind}\nposition: (${x|0}, ${y|0})\nlore:\n${STORIES[h.kind]}\n\nthemes: ${THEMES.slice(0,5).join(", ")}`);
});
sv.addEventListener("click",e=>{
  const id=e.target.getAttribute("data-id");if(!id) return;
  const s=stars.find(x=>x.id===id);if(!s) return;
  show("STAR · "+s.name,`magnitude: ${s.m.toFixed(2)}\nlore:\n${STORIES.star}`);
});
$("#close").onclick=()=>$("#panel").hidden=true;
function show(t,b){$("#pt").textContent=t;$("#pb").textContent=b;$("#panel").hidden=false}

function refresh(){
  const L=+$("#lamps").value, WH=+$("#whales").value;
  drift=(+$("#drift").value)/100;
  $("#meta").textContent=`drift ${drift.toFixed(2)} · ${lanterns.length} lanterns · ${whales.length} whales · ${stars.length} stars`;
  seed(L,WH,28);
}
["drift","lamps","whales"].forEach(id=>$("#"+id).addEventListener("input",refresh));
$("#reseed").onclick=refresh;
addEventListener("keydown",e=>{if(e.key==="r"||e.key==="R") refresh()});
refresh();draw();