// Lullaby Orchid Forge — pure-reducer rhythm puzzle with pity.
// stateless-turn-combat-engine + phase-window-timing-grade-with-pity.
const KEY="jungle alchemists lullaby";
function fnv1a(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function xorshift(seed){let x=seed||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return ((x>>>0)/4294967296);};}
const rand=xorshift(fnv1a(KEY));

const cvs=document.getElementById("stage"), ctx=cvs.getContext("2d");
const hum=document.getElementById("hum"), windowEl=document.getElementById("window");
const logEl=document.getElementById("log"), gradeEl=document.getElementById("grade");

let state={
  wave:1, score:0, pityMiss:0, streak:0, tune:0,
  serpents:[], orchids:[], events:[],
  phase:0, windowCenter:0.5, windowSize:0.14,
  lastTick:performance.now()
};
const TUNES=["storm","jade","ember"];
function reduce(s,a){
  const evts=[];
  switch(a.type){
    case "STRIKE":{
      const d=Math.abs(s.phase-s.windowCenter);
      const w=s.windowSize+(s.pityMiss*0.02);
      let grade="miss", pts=0;
      if(d<w*0.25){grade="perfect";pts=30;}
      else if(d<w*0.5){grade="good";pts=18;}
      else if(d<w){grade="ok";pts=8;}
      const n={...s};
      if(grade==="miss"){n.pityMiss=Math.min(8,s.pityMiss+1);n.streak=s.streak+1;}
      else{n.pityMiss=0;n.streak=0;n.score=s.score+pts;}
      // damage serpents
      n.serpents=s.serpents.map(sp=>({...sp,hum:Math.max(0,sp.hum-pts)}));
      n.serpents=n.serpents.filter(sp=>sp.hum>0);
      if(!n.serpents.length){
        evts.push({msg:`wave ${s.wave} stilled`});
        n.wave=s.wave+1; n.serpents=spawnSerpents(n.wave);
      }
      evts.push({msg:`strike ${grade.padEnd(7)} +${pts}`,grade});
      return {state:n,events:evts};
    }
    case "TICK":{
      const dt=a.dt/1000;
      const speed=0.35+0.05*s.wave;
      let p=(s.phase+speed*dt)%1;
      const n={...s,phase:p};
      // serpents nibble back
      n.serpents=s.serpents.map(sp=>({...sp,hum:sp.hum+sp.bite*dt}));
      if(n.serpents.some(sp=>sp.hum>120)){
        evts.push({msg:"canopy frays — reset",grade:"miss"});
        return reduce({...n,wave:Math.max(1,s.wave-1),serpents:spawnSerpents(s.wave)},{type:"NOOP"});
      }
      return {state:n,events:evts};
    }
    case "TUNE":{
      return {state:{...s,tune:a.t,windowSize:0.12+0.02*a.t},events:[{msg:`tune → ${TUNES[a.t]}`}]};
    }
    case "RESET":{
      return {state:{...s,serpents:spawnSerpents(s.wave),pityMiss:0,streak:0},events:[{msg:"wave reset"}]};
    }
    default: return {state:s,events:[]};
  }
}
function spawnSerpents(w){
  const n=2+Math.min(4,Math.floor(w/2));
  const out=[];
  for(let i=0;i<n;i++){
    out.push({id:i,x:100+i*120,y:200+Math.sin(i)*20,hum:40+rand()*30+w*6,bite:2+rand()*3,hue:i*60});
  }
  return out;
}
state.serpents=spawnSerpents(1);

function dispatch(a){
  const {state:ns,events}=reduce(state,a);
  state=ns;
  for(const e of events){
    const li=document.createElement("li");
    li.textContent=new Date().toISOString().slice(11,19)+"  "+e.msg;
    logEl.prepend(li);
    if(logEl.children.length>40) logEl.lastChild.remove();
    if(e.grade){
      gradeEl.className="grade "+e.grade;
      gradeEl.textContent=e.grade.toUpperCase();
    }
  }
  document.getElementById("wave").textContent="Wave "+state.wave;
  document.getElementById("score").textContent="Calm "+state.score;
  document.getElementById("pity").textContent="Pity "+state.pityMiss;
  document.getElementById("streak").textContent="Miss "+state.streak;
}

window.addEventListener("keydown",e=>{
  if(e.code==="Space"){e.preventDefault();dispatch({type:"STRIKE"});}
  else if(e.code==="KeyR"){dispatch({type:"RESET"});}
  else if(["Digit1","Digit2","Digit3"].includes(e.code)){
    dispatch({type:"TUNE",t:Number(e.code.slice(-1))-1});
  }
});

function updateWindowBar(){
  const c=state.windowCenter, w=state.windowSize+state.pityMiss*0.02;
  windowEl.style.left=((c-w)*100)+"%";
  windowEl.style.width=(w*2*100)+"%";
  hum.style.left=(state.phase*100)+"%";
}

function draw(){
  ctx.fillStyle="rgba(15,17,23,0.35)";
  ctx.fillRect(0,0,cvs.width,cvs.height);
  // canopy silhouettes (parallax sines)
  for(let layer=0;layer<3;layer++){
    ctx.beginPath();
    ctx.moveTo(0,cvs.height);
    for(let x=0;x<=cvs.width;x+=8){
      const y=cvs.height-60-layer*40
        -Math.sin(x/120+performance.now()/2000+layer)*10
        -Math.sin(x/37+performance.now()/1700)*4;
      ctx.lineTo(x,y);
    }
    ctx.lineTo(cvs.width,cvs.height); ctx.closePath();
    ctx.fillStyle=`rgba(30,${60+layer*20},${40+layer*10},${0.3-layer*0.07})`;
    ctx.fill();
  }
  // orchid ring
  ctx.strokeStyle="rgba(251,191,36,0.5)";
  ctx.beginPath(); ctx.arc(cvs.width/2,cvs.height-70,40,0,Math.PI*2); ctx.stroke();
  // serpents
  state.serpents.forEach((sp,i)=>{
    const flick=Math.sin(performance.now()/300+i)*6;
    ctx.fillStyle=`hsl(${120+sp.hue},60%,55%)`;
    ctx.beginPath();
    for(let t=0;t<30;t++){
      const px=sp.x+Math.cos(performance.now()/600+i+t*0.4)*(t*2);
      const py=sp.y+Math.sin(performance.now()/600+i+t*0.4)*(t*2)+flick;
      ctx.arc(px,py,4-t*0.1,0,Math.PI*2);
    }
    ctx.fill();
    // hum bar
    ctx.fillStyle="#0f1117"; ctx.fillRect(sp.x-30,sp.y-40,60,6);
    ctx.fillStyle="#6ee7b7"; ctx.fillRect(sp.x-30,sp.y-40,60*Math.max(0,1-sp.hum/120),6);
  });
  updateWindowBar();
}

let last=performance.now();
function loop(now){
  const dt=now-last; last=now;
  dispatch({type:"TICK",dt});
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);