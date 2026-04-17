const { createApp, ref, reactive, computed, onMounted, onUnmounted, watch, h } = Vue;

// --- Utilities: seeded RNG (per `fnv1a-xorshift-text-to-procedural-seed`) ---
function fnv1a(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h>>>0}
function rng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)/4294967296)}}

// --- Bloom filter primitive ---
function bloomOf(keys,m=128,k=3){
  const bits=new Uint8Array(m);
  keys.forEach(key=>{
    let h1=fnv1a(key), h2=fnv1a('ember-'+key);
    for(let i=0;i<k;i++) bits[(h1+i*h2)%m]=1;
  });
  return bits;
}
function bloomIntersect(a,b){
  let and=0,or=0;
  for(let i=0;i<a.length;i++){ if(a[i]&&b[i])and++; if(a[i]||b[i])or++;}
  return or?and/or:1;
}

// --- Model: peers as lanterns (status-effect-enum-system pattern) ---
const STATUS = {
  OK:'ok', BURN:'burn', FENCE:'fence', PARTITION:'partition', FROZEN:'frozen'
};

function makePeers(seed){
  const r=rng(fnv1a(seed));
  const names=['flint','ember','cinder','forge','kiln','brazier','ashen','taper'];
  return names.slice(0,6).map((n,i)=>{
    const keyCount=14+Math.floor(r()*10);
    const keys=[];
    for(let j=0;j<keyCount;j++){
      keys.push('tx-'+(1000+Math.floor(r()*60)));
    }
    const uniq=Array.from(new Set(keys));
    return reactive({
      id:n,
      idx:i,
      keys:uniq,
      bloom:bloomOf(uniq),
      fence:Math.floor(r()*5),
      hlc:{wall:Date.now(), logical:Math.floor(r()*3)},
      queueDepth:Math.floor(r()*12),
      inFlight:0,
      statuses:new Set(),
      lastHeartbeat:0,
      consecFrozen:0,
      pendingOutbox:[],
      epoch:1,
      hue: i*60,
    });
  });
}

// --- Event-returning pure reducer (per `event-returning-pure-reducer` / `immutable-action-event-log`) ---
function reduceGossip(state, action){
  const events=[];
  const next={...state, peers:state.peers};
  if(action.type==='TICK'){
    // backpressure hysteresis (per `thread-pool-queue-backpressure`)
    next.peers.forEach(p=>{
      if(p.queueDepth>state.config.highWater && !p.statuses.has(STATUS.BURN)){
        p.statuses.add(STATUS.BURN);
        events.push({t:'warn',m:`${p.id} paused: queue ${p.queueDepth}>${state.config.highWater}`});
      }
      if(p.queueDepth<state.config.lowWater && p.statuses.has(STATUS.BURN)){
        p.statuses.delete(STATUS.BURN);
        events.push({t:'ok',m:`${p.id} resumed under lowWater`});
      }
      p.queueDepth=Math.max(0, p.queueDepth + Math.floor(Math.random()*5-2));
      p.hlc.logical+=1;
      p.hlc.wall=Math.max(Date.now(), p.hlc.wall+1);
    });
  }
  if(action.type==='GOSSIP'){
    const {fromIdx,toIdx}=action;
    const a=next.peers[fromIdx], b=next.peers[toIdx];
    if(!a || !b) return {state:next,events};
    if(a.statuses.has(STATUS.PARTITION) || b.statuses.has(STATUS.PARTITION)){
      events.push({t:'err',m:`${a.id}→${b.id} partitioned (dropped)`});
      return {state:next,events};
    }
    // fence-token monotonic guard
    if(action.fence < Math.max(a.fence,b.fence)){
      events.push({t:'err',m:`${a.id}→${b.id} rejected stale fence ${action.fence}`});
      return {state:next,events};
    }
    const sim=bloomIntersect(a.bloom,b.bloom);
    const missingAtB=a.keys.filter(k=>!b.keys.includes(k));
    const missingAtA=b.keys.filter(k=>!a.keys.includes(k));
    events.push({t:'gossip',m:`${a.id}→${b.id} bloom sim ${(sim*100).toFixed(1)}%  Δ${missingAtA.length+missingAtB.length}`});
    // reconcile
    missingAtB.slice(0,3).forEach(k=>{
      b.keys.push(k); b.pendingOutbox.push({k,dir:'in',from:a.id});
    });
    missingAtA.slice(0,3).forEach(k=>{
      a.keys.push(k); a.pendingOutbox.push({k,dir:'in',from:b.id});
    });
    b.bloom=bloomOf(b.keys);
    a.bloom=bloomOf(a.keys);
    // hybrid-logical-clock-merge
    const newWall=Math.max(a.hlc.wall,b.hlc.wall,Date.now());
    const newLog = (newWall===a.hlc.wall && newWall===b.hlc.wall)? Math.max(a.hlc.logical,b.hlc.logical)+1
                : (newWall===a.hlc.wall? a.hlc.logical+1 : (newWall===b.hlc.wall? b.hlc.logical+1 : 0));
    a.hlc={wall:newWall,logical:newLog};
    b.hlc={wall:newWall,logical:newLog};
    a.fence=Math.max(a.fence,action.fence);
    b.fence=Math.max(b.fence,action.fence);
    if(missingAtA.length+missingAtB.length===0){
      events.push({t:'ok',m:`${a.id}↔${b.id} converged`});
    }
  }
  if(action.type==='CHAOS_PARTITION'){
    const p=next.peers[action.idx];
    if(p){
      if(p.statuses.has(STATUS.PARTITION)){ p.statuses.delete(STATUS.PARTITION); events.push({t:'ok',m:`${p.id} healed`}); }
      else { p.statuses.add(STATUS.PARTITION); events.push({t:'err',m:`${p.id} partitioned`}); }
    }
  }
  if(action.type==='LEAD_ELECTION'){
    next.peers.forEach(p=>p.statuses.delete(STATUS.FENCE));
    const leader=next.peers[action.idx];
    if(leader){ leader.statuses.add(STATUS.FENCE); leader.epoch+=1; events.push({t:'ok',m:`${leader.id} elected (epoch ${leader.epoch})`}); }
  }
  return {state:next,events};
}

// --- Composition root ---
createApp({
  setup(){
    const seed=ref('forge-01');
    const config=reactive({tick:650,rounds:0,fanOut:2,highWater:9,lowWater:3,gossipProb:0.9,chaosRate:0.08});
    const peers=ref(makePeers(seed.value));
    const ledger=ref([]);
    const selected=ref(0);
    const running=ref(true);
    const tickCounter=ref(0);
    const particles=ref([]);
    const globalFence=ref(1);
    const running_state=computed(()=>({peers:peers.value,config}));

    function log(ev){
      ledger.value.unshift({t:ev.t,m:ev.m,ts:tickCounter.value});
      if(ledger.value.length>140) ledger.value.length=140;
    }
    function dispatch(action){
      const {state:next,events}=reduceGossip({peers:peers.value,config},action);
      peers.value=next.peers;
      events.forEach(log);
    }

    function tick(){
      if(!running.value) return;
      tickCounter.value++;
      dispatch({type:'TICK'});
      // adaptive fanout: `adaptive-strategy-hot-swap`
      const peerCount=peers.value.length;
      for(let f=0;f<config.fanOut;f++){
        if(Math.random()<config.gossipProb){
          const a=Math.floor(Math.random()*peerCount);
          let b=Math.floor(Math.random()*peerCount);
          if(b===a)b=(b+1)%peerCount;
          const fence=Math.max(1, Math.floor(globalFence.value*(0.5+Math.random()*0.6)));
          dispatch({type:'GOSSIP',fromIdx:a,toIdx:b,fence});
          // add animation particle
          particles.value.push({from:a,to:b,t:Date.now(),id:Math.random()});
          if(particles.value.length>30) particles.value.splice(0,particles.value.length-30);
        }
      }
      // chaos injection (`chaos-engineering-data-simulation`)
      if(Math.random()<config.chaosRate){
        const idx=Math.floor(Math.random()*peerCount);
        dispatch({type:'CHAOS_PARTITION',idx});
      }
      // frozen detection (per `frozen-detection-consecutive-count`)
      peers.value.forEach(p=>{
        if(p.queueDepth===p.lastHeartbeat) p.consecFrozen++; else p.consecFrozen=0;
        p.lastHeartbeat=p.queueDepth;
        if(p.consecFrozen>6 && !p.statuses.has(STATUS.FROZEN)){
          p.statuses.add(STATUS.FROZEN);
          log({t:'warn',m:`${p.id} frozen (no queue delta in 6 ticks)`});
        } else if(p.consecFrozen<=6 && p.statuses.has(STATUS.FROZEN)){
          p.statuses.delete(STATUS.FROZEN);
        }
      });
    }

    let timer=null;
    function start(){ if(timer) return; timer=setInterval(tick, config.tick); }
    function stop(){ clearInterval(timer); timer=null; }
    watch(()=>config.tick, ()=>{ stop(); if(running.value) start(); });
    watch(running,(v)=>{ v?start():stop(); });

    function reseed(){
      stop();
      peers.value=makePeers(seed.value+Math.random().toFixed(3));
      ledger.value=[];
      tickCounter.value=0;
      globalFence.value=1;
      particles.value=[];
      if(running.value) start();
    }
    function pickLeader(){
      const alive=peers.value.filter(p=>!p.statuses.has(STATUS.PARTITION));
      if(!alive.length)return;
      const pick=alive[Math.floor(Math.random()*alive.length)];
      globalFence.value+=1;
      dispatch({type:'LEAD_ELECTION',idx:pick.idx});
    }
    function togglePartition(p){ dispatch({type:'CHAOS_PARTITION',idx:p.idx}); }

    onMounted(()=>{
      start();
      window.addEventListener('keydown', onKey);
    });
    onUnmounted(()=>{
      stop();
      window.removeEventListener('keydown',onKey);
    });
    function onKey(e){
      if(e.key===' '){ e.preventDefault(); running.value=!running.value; }
      if(e.key==='r') reseed();
      if(e.key==='l') pickLeader();
      if(e.key==='p' && peers.value[selected.value]) togglePartition(peers.value[selected.value]);
    }

    // compute arc positions for SVG gossip arcs
    const ringGeom=computed(()=>{
      const n=peers.value.length, cx=0, cy=0, r=140;
      return peers.value.map((p,i)=>{
        const a=i/n*Math.PI*2 - Math.PI/2;
        return {x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r, a};
      });
    });

    const selPeer=computed(()=>peers.value[selected.value]);
    const convergedPct=computed(()=>{
      let sum=0, n=peers.value.length*(peers.value.length-1)/2, pairs=0;
      for(let i=0;i<peers.value.length;i++) for(let j=i+1;j<peers.value.length;j++){
        sum+=bloomIntersect(peers.value[i].bloom, peers.value[j].bloom); pairs++;
      }
      return pairs?(sum/pairs*100):0;
    });

    return {
      seed,config,peers,ledger,selected,running,tickCounter,particles,globalFence,
      ringGeom,selPeer,convergedPct,STATUS,
      log,dispatch,tick,start,stop,reseed,pickLeader,togglePartition
    };
  },
  template: `
  <div class="masthead">
    <h1>Ember Reconciliation Forge</h1>
    <span class="tag">· gossip · anti-entropy · merkle fencing</span>
    <span style="margin-left:auto" class="k-label">tick #{{tickCounter}} · fence {{globalFence}}</span>
    <span class="k-label" :style="{color: convergedPct>95?'var(--ok)':'var(--accent)'}">converged {{convergedPct.toFixed(1)}}%</span>
  </div>

  <div class="ctrl-bar">
    <button class="btn primary" @click="running=!running">{{running?'pause':'resume'}}</button>
    <button class="btn" @click="reseed">reseed</button>
    <button class="btn" @click="pickLeader">elect leader</button>
    <button class="btn danger" v-if="selPeer" @click="togglePartition(selPeer)">toggle partition on {{selPeer.id}}</button>
    <span class="slider-row"><label>seed</label><input v-model="seed" @keydown.enter="reseed" style="background:#16100a;color:var(--glow);border:1px solid var(--line);padding:4px 8px;font-family:monospace"/></span>
    <span class="slider-row"><label>tick ms</label><input type="range" min="150" max="2000" step="50" v-model.number="config.tick"/><span class="v">{{config.tick}}</span></span>
    <span class="slider-row"><label>fanout</label><input type="range" min="1" max="4" v-model.number="config.fanOut"/><span class="v">{{config.fanOut}}</span></span>
    <span class="slider-row"><label>chaos</label><input type="range" min="0" max="0.5" step="0.01" v-model.number="config.chaosRate"/><span class="v">{{(config.chaosRate*100).toFixed(0)}}%</span></span>
    <span class="slider-row"><label>high/low</label><input type="range" min="4" max="16" v-model.number="config.highWater"/><span class="v">{{config.highWater}}/{{config.lowWater}}</span></span>
  </div>

  <div class="stage">
    <div class="arena">
      <svg class="arc-svg" :viewBox="'-300 -200 600 400'">
        <circle cx="0" cy="0" :r="140" fill="none" stroke="#3a2a1c" stroke-dasharray="2 4"/>
        <circle cx="0" cy="0" :r="100" fill="none" stroke="#2a1a10"/>
        <circle cx="0" cy="0" :r="180" fill="none" stroke="#3a2a1c" stroke-dasharray="1 6"/>
        <g v-for="(g,i) in ringGeom" :key="'peer-'+i">
          <circle :cx="g.x" :cy="g.y" r="22"
            :fill="peers[i].statuses.has('partition')?'#3a1a10':'#2a1a10'"
            :stroke="i===selected?'#f0a050':'#3a2a1c'" stroke-width="2"
            @click="selected=i" style="cursor:pointer"/>
          <text :x="g.x" :y="g.y+4" text-anchor="middle" fill="#f0d0a0" font-size="11" font-family="monospace" style="pointer-events:none">{{peers[i].id.slice(0,3)}}</text>
          <circle :cx="g.x" :cy="g.y-28" r="3" :fill="peers[i].statuses.has('fence')?'#ffcc88':'transparent'"/>
        </g>
        <g v-for="p in particles" :key="p.id">
          <line :x1="ringGeom[p.from]?.x" :y1="ringGeom[p.from]?.y"
                :x2="ringGeom[p.to]?.x" :y2="ringGeom[p.to]?.y"
                stroke="#f0a050" stroke-opacity="0.45" stroke-width="1.2"/>
        </g>
        <text x="0" y="0" text-anchor="middle" fill="#c87028" font-size="10" font-family="Georgia" style="font-style:italic">hearth</text>
      </svg>
      <!-- parallax-sine-silhouette-horizon inspired backdrop -->
      <svg class="silhouette" viewBox="0 0 800 120" preserveAspectRatio="none">
        <path d="M0,60 Q100,30 200,50 T400,40 T600,55 T800,45 L800,120 L0,120Z" fill="#0f0a06" opacity="0.8"/>
        <path d="M0,80 Q120,55 240,75 T480,65 T720,75 T800,70 L800,120 L0,120Z" fill="#1a0f08" opacity="0.7"/>
        <path d="M0,100 Q80,85 160,95 T320,90 T560,100 T800,95 L800,120 L0,120Z" fill="#2a1a10" opacity="0.6"/>
      </svg>
    </div>

    <div class="sideboard">
      <h2>Lantern peers</h2>
      <div class="lantern-grid">
        <div v-for="(p,i) in peers" :key="p.id"
             :class="['lantern', {sel:i===selected, partition:p.statuses.has('partition'), degraded:p.statuses.has('burn'), down:p.statuses.has('partition')}]"
             @click="selected=i" :style="{filter:'hue-rotate('+p.hue+'deg)'}">
          <h4><span class="flame"/>{{p.id}}
            <span v-if="p.statuses.has('fence')" class="badge lead">lead</span>
            <span v-if="p.statuses.has('burn')" class="badge slow">slow</span>
            <span v-if="p.statuses.has('partition')" class="badge partition">x</span>
          </h4>
          <div class="stats">
            keys {{p.keys.length}} · queue {{p.queueDepth}} / {{config.highWater}}<br/>
            epoch {{p.epoch}} · fence {{p.fence}}<br/>
            hlc ({{p.hlc.logical}})
          </div>
          <div class="bar"><span :style="{width:Math.min(100,p.queueDepth/config.highWater*100)+'%'}"/></div>
        </div>
      </div>

      <h3>Selected peer</h3>
      <div v-if="selPeer">
        <div class="gauge">
          <div class="cell"><div class="lbl">keys</div><div class="val">{{selPeer.keys.length}}</div></div>
          <div class="cell"><div class="lbl">outbox</div><div class="val">{{selPeer.pendingOutbox.length}}</div></div>
          <div class="cell"><div class="lbl">queue</div><div class="val">{{selPeer.queueDepth}}</div></div>
          <div class="cell"><div class="lbl">fence</div><div class="val">{{selPeer.fence}}</div></div>
        </div>
        <div style="margin-top:8px">
          <span v-for="s in Array.from(selPeer.statuses)" :key="s" :class="'status-chip '+s">{{s}}</span>
          <span v-if="!selPeer.statuses.size" class="status-chip ok">ok</span>
        </div>
      </div>

      <h3>Reconciliation ledger</h3>
      <div class="ledger">
        <div v-for="(e,i) in ledger" :key="i" :class="'ev '+e.t">
          <span style="opacity:.6">#{{e.ts}}</span> · {{e.m}}
        </div>
      </div>
      <p style="color:var(--ink-dim);font-size:11px;font-style:italic;margin-top:10px">keys: <span class="k-label">space</span> pause · <span class="k-label">r</span> reseed · <span class="k-label">l</span> elect · <span class="k-label">p</span> partition selected</p>
    </div>
  </div>
  `
}).mount('#app');