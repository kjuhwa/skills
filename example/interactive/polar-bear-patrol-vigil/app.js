(()=>{
let rngSeed=987654321;
function rand(){rngSeed^=rngSeed<<13;rngSeed^=rngSeed>>>17;rngSeed^=rngSeed<<5;return ((rngSeed>>>0)/4294967296);}

const STATES=['dreaming','dozing','stirring','waking'];
const init={
  turn:1,calm:100,pity:0,breakerOpen:false,breakerStreak:0,budget:3,selected:0,
  bears:[
    {id:0,name:'Ursa',stamina:5,effects:[]},
    {id:1,name:'Borea',stamina:5,effects:[]},
    {id:2,name:'Skadi',stamina:5,effects:[]},
  ],
  volcanoes:[
    {id:'Muspel',state:'dreaming',pressure:15,watched:0},
    {id:'Hraun',state:'dozing',pressure:35,watched:0},
    {id:'Katla',state:'stirring',pressure:60,watched:0},
    {id:'Surtr',state:'dreaming',pressure:20,watched:0},
  ],
  events:[]
};
let S=JSON.parse(JSON.stringify(init));

// pure reducer — returns {state, events}
function reduce(state,action){
  const s=JSON.parse(JSON.stringify(state));
  const events=[];
  const bear=s.bears[s.selected];
  if(action.type==='CIRCLE'){
    const v=s.volcanoes[action.v];
    if(s.budget<=0){events.push({tag:'warn',msg:'No patrol budget left'});return{state:s,events};}
    v.watched++;v.pressure=Math.max(0,v.pressure-8-rand()*4);
    s.budget--;bear.stamina--;
    events.push({tag:'patrol',msg:`${bear.name} circles ${v.id} — pressure ↓ ${v.pressure|0}`});
    if(v.pressure<20&&v.state!=='dreaming'){v.state='dreaming';events.push({tag:'ice',msg:`${v.id} sleeps again`});}
  } else if(action.type==='TRACE'){
    // gacha aurora draw with soft+hard pity
    s.pity++;
    const softRate=s.pity>30?.15+((s.pity-30)*.05):.05;
    const hard=s.pity>=60;
    const hit=hard||rand()<softRate;
    if(hit){
      s.calm=Math.min(100,s.calm+10);
      events.push({tag:'aurora',msg:`✨ ${bear.name} traces rare aurora — calm +10 (pity ${s.pity})`,critical:true});
      s.pity=0;
    }else{
      s.calm=Math.min(100,s.calm+2);
      events.push({tag:'aurora',msg:`${bear.name} sketches pale arc — calm +2`});
    }
    s.budget--;bear.stamina--;
  } else if(action.type==='FREEZE'){
    // freeze river — apply frost status to bear, reduce all volcanoes slightly
    s.volcanoes.forEach(v=>v.pressure=Math.max(0,v.pressure-3));
    if(!bear.effects.includes('frost'))bear.effects.push('frost');
    s.budget--;bear.stamina-=2;
    events.push({tag:'ice',msg:`${bear.name} freezes river — all volcanoes ↓ 3`});
  } else if(action.type==='REST'){
    bear.stamina=Math.min(5,bear.stamina+2);
    bear.effects=bear.effects.filter(e=>e!=='frost');
    s.budget--;
    events.push({tag:'patrol',msg:`${bear.name} rests by pine — stamina restored`});
  } else if(action.type==='TICK'){
    // end of turn: volcanoes drift, FSM transitions, breaker check
    s.volcanoes.forEach(v=>{
      const unwatched=v.watched===0;
      const drift=(unwatched?6:1)+rand()*4;
      v.pressure=Math.min(100,v.pressure+drift);
      v.watched=0;
      const idx=Math.floor(v.pressure/25);
      const newState=STATES[Math.min(3,idx)];
      if(newState!==v.state){events.push({tag:newState==='waking'?'ember':'patrol',msg:`${v.id}: ${v.state} → ${newState}`});v.state=newState;}
      if(v.state==='waking')s.calm-=5;
    });
    // breaker — 3 consecutive ticks with any waking volcano opens it
    const anyWaking=s.volcanoes.some(v=>v.state==='waking');
    if(anyWaking){s.breakerStreak++;if(s.breakerStreak>=3){s.breakerOpen=true;events.push({tag:'ember',msg:'⚠ Circuit breaker OPEN — patrol exhausted',critical:true});}}
    else{s.breakerStreak=0;s.breakerOpen=false;}
    // divide-by-zero guard
    const alive=s.bears.filter(b=>b.stamina>0).length||1;
    events.push({tag:'patrol',msg:`Turn ${s.turn} end — ${alive} bear(s) active`});
    s.turn++;s.budget=3;
    s.bears.forEach(b=>{b.stamina=Math.min(5,b.stamina+1);});
  } else if(action.type==='SELECT'){
    s.selected=action.i;
  }
  s.calm=Math.max(0,Math.min(100,s.calm));
  s.events=s.events.concat(events);
  return {state:s,events};
}

function dispatch(a){
  const {state,events}=reduce(S,a);
  S=state;
  events.forEach(e=>{
    const li=document.createElement('li');
    li.innerHTML=`<span class="tag ${e.tag}">[${e.tag}]</span>${e.msg}`;
    if(e.critical)li.classList.add('critical');
    document.getElementById('events').prepend(li);
  });
  render();
}

function render(){
  document.getElementById('turn').textContent=S.turn;
  document.getElementById('calm').textContent=S.calm|0;
  document.getElementById('pity').textContent=S.pity;
  document.getElementById('breaker').textContent=S.breakerOpen?'OPEN':'CLOSED';
  document.getElementById('breaker').style.color=S.breakerOpen?'var(--danger)':'var(--accent)';
  document.getElementById('budget').textContent=S.budget;
  const vdom=document.getElementById('volcanoes');vdom.innerHTML='';
  S.volcanoes.forEach((v,i)=>{
    const d=document.createElement('div');d.className='volcano '+v.state;
    d.innerHTML=`<h3>${v.id}</h3><small>state: ${v.state}</small><div class="pressure"><span style="width:${v.pressure}%"></span></div>`;
    d.onclick=()=>{if(pending){dispatch({type:pending,v:i});pending=null;document.querySelectorAll('#actions button').forEach(b=>b.classList.remove('pending'));}};
    vdom.appendChild(d);
  });
  const bdom=document.getElementById('bearList');bdom.innerHTML='';
  S.bears.forEach((b,i)=>{
    const d=document.createElement('div');d.className='bear'+(i===S.selected?' selected':'');
    d.innerHTML=`<span>${b.name} · stamina ${b.stamina}</span><span class="effects">${b.effects.join(' ')}</span>`;
    d.onclick=()=>dispatch({type:'SELECT',i});
    bdom.appendChild(d);
  });
}

let pending=null;
document.querySelectorAll('#actions button[data-act]').forEach(b=>{
  b.onclick=()=>{
    const act=b.dataset.act.toUpperCase();
    if(act==='REST'){dispatch({type:'REST'});return;}
    if(act==='TRACE'){dispatch({type:'TRACE'});return;}
    if(act==='FREEZE'){dispatch({type:'FREEZE'});return;}
    pending=act;document.querySelectorAll('#actions button').forEach(x=>x.classList.remove('pending'));b.classList.add('pending');
  };
});
document.getElementById('end').onclick=()=>dispatch({type:'TICK'});
addEventListener('keydown',e=>{
  if(e.key.toLowerCase()==='q')document.querySelector('[data-act="circle"]').click();
  if(e.key.toLowerCase()==='w')dispatch({type:'TRACE'});
  if(e.key.toLowerCase()==='e')dispatch({type:'FREEZE'});
  if(e.key.toLowerCase()==='r')dispatch({type:'REST'});
  if(e.key===' '||e.key==='Enter'){e.preventDefault();dispatch({type:'TICK'});}
  if(['1','2','3'].includes(e.key))dispatch({type:'SELECT',i:+e.key-1});
});

render();
})();