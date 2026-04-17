const c = document.getElementById('scene'), ctx = c.getContext('2d');
const dpr = Math.max(1, window.devicePixelRatio||1);
function resize(){ c.width = c.clientWidth*dpr; c.height = c.clientHeight*dpr; }
resize(); addEventListener('resize', resize);

// fnv1a-xorshift seed
let seedStr = 'deep-sea cartographers';
function seeded(s){ let h=2166136261>>>0; for(const ch of s){h^=ch.charCodeAt(0); h=Math.imul(h,16777619)>>>0;} return ()=>{ h^=h<<13; h^=h>>>17; h^=h<<5; return ((h>>>0)%100000)/100000; }; }
let rnd = seeded(seedStr);

// layers
const layers = { currents:true, kelp:true, whales:true, temples:true, bio:true };
document.querySelectorAll('[data-layer]').forEach(el=>{
  el.addEventListener('change', e=> { layers[el.dataset.layer]=e.target.checked; });
});

// entities
function build(){
  const W = c.width, H = c.height;
  const currents = Array.from({length:12}, (_,i)=>({
    x: rnd()*W, y: H*0.2 + rnd()*H*0.6, amp: 20+rnd()*60, freq: .002+rnd()*.004,
    phase: rnd()*Math.PI*2, hue: 150 + rnd()*70, flow: .3+rnd()*.8
  }));
  const whales = Array.from({length:5},()=>({
    x: rnd()*W, y: H*0.3+rnd()*H*0.5, vx: (rnd()-.5)*0.4, vy: (rnd()-.5)*0.15,
    size: 30+rnd()*30, songPhase: rnd()*Math.PI*2, songFreq: .3+rnd()*.6,
    name: ['Thalassa','Morrigan','Cael','Ondine','Nereus'][Math.floor(rnd()*5)]
  }));
  const kelp = Array.from({length:40},(_,i)=>({
    x: (i/40)*W + rnd()*20, baseH: H*0.55+rnd()*H*0.3, sway: rnd()*Math.PI*2, len: 80+rnd()*160
  }));
  const temples = Array.from({length:6},()=>({
    x: rnd()*W*.9+W*.05, y: H*0.75+rnd()*H*0.18, w: 60+rnd()*60, glow: rnd()*Math.PI*2,
    name: ['Eresh','Nammu','Tiamat','Abzu','Ketos','Dagon'][Math.floor(rnd()*6)]
  }));
  const bio = Array.from({length:120},()=>({
    x:rnd()*W, y:rnd()*H, r: 1+rnd()*2.5, tw: rnd()*Math.PI*2, spd:.5+rnd()*1.3
  }));
  return {currents, whales, kelp, temples, bio};
}
let world = build();

let t=0, paused=false;
addEventListener('keydown', e=>{
  if(e.key===' ') { paused=!paused; e.preventDefault(); }
  if(e.key==='r') { seedStr += '·'; rnd=seeded(seedStr); world=build(); }
});

// interaction
c.addEventListener('click', e=>{
  const r = c.getBoundingClientRect();
  const x = (e.clientX - r.left) * (c.width/r.width);
  const y = (e.clientY - r.top)  * (c.height/r.height);
  const hit = pick(x,y);
  if(hit) openPanel(hit);
});
document.getElementById('close').onclick = ()=> document.getElementById('panel').classList.add('hidden');

function pick(x,y){
  for(const w of world.whales){ if(Math.hypot(x-w.x,y-w.y) < w.size) return {kind:'whale', d:w}; }
  for(const tp of world.temples){ if(Math.abs(x-tp.x)<tp.w && Math.abs(y-tp.y)<tp.w*.6) return {kind:'temple', d:tp}; }
  for(const cu of world.currents){ const d = Math.abs(y - (cu.y + Math.sin(cu.phase+x*cu.freq)*cu.amp)); if(d<6 && Math.abs(x-cu.x)<c.width*.4) return {kind:'current', d:cu}; }
  return null;
}
function openPanel(h){
  const p=document.getElementById('panel'), t=document.getElementById('pTitle'), b=document.getElementById('pBody');
  p.classList.remove('hidden');
  if(h.kind==='whale'){ t.textContent=`whale · ${h.d.name}`;
    b.innerHTML = row('song hz', (h.d.songFreq*40).toFixed(2)) + row('drift', `${h.d.vx.toFixed(2)}, ${h.d.vy.toFixed(2)}`) + row('mass', `${(h.d.size*1.8).toFixed(0)} t`) + row('state','broadcasting'); }
  else if(h.kind==='temple'){ t.textContent=`sunken temple · ${h.d.name}`;
    b.innerHTML = row('depth',`${(600+h.d.y).toFixed(0)} m`) + row('span',`${h.d.w.toFixed(0)} m`) + row('ward','lit') + row('glyphs', Math.floor(h.d.w/6)); }
  else { t.textContent='bioluminescent current';
    b.innerHTML = row('flow',`${(h.d.flow*3).toFixed(2)} kn`) + row('amp',`${h.d.amp.toFixed(0)} m`) + row('hue',`${h.d.hue.toFixed(0)}°`) + row('freq',`${(h.d.freq*1000).toFixed(2)}`); }
}
const row = (k,v)=>`<div class="row"><span>${k}</span><b>${v}</b></div>`;

// render loop
function frame(){
  if(!paused) t += 1/60;
  const W=c.width, H=c.height;
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#0a0f1a'); g.addColorStop(.6,'#081220'); g.addColorStop(1,'#04070e');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  if(layers.bio) for(const b of world.bio){
    const a = (Math.sin(t*b.spd + b.tw) + Math.sin(t*b.spd*1.37+b.tw*.7))*.25 + .5;
    ctx.fillStyle=`rgba(110,231,183,${a*.6})`;
    ctx.beginPath(); ctx.arc(b.x + Math.sin(t+b.tw)*8, b.y + Math.cos(t*.7+b.tw)*4, b.r, 0, 7); ctx.fill();
  }

  if(layers.currents) for(const cu of world.currents){
    ctx.strokeStyle=`hsla(${cu.hue},70%,55%,.35)`; ctx.lineWidth=2;
    ctx.beginPath();
    for(let x=0;x<W;x+=6){
      const y = cu.y + Math.sin(cu.phase + x*cu.freq + t*cu.flow)*cu.amp;
      if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }

  if(layers.kelp) for(const k of world.kelp){
    const sway = Math.sin(t*.5 + k.sway)*20 + Math.sin(t*.27+k.sway*.8)*8;
    ctx.strokeStyle='rgba(30,70,50,.55)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(k.x, k.baseH+k.len);
    ctx.quadraticCurveTo(k.x+sway*.5, k.baseH+k.len*.4, k.x+sway, k.baseH);
    ctx.stroke();
  }

  if(layers.temples) for(const tp of world.temples){
    const glow = (Math.sin(t+tp.glow)+Math.sin(t*.7+tp.glow))*.2+.6;
    ctx.fillStyle=`rgba(110,231,183,${glow*.18})`;
    ctx.beginPath(); ctx.arc(tp.x, tp.y, tp.w*1.3, 0, 7); ctx.fill();
    ctx.fillStyle='#1a1d27'; ctx.strokeStyle=`rgba(255,214,165,${glow})`; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.rect(tp.x-tp.w/2, tp.y-tp.w*.3, tp.w, tp.w*.5); ctx.fill(); ctx.stroke();
    for(let i=0;i<3;i++){ ctx.fillStyle=`rgba(255,214,165,${glow*.7})`;
      ctx.fillRect(tp.x-tp.w/2+4+i*(tp.w/3), tp.y-tp.w*.3+4, tp.w/4-4, tp.w*.08);
    }
  }

  if(layers.whales) for(const w of world.whales){
    if(!paused){ w.x += w.vx; w.y += w.vy; if(w.x<0||w.x>W) w.vx*=-1; if(w.y<H*0.3||w.y>H*0.85) w.vy*=-1; }
    const pulse = (Math.sin(t*w.songFreq+w.songPhase)+1)*.5;
    for(let i=0;i<4;i++){
      const r = (i+1)*35 + pulse*30 + (t*20)%80;
      ctx.strokeStyle=`rgba(110,231,183,${(.35-i*.08)*(1-((t*20)%80)/80)})`;
      ctx.beginPath(); ctx.arc(w.x,w.y,r,0,7); ctx.stroke();
    }
    ctx.fillStyle='#243045'; ctx.beginPath();
    ctx.ellipse(w.x,w.y,w.size,w.size*.45,0,0,7); ctx.fill();
    ctx.fillStyle='rgba(110,231,183,.9)';
    ctx.beginPath(); ctx.arc(w.x+w.size*.6, w.y-3, 2, 0, 7); ctx.fill();
  }

  requestAnimationFrame(frame);
}
frame();