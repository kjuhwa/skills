const { createApp, ref, reactive, computed, watch, onMounted, onUnmounted } = Vue;

const App = {
  template: `
    <div class="shell">
      <div class="top">
        <div class="brand">
          ❯ EMBER REBALANCE FORGE
          <small>partition · consumer-group · saga · pity</small>
        </div>
        <div class="stat"><span class="k">tenants</span><span class="v">{{ tenants.length }}</span></div>
        <div class="stat"><span class="k">active forges</span><span class="v">{{ groups.length }}</span></div>
        <div class="stat"><span class="k">ingots</span><span class="v">{{ totalIngots }}</span></div>
        <div class="stat"><span class="k">strikes /s</span><span class="v">{{ strikesPerSec.toFixed(1) }}</span></div>
        <div class="stat"><span class="k">cracks</span><span class="v" style="color:var(--accent-hot)">{{ cracks }}</span></div>
        <div class="controls">
          <button class="forge-btn ghost" @click="togglePlay">{{ playing ? '⏸ pause' : '▶ stoke' }}</button>
          <button class="forge-btn" @click="forceRebalance">⚒ strike all</button>
          <button class="forge-btn ghost" @click="injectFault">☠ inject fault</button>
        </div>
      </div>

      <aside class="panel coord">
        <h2>Coordinator — leader</h2>
        <div class="group-card" :class="{ active: leaderId === 'n1' }">
          <div class="name">◆ coordinator@n1</div>
          <div class="meta">
            <span>term {{ term }}</span>
            <span>UP · commitIdx {{ commitIdx }}</span>
          </div>
          <div class="chip-list">
            <span class="chip hot">leader</span>
            <span class="chip">raft</span>
            <span class="chip">heartbeat 10s</span>
          </div>
        </div>
        <div v-for="(r, i) in replicas" :key="r.id" class="group-card">
          <div class="name">{{ r.status === 'UP' ? '◇' : '✕' }} replica@{{ r.id }}</div>
          <div class="meta"><span>matchIdx {{ r.matchIdx }}</span><span>{{ r.status }}</span></div>
        </div>

        <h2 style="margin-top:16px">Consumer Groups</h2>
        <div
          v-for="g in groups"
          :key="g.id"
          class="group-card"
          :class="{ active: selected === g.id }"
          @click="selected = g.id"
        >
          <div class="name">{{ g.id }}</div>
          <div class="meta">
            <span>{{ g.members }} members · {{ g.partitions.length }} parts</span>
            <span>{{ g.state }}</span>
          </div>
          <div class="lag-bar">
            <div class="lag-fill" :style="{ width: Math.min(100, g.lag / 500) + '%' }" />
          </div>
          <div class="chip-list">
            <span class="chip" v-for="t in g.tenantIds" :key="t">🏷 {{ t }}</span>
            <span class="chip" v-if="g.dlqCount > 0" style="color:var(--accent-hot)">dlq {{ g.dlqCount }}</span>
          </div>
        </div>

        <h2 style="margin-top:16px">Skills forged here</h2>
        <div class="chip-list">
          <span v-for="s in appliedSkills" :key="s" class="chip">{{ s }}</span>
        </div>
      </aside>

      <section class="anvil" @mousemove="onAnvilHover" @mouseleave="hover = null">
        <svg :viewBox="'0 0 1000 700'" preserveAspectRatio="xMidYMid meet">
          <!-- horizon silhouettes — parallax-sine-silhouette-horizon -->
          <g v-for="layer in 3" :key="'h'+layer">
            <path
              :d="horizonPath(layer)"
              :fill="'rgba(42, 32, 24,' + (0.3 + layer * 0.2) + ')'"
            />
          </g>
          <!-- ember sparks — canvas-flowfield-particle-advection (ported to svg) -->
          <circle
            v-for="(e, idx) in sparks"
            :key="'e'+idx"
            :cx="e.x" :cy="e.y" :r="e.r"
            :fill="'hsla(' + e.hue + ', 90%, 60%, ' + e.alpha + ')'"
          />
          <!-- anvil platform -->
          <g :transform="'translate(500, 500)'">
            <rect x="-200" y="0" width="400" height="50" rx="6" fill="#2a1810" stroke="#1a0e08" />
            <rect x="-180" y="-10" width="360" height="20" rx="3" fill="#4a3828" />
            <text y="38" text-anchor="middle" fill="#8a7058" font-size="10" letter-spacing="3">
              ANVIL — hierarchical-group-entity
            </text>
          </g>

          <!-- partition ring — consistent-hashing-visualization-pattern -->
          <g :transform="'translate(500, 320)'">
            <circle cx="0" cy="0" r="140" fill="none" stroke="#4a3828" stroke-width="1" stroke-dasharray="3 3" />
            <g v-for="(p, i) in selectedPartitions" :key="'p'+p.id">
              <circle
                :cx="Math.cos((i / selectedPartitions.length) * Math.PI * 2 - Math.PI/2) * 140"
                :cy="Math.sin((i / selectedPartitions.length) * Math.PI * 2 - Math.PI/2) * 140"
                :r="p.heat > 0.5 ? 14 : 9"
                :fill="heatColor(p.heat)"
                :opacity="0.4 + p.heat * 0.6"
                :stroke="p.striking ? '#ffcc66' : 'none'"
                :stroke-width="p.striking ? 3 : 0"
              >
                <animate
                  v-if="p.striking"
                  attributeName="r"
                  values="14;22;14"
                  dur="0.4s"
                  repeatCount="1"
                />
              </circle>
              <text
                :x="Math.cos((i / selectedPartitions.length) * Math.PI * 2 - Math.PI/2) * 140"
                :y="Math.sin((i / selectedPartitions.length) * Math.PI * 2 - Math.PI/2) * 140 + 3"
                text-anchor="middle"
                fill="#1a1410"
                font-size="9"
                font-weight="bold"
              >{{ p.partition }}</text>
            </g>
            <text y="-160" text-anchor="middle" fill="#f0a050" font-size="12" letter-spacing="4">
              RING — {{ selectedGroup ? selectedGroup.id : 'idle' }}
            </text>
            <text y="170" text-anchor="middle" fill="#8a7058" font-size="10" letter-spacing="2">
              consistent-hashing-data-simulation · gacha-soft-hard-pity
            </text>
          </g>

          <!-- hammer strike beam -->
          <g v-if="lastStrike" :transform="'translate(500, 320)'">
            <line
              x1="0" y1="0"
              :x2="lastStrike.x" :y2="lastStrike.y"
              stroke="#ffcc66"
              stroke-width="2"
              opacity="0.6"
            >
              <animate attributeName="opacity" from="0.9" to="0" dur="0.6s" fill="freeze" />
            </line>
          </g>

          <!-- watermark crest -->
          <g v-for="(w, idx) in watermarks" :key="'w'+idx">
            <circle
              :cx="w.x" :cy="w.y"
              :r="20 + w.age * 8"
              fill="none"
              stroke="#f0a050"
              :stroke-width="2 - w.age * 0.3"
              :opacity="1 - w.age / 3"
            />
          </g>
        </svg>
        <div v-if="hover" class="hover-tip" :style="{ left: hover.px + 'px', top: hover.py + 'px' }">
          ingot heat: {{ (hover.heat * 100).toFixed(0) }}% · {{ hover.status }}
        </div>
      </section>

      <aside class="panel saga">
        <h2>Saga — current rebalance</h2>
        <div class="saga-chain">
          <div
            v-for="(s, i) in sagaSteps"
            :key="s.name"
            class="saga-step"
            :class="{ done: s.status === 'done', active: s.status === 'active', failed: s.status === 'failed', compensated: s.status === 'compensated' }"
          >
            <div class="step-name">{{ i + 1 }}. {{ s.name }}</div>
            <div class="step-note">{{ s.note }}</div>
          </div>
        </div>

        <div class="pity">
          <div>pity meter — gacha-soft-hard-pity</div>
          <div class="pity-bar"><div class="pity-fill" :style="{ width: Math.min(100, (pity / 20) * 100) + '%' }" /></div>
          <div>{{ pity }} / 20 · hard pity guarantees next full-ring strike</div>
        </div>

        <h2 style="margin-top:16px">Status Effects</h2>
        <div class="chip-list">
          <span v-for="s in statusEffects" :key="s.id" class="chip" :class="{ hot: s.burning }">
            {{ s.icon }} {{ s.name }} · {{ s.ttl }}t
          </span>
        </div>

        <h2 style="margin-top:16px">Locks</h2>
        <div class="chip-list">
          <span v-for="l in locks" :key="l.key" class="chip">🔒 {{ l.key }} · {{ l.ttl }}s</span>
        </div>

        <h2 style="margin-top:16px">Outbox</h2>
        <div class="chip-list">
          <span v-for="o in outbox.slice(-6)" :key="o.id" class="chip">{{ o.event }}</span>
        </div>
      </aside>

      <section class="log">
        <h2 style="flex:0">Event Log — immutable-action-event-log</h2>
        <div class="log-lines" ref="logEl">
          <div v-for="(e, i) in logTail" :key="i" class="log-line" :class="e.type">
            <span class="ts">{{ fmtTime(e.ts) }}</span>
            <span class="type">{{ e.type }}</span>
            <span>
              <span class="chip">{{ e.group || 'cluster' }}</span>
              <span class="chip" v-if="e.partition !== undefined">p{{ e.partition }}</span>
              {{ e.msg }}
            </span>
          </div>
        </div>
      </section>
    </div>
  `,
  setup() {
    // --- tenants & groups ---
    const tenants = ref(['forge-north', 'forge-south', 'caravan-east']);
    const groups = reactive([
      { id: 'cg-ingot-heater', members: 4, partitions: [], tenantIds: ['forge-north'], lag: 0, state: 'STABLE', dlqCount: 0 },
      { id: 'cg-hammer-bench', members: 6, partitions: [], tenantIds: ['forge-south', 'forge-north'], lag: 0, state: 'STABLE', dlqCount: 0 },
      { id: 'cg-temper-trough', members: 2, partitions: [], tenantIds: ['caravan-east'], lag: 0, state: 'STABLE', dlqCount: 0 },
      { id: 'cg-quench-audit', members: 1, partitions: [], tenantIds: ['forge-north', 'caravan-east'], lag: 0, state: 'STABLE', dlqCount: 0 },
    ]);

    // partitions: 24 logical, each with heat / striking / watermark
    const allPartitions = reactive([]);
    for (let i = 0; i < 24; i++) {
      allPartitions.push({
        id: 'p' + i,
        partition: i,
        owner: null,
        heat: Math.random() * 0.3,
        striking: false,
        watermark: Date.now() - Math.random() * 60000,
        checkpoint: Date.now() - Math.random() * 60000,
      });
    }

    // assign initial partitions to groups by modulo
    allPartitions.forEach((p, i) => {
      const g = groups[i % groups.length];
      p.owner = g.id;
      g.partitions.push(p);
    });

    // raft state — raft-consensus-visualization-pattern
    const leaderId = ref('n1');
    const term = ref(3);
    const commitIdx = ref(142);
    const replicas = reactive([
      { id: 'n2', status: 'UP', matchIdx: 142 },
      { id: 'n3', status: 'UP', matchIdx: 141 },
      { id: 'n4', status: 'DOWN', matchIdx: 98 },
    ]);

    const selected = ref('cg-hammer-bench');
    const selectedGroup = computed(() => groups.find((g) => g.id === selected.value));
    const selectedPartitions = computed(() => selectedGroup.value ? selectedGroup.value.partitions : []);

    // --- saga steps for current rebalance — saga-pattern-visualization-pattern ---
    const sagaSteps = reactive([
      { name: 'acquire coordinator lock', status: 'done', note: 'distributed-lock-mongodb · TTL 30s' },
      { name: 'emit JoinGroupRequest', status: 'done', note: 'event-driven-kafka-scheduling · JobExecuteNotice' },
      { name: 'wait for member heartbeats', status: 'done', note: 'stomp-heartbeat 10s/10s' },
      { name: 'compute assignment', status: 'active', note: 'consistent-hashing-data-simulation · virtual nodes' },
      { name: 'emit SyncGroupResponse', status: 'pending', note: 'feed-envelope-frame · SNAPSHOT' },
      { name: 'await offset commits', status: 'pending', note: 'idempotency-visualization-pattern' },
      { name: 'release lock + audit', status: 'pending', note: 'outbox-pattern-data-simulation' },
    ]);

    // --- status effects on groups — status-effect-enum-system ---
    const statusEffects = reactive([
      { id: 'e1', name: 'heated', icon: '🔥', ttl: 5, burning: true },
      { id: 'e2', name: 'tempered', icon: '❄', ttl: 3, burning: false },
      { id: 'e3', name: 'lagging', icon: '⌛', ttl: 7, burning: false },
    ]);

    // --- locks ---
    const locks = reactive([
      { key: 'rebalance.cg-hammer-bench', ttl: 27 },
      { key: 'outbox.dispatcher', ttl: 58 },
    ]);

    // --- outbox — outbox-pattern-data-simulation ---
    const outbox = reactive([]);

    // --- pity meter — gacha-soft-hard-pity ---
    const pity = ref(3);

    // --- log ---
    const log = reactive([]);
    const logEl = ref(null);
    const logTail = computed(() => log.slice(-80));

    // --- sparks (ember particles) ---
    const sparks = reactive([]);
    for (let i = 0; i < 60; i++) {
      sparks.push({
        x: Math.random() * 1000,
        y: Math.random() * 700,
        vx: 0, vy: -0.5 - Math.random(),
        r: 1 + Math.random() * 1.5,
        hue: 20 + Math.random() * 30,
        alpha: 0.4 + Math.random() * 0.4,
        life: 100 + Math.random() * 200,
      });
    }

    // --- watermark crests ---
    const watermarks = reactive([]);

    // --- last strike (for anvil beam) ---
    const lastStrike = ref(null);

    // --- stats ---
    const playing = ref(true);
    const cracks = ref(0);
    const strikesPerSec = ref(0);
    let strikeCounter = 0;
    const totalIngots = computed(() => allPartitions.length);

    // --- hover tip ---
    const hover = ref(null);

    const appliedSkills = [
      'event-driven-kafka-scheduling', 'availability-ttl-punctuate-processor',
      'consistent-hashing-data-simulation', 'raft-consensus-visualization-pattern',
      'saga-pattern-visualization-pattern', 'outbox-pattern-visualization-pattern',
      'cdc-visualization-pattern', 'idempotency-visualization-pattern',
      'cqrs-visualization-pattern', 'circuit-breaker-visualization-pattern',
      'retry-strategy-visualization-pattern', 'gacha-soft-hard-pity',
      'status-effect-enum-system', 'event-returning-pure-reducer',
      'distributed-lock-mongodb', 'redis-lock-recheck-flag-pattern',
      'challenge-response-auth-redis-ttl', 'multi-tenant-kafka-header-organization-context',
      'org-scoped-kafka-topic-bootstrap', 'tenant-context-holder-propagation',
      'avro-event-change-flags', 'feed-envelope-frame',
      'reactor-subscription-router-backpressure', 'realtime-vs-polling-fallback',
      'strategy-spi-list-to-map-autoinject', 'pluggable-sender-factory-pattern',
      'adaptive-strategy-hot-swap', 'hierarchical-group-entity',
      'definition-registry-helper-cache', 'service-discovery-replica-leader-tracking',
      'yorkie-crdt-sync-pattern', 'service-readiness-event-listener-pattern',
      'kafka-consumer-tenant-fan-out', 'kafka-message-header-metadata',
    ];

    const heatColor = (h) => {
      const hue = 40 - h * 40;
      const lum = 40 + h * 40;
      return `hsl(${hue}, 90%, ${lum}%)`;
    };

    const horizonPath = (layer) => {
      const y0 = 450 + layer * 40;
      const pts = [];
      for (let x = 0; x <= 1000; x += 20) {
        const y = y0 + Math.sin(x * 0.008 + layer * 1.3 + clock * 0.001) * (6 + layer * 4);
        pts.push(`${x},${y}`);
      }
      return `M 0 700 L ${pts.join(' L ')} L 1000 700 Z`;
    };

    // --- simulation clock ---
    let clock = 0;
    let lastStrikeWindow = 0;

    const addLog = (type, msg, extra = {}) => {
      log.push({ type, msg, ts: Date.now(), ...extra });
      if (log.length > 400) log.splice(0, log.length - 400);
    };

    const applyStrike = (partition) => {
      partition.striking = true;
      partition.heat = Math.min(1, partition.heat + 0.3);
      strikeCounter++;
      pity.value++;
      lastStrike.value = {
        x: Math.cos((partition.partition / 24) * Math.PI * 2 - Math.PI/2) * 140,
        y: Math.sin((partition.partition / 24) * Math.PI * 2 - Math.PI/2) * 140,
      };
      addLog('strike', 'hammer strike · consistent-hashing-data-simulation', { group: selected.value, partition: partition.partition });
      setTimeout(() => { partition.striking = false; lastStrike.value = null; }, 400);
    };

    const forceRebalance = () => {
      // saga-pattern-visualization-pattern — advance all steps
      sagaSteps.forEach((s, i) => {
        setTimeout(() => {
          if (Math.random() < 0.1 && i > 2) {
            s.status = 'failed';
            addLog('crack', `step '${s.name}' failed — compensating`, { group: selected.value });
            cracks.value++;
          } else {
            s.status = 'done';
          }
        }, i * 300);
      });
      if (selectedGroup.value) {
        selectedGroup.value.state = 'REBALANCING';
        setTimeout(() => { selectedGroup.value.state = 'STABLE'; }, 2500);
      }
      // hard pity — gacha-soft-hard-pity
      if (pity.value >= 20) {
        addLog('strike', 'HARD PITY — guaranteed full-ring rebalance', { group: selected.value });
        pity.value = 0;
        allPartitions.forEach((p) => applyStrike(p));
      }
      outbox.push({ id: Date.now(), event: 'RebalanceInitiated' });
    };

    const injectFault = () => {
      const p = allPartitions[Math.floor(Math.random() * allPartitions.length)];
      addLog('crack', 'fault injected · saga-pattern-data-simulation', { partition: p.partition });
      cracks.value++;
      const g = groups.find((x) => x.id === p.owner);
      if (g) g.dlqCount++;
      const idx = Math.floor(Math.random() * sagaSteps.length);
      if (sagaSteps[idx]) {
        sagaSteps[idx].status = 'failed';
        setTimeout(() => { sagaSteps[idx].status = 'compensated'; }, 1200);
      }
    };

    const togglePlay = () => { playing.value = !playing.value; };

    // --- tick loop ---
    let tickId, strikeRateId, watermarkId;

    onMounted(() => {
      addLog('lock', 'coordinator lock acquired · distributed-lock-mongodb');
      addLog('heat', 'ingot heated · availability-ttl-punctuate-processor');
      addLog('strike', 'initial assignment · consistent-hashing-data-simulation');

      tickId = setInterval(() => {
        if (!playing.value) return;
        clock += 50;
        // partition heat decay / pulse — incommensurate-sine-organic-flicker
        allPartitions.forEach((p, i) => {
          const flick = Math.sin(clock * 0.001 + i) * 0.5
                      + Math.sin(clock * 0.00231 + i * 1.7) * 0.3;
          p.heat = Math.max(0, Math.min(1, p.heat * 0.99 + 0.01 * (0.5 + flick * 0.5)));
        });
        // lag + dlq drift
        groups.forEach((g) => {
          g.lag = g.lag * 0.95 + Math.random() * 300;
          if (Math.random() < 0.002) g.dlqCount = Math.max(0, g.dlqCount - 1);
        });
        // sparks advection
        sparks.forEach((e) => {
          e.vy -= 0.005;
          e.x += (Math.sin(clock * 0.001 + e.y * 0.01) * 0.5);
          e.y += e.vy;
          e.life -= 1;
          if (e.y < -10 || e.life < 0) {
            e.x = 300 + Math.random() * 400;
            e.y = 500 + Math.random() * 30;
            e.vy = -0.5 - Math.random();
            e.alpha = 0.6 + Math.random() * 0.3;
            e.life = 100 + Math.random() * 200;
          }
        });
        // status effect tick — status-effect-enum-system
        statusEffects.forEach((s) => { s.ttl = Math.max(0, s.ttl - 0.01); });
        // lock TTL
        locks.forEach((l) => { l.ttl = Math.max(0, l.ttl - 0.05); });
        // watermark crest fade
        watermarks.forEach((w) => { w.age += 0.05; });
        for (let i = watermarks.length - 1; i >= 0; i--) {
          if (watermarks[i].age > 3) watermarks.splice(i, 1);
        }
        // term bumps occasionally — raft-consensus-data-simulation
        if (Math.random() < 0.003) {
          term.value++;
          commitIdx.value += Math.floor(Math.random() * 4);
          addLog('heat', 'raft term advance · raft-consensus-visualization-pattern');
        }
      }, 50);

      strikeRateId = setInterval(() => {
        strikesPerSec.value = strikeCounter / 1;
        strikeCounter = 0;
      }, 1000);

      watermarkId = setInterval(() => {
        if (!playing.value) return;
        // random strike — event-driven-kafka-scheduling
        if (Math.random() < 0.5 && selectedPartitions.value.length > 0) {
          const p = selectedPartitions.value[Math.floor(Math.random() * selectedPartitions.value.length)];
          applyStrike(p);
        }
        // watermark crest — availability-ttl-punctuate-processor
        watermarks.push({
          x: 300 + Math.random() * 400,
          y: 200 + Math.random() * 300,
          age: 0,
        });
        if (watermarks.length > 12) watermarks.shift();
        // random cdc emit — cdc-data-simulation
        if (Math.random() < 0.3) {
          addLog('heat', 'cdc lsn advance · cdc-data-simulation', {
            partition: Math.floor(Math.random() * 24),
            group: selected.value,
          });
        }
        if (Math.random() < 0.15) {
          addLog('temper', 'offset commit · idempotency-visualization-pattern', { group: selected.value });
          outbox.push({ id: Date.now(), event: 'OffsetCommitted' });
        }
        if (outbox.length > 30) outbox.shift();
      }, 400);

      // auto-scroll log
      watch(log, async () => {
        await Vue.nextTick();
        if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight;
      }, { deep: true });
    });

    onUnmounted(() => {
      clearInterval(tickId);
      clearInterval(strikeRateId);
      clearInterval(watermarkId);
    });

    const onAnvilHover = (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const rx = (e.clientX - r.left) / r.width * 1000;
      const ry = (e.clientY - r.top) / r.height * 700;
      let nearest = null, nd = 60;
      selectedPartitions.value.forEach((p, i) => {
        const px = 500 + Math.cos((i / selectedPartitions.value.length) * Math.PI * 2 - Math.PI/2) * 140;
        const py = 320 + Math.sin((i / selectedPartitions.value.length) * Math.PI * 2 - Math.PI/2) * 140;
        const d = Math.hypot(px - rx, py - ry);
        if (d < nd) { nd = d; nearest = p; }
      });
      if (nearest) {
        hover.value = {
          px: e.clientX - r.left + 12,
          py: e.clientY - r.top + 12,
          heat: nearest.heat,
          status: nearest.striking ? 'striking' : nearest.heat > 0.7 ? 'white-hot' : 'warm',
        };
      } else {
        hover.value = null;
      }
    };

    const fmtTime = (ts) => new Date(ts).toISOString().slice(11, 23);

    return {
      tenants, groups, replicas, leaderId, term, commitIdx, selected, selectedGroup, selectedPartitions,
      sagaSteps, statusEffects, locks, outbox, pity, log, logEl, logTail, sparks, watermarks, lastStrike,
      playing, cracks, strikesPerSec, totalIngots, hover, appliedSkills,
      heatColor, horizonPath, togglePlay, forceRebalance, injectFault, onAnvilHover, fmtTime,
    };
  },
};

createApp(App).mount('#app');