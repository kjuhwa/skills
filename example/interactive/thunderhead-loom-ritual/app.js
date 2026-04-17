const $=s=>document.querySelector(s);
const cvs=$('#sky'),ctx=cvs.getContext('2d');
let W=0,H=0;function resize(){const r=cvs.getBoundingClientRect();W=r.width;H=r.height;cvs.width=W*devicePixelRatio;cvs.height=H*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);}addEventListener('resize',resize);resize();

// fnv1a-xorshift-text-to-procedural-seed
function seedRnd(str){let h=2166136261>>>0;for(const c of str)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return()=>{h^=h<<13;h^=h>>>17;h^=h<<5;return((h>>>0)%1e9)/1e9;};}
const rnd=seedRnd('wildflower-thunderhead-'+Date.now());

// stateless reducer — event-returning-pure-reducer + stateless-turn-combat-engine
const initial={
  turn:1,score:0,pity:0,maxPity:8,breaker:'CLOSED',fails:0,
  slots:Array.from({length:4},(_,i)=>({id:i,charge:0,state:'gather',cd:0,hue:200+i*18})),
  giants:Array.from({length:3},(_,i)=>({id:i,dream:1,status:[],hue:260+i*25,hp:80})),
  log:[],history:[]
};
let state=clone(initial);
function clone(o){return JSON.parse(JSON.stringify(o));} // json-clone-reducer-state-constraint: no Dates/Maps here

const STATUS={CHARGED:'charged',DREAMING:'dreaming',BLOOMING:'blooming',STUNNED:'stunned'};

// reducer: (state, action) => {state, events}
function reduce(s,a){
  s=clone(s);const events=[];
  if(a.t==='tick'){
    s.slots.forEach(sl=>{
      if(sl.state==='cool'){sl.cd-=a.dt;if(sl.cd<=0){sl.state='gather';events.push(`slot ${sl.id} ready`);}}
      else{sl.charge=Math.min(1,sl.charge+a.dt*(sl.state==='spin'?0.8:0.4));}
      if(sl.state==='gather'&&sl.charge>0.6)sl.state='spin';
    });
    s.giants.forEach(g=>{g.dream=Math.max(0,Math.min(1,g.dream+(rnd()-0.5)*0.02));});
    if(s.breaker==='OPEN'){s.fails=Math.max(0,s.fails-a.dt*0.5);if(s.fails<0.5){s.breaker='HALF';events.push('breaker half-open');}}
  }
  if(a.t==='weave'){
    const hit=a.hit;const best=s.slots.filter(sl=>sl.state==='spin').sort((x,y)=>y.charge-x.charge)[0];
    if(!best){events.push('no loom spun up');s.fails++;return{s,events};}
    const score=hit==='GOLD'?3:hit==='SILVER'?2:hit==='COPPER'?1:0;
    if(score===0){s.pity++;s.fails++;events.push('missed — pity '+s.pity);
      if(s.pity>=s.maxPity){events.push('HARD PITY: silver guaranteed');s.pity=0;s.score+=2;best.state='cool';best.cd=1.2+rnd()*0.6;}
    }else{
      s.score+=score;s.pity=0;s.fails=Math.max(0,s.fails-1);
      events.push(`wove ${hit}(+${score}) at slot ${best.id}`);
      best.state='cool';best.cd=1+rnd()*0.8;best.charge=0; // cache-variance-ttl-jitter
      // apply status to a random giant — status-effect-enum-system
      const tg=s.giants[(rnd()*s.giants.length)|0];tg.status.push({k:STATUS.BLOOMING,ttl:3});tg.hp-=score*4;
    }
    if(s.fails>=5){s.breaker='OPEN';s.fails=5;events.push('circuit OPEN — cooldown');} // circuit-breaker
  }
  if(a.t==='discharge'){
    if(s.breaker==='OPEN'){events.push('breaker OPEN — discharge blocked');return{s,events};}
    // layered-risk-gates: admission → monitor → breaker
    const spun=s.slots.filter(sl=>sl.state==='spin'&&sl.charge>0.85);
    if(spun.length<2){events.push('admission gate: need ≥2 spun looms');return{s,events};}
    const rate=spun.reduce((x,y)=>x+y.charge,0)/Math.max(1,spun.length); // divide-by-zero-rate-guard
    const dmg=Math.round(rate*10*spun.length);
    s.score+=dmg;events.push(`DISCHARGE ${dmg} across ${spun.length} looms`);
    spun.forEach(sl=>{sl.state='cool';sl.cd=1.6;sl.charge=0;});
    s.giants.forEach(g=>{g.hp=Math.max(0,g.hp-Math.round(dmg/s.giants.length));});
  }
  if(a.t==='turn'){s.turn++;s.giants.forEach(g=>{g.status=g.status.map(st=>({...st,ttl:st.ttl-1})).filter(st=>st.ttl>0);});}
  s.history.push({a:a.t,turn:s.turn,at:Date.now()}); // immutable-action-event-log
  s.log=s.log.concat(events).slice(-40); // log-aggregation bounded
  return{s,events};
}

function apply(a){const r=reduce(state,a);state=r.s;render();}

// phase-window-timing-grade-with-pity — golden arc around -30°
let angle=0;
function gradeNeedle(){
  // golden zone 290°..340° (i.e., -30° band)
  const deg=((angle%360)+360)%360;
  const d=Math.min(Math.abs(deg-330),Math.abs(deg-330-360));
  if(d<6)return'GOLD';if(d<14)return'SILVER';if(d<26)return'COPPER';return'MISS';
}

function render(){
  $('#turn').textContent=state.turn;
  $('#score').textContent=state.score;
  $('#pity').textContent=`${state.pity}/${state.maxPity}`;
  $('#brk').textContent=state.breaker;$('#brk').style.color=state.breaker==='OPEN'?'var(--bad)':'var(--accent)';
  const slots=$('#slots');slots.innerHTML='';
  state.slots.forEach(sl=>{
    const el=document.createElement('div');
    el.className='slot '+(sl.state==='spin'?'hot':sl.state==='cool'?'cool':'');
    el.innerHTML=`loom #${sl.id} · ${sl.state}${sl.state==='cool'?` (${sl.cd.toFixed(1)}s)`:''}<div class="bar ${sl.state==='cool'?'red':''}"><span style="width:${(sl.charge*100).toFixed(0)}%"></span></div>`;
    slots.appendChild(el);
  });
  const giants=$('#giants');giants.innerHTML='';
  state.giants.forEach(g=>{
    const el=document.createElement('div');el.className='giant';
    const sts=g.status.map(s=>s.k).join(',')||'—';
    el.innerHTML=`giant #${g.id} hp:${g.hp} dream:${(g.dream*100|0)}% <small>${sts}</small><div class="bar"><span style="width:${g.hp}%"></span></div>`;
    el.style.borderColor=`hsl(${g.hue},40%,45%)`;
    giants.appendChild(el);
  });
  const log=$('#log');log.innerHTML='';
  state.log.slice(-18).forEach(l=>{const li=document.createElement('li');li.textContent=l;log.appendChild(li);});
}
render();

// draw sky + horizon — parallax-sine-silhouette-horizon
let t=0;
function loop(ts){
  t=ts/1000;
  // canvas-trail-fade-vs-clear
  ctx.fillStyle='rgba(15,17,23,0.2)';ctx.fillRect(0,0,W,H);
  // storm clouds (incommensurate sines)
  for(let i=0;i<6;i++){
    const cx=W*0.5+Math.sin(t*0.2+i)*W*0.3;
    const cy=H*0.25+Math.cos(t*0.17+i*1.3)*30;
    const r=40+Math.sin(t+i*1.618)*12+i*4;
    const g=ctx.createRadialGradient(cx,cy,4,cx,cy,r);
    g.addColorStop(0,'rgba(143,167,255,0.6)');g.addColorStop(1,'rgba(143,167,255,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,r,0,6.28);ctx.fill();
  }
  // mountain silhouette
  ctx.beginPath();ctx.moveTo(0,H);
  for(let x=0;x<=W;x+=8){const y=H*0.75+Math.sin(x*0.01+t*0.05)*20+Math.sin(x*0.02+t*0.03)*30;ctx.lineTo(x,y);}
  ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle='#1a2040';ctx.fill();
  // meadow flowers — actor swarm
  for(let i=0;i<40;i++){const x=((i*91)%W);const y=H-18-Math.sin(t*0.8+i)*4;ctx.fillStyle=`hsla(${300+i*2},60%,60%,.7)`;ctx.fillRect(x,y,2,2);}
  // needle angle drive
  angle=(t*140)%360;
  $('#needle').style.transform=`rotate(${angle}deg)`;
  // periodic tick — availability-ttl-punctuate-processor
  apply({t:'tick',dt:0.016});
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// controls
$('#weave').onclick=()=>apply({t:'weave',hit:gradeNeedle()});
$('#discharge').onclick=()=>apply({t:'discharge'});
$('#reset').onclick=()=>{state=clone(initial);render();};
addEventListener('keydown',e=>{
  if(e.code==='Space'){e.preventDefault();apply({t:'weave',hit:gradeNeedle()});}
  if(e.key==='d')apply({t:'discharge'});
  if(e.key==='r'){state=clone(initial);render();}
  if(e.key==='n')apply({t:'turn'});
});
setInterval(()=>apply({t:'turn'}),6000);