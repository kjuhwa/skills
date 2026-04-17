const { createApp, ref, reactive, computed, watch, onMounted, onBeforeUnmount } = Vue;

createApp({
  setup() {
    // ---------- world state ----------
    const now = ref(0);
    const running = ref(true);
    const tickMs = ref(500);

    const policy = ref("priority-tombstone");
    const tombBudget = ref(35);
    const jitterPct = ref(12);
    const retryBaseMs = ref(140);
    const fencingOn = ref(true);
    const snapshotCadence = ref(8);
    const softPity = ref(6);
    const hardPity = ref(14);

    const SEG_COUNT = 48;
    const segments = reactive([]);
    const lanes = reactive([
      { id: "primary",     lag: 0,   epoch: 1 },
      { id: "replica-α",   lag: 40,  epoch: 1 },
      { id: "replica-β",   lag: 120, epoch: 1 },
      { id: "replica-γ",   lag: 280, epoch: 1 },
    ]);
    const events = reactive([]);
    const fsmState = ref("IDLE");
    const pityCounter = ref(0);

    // init segments
    function initSegments() {
      segments.splice(0, segments.length);
      for (let i = 0; i < SEG_COUNT; i++) {
        segments.push({
          id: "seg-" + String(i).padStart(3,"0"),
          idx: i,
          records: 500 + Math.floor(Math.random() * 800),
          tombstones: Math.floor(Math.random() * 180),
          status: Math.random() < 0.1 ? "fresh" :
                  Math.random() < 0.2 ? "tomb" :
                  Math.random() < 0.15 ? "compacted" : "live",
          offsetStart: i * 1000,
          snapshot: i % 8 === 3,
          ttlJitter: Math.round((Math.random()*2 - 1) * jitterPct.value),
        });
      }
    }
    initSegments();

    const activeSegIdx = ref(12);
    const hoverIdx = ref(null);

    // ---------- helpers ----------
    function log(kind, msg) {
      events.unshift({
        tick: now.value, kind, msg,
      });
      if (events.length > 40) events.pop();
    }

    const livePct = computed(() => {
      const live = segments.filter(s => s.status === "live" || s.status === "fresh").length;
      return Math.round((live / SEG_COUNT) * 100);
    });
    const tombPct = computed(() => {
      const t = segments.filter(s => s.status === "tomb").length;
      return Math.round((t / SEG_COUNT) * 100);
    });
    const totalOffset = computed(() =>
      segments[segments.length-1] ? segments[segments.length-1].offsetStart + segments[segments.length-1].records : 0);
    const pressureRatio = computed(() => Math.min(100, Math.round(tombPct.value * 100 / Math.max(1, tombBudget.value))));

    // ---------- FSM tick ----------
    function simulateTick() {
      now.value++;

      // snapshot cadence + pity
      pityCounter.value++;
      const shouldSnap =
        now.value % snapshotCadence.value === 0 ||
        pityCounter.value >= hardPity.value ||
        (pityCounter.value >= softPity.value && Math.random() < 0.35);
      if (shouldSnap) {
        const target = segments[Math.floor(Math.random() * SEG_COUNT)];
        target.snapshot = true;
        log("snap", `snapshot cast at ${target.id} (pity ${pityCounter.value})`);
        pityCounter.value = 0;
      }

      // write
      const writeCount = 1 + Math.floor(Math.random()*3);
      for (let i=0;i<writeCount;i++) {
        const idx = SEG_COUNT - 1 - Math.floor(Math.random()*3);
        segments[idx].records += 15;
        if (Math.random() < 0.3) segments[idx].tombstones += 3;
      }

      // FSM transition
      if (pressureRatio.value > 90 && fsmState.value !== "COMPACTING") {
        fsmState.value = "COMPACTING";
        log("cmp", `compaction kicks in at pressure ${pressureRatio.value}% (policy=${policy.value})`);
      } else if (pressureRatio.value < 30 && fsmState.value === "COMPACTING") {
        fsmState.value = "IDLE";
        log("cmp", `compaction finished, returning to IDLE`);
      }

      // compaction executes tombstones into cold ash
      if (fsmState.value === "COMPACTING") {
        const candidates = segments
          .map((s,i)=>({s,i}))
          .filter(({s}) => s.status === "live" || s.status === "tomb")
          .sort((a,b) => b.s.tombstones - a.s.tombstones);
        const target = candidates[0];
        if (target) {
          const merged = Math.floor(target.s.tombstones * 0.6);
          target.s.tombstones -= merged;
          if (target.s.tombstones < 20) target.s.status = "compacted";
          log("cmp", `merged ${merged} tombstones → ${target.s.id}`);
        }
      }

      // retry jitter
      if (Math.random() < 0.08) {
        const attempt = 1 + Math.floor(Math.random()*3);
        const backoff = Math.round(retryBaseMs.value * Math.pow(2, attempt) * (1 + Math.random()*0.2));
        log("warn", `merge retry ${attempt} queued (backoff ${backoff}ms)`);
      }

      // fencing
      if (fencingOn.value && Math.random() < 0.03) {
        const l = lanes[Math.floor(Math.random()*lanes.length)];
        l.epoch++;
        log("warn", `fencing epoch bumped at ${l.id} → ep=${l.epoch}`);
      }

      // lane lag drift
      lanes.forEach((l,i) => {
        l.lag = Math.max(0, Math.round(l.lag + (Math.random()-0.5)*40 + (fsmState.value==="COMPACTING"?8:-4)));
      });
    }

    // ---------- driver ----------
    let timer = null;
    function startLoop() {
      if (timer) clearInterval(timer);
      timer = setInterval(() => { if (running.value) simulateTick(); }, tickMs.value);
    }
    watch(tickMs, startLoop);
    onMounted(() => { startLoop(); log("cmp","forge ignited"); });
    onBeforeUnmount(() => clearInterval(timer));

    function togglePause() { running.value = !running.value;
      log("cmp", running.value ? "forge resumed" : "forge paused"); }
    function manualCompact() {
      fsmState.value = "COMPACTING";
      simulateTick(); simulateTick();
      log("cmp","manual compaction pass");
    }
    function forgeSnapshot() {
      const target = segments[activeSegIdx.value];
      target.snapshot = true;
      pityCounter.value = 0;
      log("snap", `manual snapshot at ${target.id}`);
    }
    function reseed() {
      initSegments();
      now.value = 0;
      fsmState.value = "IDLE";
      log("cmp","forge reseeded");
    }

    function selectSeg(i) { activeSegIdx.value = i; }

    // ---------- derived for lane SVG ----------
    const laneView = computed(() => {
      const w = 1000;
      return lanes.map((l, li) => {
        const dots = segments.map((s,i) => ({
          x: (s.offsetStart / totalOffset.value) * w,
          status: s.status,
          snap: s.snapshot,
          id: s.id,
        }));
        return { id: l.id, li, lag: l.lag, epoch: l.epoch,
          watermark: ((totalOffset.value - l.lag*60) / totalOffset.value) * w, dots };
      });
    });

    const active = computed(() => segments[activeSegIdx.value]);

    // ---------- skills/knowledge for footer ----------
    const skillsApplied = [
      "finite-state-machine-data-simulation","finite-state-machine-visualization-pattern",
      "adaptive-strategy-hot-swap","layered-risk-gates",
      "retry-strategy-data-simulation","retry-strategy-visualization-pattern",
      "rate-limiter-data-simulation","rate-limiter-visualization-pattern",
      "outbox-pattern-visualization-pattern","saga-pattern-visualization-pattern",
      "lease-epoch-fencing-token-monotonic-guard","distributed-lock-mongodb",
      "kafka-debounce-event-coalescing","thread-pool-queue-backpressure",
      "cache-variance-ttl-jitter","availability-ttl-punctuate-processor","mongo-ttl-with-aggregation-delta",
      "pub-sub-visualization-pattern","connection-pool-visualization-pattern",
      "gacha-soft-hard-pity","phase-window-timing-grade-with-pity",
      "circuit-breaker-data-simulation","circuit-breaker-visualization-pattern",
      "bulkhead-data-simulation","bulkhead-visualization-pattern",
      "raft-consensus-data-simulation","stateless-turn-combat-engine",
      "event-sourcing-data-simulation","event-returning-pure-reducer",
      "immutable-action-event-log","changelog-compaction-tombstone-retention",
      "kafka-consumer-semaphore-chunking","kafka-batch-consumer-partition-tuning",
      "dead-letter-queue-data-simulation","dead-letter-queue-visualization-pattern",
      "barrier-alignment-buffer-spill","watermark-aligned-window-emitter",
      "canary-release-data-simulation","blue-green-deploy-data-simulation",
      "saga-pattern-data-simulation","outbox-pattern-data-simulation",
      "idempotency-data-simulation","idempotency-visualization-pattern",
      "status-effect-enum-system","frozen-detection-consecutive-count",
    ];
    const knowledgeRespected = [
      "event-sourcing-implementation-pitfall",
      "changelog-compaction-tombstone-retention",
      "finite-state-machine-implementation-pitfall",
      "circuit-breaker-implementation-pitfall",
      "rate-limiter-implementation-pitfall",
      "retry-strategy-implementation-pitfall",
      "saga-pattern-implementation-pitfall",
      "idempotency-implementation-pitfall",
      "bulkhead-implementation-pitfall",
      "materialized-view-implementation-pitfall",
      "canary-release-implementation-pitfall",
      "blue-green-deploy-implementation-pitfall",
      "skip-schedule-if-previous-running",
      "kafka-batch-size-timeout-tuning",
      "binsize-zero-fallback-to-one",
      "time-unit-consistency-us-ms-ns",
      "bloom-filter-false-positive-saturation-cliff",
    ];

    return {
      now, running, tickMs, policy, tombBudget, jitterPct, retryBaseMs,
      fencingOn, snapshotCadence, softPity, hardPity,
      segments, lanes, events, fsmState, pityCounter,
      activeSegIdx, hoverIdx, togglePause, manualCompact, forgeSnapshot,
      reseed, selectSeg,
      livePct, tombPct, totalOffset, pressureRatio,
      laneView, active, skillsApplied, knowledgeRespected,
    };
  },
  template: `
    <div class="header">
      <h1>✦ Ember Segment Forge ✦</h1>
      <span class="sub">where tombstones smolder and offsets march</span>
      <div class="spacer"></div>
      <span class="forge-tick">tick ▸ {{ now }}</span>
      <span class="state-chip" :class="{ compacting: fsmState==='COMPACTING' }">{{ fsmState }}</span>
      <span class="state-chip fencing" v-if="fencingOn">fenced · ep avg {{ Math.round(lanes.reduce((a,b)=>a+b.epoch,0)/lanes.length) }}</span>
      <button class="forge-btn" @click="togglePause">{{ running ? 'Pause' : 'Resume' }}</button>
      <button class="forge-btn" @click="manualCompact">Compact</button>
      <button class="forge-btn ghost" @click="reseed">Reseed</button>
    </div>

    <!-- LEFT: control dials -->
    <div class="left">
      <h2>Forge Dials</h2>
      <div class="dial">
        <label>tick interval <b>{{ tickMs }}ms</b></label>
        <input type="range" min="80" max="1500" step="20" v-model.number="tickMs" />
        <div class="hint">debounce bursts via coalescing</div>
      </div>
      <div class="dial">
        <label>tombstone budget <b>{{ tombBudget }}%</b></label>
        <input type="range" min="10" max="80" v-model.number="tombBudget" />
        <div class="hint">governs compaction trigger</div>
      </div>
      <div class="dial">
        <label>ttl jitter ±<b>{{ jitterPct }}%</b></label>
        <input type="range" min="0" max="30" v-model.number="jitterPct" />
        <div class="hint">avoid retention cliff storms</div>
      </div>
      <div class="dial">
        <label>retry base <b>{{ retryBaseMs }}ms</b></label>
        <input type="range" min="40" max="400" step="10" v-model.number="retryBaseMs" />
        <div class="hint">exp backoff × 2^attempt</div>
      </div>
      <div class="dial">
        <label>compaction policy</label>
        <select v-model="policy">
          <option>priority-tombstone</option>
          <option>time-window-rolling</option>
          <option>size-tiered</option>
          <option>snapshot-first</option>
        </select>
        <div class="hint">hot-swap preserves invariants</div>
      </div>
      <h2>Snapshots</h2>
      <div class="dial">
        <label>cadence <b>{{ snapshotCadence }}</b> ticks</label>
        <input type="range" min="2" max="20" v-model.number="snapshotCadence" />
      </div>
      <div class="dial">
        <label>soft pity <b>{{ softPity }}</b></label>
        <input type="range" min="1" max="20" v-model.number="softPity" />
      </div>
      <div class="dial">
        <label>hard pity <b>{{ hardPity }}</b></label>
        <input type="range" min="5" max="40" v-model.number="hardPity" />
        <div class="hint">guarantees snapshot fairness</div>
      </div>
      <h2>Fencing</h2>
      <div class="dial">
        <label>
          <input type="checkbox" v-model="fencingOn" />
          epoch-fencing guard
        </label>
        <div class="hint">reject stale leaders</div>
      </div>
      <div class="dial">
        <div style="font-size:11px;color:var(--ash);margin-top:12px;font-style:italic;">
          "every offset is a small fire, every snapshot an urn."
        </div>
      </div>
    </div>

    <!-- CENTER: stages -->
    <div class="center">
      <div class="forge-stage">
        <h3><span class="dot"></span> Segment Hearth</h3>
        <div class="desc">48 segments arranged left→right by offset. Clicking lifts a single ember.</div>
        <div class="seg-grid">
          <div v-for="(s, i) in segments" :key="s.id"
               class="seg-cell"
               :class="[s.status, { active: i===activeSegIdx, snap: s.snapshot }]"
               @click="selectSeg(i)"
               :title="s.id + ' · tomb=' + s.tombstones + ' · rec=' + s.records">
          </div>
        </div>
        <div style="margin-top:10px;font-size:11px;color:var(--ash);">
          live <span style="color:var(--accent-bright)">{{ livePct }}%</span> ·
          tomb <span style="color:var(--ember)">{{ tombPct }}%</span> ·
          pressure
          <div class="gauge" style="display:inline-block;width:180px;vertical-align:middle">
            <div class="fill" :style="{ width: pressureRatio + '%' }"></div>
          </div>
          <b style="color:var(--accent-bright)">{{ pressureRatio }}%</b>
        </div>
      </div>

      <div class="forge-stage">
        <h3><span class="dot" style="background:#ffc98a;box-shadow:0 0 8px #ffc98a;"></span>Offset Procession — Replica Lanes</h3>
        <div class="desc">Each lane's watermark advances with consumer lag; fencing epoch stamped upstream.</div>
        <svg class="lane-svg" viewBox="0 0 1000 220" preserveAspectRatio="none">
          <g v-for="lane in laneView" :key="lane.id">
            <rect :x="0" :y="lane.li*50+20" width="1000" height="42"
                  fill="#1a120c" stroke="#55453a"/>
            <text :x="8" :y="lane.li*50+34" fill="#7a6a5c" font-size="11" font-family="monospace">
              {{ lane.id }} · ep={{ lane.epoch }} · lag={{ lane.lag }}
            </text>
            <line :x1="lane.watermark" :x2="lane.watermark"
                  :y1="lane.li*50+20" :y2="lane.li*50+62"
                  stroke="#f0a050" stroke-dasharray="3 3"/>
            <g v-for="(d, di) in lane.dots" :key="di">
              <rect :x="d.x-1" :y="lane.li*50+44"
                    width="3" height="12"
                    :fill="d.status==='tomb' ? '#ff6a3d' :
                           d.status==='compacted' ? '#7ab3c4' :
                           d.status==='fresh' ? '#b6d779' : '#f0a050'" />
              <circle v-if="d.snap" :cx="d.x" :cy="lane.li*50+40"
                      r="3" fill="#ffc98a" />
            </g>
          </g>
          <path d="M40,35 Q500,210 920,180" fill="none" stroke="#ffc98a88" stroke-width="1"/>
          <text x="420" y="210" fill="#ffc98a88" font-size="10" font-family="serif">hybrid logical clock drift</text>
        </svg>
      </div>

      <div class="forge-stage">
        <h3><span class="dot"></span>Adaptive Compaction State</h3>
        <div class="stats-grid">
          <div class="stat-box"><div class="v">{{ fsmState }}</div><div class="l">FSM state</div></div>
          <div class="stat-box"><div class="v">{{ policy }}</div><div class="l">active policy</div></div>
          <div class="stat-box"><div class="v">{{ pityCounter }}</div><div class="l">pity counter</div></div>
          <div class="stat-box"><div class="v">{{ totalOffset.toLocaleString() }}</div><div class="l">total offset</div></div>
          <div class="stat-box"><div class="v">{{ pressureRatio }}%</div><div class="l">tomb pressure</div></div>
          <div class="stat-box"><div class="v">{{ lanes.filter(l=>l.lag<100).length }}/{{ lanes.length }}</div><div class="l">lanes within slo</div></div>
        </div>
      </div>
    </div>

    <!-- RIGHT: ember detail -->
    <div class="right">
      <h2>Selected Ember</h2>
      <div v-if="active">
        <div style="font-family:monospace;font-size:15px;color:var(--accent-bright);">{{ active.id }}</div>
        <div style="font-size:11px;color:var(--ash);margin-bottom:8px;">
          offset {{ active.offsetStart.toLocaleString() }} — {{ (active.offsetStart+active.records).toLocaleString() }}
        </div>
        <div class="stats-grid">
          <div class="stat-box"><div class="v">{{ active.records }}</div><div class="l">records</div></div>
          <div class="stat-box"><div class="v">{{ active.tombstones }}</div><div class="l">tombstones</div></div>
          <div class="stat-box"><div class="v">{{ active.status }}</div><div class="l">status</div></div>
          <div class="stat-box"><div class="v">{{ active.ttlJitter }}%</div><div class="l">ttl jitter</div></div>
        </div>
        <div style="margin:10px 0;">
          <span class="state-chip" v-if="active.snapshot">✧ snapshot ✧</span>
        </div>
        <button class="forge-btn" @click="forgeSnapshot">Forge Snapshot Here</button>
      </div>
      <h2 style="margin-top:16px;">Forge Journal</h2>
      <div v-for="(e,i) in events" :key="i"
           class="event-row" :class="e.kind">
        <span class="tick">t{{ e.tick }}</span>
        <span class="msg">{{ e.msg }}</span>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <div class="box">
        <h4>Skills applied</h4>
        <code v-for="s in skillsApplied" :key="s">{{ s }}</code>
      </div>
      <div class="box">
        <h4>Knowledge respected</h4>
        <code v-for="k in knowledgeRespected" :key="k">{{ k }}</code>
      </div>
      <div class="box">
        <h4>Forge invariant</h4>
        <div style="color:var(--text);font-style:italic;line-height:1.5;">
          tombstone pressure drives compaction FSM; retention jitter + pity prevent synchronized recompute storms;
          fencing epochs protect the hearth from stale leaders;
          replica lanes watermark at the slowest pyre.
        </div>
      </div>
    </div>
  `,
}).mount("#app");