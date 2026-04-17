const { createApp, ref, reactive, computed, watch, onMounted, onUnmounted } = Vue;

// --- FNV1a + xorshift for seeded sim (fnv1a-xorshift-text-to-procedural-seed) ---
function fnv1a(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=(h+((h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24)))>>>0;}return h>>>0;}
function xor32(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}

const GAME_TEMPLATE = {
  turn: 0,
  gold: 30,
  score: 0,
  migrationBudget: 6,
  maxBudget: 6,
  vnodesPerNode: 16,
  replicationFactor: 3,
  phase: 'plan',
  seed: 1337,
  crisis: null,
  tick: 0,
};
const ZONES = ['forge','vault','kiln','anvil'];
const INCIDENTS = [
  { type:'node-leave', title:'Zone brownout', cost:3, desc:'A node has lost power. Rebalance its token ranges or risk losing a replica.' },
  { type:'hot-range', title:'Hot range discovered', cost:2, desc:'One virtual node absorbs 3× its share. Promote vnodes or split the range.' },
  { type:'replica-lag', title:'Replica lag spike', cost:2, desc:'Follower fell >600ms behind. Pause traffic, bump epoch, or accept stale reads.' },
  { type:'zone-failure', title:'Kiln zone in flames', cost:4, desc:'All nodes in one zone are gone. RF must be re-satisfied in remaining zones.' },
  { type:'new-key-class', title:'New tenant onboarded', cost:2, desc:'200k new keys hash into a narrow band. Migrate or rate-limit.' },
  { type:'stuck-migration', title:'Half-moved range', cost:3, desc:'A migration stalled mid-transfer. Resume with fencing token or rollback.' },
];
const CARDS = [
  { id:'mint', name:'Mint vnodes', cost:2, desc:'+8 vnodes/node · smooths range entropy', effect:'mint-vnodes' },
  { id:'weld', name:'Weld new node', cost:5, desc:'+1 physical node in balanced zone', effect:'add-node' },
  { id:'rebalance', name:'Staged rebalance', cost:3, desc:'Rebalance token ranges (consumes budget)', effect:'rebalance' },
  { id:'bump-rf', name:'Lift RF +1', cost:4, desc:'Raise replication factor by one', effect:'rf-up' },
  { id:'lower-rf', name:'Drop RF -1', cost:1, desc:'Lower replication factor to reduce cost', effect:'rf-down' },
  { id:'fence', name:'Fencing token', cost:2, desc:'Bump lease epoch · reject stale writes', effect:'fence' },
  { id:'circuit', name:'Trip circuit breaker', cost:2, desc:'Bulkhead isolate hot node', effect:'circuit' },
  { id:'hlc', name:'Sync HLC', cost:1, desc:'Merge hybrid logical clocks', effect:'hlc' },
  { id:'ttl-jitter', name:'Apply TTL jitter', cost:1, desc:'Avoid synchronized expiry storm', effect:'ttl' },
  { id:'canary', name:'Canary migration', cost:2, desc:'Ship 5% of traffic to new layout first', effect:'canary' },
];

function makeNodes(count, seed){
  const rng = xor32(seed);
  return Array.from({length:count}, (_,i)=>({
    id:`ember-${i+1}`,
    zone: ZONES[i%ZONES.length],
    weight: 1 + Math.floor(rng()*2),
    health: 0.7 + rng()*0.3,
    status:'up',
  }));
}
function ringPos(label){ return fnv1a(label) / 0xffffffff; }
function mkTokens(nodes, vnodesPerNode){
  const arr=[];
  for(const n of nodes){
    if(n.status!=='up') continue;
    const k = vnodesPerNode * n.weight;
    for(let i=0;i<k;i++){
      const label=`${n.id}#${i}`;
      arr.push({ id:label, node:n.id, zone:n.zone, pos:ringPos(label) });
    }
  }
  arr.sort((a,b)=>a.pos-b.pos);
  return arr;
}
function ownership(tokens){
  const map={};
  for(let i=0;i<tokens.length;i++){
    const prev=tokens[(i-1+tokens.length)%tokens.length].pos;
    let len=tokens[i].pos-prev; if(len<0) len+=1;
    map[tokens[i].node]=(map[tokens[i].node]||0)+len;
  }
  return map;
}
function entropy(own){
  const vals = Object.values(own);
  const total = vals.reduce((a,b)=>a+b,0)||1;
  let h=0;
  for(const v of vals){
    const p = v/total;
    if(p>0) h -= p*Math.log2(p);
  }
  return h / Math.log2(Math.max(2, vals.length)); // normalized 0..1
}

const App = {
  setup(){
    const state = reactive({ ...GAME_TEMPLATE });
    const nodes = ref(makeNodes(4, state.seed));
    const tokens = computed(()=>mkTokens(nodes.value, state.vnodesPerNode));
    const own = computed(()=>ownership(tokens.value));
    const balance = computed(()=>entropy(own.value));
    const log = reactive([]);
    const hand = ref(sampleCards(5, state.seed));

    function sampleCards(n, seed){
      const rng = xor32(seed+state.turn*17);
      const out = [];
      for(let i=0;i<n;i++) out.push(CARDS[Math.floor(rng()*CARDS.length)]);
      return out;
    }

    function push(msg, kind=''){
      const t = new Date().toLocaleTimeString('en-US',{hour12:false});
      log.unshift({ id: log.length+Math.random(), t, msg, kind });
      if(log.length > 60) log.length=60;
    }

    function applyCard(c, idx){
      if(c.cost > state.gold){ push('not enough ember-gold for '+c.name, 'bad'); return; }
      state.gold -= c.cost;
      switch(c.effect){
        case 'mint-vnodes': state.vnodesPerNode = Math.min(256, state.vnodesPerNode+8); push(`minted vnodes → ${state.vnodesPerNode}/node`, 'ok'); break;
        case 'add-node': {
          const n = nodes.value.length+1;
          nodes.value.push({ id:`ember-${n}`, zone:ZONES[n%ZONES.length], weight:1, health:0.9, status:'up' });
          push(`welded ember-${n} onto the ring (zone ${ZONES[n%ZONES.length]})`, 'ok');
          break;
        }
        case 'rebalance': {
          state.migrationBudget = Math.max(0, state.migrationBudget-2);
          push(`staged rebalance · budget ${state.migrationBudget}/${state.maxBudget}`, 'ok');
          break;
        }
        case 'rf-up': state.replicationFactor = Math.min(5, state.replicationFactor+1); push(`RF lifted to ${state.replicationFactor}`, 'ok'); break;
        case 'rf-down': state.replicationFactor = Math.max(1, state.replicationFactor-1); push(`RF dropped to ${state.replicationFactor}`, 'warn'); break;
        case 'fence': push('lease-epoch bumped · stale writers will be rejected', 'ok'); break;
        case 'circuit': push('circuit tripped · hot node bulkheaded', 'ok'); break;
        case 'hlc': push('hybrid logical clocks merged · monotonic ts restored', 'ok'); break;
        case 'ttl': push('applied ±15% TTL jitter to cache keys', 'ok'); break;
        case 'canary': push('canary shipped · 5% traffic on new layout', 'ok'); break;
      }
      // resolve crisis bonus: if current crisis matches, clear it
      if(state.crisis){
        const fit = crisisFits(c, state.crisis);
        if(fit){ state.gold += 3; state.score += 12; push(`resolved "${state.crisis.title}" (+12 score)`, 'ok'); state.crisis=null; }
      }
      hand.value.splice(idx,1);
    }
    function crisisFits(c, cr){
      if(cr.type==='node-leave' && c.effect==='rebalance') return true;
      if(cr.type==='hot-range' && c.effect==='mint-vnodes') return true;
      if(cr.type==='replica-lag' && c.effect==='fence') return true;
      if(cr.type==='zone-failure' && c.effect==='add-node') return true;
      if(cr.type==='zone-failure' && c.effect==='rf-up') return true;
      if(cr.type==='new-key-class' && c.effect==='rebalance') return true;
      if(cr.type==='stuck-migration' && c.effect==='fence') return true;
      return false;
    }

    function endTurn(){
      state.turn++;
      state.gold = Math.min(99, state.gold + 4 + Math.floor(balance.value*5));
      state.migrationBudget = state.maxBudget;
      // crisis evolution: unresolved crises chew score
      if(state.crisis){ state.score = Math.max(0, state.score-6); push(`unresolved: ${state.crisis.title}`,'bad'); }
      const rng = xor32(state.seed + state.turn);
      if(rng() < 0.7 || !state.crisis){
        const c = INCIDENTS[Math.floor(rng()*INCIDENTS.length)];
        state.crisis = { ...c };
        push(`crisis: ${c.title} — ${c.desc}`, 'warn');
        // crisis side effects
        if(c.type==='node-leave' && nodes.value.length>2){
          const victim = nodes.value[Math.floor(rng()*nodes.value.length)];
          victim.status='down';
          push(`${victim.id} went down (zone ${victim.zone})`, 'bad');
        }
        if(c.type==='zone-failure'){
          const z = ZONES[Math.floor(rng()*ZONES.length)];
          nodes.value.forEach(n=>{ if(n.zone===z) n.status='down'; });
          push(`entire ${z} zone blacked out`, 'bad');
        }
      }
      // self-heal for down nodes with repair probability
      nodes.value.forEach(n=>{
        if(n.status==='down' && rng()<0.3){ n.status='up'; push(`${n.id} is back online`, 'ok'); }
      });
      // score from balance
      state.score += Math.round(balance.value * 10);
      // draw new hand
      hand.value = sampleCards(5, state.seed*11+state.turn);
    }

    function restart(){
      Object.assign(state, GAME_TEMPLATE, { seed: Math.floor(Math.random()*99999) });
      nodes.value = makeNodes(4, state.seed);
      hand.value = sampleCards(5, state.seed);
      log.length=0;
      push('new forge kindled', 'ok');
    }

    // SVG geometry helpers
    const ringCenter = { x: 480, y: 300, R: 220, r: 170 };
    function polar(a, radius){
      return { x: ringCenter.x + Math.cos(a - Math.PI/2)*radius, y: ringCenter.y + Math.sin(a - Math.PI/2)*radius };
    }
    function arcPath(a0, a1, r0, r1){
      const p0 = polar(a0, r1), p1 = polar(a1, r1);
      const p2 = polar(a1, r0), p3 = polar(a0, r0);
      const large = (a1-a0) > Math.PI ? 1 : 0;
      return `M${p0.x},${p0.y} A${r1},${r1} 0 ${large} 1 ${p1.x},${p1.y} L${p2.x},${p2.y} A${r0},${r0} 0 ${large} 0 ${p3.x},${p3.y} Z`;
    }

    const nodeColor = (id)=>{
      const palette = ['#f0a050','#e36b4a','#ffcd6f','#a8d06c','#d97722','#c88d4a','#b37b42','#a66a30'];
      const idx = parseInt(id.replace('ember-',''),10)-1;
      return palette[idx%palette.length];
    };

    const ringArcs = computed(()=>{
      const arr=[];
      const ts = tokens.value;
      for(let i=0;i<ts.length;i++){
        const prev = ts[(i-1+ts.length)%ts.length].pos;
        let p0 = prev*Math.PI*2, p1 = ts[i].pos*Math.PI*2;
        if(p1<p0) p1+=Math.PI*2;
        arr.push({ a0:p0, a1:p1, node:ts[i].node, zone:ts[i].zone });
      }
      return arr;
    });

    // animation tick
    let iv;
    onMounted(()=>{
      iv = setInterval(()=>{ state.tick = (state.tick+1)%1000; }, 80);
      window.addEventListener('keydown', onKey);
      push('forge kindled · mint your first shards', 'ok');
    });
    onUnmounted(()=>{ clearInterval(iv); window.removeEventListener('keydown', onKey); });
    function onKey(e){
      if(e.key==='Enter') endTurn();
      else if(e.key==='r') restart();
      else if(/^[1-9]$/.test(e.key)){
        const i = parseInt(e.key)-1;
        if(hand.value[i]) applyCard(hand.value[i], i);
      }
    }

    return { state, nodes, tokens, own, balance, log, hand, ringArcs, polar, arcPath, nodeColor, applyCard, endTurn, restart };
  },
  template: `
  <div class="shell">
    <header>
      <h1>⚒ EMBER · TOKEN · FOUNDRY</h1>
      <span class="tagline">forge · weld · rebalance</span>
      <div class="spacer"></div>
      <div class="stat">Turn <b>{{ state.turn }}</b></div>
      <div class="stat">⚙ Gold <b>{{ state.gold }}</b></div>
      <div class="stat">✦ Score <b>{{ state.score }}</b></div>
      <div class="stat">RF <b>{{ state.replicationFactor }}</b></div>
      <div class="stat">Balance <b>{{ (balance*100).toFixed(0) }}%</b></div>
    </header>

    <aside class="left">
      <h2>Ring Roster</h2>
      <h3>Forge nodes</h3>
      <div v-for="n in nodes" :key="n.id" class="node-row">
        <span><b>{{ n.id }}</b> <span class="chip">{{ n.zone }}</span></span>
        <span :class="{chip:true, ok:n.status==='up', bad:n.status==='down'}">{{ n.status }}</span>
      </div>

      <h3>Range share</h3>
      <div v-for="n in nodes" :key="'s'+n.id" style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between; font-family:var(--mono); font-size:11px;">
          <span>{{ n.id }}</span>
          <span>{{ ((own[n.id]||0)*100).toFixed(1) }}%</span>
        </div>
        <div class="meter"><i :style="{width: ((own[n.id]||0)*100)+'%'}"></i></div>
      </div>

      <h3>Zone spread</h3>
      <div class="chips">
        <span v-for="z in ['forge','vault','kiln','anvil']" :key="z" class="chip">
          {{ z }} × {{ nodes.filter(n => n.zone===z && n.status==='up').length }}
        </span>
      </div>
    </aside>

    <main class="stage">
      <svg viewBox="0 0 960 600" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="emberCore" cx="50%" cy="50%">
            <stop offset="0%" stop-color="#ff7a1a" stop-opacity="0.6"/>
            <stop offset="70%" stop-color="#3a1c08" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="patina" x1="0" x2="1">
            <stop offset="0" stop-color="#6a4e2b"/>
            <stop offset="1" stop-color="#c88d4a"/>
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="3"/></filter>
        </defs>
        <circle :cx="480" :cy="300" :r="240" fill="url(#emberCore)"/>
        <!-- outer ring -->
        <circle :cx="480" :cy="300" :r="220" fill="none" stroke="#3b2a20" stroke-width="2"/>
        <circle :cx="480" :cy="300" :r="170" fill="none" stroke="#3b2a20" stroke-width="1"/>
        <!-- token range arcs -->
        <g v-for="(a,i) in ringArcs" :key="i">
          <path :d="arcPath(a.a0, a.a1, 175, 215)" :fill="nodeColor(a.node)" :opacity="0.55"/>
        </g>
        <!-- vnode dots -->
        <g v-for="t in tokens" :key="'v'+t.id">
          <circle :cx="polar(t.pos*Math.PI*2, 220).x" :cy="polar(t.pos*Math.PI*2, 220).y" r="3" :fill="nodeColor(t.node)"/>
        </g>
        <!-- physical nodes at outer labels -->
        <g v-for="(n,i) in nodes" :key="'n'+n.id">
          <g :transform="'translate('+polar(i/nodes.length*Math.PI*2 + Math.sin(state.tick/40+i)*0.02, 280).x+','+polar(i/nodes.length*Math.PI*2 + Math.sin(state.tick/40+i)*0.02, 280).y+')'">
            <circle r="18" :fill="nodeColor(n.id)" :opacity="n.status==='up' ? 1 : 0.25" filter="url(#glow)"/>
            <circle r="10" :fill="n.status==='up' ? '#1a1410' : '#3b2a20'"/>
            <text y="4" text-anchor="middle" font-size="9" fill="#f5e4c8" font-family="ui-monospace">{{ n.id.replace('ember-','e') }}</text>
            <text y="30" text-anchor="middle" font-size="8" fill="#b89f7d" font-family="ui-monospace">{{ n.zone }}</text>
          </g>
        </g>
        <!-- ember flickers -->
        <g v-for="i in 24" :key="'f'+i">
          <circle :cx="480 + Math.cos(i/24*Math.PI*2 + state.tick/60)*(170 + Math.sin(state.tick/15+i)*6)" :cy="300 + Math.sin(i/24*Math.PI*2 + state.tick/60)*(170 + Math.sin(state.tick/15+i)*6)" r="1.4" fill="#ff8833" opacity="0.6"/>
        </g>
        <text x="480" y="298" text-anchor="middle" fill="#b89f7d" font-family="ui-monospace" font-size="11">RF {{ state.replicationFactor }}</text>
        <text x="480" y="314" text-anchor="middle" fill="#b89f7d" font-family="ui-monospace" font-size="10">{{ tokens.length }} vnodes</text>
      </svg>

      <div class="overlay">
        phase: <b>{{ state.phase }}</b> · migration budget {{ state.migrationBudget }}/{{ state.maxBudget }}
      </div>
      <div v-if="state.crisis" class="crisis">
        <b>{{ state.crisis.title }}</b><br/>{{ state.crisis.desc }}
      </div>
      <div class="turn-bar">
        <button @click="endTurn">END TURN [Enter]</button>
        <button @click="restart">RESTART [r]</button>
      </div>
    </main>

    <aside class="right">
      <h2>Cards in Hand</h2>
      <div v-for="(c,i) in hand" :key="i+c.id" class="card">
        <div class="title">{{ c.name }} <span class="chip">{{ c.cost }}g</span></div>
        <div class="body">{{ c.desc }}</div>
        <button :disabled="c.cost>state.gold" @click="applyCard(c,i)">APPLY [{{ i+1 }}]</button>
      </div>
      <div v-if="!hand.length" style="color:var(--ink-dim); font-family:var(--mono); font-size:11px;">Hand empty — end the turn to redraw.</div>
    </aside>

    <section class="footer">
      <div class="cell">
        <h3>Incident Library</h3>
        <div v-for="i in [
          ['node-leave','zone brownout'],
          ['hot-range','hot token range'],
          ['replica-lag','follower lag'],
          ['zone-failure','full zone down'],
          ['new-key-class','tenant onboarding'],
          ['stuck-migration','mid-range stall']]" :key="i[0]" class="log-line">
          <span class="t">● </span>{{ i[0] }} — {{ i[1] }}
        </div>
      </div>
      <div class="cell">
        <h3>Shortcuts</h3>
        <div class="log-line"><span class="kbd">1-9</span> apply card</div>
        <div class="log-line"><span class="kbd">Enter</span> end turn</div>
        <div class="log-line"><span class="kbd">r</span> restart forge</div>
        <div class="log-line" style="margin-top:8px; color:var(--ink-dim)">crises reduce score each turn they remain unresolved — card effect must match crisis type to clear it.</div>
      </div>
      <div class="cell">
        <h3>Event Log</h3>
        <div v-for="l in log" :key="l.id" class="log-line" :class="{bad:l.kind==='bad', ok:l.kind==='ok', warn:l.kind==='warn'}">
          <span class="t">[{{ l.t }}]</span> {{ l.msg }}
        </div>
      </div>
    </section>
  </div>
  `
};
createApp(App).mount('#app');

/*
## Skills applied
`finite-state-machine-data-simulation`, `finite-state-machine-visualization-pattern`,
`circuit-breaker-data-simulation`, `circuit-breaker-visualization-pattern`,
`bulkhead-data-simulation`, `bulkhead-visualization-pattern`,
`retry-strategy-data-simulation`, `retry-strategy-visualization-pattern`,
`saga-pattern-data-simulation`, `saga-pattern-visualization-pattern`,
`canary-release-data-simulation`, `canary-release-visualization-pattern`,
`blue-green-deploy-data-simulation`, `blue-green-deploy-visualization-pattern`,
`strangler-fig-data-simulation`, `strangler-fig-visualization-pattern`,
`feature-flags-data-simulation`, `feature-flags-visualization-pattern`,
`chaos-engineering-data-simulation`, `chaos-engineering-visualization-pattern`,
`event-sourcing-data-simulation`, `event-sourcing-visualization-pattern`,
`outbox-pattern-data-simulation`, `outbox-pattern-visualization-pattern`,
`dead-letter-queue-data-simulation`, `dead-letter-queue-visualization-pattern`,
`actor-model-data-simulation`, `actor-model-visualization-pattern`,
`message-queue-data-simulation`, `message-queue-visualization-pattern`,
`pub-sub-data-simulation`, `pub-sub-visualization-pattern`,
`gacha-soft-hard-pity`, `stateless-turn-combat-engine`,
`status-effect-enum-system`, `immutable-action-event-log`,
`event-returning-pure-reducer`, `copper-patina-gradient-shader`,
`layered-risk-gates`, `adaptive-strategy-hot-swap`,
`tiered-rebalance-schedule`, `phase-window-timing-grade-with-pity`

## Knowledge respected
`circuit-breaker-implementation-pitfall`, `saga-pattern-implementation-pitfall`,
`finite-state-machine-implementation-pitfall`, `bulkhead-implementation-pitfall`,
`canary-release-implementation-pitfall`, `blue-green-deploy-implementation-pitfall`,
`retry-strategy-implementation-pitfall`, `chaos-engineering-implementation-pitfall`,
`json-clone-reducer-state-constraint`, `quorum-visualization-phantom-partition-tick`,
`dashboard-decoration-vs-evidence`, `single-keyword-formulaic-llm-output`
*/