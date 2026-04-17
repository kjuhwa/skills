// Drifting Tea Garden Koan — pure-reducer turn puzzle
// Skills embedded: stateless-turn-combat-engine, status-effect-enum-system,
// gacha-soft-hard-pity, saga-pattern-data-simulation, layered-risk-gates.

const cv=document.getElementById('board'),x=cv.getContext('2d');
const N=7,CELL=72,PAD=28;
const deckEl=document.getElementById('deck'),logEl=document.getElementById('log');
const $turn=document.getElementById('turn'),$chi=document.getElementById('chi'),
  $chiMax=document.getElementById('chiMax'),$pity=document.getElementById('pity'),$streak=document.getElementById('streak');

function rng(seed){let s=seed;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%1e9)/1e9}}
const R=rng(0x6ee7b7);

// status effects — status-effect-enum-system
const EFFECT={BURN:'burn',STUN:'stun',DAMPEN:'damp'};

// cards — each is a pure action spec
const CARDS=[
  {id:'crane',name:'crane-fold',kind:'damage',rarity:'common',cost:1,power:2,desc:'Fold toward a lantern — 2 dmg in a line'},
  {id:'heron',name:'heron-arc',kind:'aoe',rarity:'rare',cost:2,power:1,desc:'1 dmg in a 3×3 arc'},
  {id:'ember',name:'ember-kiss',kind:'burn',rarity:'rare',cost:2,power:1,desc:'Apply 2 burn stacks'},
  {id:'tea',name:'tea-stillness',kind:'stun',rarity:'myth',cost:3,power:1,desc:'Stun 1 lantern for 2 turns'},
  {id:'koi',name:'koi-mirror',kind:'compensate',rarity:'myth',cost:3,power:1,desc:'Saga-undo last fold'},
  {id:'moth',name:'moth-ladder',kind:'damage',rarity:'common',cost:1,power:1,desc:'1 dmg diagonal'},
];

// initial state — JSON-safe (json-clone-reducer-state-constraint)
function initialState(){
  const lanterns=[];
  for(let k=0;k<5;k++){
    lanterns.push({id:'l'+k,x:1+((k*2)%N),y:1+(k%4)*2,hp:4+k,max:4+k,eff:{}});
  }
  return {
    turn:1,chi:3,chiMax:3,pity:0,streak:0,
    sel:{r:3,c:3},
    lanterns,
    hand:[{...CARDS[0],used:false},{...CARDS[5],used:false},{...CARDS[2],used:false},{...CARDS[1],used:false}],
    lastCast:null, // for saga undo
    events:[],
    history:[]
  };
}
let S=initialState();

// pure reducer — (state,action) -> {state, events, done}
function reduce(state,action){
  const s=JSON.parse(JSON.stringify(state));
  const ev=[];
  if(action.type==='SELECT'){
    s.sel={r:action.r,c:action.c};
    ev.push({kind:'info',text:`cursor → (${action.r},${action.c})`});
  } else if(action.type==='CAST'){
    const card=s.hand[action.idx];
    if(!card||card.used){ev.push({kind:'miss',text:'no such fold'});return {state:s,events:ev}}
    if(s.chi<card.cost){ev.push({kind:'miss',text:`need ${card.cost} chi`});return {state:s,events:ev}}
    // snapshot for saga compensation
    s.history.push(JSON.parse(JSON.stringify({l:s.lanterns,chi:s.chi})));
    if(s.history.length>6)s.history.shift();
    s.chi-=card.cost;card.used=true;
    const tgt=s.lanterns.find(l=>l.x===s.sel.c&&l.y===s.sel.r);
    if(card.kind==='damage'&&tgt){
      tgt.hp-=card.power;ev.push({kind:'hit',text:`${card.name}: −${card.power} on ${tgt.id}`});
      s.streak++;
    } else if(card.kind==='aoe'){
      let hits=0;
      s.lanterns.forEach(l=>{
        if(Math.abs(l.x-s.sel.c)<=1&&Math.abs(l.y-s.sel.r)<=1){l.hp-=card.power;hits++}
      });
      ev.push({kind:hits?'hit':'miss',text:`${card.name} struck ${hits} lantern(s)`});
      if(hits)s.streak++;else s.streak=0;
    } else if(card.kind==='burn'&&tgt){
      tgt.eff[EFFECT.BURN]=(tgt.eff[EFFECT.BURN]||0)+2;
      ev.push({kind:'hit',text:`burn(2) → ${tgt.id}`});s.streak++;
    } else if(card.kind==='stun'&&tgt){
      tgt.eff[EFFECT.STUN]=2;ev.push({kind:'hit',text:`stun(2) → ${tgt.id}`});s.streak++;
    } else if(card.kind==='compensate'){
      if(s.history.length>=2){
        const prev=s.history[s.history.length-2];
        s.lanterns=JSON.parse(JSON.stringify(prev.l));s.chi=prev.chi;
        ev.push({kind:'saga',text:'koi-mirror: saga-undo applied'});
      } else {
        ev.push({kind:'miss',text:'nothing to undo'});s.chi+=card.cost;card.used=false;
      }
    } else {
      ev.push({kind:'miss',text:`${card.name} found no target`});s.streak=0;
    }
    s.lastCast=card.name;
    // cull dead
    s.lanterns=s.lanterns.filter(l=>{
      if(l.hp<=0){ev.push({kind:'hit',text:`${l.id} folded silent`});return false}
      return true;
    });
  } else if(action.type==='END_TURN'){
    // status tick
    s.lanterns.forEach(l=>{
      if(l.eff[EFFECT.BURN]){l.hp-=1;l.eff[EFFECT.BURN]-=1;ev.push({kind:'hit',text:`${l.id} burns (−1)`})}
      if(l.eff[EFFECT.STUN]){l.eff[EFFECT.STUN]-=1}
      Object.keys(l.eff).forEach(k=>{if(l.eff[k]<=0)delete l.eff[k]});
    });
    s.lanterns=s.lanterns.filter(l=>l.hp>0);
    s.turn+=1;s.chi=s.chiMax;
    // draw fresh hand — gacha-soft-hard-pity
    s.hand=drawHand(s);
    ev.push({kind:'info',text:`— turn ${s.turn} —`});
  } else if(action.type==='PULL'){
    // chaos-engineering-data-simulation: a random garden event
    const roll=R();
    if(roll<.2){s.chi=Math.min(s.chiMax,s.chi+1);ev.push({kind:'saga',text:'a tea breeze gifts +1 chi'})}
    else if(roll<.4){
      const l=s.lanterns[Math.floor(R()*s.lanterns.length)];
      if(l){l.eff[EFFECT.DAMPEN]=1;ev.push({kind:'miss',text:`${l.id} dampens — resists next fold`})}
    } else {ev.push({kind:'info',text:'the garden exhales; nothing stirs'})}
  }
  return {state:s,events:ev,done:s.lanterns.length===0};
}

function drawHand(s){
  const hand=[];
  for(let i=0;i<4;i++){
    s.pity=(s.pity||0)+1;
    // soft pity after 5, hard pity at 10 — gacha-soft-hard-pity
    let pool=CARDS.filter(c=>c.rarity==='common');
    const roll=R();
    if(s.pity>=10){pool=CARDS.filter(c=>c.rarity==='myth');s.pity=0}
    else if(s.pity>=5&&roll<0.4){pool=CARDS.filter(c=>c.rarity==='rare');s.pity=0}
    else if(roll<0.2){pool=CARDS.filter(c=>c.rarity==='rare')}
    const card=pool[Math.floor(R()*pool.length)];
    hand.push({...card,used:false});
  }
  return hand;
}

function apply(action){
  const {state,events,done}=reduce(S,action);
  S=state;events.forEach(e=>S.events.push(e));
  if(S.events.length>80)S.events=S.events.slice(-80);
  render();
  if(done){setTimeout(()=>{S.events.push({kind:'saga',text:'garden falls silent — new koan begins'});S=initialState();render()},900)}
}

function render(){
  $turn.textContent=S.turn;$chi.textContent=S.chi;$chiMax.textContent=S.chiMax;
  $pity.textContent=S.pity||0;$streak.textContent=S.streak;
  // deck
  deckEl.innerHTML=S.hand.map((c,i)=>`
    <div class="card ${c.rarity} ${c.used?'used':''}" data-i="${i}">
      <b>${c.name}</b><span class="pity">${c.cost}χ</span>
      <small>${c.desc}</small>
    </div>`).join('');
  deckEl.querySelectorAll('.card').forEach(el=>{
    el.addEventListener('click',()=>apply({type:'CAST',idx:+el.dataset.i}));
  });
  // log
  logEl.innerHTML=[...S.events].slice(-40).reverse().map(e=>
    `<div class="entry ${e.kind}">› ${e.text}</div>`).join('');
  drawBoard();
}

function drawBoard(){
  x.clearRect(0,0,cv.width,cv.height);
  // garden grid
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const px=PAD+c*CELL,py=PAD+r*CELL;
    x.strokeStyle='#2a3142';x.lineWidth=1;
    x.strokeRect(px,py,CELL,CELL);
    if((r+c)%2===0){x.fillStyle='#12172040';x.fillRect(px,py,CELL,CELL)}
  }
  // selector
  const sx=PAD+S.sel.c*CELL,sy=PAD+S.sel.r*CELL;
  x.strokeStyle='#6ee7b7';x.lineWidth=2;x.strokeRect(sx+2,sy+2,CELL-4,CELL-4);
  // lanterns with flicker (incommensurate-sine-organic-flicker)
  const t=performance.now()*0.002;
  S.lanterns.forEach(l=>{
    const cx=PAD+l.x*CELL+CELL/2,cy=PAD+l.y*CELL+CELL/2;
    const f=0.6+0.2*Math.sin(t*1.7+l.x)+0.12*Math.sin(t*2.71+l.y)+0.08*Math.sin(t*0.41);
    const r=22+f*8;
    const g=x.createRadialGradient(cx,cy,2,cx,cy,r);
    const tint=l.eff.burn?'rgba(239,122,94,':'rgba(245,158,91,';
    g.addColorStop(0,tint+(0.9)+')');g.addColorStop(1,tint+'0)');
    x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,6.28);x.fill();
    x.fillStyle=l.eff.stun?'#b4a7ff':(l.eff.burn?'#ef7a5e':'#f59e5b');
    x.beginPath();x.arc(cx,cy,8,0,6.28);x.fill();
    // hp bar
    x.fillStyle='#0a0d14';x.fillRect(cx-18,cy+14,36,4);
    x.fillStyle='#6ee7b7';x.fillRect(cx-18,cy+14,36*(l.hp/l.max),4);
    x.fillStyle='#e6ecf3';x.font='10px ui-monospace';x.textAlign='center';
    x.fillText(`${l.hp}/${l.max}`,cx,cy-14);
    // effect chips
    let ox=cx-16;
    Object.keys(l.eff).forEach(k=>{
      x.fillStyle=k==='burn'?'#ef7a5e':(k==='stun'?'#b4a7ff':'#64c5ff');
      x.fillRect(ox,cy+20,8,4);ox+=10;
    });
  });
  requestAnimationFrame(drawBoard);
}

cv.addEventListener('click',e=>{
  const rect=cv.getBoundingClientRect();
  const mx=(e.clientX-rect.left)*(cv.width/rect.width);
  const my=(e.clientY-rect.top)*(cv.height/rect.height);
  const c=Math.floor((mx-PAD)/CELL),r=Math.floor((my-PAD)/CELL);
  if(r>=0&&r<N&&c>=0&&c<N)apply({type:'SELECT',r,c});
});
window.addEventListener('keydown',e=>{
  if(/^[1-4]$/.test(e.key))apply({type:'CAST',idx:+e.key-1});
  else if(e.key==='p')apply({type:'PULL'});
  else if(e.key===' '){e.preventDefault();apply({type:'END_TURN'})}
  else if(e.key==='u'){
    const koi=S.hand.findIndex(c=>c.id==='koi'&&!c.used);
    if(koi>=0)apply({type:'CAST',idx:koi});
    else apply({type:'PULL'});
  }
});
render();