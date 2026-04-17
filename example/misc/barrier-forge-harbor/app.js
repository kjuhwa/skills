const { createApp, ref, reactive, computed, onMounted, onBeforeUnmount, watch, h } = Vue;

// --- constants driven by kafka-batch-consumer-partition-tuning / skip-schedule-if-previous-running
const PARTS = 6;
const STAGE_W = 980;
const STAGE_H = 520;
const HORIZON = 280;
const MAX_LOG = 120;

// deterministic rng (fnv1a-xorshift-text-to-procedural-seed)
function mulberry(seed) {
  let t = seed | 0;
  return () => {
    t |= 0; t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry(42);

// --- pure reducer — event-returning-pure-reducer / stateless-turn-combat-engine
function reduceGame(state, action) {
  const events = [];
  const next = { ...state };
  switch (action.type) {
    case 'tick': {
      const dt = action.dt;
      next.t += dt;
      // advance tide (parallax-sine-silhouette-horizon)
      next.tidePhase = (state.tidePhase + dt * 0.0006) % (Math.PI * 2);
      // producer surge per partition
      next.partitions = state.partitions.map((p) => {
        const noise = Math.sin(state.t * 0.0013 + p.id) * 0.5 + 0.5;
        const load = p.rate * (0.4 + 0.8 * noise);
        const hi = p.hi + load * dt * 0.001;
        const wm = Math.min(hi, p.wm + dt * 0.0004 * (p.aligned ? 1.2 : 0.5));
        const lag = Math.max(0, hi - wm);
        let dlq = p.dlq;
        if (rng() < 0.001 * dt) {
          dlq += 1;
          events.push({ t: next.t, kind: 'DLQ', partId: p.id, msg: `partition ${p.id} poison record shoved to DLQ` });
        }
        return { ...p, hi, wm, lag };
      });
      // drift barriers
      next.barriers = state.barriers.map((b) => ({ ...b, y: b.y + dt * 0.04 }))
        .filter((b) => b.y < STAGE_H - 20 || !b.resolved);
      // resolve barriers crossing the alignment line
      const alignY = HORIZON + 40;
      next.barriers.forEach((b) => {
        if (!b.resolved && b.y >= alignY) {
          b.resolved = true;
          // phase-window-timing-grade-with-pity-style grading
          const phase = Math.abs((b.y - alignY) - b.offset);
          let grade = 'MISS';
          if (phase < 4) grade = 'PERFECT';
          else if (phase < 10) grade = 'GREAT';
          else if (phase < 20) grade = 'GOOD';
          const gain = { PERFECT: 120, GREAT: 80, GOOD: 40, MISS: -20 }[grade];
          next.score += gain;
          next.combo = grade === 'MISS' ? 0 : next.combo + 1;
          if (grade !== 'MISS') {
            next.partitions = next.partitions.map((p) => (
              p.id === b.partId ? { ...p, aligned: true, wm: p.hi, lag: 0 } : p
            ));
          }
          events.push({ t: next.t, kind: grade, partId: b.partId, msg: `barrier B${b.id} on P${b.partId} → ${grade} (+${gain})` });
          // soft/hard pity from gacha-soft-hard-pity
          next.sincePerfect = grade === 'PERFECT' ? 0 : next.sincePerfect + 1;
        }
      });
      // circuit breaker check (circuit-breaker-visualization-pattern)
      next.partitions.forEach((p) => {
        if (p.lag > 8 && p.breaker !== 'OPEN') {
          p.breaker = 'OPEN';
          events.push({ t: next.t, kind: 'BREAK', partId: p.id, msg: `P${p.id} breaker OPEN — lag ${p.lag.toFixed(1)}s` });
        } else if (p.lag < 2 && p.breaker === 'OPEN') {
          p.breaker = 'HALF';
          events.push({ t: next.t, kind: 'HALF', partId: p.id, msg: `P${p.id} breaker HALF-OPEN probe` });
        } else if (p.lag < 1 && p.breaker === 'HALF') {
          p.breaker = 'CLOSED';
        }
      });
      // pity barrier — channels gacha-soft-hard-pity
      if (next.sincePerfect > 20 && rng() < 0.2) {
        events.push({ t: next.t, kind: 'PITY', partId: -1, msg: 'pity aligned barrier unlocked — next drop guaranteed PERFECT' });
        next.pityReady = true;
        next.sincePerfect = 0;
      }
      // topic-level checkpoint when all partitions aligned
      if (next.partitions.every((p) => p.aligned)) {
        const id = next.checkpoints.length + 1;
        next.checkpoints = [...next.checkpoints, { id, t: next.t, wm: Math.min(...next.partitions.map((p) => p.wm)) }];
        events.push({ t: next.t, kind: 'CKPT', partId: -1, msg: `global checkpoint C${id} committed` });
        next.partitions = next.partitions.map((p) => ({ ...p, aligned: false }));
      }
      return [next, events];
    }
    case 'drop': {
      const p = next.partitions[action.partId];
      const offset = next.pityReady ? 0 : (rng() - 0.5) * 30;
      next.barriers = [...state.barriers, {
        id: state.barrierSeq + 1, partId: p.id, x: action.x, y: HORIZON - 20,
        offset, resolved: false,
      }];
      next.barrierSeq = state.barrierSeq + 1;
      next.pityReady = false;
      events.push({ t: next.t, kind: 'BARRIER', partId: p.id, msg: `barrier B${next.barrierSeq} dropped on P${p.id}` });
      return [next, events];
    }
    case 'rewind': {
      const c = state.checkpoints[state.checkpoints.length - 1];
      if (!c) return [state, [{ t: state.t, kind: 'WARN', partId: -1, msg: 'no checkpoint to rewind' }]];
      next.partitions = state.partitions.map((p) => ({ ...p, wm: c.wm, hi: c.wm + 1, lag: 1, aligned: false }));
      events.push({ t: next.t, kind: 'REWIND', partId: -1, msg: `rewound all partitions to C${c.id}` });
      return [next, events];
    }
    case 'chaos': {
      const pid = Math.floor(rng() * PARTS);
      next.partitions = state.partitions.map((p) => p.id === pid
        ? { ...p, rate: Math.min(p.rate * 2, 50), aligned: false }
        : p);
      events.push({ t: next.t, kind: 'CHAOS', partId: pid, msg: `chaos — traffic doubled on P${pid}` });
      return [next, events];
    }
    default:
      return [state, []];
  }
}

// Initial immutable state
function seedState() {
  return {
    t: 0,
    tidePhase: 0,
    score: 0,
    combo: 0,
    sincePerfect: 0,
    pityReady: false,
    barrierSeq: 0,
    partitions: Array.from({ length: PARTS }, (_, i) => ({
      id: i,
      tenant: ['oak', 'iron', 'ash', 'fern', 'salt', 'mist'][i],
      rate: 4 + rng() * 6,
      hi: 0,
      wm: 0,
      lag: 0,
      dlq: 0,
      aligned: false,
      breaker: 'CLOSED',
    })),
    barriers: [],
    checkpoints: [],
  };
}

const RootComponent = {
  setup() {
    const state = reactive(seedState());
    const log = reactive([]);
    const selectedPid = ref(0);
    const play = ref(true);
    const rafId = ref(null);
    const lastT = ref(performance.now());

    function dispatch(action) {
      const [next, events] = reduceGame(state, action);
      // apply shallow merge so Vue tracks array replacements
      Object.assign(state, next);
      if (events.length) {
        for (const e of events) {
          log.push(e);
          if (log.length > MAX_LOG) log.shift();
        }
      }
    }

    function frame(now) {
      const dt = Math.min(64, now - lastT.value);
      lastT.value = now;
      if (play.value) dispatch({ type: 'tick', dt });
      rafId.value = requestAnimationFrame(frame);
    }

    onMounted(() => {
      rafId.value = requestAnimationFrame(frame);
      // keyboard shortcuts inspired by stateless-turn-combat-engine hot-seat play
      window.addEventListener('keydown', onKey);
    });
    onBeforeUnmount(() => {
      cancelAnimationFrame(rafId.value);
      window.removeEventListener('keydown', onKey);
    });

    function onKey(e) {
      if (e.code === 'Space') { e.preventDefault(); play.value = !play.value; }
      else if (e.key >= '1' && e.key <= String(PARTS)) {
        selectedPid.value = +e.key - 1;
      } else if (e.key === 'q') dispatch({ type: 'drop', partId: selectedPid.value, x: laneX(selectedPid.value) });
      else if (e.key === 'r') dispatch({ type: 'rewind' });
      else if (e.key === 'c') dispatch({ type: 'chaos' });
    }

    function laneX(i) { return 80 + i * ((STAGE_W - 160) / PARTS) + ((STAGE_W - 160) / PARTS) / 2; }

    function dropOn(pid) { dispatch({ type: 'drop', partId: pid, x: laneX(pid) }); }

    const laneList = computed(() => state.partitions);
    const totalLag = computed(() => state.partitions.reduce((s, p) => s + p.lag, 0));
    const totalDlq = computed(() => state.partitions.reduce((s, p) => s + p.dlq, 0));
    const lastCheckpoint = computed(() => state.checkpoints[state.checkpoints.length - 1]);

    const health = computed(() => {
      const avgLag = totalLag.value / PARTS;
      if (avgLag < 1.5) return { label: 'FORGED', cls: 'ok' };
      if (avgLag < 4)   return { label: 'KINDLED', cls: 'hot' };
      if (avgLag < 8)   return { label: 'SMOLDER', cls: 'hot' };
      return { label: 'BURNOUT', cls: 'cold' };
    });

    // tide path, polygons for parallax-sine-silhouette-horizon
    const tideLayers = computed(() => {
      const layers = [0, 1, 2];
      return layers.map((li) => {
        const pts = [];
        const amp = 12 - li * 2;
        const freq = 0.012 + li * 0.008;
        const phase = state.tidePhase * (1 + li * 0.7);
        const y0 = HORIZON - 40 + li * 22;
        for (let x = 0; x <= STAGE_W; x += 12) {
          const y = y0 + Math.sin(x * freq + phase) * amp
            + Math.sin(x * freq * 2.3 + phase * 1.7) * (amp * 0.35);
          pts.push(x + ',' + y.toFixed(1));
        }
        pts.push(STAGE_W + ',' + STAGE_H);
        pts.push('0,' + STAGE_H);
        const opacity = 0.25 - li * 0.06;
        return { id: li, points: pts.join(' '), opacity };
      });
    });

    const barrierNodes = computed(() =>
      state.barriers.map((b) => ({
        ...b,
        cx: laneX(b.partId),
        cy: b.y,
        fill: b.resolved ? '#88e878' : '#f0a050',
      }))
    );

    const partitionColumns = computed(() => state.partitions.map((p, i) => {
      const x = laneX(i);
      const ht = Math.min(140, 20 + p.rate * 6);
      const fill = p.breaker === 'OPEN' ? '#ff6060' : p.breaker === 'HALF' ? '#ffd166' : '#f0a050';
      return { id: p.id, x, ht, fill, lag: p.lag, aligned: p.aligned };
    }));

    function logClass(k) {
      if (k === 'CKPT' || k === 'PERFECT' || k === 'GREAT') return 'ckpt';
      if (k === 'BARRIER' || k === 'PITY' || k === 'REWIND') return 'bar';
      if (k === 'DLQ' || k === 'BREAK' || k === 'MISS' || k === 'CHAOS') return 'dlq';
      return 'warn';
    }

    return {
      state, log, selectedPid, play,
      laneList, totalLag, totalDlq, lastCheckpoint,
      tideLayers, barrierNodes, partitionColumns, health,
      dropOn, laneX,
      logClass,
      dispatch,
      STAGE_W, STAGE_H, HORIZON,
    };
  },
  template: `
    <div class="layout">
      <header class="brand">
        <div class="crest"></div>
        <h1>BARRIER · FORGE · HARBOR</h1>
        <span class="status-pill">TOPIC · WINDOWING · CHECKPOINT</span>
        <span class="status-pill burn">STREAM-PROCESSOR SIMULATION</span>
        <div class="spacer"></div>
        <div class="stat">
          <span>SCORE</span>
          <b>{{ state.score }}</b>
        </div>
        <div class="stat">
          <span>COMBO</span>
          <b>x{{ state.combo }}</b>
        </div>
        <div class="stat">
          <span>STATE</span>
          <b :style="{ color: health.cls === 'ok' ? '#88e878' : '#f0a050' }">{{ health.label }}</b>
        </div>
      </header>

      <aside class="lane">
        <h2>PARTITIONS</h2>
        <div v-for="p in laneList" :key="p.id"
             class="partition-card"
             :class="{
               selected: selectedPid === p.id,
               hot: p.breaker === 'OPEN',
               cold: p.breaker === 'HALF'
             }"
             @click="selectedPid = p.id"
             @dblclick="dropOn(p.id)">
          <div class="title"><span class="id">P{{ p.id }}</span><span>{{ p.tenant }}</span></div>
          <div class="gauge"><span :style="{ width: Math.min(100, p.rate * 9) + '%' }"></span></div>
          <div class="meta">
            <span>rate {{ p.rate.toFixed(1) }}</span>
            <span class="lag" :class="p.lag < 2 ? 'ok' : p.lag > 6 ? 'warn' : ''">
              lag {{ p.lag.toFixed(2) }}s
            </span>
          </div>
          <div class="meta">
            <span>breaker {{ p.breaker }}</span>
            <span>DLQ {{ p.dlq }}</span>
          </div>
          <div v-if="p.aligned" class="status-pill buff">ALIGNED</div>
          <div v-if="p.lag > 6" class="status-pill stun">BACKPRESSURE</div>
          <div v-if="p.dlq > 3" class="status-pill dlq">DLQ SURGE</div>
        </div>
      </aside>

      <main class="stage">
        <svg :viewBox="'0 0 ' + STAGE_W + ' ' + STAGE_H" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="sky" cx="50%" cy="0%" r="85%">
              <stop offset="0%" stop-color="#3a2818" />
              <stop offset="60%" stop-color="#1a0e08" />
              <stop offset="100%" stop-color="#0b0604" />
            </radialGradient>
            <linearGradient id="tide" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#a85020" stop-opacity="0.4" />
              <stop offset="100%" stop-color="#3a1a0a" stop-opacity="0.8" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <rect x="0" y="0" :width="STAGE_W" :height="STAGE_H" fill="url(#sky)" />
          <!-- distant silhouettes — parallax-sine-silhouette-horizon -->
          <polygon points="0,260 90,230 170,250 250,210 340,240 420,220 510,245 600,215 690,235 780,225 870,240 980,230 980,320 0,320"
                   fill="#1a0e08" opacity="0.9" />
          <polygon points="0,275 80,260 180,268 270,250 360,265 450,255 550,268 640,255 740,265 830,258 920,268 980,262 980,320 0,320"
                   fill="#2a1410" opacity="0.7" />
          <!-- animated tide layers -->
          <polygon v-for="layer in tideLayers" :key="layer.id"
                   :points="layer.points" fill="url(#tide)" :opacity="layer.opacity" />
          <!-- alignment line (checkpoint barrier grading line) -->
          <line x1="0" :y1="HORIZON + 40" :x2="STAGE_W" :y2="HORIZON + 40"
                stroke="#f0a050" stroke-dasharray="4 6" stroke-opacity="0.6" />
          <!-- partition columns — state backends as kilns -->
          <g v-for="col in partitionColumns" :key="'col' + col.id">
            <rect :x="col.x - 18" :y="HORIZON + 40" width="36" :height="col.ht"
                  :fill="col.fill" opacity="0.85" rx="4" />
            <rect :x="col.x - 22" :y="HORIZON + 34" width="44" height="10" fill="#5a2e14" rx="2" />
            <circle :cx="col.x" :cy="HORIZON + 40 + col.ht" r="6"
                    fill="#ffd08a" :opacity="col.aligned ? 1 : 0.3"
                    filter="url(#glow)" />
            <text :x="col.x" :y="HORIZON + 180" text-anchor="middle"
                  font-family="Cinzel, serif" font-size="11" fill="#b58a5e">P{{ col.id }}</text>
          </g>
          <!-- falling barriers -->
          <g v-for="b in barrierNodes" :key="'b' + b.id">
            <circle :cx="b.cx" :cy="b.cy" r="10" :fill="b.fill"
                    :opacity="b.resolved ? 0.4 : 0.95"
                    filter="url(#glow)" />
            <line :x1="b.cx - 16" :y1="b.cy" :x2="b.cx + 16" :y2="b.cy"
                  stroke="#f0a050" stroke-width="1.5" />
            <text :x="b.cx + 14" :y="b.cy - 6" font-family="Cinzel" font-size="10" fill="#f0a050">
              B{{ b.id }}
            </text>
          </g>
          <!-- topic checkpoints stamped on horizon -->
          <g v-for="(ckpt, i) in state.checkpoints.slice(-8)" :key="'ck' + ckpt.id">
            <circle :cx="100 + i * 80" :cy="70" r="14" fill="#88e878" opacity="0.35" filter="url(#glow)" />
            <circle :cx="100 + i * 80" :cy="70" r="8" fill="#88e878" />
            <text :x="100 + i * 80" y="102" text-anchor="middle"
                  font-family="Cinzel" font-size="10" fill="#88e878">C{{ ckpt.id }}</text>
          </g>
          <!-- crest text -->
          <text x="490" y="40" text-anchor="middle" font-family="Cinzel" font-size="14"
                fill="#f0a050" letter-spacing="5">
            TOPIC · FORGE · HARBOR
          </text>
        </svg>
      </main>

      <section class="log">
        <div class="log-head">
          <h3>CHANGELOG</h3>
          <span class="status-pill">{{ log.length }} events</span>
          <span class="status-pill burn" v-if="state.pityReady">PITY READY</span>
        </div>
        <div class="log-body">
          <div v-for="(e, i) in [...log].reverse()" :key="i" class="entry" :class="logClass(e.kind)">
            <span class="ts">{{ e.t.toFixed(1) }}s</span>
            <span class="kind">{{ e.kind }}</span>
            <span class="msg">{{ e.msg }}</span>
          </div>
        </div>
      </section>

      <aside class="panel">
        <h2>CONTROL · FORGE</h2>
        <div class="action-grid">
          <button class="btn-forge" @click="dropOn(selectedPid)">DROP BARRIER (Q)</button>
          <button class="btn-forge cool" @click="dispatch({ type: 'rewind' })">REWIND TO CKPT (R)</button>
          <button class="btn-forge danger" @click="dispatch({ type: 'chaos' })">UNLEASH CHAOS (C)</button>
          <button class="btn-forge" @click="play = !play">{{ play ? 'PAUSE' : 'PLAY' }} (space)</button>
        </div>

        <h2>GLOBAL METERS</h2>
        <div class="meter">
          <div class="lbl">AVG WATERMARK LAG</div>
          <div class="val" :class="health.cls">{{ (totalLag / 6).toFixed(2) }}s</div>
          <div class="track"><span :style="{ width: Math.min(100, (totalLag / 6) * 12) + '%' }"></span></div>
        </div>
        <div class="meter">
          <div class="lbl">DLQ</div>
          <div class="val hot">{{ totalDlq }}</div>
          <div class="track"><span :style="{ width: Math.min(100, totalDlq * 4) + '%' }"></span></div>
        </div>
        <div class="meter">
          <div class="lbl">LAST CHECKPOINT</div>
          <div class="val ok">C{{ lastCheckpoint ? lastCheckpoint.id : '—' }}</div>
        </div>
        <div class="meter">
          <div class="lbl">BARRIERS ISSUED</div>
          <div class="val">{{ state.barrierSeq }}</div>
        </div>

        <h2>STATUS EFFECTS</h2>
        <div>
          <span class="status-pill buff" v-if="state.combo > 5">COMBO FORGE x{{ state.combo }}</span>
          <span class="status-pill burn" v-if="state.sincePerfect > 12">FADING HEAT</span>
          <span class="status-pill stun" v-if="totalLag / 6 > 4">BACKPRESSURE STUN</span>
          <span class="status-pill dlq" v-if="totalDlq > 6">POISON TIDE</span>
          <span class="status-pill buff" v-if="state.pityReady">PITY · NEXT PERFECT</span>
        </div>
      </aside>
    </div>
  `,
};

createApp(RootComponent).mount('#app');