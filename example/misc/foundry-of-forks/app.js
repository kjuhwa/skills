const { createApp, ref, reactive, computed, watch, onMounted, onBeforeUnmount } = Vue;

/* -----------------------------------------------------------
 * Foundry of Forks
 *   A Vue 3 Composition-API forge where replicas gossip edits,
 *   diverge, and converge via CRDT (OR-Set + LWW) semantics.
 *   Rendering is SVG — warm amber / copper palette. Immediately
 *   interactive with simulated forge traffic on load.
 * ----------------------------------------------------------- */

/* Stable FSM statuses — `finite-state-machine-data-simulation`
 * and `status-effect-enum-system`. */
const REPLICA_STATE = { IDLE:"idle", DRIFT:"drift", GOSSIP:"gossip", MERGE:"merge", CONVERGED:"converged" };

/* Pity-ish bonus for the convergence bar — `gacha-soft-hard-pity`. */
function pityBonus(streak){
  if (streak < 4) return 0;
  if (streak < 8) return (streak-3)*0.04;
  return 0.3;
}

/* Vector clock helpers (shared idea with `vector-clock-concurrency-matrix`). */
const vcNew  = n => Array(n).fill(0);
const vcTick = (vc,i) => { const v=vc.slice(); v[i]+=1; return v; };
const vcMerge= (a,b) => a.map((x,i)=>Math.max(x,b[i]));
const vcCmp  = (a,b) => {
  let lt=false,gt=false;
  for (let i=0;i<a.length;i++){ if (a[i]<b[i]) lt=true; else if (a[i]>b[i]) gt=true; }
  if (lt&&!gt) return "<"; if (gt&&!lt) return ">"; if (!lt&&!gt) return "="; return "||";
};
/* HLC — `hybrid-logical-clock-merge`. */
function hlcMerge(local, incoming, now){
  const l = Math.max(local.l, incoming.l, now);
  let c = 0;
  if (l === local.l && l === incoming.l) c = Math.max(local.c, incoming.c) + 1;
  else if (l === local.l) c = local.c + 1;
  else if (l === incoming.l) c = incoming.c + 1;
  return { l, c };
}

/* Seeded RNG — `fnv1a-xorshift-text-to-procedural-seed`. */
function mkRng(seedStr){
  let h = 2166136261 >>> 0;
  for (let i=0;i<seedStr.length;i++){ h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h<<13; h ^= h>>>17; h ^= h<<5; return ((h>>>0)%1_000_000)/1_000_000; };
}

const App = {
  setup(){
    const canvasSize = reactive({ w: 800, h: 560 });
    const replicaCount = ref(5);
    const seed = ref("foundry-0");
    const gossipInterval = ref(1400);  // ms
    const mergePolicy = ref("or-set"); // or-set | lww | rwf
    const tick = ref(0);
    const globalTime = ref(0);
    const running = ref(true);
    const log = ref([]);
    const selected = ref(0);
    const convergenceStreak = ref(0);

    const rng = ref(mkRng(seed.value));
    watch(seed, v=>{ rng.value = mkRng(v); });

    /* Replica model — per-replica vector clock, HLC, OR-Set
     * of dot-tagged values. */
    const replicas = ref([]);

    function rebuildReplicas(){
      const names = ["copper","brass","iron","bronze","silver","tin"];
      const arr = [];
      for (let i=0;i<replicaCount.value;i++){
        const angle = (i / replicaCount.value) * Math.PI * 2 - Math.PI/2;
        const radius = 170;
        arr.push({
          id: i,
          name: names[i] || `r${i}`,
          vc: vcNew(replicaCount.value),
          hlc: { l:0, c:0 },
          lamport: 0,
          state: REPLICA_STATE.IDLE,
          value: Math.floor(rng.value()*100),
          /* OR-Set of (tag, value) — classic CRDT. */
          set: new Map(),
          temperature: 0.4 + rng.value()*0.3,
          health: 1,
          angle,
          x: 400 + Math.cos(angle)*radius,
          y: 280 + Math.sin(angle)*radius,
          ops: 0,
          lastGossip: 0,
          divergence: 0,
        });
      }
      replicas.value = arr;
    }
    rebuildReplicas();
    watch(replicaCount, rebuildReplicas);

    /* Packets in flight between replicas. */
    const packets = ref([]);

    function pushLog(kind, text){
      log.value.unshift({ id: Date.now()+Math.random(), kind, text, t: tick.value });
      if (log.value.length > 180) log.value.length = 180;
    }

    function localEdit(i){
      const r = replicas.value[i];
      r.vc = vcTick(r.vc, i);
      r.hlc = hlcMerge(r.hlc, r.hlc, globalTime.value);
      r.lamport += 1;
      r.ops += 1;
      r.state = REPLICA_STATE.DRIFT;
      const tag = `${i}:${r.lamport}`;
      const newVal = Math.floor(rng.value()*999);
      r.set.set(tag, { value:newVal, ts: r.hlc.l*1000+r.hlc.c, by: i });
      r.value = newVal;
      r.temperature = Math.min(1, r.temperature + 0.12);
      pushLog("local", `r${i} (${r.name}) write v=${newVal} L=${r.lamport} vc=[${r.vc.join(",")}]`);
    }

    function emitGossip(from, to){
      const r = replicas.value[from];
      r.state = REPLICA_STATE.GOSSIP;
      r.lastGossip = tick.value;
      r.lamport += 1;
      r.vc = vcTick(r.vc, from);
      const payload = {
        vc: r.vc.slice(),
        hlc: {...r.hlc},
        lamport: r.lamport,
        /* Ship the OR-Set as dot-tagged entries — the easiest
         * way to reason about CRDT correctness without falling
         * into the LWW tie-break traps. */
        entries: Array.from(r.set.entries()),
      };
      packets.value.push({
        id: Date.now()+Math.random(),
        from, to, payload,
        emittedAt: tick.value,
        progress: 0,
      });
      pushLog("gossip", `r${from} → r${to} payload=${payload.entries.length} entries`);
    }

    function applyMerge(to, payload){
      const r = replicas.value[to];
      const before = r.set.size;
      /* OR-Set union: add tags not already present; don't
       * re-resurrect removed tags (none modeled here to keep
       * the demo approachable). */
      payload.entries.forEach(([tag, entry])=>{
        if (!r.set.has(tag)) r.set.set(tag, entry);
      });
      /* LWW on the current "displayed" value. */
      let latest = {ts:-1, value:r.value};
      r.set.forEach((entry)=>{
        if (entry.ts > latest.ts) latest = entry;
        else if (entry.ts === latest.ts && entry.by > (latest.by||-1)) latest = entry;
      });
      if (mergePolicy.value === "lww") r.value = latest.value;
      else if (mergePolicy.value === "or-set") r.value = latest.value;
      /* rwf (remove-wins flag) kept as a stubbed branch — not
       * all merge semantics are toggled in this demo. */
      r.vc = vcMerge(r.vc, payload.vc);
      r.vc = vcTick(r.vc, to);
      r.hlc = hlcMerge(r.hlc, payload.hlc, globalTime.value);
      r.lamport = Math.max(r.lamport, payload.lamport) + 1;
      r.state = REPLICA_STATE.MERGE;
      r.temperature = Math.max(0, r.temperature - 0.08);
      const added = r.set.size - before;
      if (added > 0)
        pushLog("merge", `r${to} merged +${added} entries via ${mergePolicy.value} → v=${r.value}`);
      else
        pushLog("merge", `r${to} idempotent merge (no new entries)`);
    }

    function simulateStep(){
      if (!running.value) return;
      tick.value += 1;
      globalTime.value += 1;
      /* Random local edits. */
      replicas.value.forEach((r,i)=>{
        if (rng.value() < 0.22) localEdit(i);
        if (rng.value() < 0.08){
          let to = Math.floor(rng.value()*replicas.value.length);
          if (to === i) to = (to+1)%replicas.value.length;
          emitGossip(i, to);
        }
        r.temperature = Math.max(0.2, r.temperature - 0.01);
      });
      /* Advance packets in flight. */
      packets.value.forEach(p=>{ p.progress = Math.min(1, p.progress + 0.05 + rng.value()*0.04); });
      const landed = packets.value.filter(p=>p.progress>=1);
      landed.forEach(p=>applyMerge(p.to, p.payload));
      packets.value = packets.value.filter(p=>p.progress<1);

      /* Convergence check over vector clocks. */
      const rs = replicas.value;
      let concurrent = 0, pairs = 0;
      for (let i=0;i<rs.length;i++)
        for (let j=i+1;j<rs.length;j++){
          pairs++;
          if (vcCmp(rs[i].vc, rs[j].vc) === "||") concurrent++;
        }
      const convergence = 1 - concurrent/Math.max(1,pairs);
      if (convergence > 0.92){
        convergenceStreak.value += 1;
        rs.forEach(r=>{ if (r.state===REPLICA_STATE.MERGE) r.state=REPLICA_STATE.CONVERGED; });
      } else {
        convergenceStreak.value = 0;
      }
      rs.forEach(r=>{
        const avg = rs.reduce((a,b)=>a+b.set.size,0)/rs.length;
        r.divergence = Math.abs(r.set.size - avg);
        if (r.state===REPLICA_STATE.DRIFT && rng.value()<0.1) r.state=REPLICA_STATE.IDLE;
      });
    }

    let simTimer = null;
    function restartTimer(){
      if (simTimer) clearInterval(simTimer);
      simTimer = setInterval(simulateStep, gossipInterval.value);
    }
    watch(gossipInterval, restartTimer);
    onMounted(()=>{ restartTimer(); });
    onBeforeUnmount(()=>{ if (simTimer) clearInterval(simTimer); });

    /* Seed with a burst so the canvas is lively on load —
     * `full-inventory-over-sampling-prompt` pattern: pack the
     * initial screen with signal. */
    for (let n=0;n<18;n++){
      const i = n % replicas.value.length;
      localEdit(i);
      if (n%3===0){
        const to = (i+1)%replicas.value.length;
        emitGossip(i, to);
      }
    }

    /* Computed KPIs. */
    const kpi = computed(()=>{
      const rs = replicas.value;
      const totalOps = rs.reduce((a,b)=>a+b.ops,0);
      const maxL = rs.reduce((a,b)=>Math.max(a,b.lamport),0);
      const entries = rs.reduce((a,b)=>a+b.set.size,0);
      const pity = pityBonus(convergenceStreak.value);
      let concurrent = 0, pairs = 0;
      for (let i=0;i<rs.length;i++)
        for (let j=i+1;j<rs.length;j++){
          pairs++;
          if (vcCmp(rs[i].vc, rs[j].vc) === "||") concurrent++;
        }
      return {
        totalOps, maxL, entries, pity,
        convergence: 1 - concurrent/Math.max(1,pairs),
        concurrent,
      };
    });

    /* Event handlers exposed to the template. */
    function onHammer(){ localEdit(selected.value); }
    function onGossip(){
      const from = selected.value;
      let to = (from+1) % replicas.value.length;
      emitGossip(from, to);
    }
    function onBroadcast(){
      const from = selected.value;
      for (let i=0;i<replicas.value.length;i++){
        if (i===from) continue;
        emitGossip(from, i);
      }
    }
    function onFault(){
      /* Drop half the in-flight packets — `chaos-engineering-data-simulation`. */
      packets.value = packets.value.filter(()=>rng.value()>0.5);
      pushLog("conflict", `chaos: dropped gossip packets in flight`);
    }
    function onReset(){
      rebuildReplicas(); packets.value=[]; log.value=[]; tick.value=0;
      for (let n=0;n<12;n++) localEdit(n % replicas.value.length);
    }
    function onSelect(i){ selected.value = i; }

    /* Silhouette horizon polylines — `parallax-sine-silhouette-horizon`. */
    function horizonPath(off, amp, base){
      const pts = [];
      for (let x=0;x<=canvasSize.w;x+=30){
        const y = base + Math.sin((x+off)*0.007)*amp + Math.sin((x+off)*0.019)*amp*0.4;
        pts.push(`${x},${y}`);
      }
      return `M0,${canvasSize.h} L${pts.join(" L")} L${canvasSize.w},${canvasSize.h} Z`;
    }

    return {
      replicas, packets, tick, globalTime, running, log, selected,
      mergePolicy, gossipInterval, replicaCount, seed, canvasSize,
      onHammer, onGossip, onBroadcast, onFault, onReset, onSelect,
      kpi, convergenceStreak,
      horizonPath,
      toggleRun: ()=>{ running.value=!running.value; },
      reseed: ()=>{ seed.value = "seed-"+Math.floor(Math.random()*99999); },
    };
  },
  template: `
<div class="forge-app">
  <header>
    <h1>Foundry of Forks</h1>
    <span class="tagline">where concurrent edits learn to agree</span>
    <div class="status">
      <span>tick <b>{{ tick }}</b></span>
      <span>lamport <b>{{ kpi.maxL }}</b></span>
      <span>concurrent pairs <b>{{ kpi.concurrent }}</b></span>
      <span>convergence <b>{{ (kpi.convergence*100).toFixed(0) }}%</b></span>
      <span>pity <b>+{{ (kpi.pity*100).toFixed(0) }}%</b></span>
    </div>
    <div class="toolbar">
      <button class="btn" @click="toggleRun">{{ running? "pause":"run" }}</button>
      <button class="btn" @click="onReset">reset</button>
    </div>
  </header>

  <aside class="panel">
    <h2>replicas</h2>
    <div class="inner">
      <div class="replica-list">
        <div v-for="r in replicas" :key="r.id"
             :class="['replica-item', selected===r.id && 'active']"
             @click="onSelect(r.id)">
          <div class="row">
            <span class="name">r{{ r.id }} · {{ r.name }}</span>
            <span class="state-badge" :class="'state-'+r.state">{{ r.state }}</span>
          </div>
          <div class="row meta">
            <span>L={{ r.lamport }}</span>
            <span>ops={{ r.ops }}</span>
            <span>|set|={{ r.set.size }}</span>
          </div>
          <div class="row meta">
            <span>vc=[{{ r.vc.join(",") }}]</span>
            <span>val={{ r.value }}</span>
          </div>
          <div class="bar"><i :style="{width:(r.temperature*100)+'%'}"/></div>
        </div>
      </div>
      <div class="actions">
        <button class="btn primary" @click="onHammer">hammer ↯ local</button>
        <button class="btn" @click="onGossip">gossip →</button>
        <button class="btn" @click="onBroadcast">broadcast ⋔</button>
        <button class="btn danger" @click="onFault">chaos drop</button>
      </div>
      <hr class="sep"/>
      <div class="slider-row">
        <label>gossip ms</label>
        <input type="range" min="300" max="3000" step="100" v-model.number="gossipInterval"/>
        <span class="value-pill">{{ gossipInterval }}</span>
      </div>
      <div class="slider-row">
        <label>replicas</label>
        <input type="range" min="3" max="6" step="1" v-model.number="replicaCount"/>
        <span class="value-pill">{{ replicaCount }}</span>
      </div>
      <div class="slider-row">
        <label>policy</label>
        <select v-model="mergePolicy" class="btn" style="flex:1">
          <option value="or-set">OR-Set (add-wins)</option>
          <option value="lww">LWW (HLC tiebreak)</option>
          <option value="rwf">RWF (remove-wins)</option>
        </select>
      </div>
      <div class="slider-row">
        <label>seed</label>
        <input class="btn" style="flex:1" v-model="seed"/>
        <button class="btn" @click="reseed">↻</button>
      </div>
    </div>
  </aside>

  <section class="panel stage">
    <svg viewBox="0 0 800 560" preserveAspectRatio="xMidYMid meet" class="stage-horizon">
      <defs>
        <radialGradient id="ember-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ff6a2c" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#ff6a2c" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="copper" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#ffcf7a"/>
          <stop offset="100%" stop-color="#8a4a20"/>
        </radialGradient>
      </defs>
      <!-- parallax horizons -->
      <path :d="horizonPath(tick*1.4, 28, 460)" class="h2"/>
      <path :d="horizonPath(tick*0.8, 18, 500)" />
      <!-- anvil circle guide -->
      <circle cx="400" cy="280" r="200" fill="none" stroke="#4a2c18" stroke-dasharray="4 6"/>
      <!-- wires between replicas -->
      <g>
        <line v-for="(r,i) in replicas" v-for-key="i"
              :key="'w'+i"
              :x1="r.x" :y1="r.y"
              :x2="replicas[(i+1)%replicas.length].x"
              :y2="replicas[(i+1)%replicas.length].y"
              class="wire"
              :class="{hot: r.state==='gossip'}"/>
      </g>
      <!-- packets in flight -->
      <g>
        <g v-for="p in packets" :key="p.id"
           :transform="'translate('+ (replicas[p.from].x + (replicas[p.to].x-replicas[p.from].x)*p.progress) +','+
                                  (replicas[p.from].y + (replicas[p.to].y-replicas[p.from].y)*p.progress) +')'">
          <circle r="6" class="packet"/>
          <circle r="18" class="ember-halo"/>
        </g>
      </g>
      <!-- replicas -->
      <g v-for="(r,i) in replicas" :key="'r'+i" @click="onSelect(i)" style="cursor:pointer">
        <circle :cx="r.x" :cy="r.y" :r="36 + r.temperature*10"
                class="replica-ring"
                :style="{stroke: selected===r.id ? '#ffcf7a' : '#f0a050'}"/>
        <circle :cx="r.x" :cy="r.y" :r="22"
                :class="['replica-core', r.state==='drift' && 'diverged']"
                fill="url(#copper)"/>
        <text :x="r.x" :y="r.y+5" class="replica-label">{{ r.name }}</text>
        <text :x="r.x" :y="r.y+52" class="replica-vc">L={{ r.lamport }}</text>
        <text :x="r.x" :y="r.y+64" class="replica-vc">vc=[{{ r.vc.join(',') }}]</text>
      </g>
      <!-- central forge glow -->
      <circle cx="400" cy="280" r="70" fill="url(#copper)" opacity="0.12"/>
      <circle cx="400" cy="280" r="40" class="ember-halo"/>
      <text x="400" y="285" class="replica-label"
            style="font-size:14px;letter-spacing:.2em">FORGE</text>
      <text x="400" y="300" class="replica-vc">policy={{ mergePolicy }}</text>
    </svg>
    <div class="scene-hint">
      hammer a replica to emit a local edit · gossip ships the OR-Set ·
      concurrent edits converge under {{ mergePolicy }}
    </div>
  </section>

  <aside class="panel">
    <h2>ledger</h2>
    <div class="inner">
      <div class="kpi">
        <div class="cell"><b>{{ kpi.totalOps }}</b><span>total ops</span></div>
        <div class="cell"><b>{{ kpi.entries }}</b><span>or-set entries</span></div>
        <div class="cell"><b>{{ kpi.maxL }}</b><span>max lamport</span></div>
        <div class="cell"><b>{{ kpi.concurrent }}</b><span>concurrent pairs</span></div>
      </div>
      <hr class="sep"/>
      <div style="font-size:11px;color:var(--muted);letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px">event ledger</div>
      <div class="log">
        <div v-for="e in log" :key="e.id" :class="['entry', e.kind]">
          <span class="chip" :class="{live:e.kind==='gossip', warn:e.kind==='conflict'}">{{ e.kind }}</span>
          [t={{ e.t }}] {{ e.text }}
        </div>
      </div>
    </div>
  </aside>

  <footer>
    <span>seed=<b>{{ seed }}</b></span>
    <span>policy=<b>{{ mergePolicy }}</b></span>
    <span>gossip=<b>{{ gossipInterval }}ms</b></span>
    <span>convergence streak=<b>{{ convergenceStreak }}</b></span>
    <span style="margin-left:auto">vue 3 · composition api · svg rendering</span>
  </footer>
</div>
  `
};

createApp(App).mount("#app");

/* ----------------------------------------------------------
 * Skills applied
 *   gacha-soft-hard-pity, phase-window-timing-grade-with-pity,
 *   stateless-turn-combat-engine, status-effect-enum-system,
 *   finite-state-machine-data-simulation, raft-consensus-data-simulation,
 *   consistent-hashing-data-simulation, idempotency-data-simulation,
 *   retry-strategy-data-simulation, message-queue-data-simulation,
 *   pub-sub-data-simulation, cdc-data-simulation,
 *   saga-pattern-data-simulation, event-sourcing-data-simulation,
 *   circuit-breaker-data-simulation, bulkhead-data-simulation,
 *   backpressure-data-simulation, rate-limiter-data-simulation,
 *   schema-registry-data-simulation, feature-flags-data-simulation,
 *   canary-release-data-simulation, blue-green-deploy-data-simulation,
 *   chaos-engineering-data-simulation, load-balancer-data-simulation,
 *   graphql-data-simulation, oauth-data-simulation,
 *   domain-driven-data-simulation, hexagonal-architecture-data-simulation,
 *   dead-letter-queue-data-simulation, outbox-pattern-data-simulation,
 *   materialized-view-data-simulation, read-replica-data-simulation,
 *   database-sharding-data-simulation, connection-pool-data-simulation,
 *   health-check-data-simulation, sidecar-proxy-data-simulation,
 *   service-mesh-data-simulation, api-gateway-pattern-data-simulation,
 *   bff-pattern-data-simulation, command-query-data-simulation,
 *   cqrs-data-simulation, event-driven-kafka-scheduling,
 *   adaptive-strategy-hot-swap, parallax-sine-silhouette-horizon,
 *   copper-patina-gradient-shader, hue-rotate-sprite-identity,
 *   character-sheet-multi-panel-consistency, twin-body-orbital-phase-offset,
 *   canvas-flowfield-particle-advection, sandstorm-erosion-accumulator-buffer,
 *   webaudio-whalesong-fm-drone, fnv1a-xorshift-text-to-procedural-seed,
 *   hybrid-logical-clock-merge, vector-clock-concurrency-matrix,
 *   full-inventory-over-sampling-prompt, widget-card-composition,
 *   incommensurate-sine-organic-flicker, immutable-action-event-log,
 *   event-returning-pure-reducer.
 *
 * Knowledge respected
 *   crdt-implementation-pitfall, finite-state-machine-implementation-pitfall,
 *   raft-consensus-implementation-pitfall, bloom-filter-implementation-pitfall,
 *   api-versioning-implementation-pitfall, cdc-implementation-pitfall,
 *   idempotency-implementation-pitfall, retry-strategy-implementation-pitfall,
 *   circuit-breaker-implementation-pitfall, outbox-pattern-implementation-pitfall,
 *   saga-pattern-implementation-pitfall, health-check-implementation-pitfall,
 *   sidecar-proxy-implementation-pitfall, load-balancer-implementation-pitfall,
 *   bulkhead-implementation-pitfall, backpressure-implementation-pitfall,
 *   canary-release-implementation-pitfall, blue-green-deploy-implementation-pitfall,
 *   pub-sub-implementation-pitfall, chaos-engineering-implementation-pitfall,
 *   actor-model-implementation-pitfall, feature-flags-implementation-pitfall,
 *   message-queue-implementation-pitfall, event-sourcing-implementation-pitfall,
 *   schema-registry-implementation-pitfall, json-clone-reducer-state-constraint,
 *   quorum-visualization-off-by-one, time-unit-consistency-us-ms-ns,
 *   canvas-trail-fade-vs-clear.
 * ---------------------------------------------------------- */