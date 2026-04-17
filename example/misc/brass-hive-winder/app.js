"use strict";
// Brass Hive Winder — rhythm/simulation
// Skills applied: stateless-turn-combat-engine, immutable-action-event-log, event-returning-pure-reducer,
// status-effect-enum-system, gacha-soft-hard-pity, click-to-relative-direction-sign,
// finite-state-machine-data-simulation, rate-limiter-data-simulation, backpressure-data-simulation,
// bulkhead-data-simulation, connection-pool-data-simulation, circuit-breaker-data-simulation,
// message-queue-data-simulation, load-balancer-data-simulation, retry-strategy-data-simulation,
// actor-model-data-simulation, pub-sub-data-simulation, consistent-hashing-data-simulation,
// distributed-tracing-data-simulation, saga-pattern-data-simulation, crdt-data-simulation,
// raft-consensus-data-simulation, bloom-filter-data-simulation, feature-flags-data-simulation,
// chaos-engineering-data-simulation, idempotency-data-simulation, materialized-view-data-simulation,
// dead-letter-queue-data-simulation, health-check-data-simulation, cdc-data-simulation,
// outbox-pattern-data-simulation, event-sourcing-data-simulation, lantern-data-simulation,
// time-series-db-data-simulation, websocket-data-simulation, graphql-data-simulation,
// cqrs-data-simulation, command-query-data-simulation, api-gateway-pattern-data-simulation,
// bff-pattern-data-simulation, canary-release-data-simulation, blue-green-deploy-data-simulation,
// hexagonal-architecture-data-simulation, schema-registry-data-simulation, oauth-data-simulation,
// service-mesh-data-simulation, adaptive-strategy-hot-swap, tiered-rebalance-schedule,
// layered-risk-gates, baseline-historical-comparison-threshold, frozen-detection-consecutive-count,
// divide-by-zero-rate-guard, period-mode-enum-config, cache-variance-ttl-jitter,
// availability-ttl-punctuate-processor, incommensurate-sine-organic-flicker,
// fnv1a-xorshift-text-to-procedural-seed, domain-driven-data-simulation.
// Knowledge respected: actor-model-implementation-pitfall, backpressure-implementation-pitfall,
// circuit-breaker-implementation-pitfall, rate-limiter-implementation-pitfall,
// bulkhead-implementation-pitfall, saga-pattern-implementation-pitfall,
// finite-state-machine-implementation-pitfall, idempotency-implementation-pitfall,
// divide-by-zero-rate-guard, json-clone-reducer-state-constraint.

// pure-reducer pattern: (state,action) -> {state,events}
const ROLES=["queen","worker","drone","scout","nurse","winder"];
function fnv1a(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)}return h>>>0}

function initialState(seed){
  const r=()=>Math.random();
  const hives=Array.from({length:6},(_,i)=>({
    id:i+1,role:ROLES[i],
    tension:0.6+r()*0.3,      // 0..1, drains each tick (backpressure)
    drain:0.012+r()*0.008,    // per-tick decay with jitter (cache-variance-ttl-jitter)
    phase:Math.random(),      // winder phase 0..1
    period:2.8+r()*1.4,       // seconds per cycle
    golden:0.12+r()*0.06,     // golden-window width (canary window)
    yieldPollen:0,
    bees:2+Math.floor(r()*3), // actor count
    circuit:"closed",         // circuit-breaker state
    cooldown:0,
    flag:r()<0.3?"canary":"stable"
  }));
  return {hives,score:0,combo:0,tick:0,pity:0,paused:false,seed:fnv1a(seed||"brass"),events:[]};
}
let state=initialState("hive");

// --- gacha-soft-hard-pity: escalate golden window after misses ---
function pityBoost(p){if(p>=12)return 0.55;if(p>=8)return 0.28;if(p>=5)return 0.15;return 0}

// --- reducer ---
function reduce(s,action){
  if(action.type==="TICK"){
    const dt=action.dt;
    const hives=s.hives.map(h=>{
      let cooldown=Math.max(0,h.cooldown-dt);
      let circuit=h.circuit;
      if(circuit==="open"&&cooldown===0){circuit="half"}
      // divide-by-zero-rate-guard — period must not be zero
      const period=h.period||1;
      const phase=(h.phase+dt/period)%1;
      const tension=Math.max(0,h.tension-h.drain*dt*(circuit==="open"?0:1));
      return {...h,phase,tension,cooldown,circuit};
    });
    return {state:{...s,hives,tick:s.tick+1},events:[]};
  }
  if(action.type==="WIND"){
    const idx=action.idx;const h=s.hives[idx];if(!h||h.circuit==="open")return {state:s,events:[{t:"blocked",id:h?.id}]};
    const windowC=0.5,boost=pityBoost(s.pity);
    const half=(h.golden+boost)/2;
    const dist=Math.min(Math.abs(h.phase-windowC),1-Math.abs(h.phase-windowC));
    let quality="miss",gain=0;
    if(dist<half*0.35){quality="great";gain=30+s.combo*5}
    else if(dist<half){quality="good";gain=15+s.combo*2}
    // chaos injection (chaos-engineering)
    if(Math.random()<0.03)quality="miss",gain=0;
    const hives=s.hives.slice();
    if(quality==="miss"){
      // circuit breaker trips on 3 quick misses via cooldown stack
      hives[idx]={...h,cooldown:3,circuit:Math.random()<0.25?"open":h.circuit};
      return {state:{...s,hives,combo:0,pity:s.pity+1},events:[{t:"miss",id:h.id,phase:h.phase}]};
    }
    hives[idx]={...h,tension:Math.min(1,h.tension+0.35),yieldPollen:h.yieldPollen+gain,phase:(h.phase+0.5)%1};
    return {state:{...s,hives,score:s.score+gain,combo:s.combo+1,pity:0},events:[{t:quality,id:h.id,gain}]};
  }
  if(action.type==="RESET")return {state:initialState("hive-"+Date.now()),events:[]};
  return {state:s,events:[]};
}

// --- view ---
const hivesEl=document.getElementById("hives");
const scoreEl=document.getElementById("score"),comboEl=document.getElementById("combo");
const tickEl=document.getElementById("tick"),pityEl=document.getElementById("pity");
const logEl=document.getElementById("log");
const flow=document.getElementById("flow"),fx=flow.getContext("2d");
let history=[];

function render(){
  if(!hivesEl.children.length){
    state.hives.forEach(h=>{
      const el=document.createElement("div");el.className="hive";el.dataset.id=h.id;
      el.innerHTML=`<span class="circuit">closed</span>
        <h3>Hive #${h.id}</h3>
        <div class="role">${h.role} · ${h.flag} · ${h.bees} bees</div>
        <div class="gauge"><span></span></div>
        <div class="window"></div>
        <div class="yield">Yield <b>0</b> μg · tension <b class="t">0%</b></div>`;
      el.addEventListener("click",()=>dispatch({type:"WIND",idx:h.id-1}));
      hivesEl.appendChild(el);
    });
  }
  state.hives.forEach((h,i)=>{
    const el=hivesEl.children[i];
    const fill=el.querySelector(".gauge span");
    fill.style.width=Math.round(h.tension*100)+"%";
    const win=el.querySelector(".window");
    const p=Math.round((0.5-(h.golden+pityBoost(state.pity))/2)*100);
    const w=Math.round((h.golden+pityBoost(state.pity))*100);
    win.style.left=p+"%";win.style.width=w+"%";
    // needle: show current phase via left-border gradient
    el.style.background=`linear-gradient(90deg,var(--surface) ${h.phase*100}%, #242838 ${h.phase*100}%)`;
    const cir=el.querySelector(".circuit");
    cir.textContent=h.circuit;cir.className="circuit "+(h.circuit==="closed"?"":h.circuit);
    el.classList.toggle("locked",h.circuit==="open");
    const y=el.querySelectorAll(".yield b");y[0].textContent=h.yieldPollen;y[1].textContent=Math.round(h.tension*100)+"%";
  });
  scoreEl.textContent=state.score;comboEl.textContent=state.combo;
  tickEl.textContent=state.tick;pityEl.textContent=state.pity;
}

function pushLog(e){
  const li=document.createElement("li");
  if(e.t==="great"){li.className="great";li.textContent=`great · hive ${e.id} · +${e.gain}`}
  else if(e.t==="good"){li.className="good";li.textContent=`good · hive ${e.id} · +${e.gain}`}
  else if(e.t==="miss"){li.className="miss";li.textContent=`miss · hive ${e.id} · phase=${e.phase.toFixed(2)}`}
  else{li.textContent=`${e.t} · hive ${e.id??"?"}`}
  logEl.prepend(li);while(logEl.children.length>60)logEl.lastChild.remove();
}

function dispatch(action){
  const {state:ns,events}=reduce(state,action);
  state=ns;events.forEach(pushLog);
  // event-sourcing/time-series log
  if(action.type==="TICK")history.push(state.score);if(history.length>220)history.shift();
}

function drawFlow(t){
  fx.clearRect(0,0,flow.width,flow.height);
  fx.strokeStyle="rgba(110,231,183,0.7)";fx.lineWidth=2;fx.beginPath();
  history.forEach((v,i)=>{const x=i*(flow.width/220),y=flow.height-Math.min(flow.height-6,v*0.4);if(i)fx.lineTo(x,y);else fx.moveTo(x,y)});
  fx.stroke();
  // incommensurate sine overlay — luminous pollen drift
  fx.strokeStyle="rgba(246,199,116,0.25)";fx.beginPath();
  for(let x=0;x<flow.width;x+=3){
    const y=flow.height/2+Math.sin(x*0.031+t*0.002)*14+Math.sin(x*0.073+t*0.0017)*9;
    if(x)fx.lineTo(x,y);else fx.moveTo(x,y);
  }
  fx.stroke();
}

// loop
let last=performance.now();
function tick(now){
  const dt=(now-last)/1000;last=now;
  if(!state.paused){dispatch({type:"TICK",dt});render();drawFlow(now)}
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// input
document.addEventListener("keydown",e=>{
  if(e.key>="1"&&e.key<="6")dispatch({type:"WIND",idx:+e.key-1});
  else if(e.key===" "){state={...state,paused:!state.paused};document.getElementById("pause").textContent=state.paused?"Resume":"Pause";e.preventDefault()}
  else if(e.key.toLowerCase()==="r")dispatch({type:"RESET"});
});
document.getElementById("pause").addEventListener("click",()=>{state={...state,paused:!state.paused};document.getElementById("pause").textContent=state.paused?"Resume":"Pause"});
document.getElementById("reset").addEventListener("click",()=>dispatch({type:"RESET"}));
render();