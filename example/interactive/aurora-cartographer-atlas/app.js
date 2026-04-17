(()=>{
const cvs=document.getElementById('sky'),ctx=cvs.getContext('2d');
const svg=document.getElementById('overlay');
const journal=document.getElementById('journal');
const ins=document.getElementById('inspector');
let W=0,H=0,t=0,lens='aurora';

function fit(){W=cvs.width=cvs.offsetWidth*devicePixelRatio;H=cvs.height=cvs.offsetHeight*devicePixelRatio;ctx.scale(devicePixelRatio,devicePixelRatio);}
addEventListener('resize',()=>{fit();layout();});

// fnv1a seed for procedural determinism
function seed(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return ()=>{h^=h<<13;h^=h>>>17;h^=h<<5;return ((h>>>0)/4294967296);};}
const rand=seed('arctic-mapmakers-aurora');

// river ice-floe ring (consistent-hashing layout)
const floes=Array.from({length:14},(_,i)=>{
  const a=i/14*Math.PI*2;
  return {id:i,name:`floe-${i.toString(16)}`,a,r:0,x:0,y:0,status:['frozen','drift','thaw'][i%3]};
});

// sleeping volcanoes (FSM nodes)
const volcanoes=[
  {id:'v1',name:'Muspel',state:'dreaming',x:0,y:0,p:0},
  {id:'v2',name:'Hraun',state:'dozing',x:0,y:0,p:.3},
  {id:'v3',name:'Katla',state:'stirring',x:0,y:0,p:.6},
  {id:'v4',name:'Surtr',state:'dreaming',x:0,y:0,p:.15},
];

// polar bears (actor-model patrol)
const bears=Array.from({length:5},(_,i)=>({id:i,x:rand()*800,y:200+rand()*300,vx:(rand()-.5)*.4,vy:(rand()-.5)*.2,mailbox:[]}));

// pines (incommensurate sine flicker)
const pines=Array.from({length:38},(_,i)=>({x:i*30+rand()*18,h:40+rand()*55,phase:rand()*6.28}));

// aurora particle field
const auroraParticles=Array.from({length:220},()=>({x:rand()*1400,y:rand()*300,age:rand()*100,hue:120+rand()*80}));

const journalEntries=[
  {t:'Cartographer Elin',body:'The aurora bent west when Katla stirred — a shimmer is not a song, but close.'},
  {t:'Ice-floe floe-3',body:'Drifted 12m overnight; rebalanced per tide rhythm. Consistent-hashed ring held.'},
  {t:'Polar bear Ursa',body:'Circled volcano Muspel thrice. No waking observed. Supervision tree intact.'},
  {t:'Pine whisper',body:'Three sines, never quite in phase. The forest never loops.'},
  {t:'Glacier patina',body:'Hue drifted copper-green; shimmer index 0.72.'},
];

function layout(){
  const cw=cvs.offsetWidth,ch=cvs.offsetHeight;
  const cx=cw/2,cy=ch*.55,rad=Math.min(cw,ch)*.28;
  floes.forEach(f=>{f.r=rad;f.x=cx+Math.cos(f.a)*rad;f.y=cy+Math.sin(f.a)*rad*.6;});
  volcanoes.forEach((v,i)=>{v.x=cw*(.2+i*.2);v.y=ch*.78;});
  renderOverlay();
}

function renderOverlay(){
  svg.innerHTML='';
  const ns='http://www.w3.org/2000/svg';
  // river connections between floes
  floes.forEach((f,i)=>{
    const n=floes[(i+1)%floes.length];
    const p=document.createElementNS(ns,'path');
    p.setAttribute('d',`M${f.x},${f.y} Q${(f.x+n.x)/2},${(f.y+n.y)/2-18} ${n.x},${n.y}`);
    p.setAttribute('stroke','rgba(154,213,255,.3)');
    p.setAttribute('fill','none');
    p.setAttribute('stroke-dasharray','3 5');
    svg.appendChild(p);
  });
  if(lens==='rivers'||lens==='aurora'){
    floes.forEach(f=>{
      const c=document.createElementNS(ns,'circle');
      c.setAttribute('cx',f.x);c.setAttribute('cy',f.y);c.setAttribute('r',7);
      c.setAttribute('fill',f.status==='frozen'?'#9ad5ff':f.status==='drift'?'#6ee7b7':'#ff9561');
      c.setAttribute('opacity','.85');
      c.addEventListener('click',()=>showIns(`Floe ${f.name}`,`Status: ${f.status}. Position on ice-ring (consistent-hash slot ${f.id}/14). Tide rhythm within budget.`));
      svg.appendChild(c);
    });
  }
  if(lens==='volcanoes'||lens==='aurora'){
    volcanoes.forEach(v=>{
      const c=document.createElementNS(ns,'circle');
      c.setAttribute('cx',v.x);c.setAttribute('cy',v.y);c.setAttribute('r',14+v.p*6);
      c.setAttribute('fill','rgba(255,149,97,'+(.18+v.p*.4)+')');
      c.setAttribute('stroke','#ff9561');c.setAttribute('stroke-width','1');
      c.addEventListener('click',()=>showIns(`Volcano ${v.name}`,`FSM state: ${v.state}. Sleep pressure ${(v.p*100|0)}%. Bears patrolling — circuit-breaker armed.`));
      svg.appendChild(c);
    });
  }
  if(lens==='bears'){
    bears.forEach(b=>{
      const c=document.createElementNS(ns,'circle');
      c.setAttribute('cx',b.x);c.setAttribute('cy',b.y);c.setAttribute('r',6);
      c.setAttribute('fill','#ffffff');c.setAttribute('opacity','.85');
      c.addEventListener('click',()=>showIns(`Bear ${b.id}`,`Mailbox depth ${b.mailbox.length}. Supervision: guarded volcano ${(b.id%4)+1}.`));
      svg.appendChild(c);
    });
  }
}

function showIns(title,body){
  document.getElementById('insTitle').textContent=title;
  document.getElementById('insBody').textContent=body;
  ins.showModal();
}
document.getElementById('closeIns').onclick=()=>ins.close();

// draw loop
function draw(){
  t+=1;
  ctx.fillStyle='rgba(10,15,31,.18)';
  ctx.fillRect(0,0,cvs.offsetWidth,cvs.offsetHeight);
  // aurora ribbons
  for(let r=0;r<4;r++){
    ctx.beginPath();
    for(let x=0;x<cvs.offsetWidth;x+=8){
      const y=80+r*22+Math.sin(x*.008+t*.02+r)*14+Math.sin(x*.021+t*.013)*8;
      if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    const g=ctx.createLinearGradient(0,60,0,180);
    g.addColorStop(0,'rgba(110,231,183,.05)');
    g.addColorStop(.5,`hsla(${140+r*20},70%,60%,.35)`);
    g.addColorStop(1,'rgba(154,213,255,0)');
    ctx.strokeStyle=g;ctx.lineWidth=18-r*3;ctx.stroke();
  }
  // flowfield particles
  auroraParticles.forEach(p=>{
    const vx=Math.cos(p.x*.005+t*.01)*.6,vy=Math.sin(p.y*.008+t*.007)*.3;
    p.x+=vx;p.y+=vy;p.age++;
    if(p.x>cvs.offsetWidth)p.x=0;if(p.x<0)p.x=cvs.offsetWidth;
    ctx.fillStyle=`hsla(${p.hue},70%,65%,.4)`;
    ctx.fillRect(p.x,p.y,1.5,1.5);
  });
  // pine whisper silhouette (parallax)
  for(let layer=0;layer<3;layer++){
    ctx.fillStyle=`rgba(${30-layer*8},${50-layer*10},${42-layer*8},${.55-layer*.15})`;
    ctx.beginPath();ctx.moveTo(0,cvs.offsetHeight);
    pines.forEach(p=>{
      const sway=Math.sin(t*.02+p.phase)*2+Math.sin(t*.031+p.phase*1.3)*1.4;
      ctx.lineTo(p.x+sway-layer*12,cvs.offsetHeight-p.h*(1-layer*.15));
    });
    ctx.lineTo(cvs.offsetWidth,cvs.offsetHeight);ctx.closePath();ctx.fill();
  }
  // bear drift
  bears.forEach(b=>{
    b.x+=b.vx;b.y+=b.vy;
    if(b.x<0||b.x>cvs.offsetWidth)b.vx*=-1;
    if(b.y<250||b.y>cvs.offsetHeight-60)b.vy*=-1;
  });
  // volcano pressure walk
  volcanoes.forEach(v=>{v.p=Math.max(0,Math.min(1,v.p+(rand()-.5)*.01));});
  // legend
  document.getElementById('tideFill').style.width=(40+Math.sin(t*.01)*30+30)+'%';
  document.getElementById('volcFill').style.width=(volcanoes.reduce((a,v)=>a+v.p,0)/4*100)+'%';
  document.getElementById('pineFill').style.width=(60+Math.sin(t*.007)*25)+'%';
  requestAnimationFrame(draw);
}

// journal
journalEntries.forEach(e=>{
  const li=document.createElement('li');
  li.textContent=e.t;
  li.onclick=()=>showIns(e.t,e.body);
  journal.appendChild(li);
});

// lens switch
document.querySelectorAll('#lenses button').forEach(b=>{
  b.onclick=()=>{lens=b.dataset.lens;document.querySelectorAll('#lenses button').forEach(x=>x.classList.toggle('active',x===b));renderOverlay();};
});
addEventListener('keydown',e=>{
  const map={'1':'aurora','2':'rivers','3':'volcanoes','4':'bears'};
  if(map[e.key]){lens=map[e.key];document.querySelectorAll('#lenses button').forEach(x=>x.classList.toggle('active',x.dataset.lens===lens));renderOverlay();}
});

fit();layout();draw();setInterval(renderOverlay,1500);
})();