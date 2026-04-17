const { createApp, ref, reactive, computed, watch, onMounted, onUnmounted } = Vue;

createApp({
  setup() {
    // ---------- configuration ----------
    const R = 260;
    const ringR = 190;
    const N = 9;
    const tabs = ["forge","lineage","ledger"];
    const tab = ref("forge");

    const heartbeatTicks = ref(4);
    const flicker = ref(0.55);
    const pity = ref(6); // soft pity / hard pity window
    const lagBudget = ref(120);

    const playing = ref(true);
    const split = ref(false);
    const turn = ref(0);
    const term = ref(1);
    const elapsed = ref(0);
    const selected = ref("ember-01");
    const hover = ref(null);

    // ---------- ember factory (hue-rotate-sprite-identity) ----------
    const NAMES = [
      "ember-01","coal-02","cinder-03","pyre-04","forge-05",
      "anvil-06","blaze-07","kindle-08","hearth-09",
    ];
    const ROLES_BY_PRIO = ["leader","follower","follower","follower","follower","candidate","follower","follower","follower"];

    const mulberry = (s) => () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const rand = mulberry(1337);

    const makeEmber = (i) => {
      const ang = (i / N) * Math.PI * 2 - Math.PI/2;
      const x = Math.cos(ang) * ringR;
      const y = Math.sin(ang) * ringR;
      return reactive({
        name: NAMES[i],
        idx: i,
        ang, x, y,
        labelY: 26,
        hue: (i * 25) - 90, // hue-rotate-sprite-identity distinct hues
        role: i === 0 ? "leader" : ROLES_BY_PRIO[i],
        heat: 0.6 + rand()*0.35,
        pulse: 0,
        lag: Math.floor(rand()*40),
        effect: "steady",
        pity: 0,
        term: 1,
        side: i < N/2 ? "A" : "B",
        suspect: false,
        alive: true,
        votes: 0,
      });
    };
    const nodes = reactive(NAMES.map((_, i) => makeEmber(i)));

    // event log (immutable-action-event-log)
    const events = reactive([
      { turn: 0, lvl:"ELECT", msg: "first crown awarded to ember-01 at dawn" },
    ]);
    const push = (lvl, msg) => {
      events.push({ turn: turn.value, lvl, msg });
      if (events.length > 400) events.splice(0, events.length - 400);
    };

    // baselines (baseline-historical-comparison-threshold)
    const lagHistory = reactive([]);
    const histAvg = computed(() => lagHistory.length
      ? lagHistory.reduce((a,b)=>a+b,0) / lagHistory.length : 0);
    const histDelta = computed(() => {
      if (lagHistory.length < 2) return 0;
      const a = lagHistory.slice(-8).reduce((x,y)=>x+y,0) / Math.max(1, Math.min(8, lagHistory.length));
      const b = lagHistory.slice(0,-8).reduce((x,y)=>x+y,0) / Math.max(1, lagHistory.length-8);
      return a - b;
    });
    const sparkPoints = computed(() => {
      const src = lagHistory.slice(-80);
      if (!src.length) return "0,52 160,52";
      const mx = Math.max(1, ...src);
      return src.map((v,i) => {
        const x = (i/(Math.max(1,src.length-1))) * 160;
        const y = 52 - (v/mx) * 48;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ");
    });
    const sparkFill = computed(() => `0,52 ${sparkPoints.value} 160,52`);

    // circuit breaker (circuit-breaker-visualization-pattern)
    const breakerState = ref("CLOSED");
    const failureRate = ref(0);
    const probeTicks = ref(0);

    // ---------- derived stats ----------
    const quorumSize = computed(() => Math.floor(nodes.length/2)+1);
    const sideA = computed(() => {
      const g = nodes.filter(n => n.side==="A");
      return { total: g.length, alive: g.filter(n => n.alive && !n.suspect).length };
    });
    const sideB = computed(() => {
      const g = nodes.filter(n => n.side==="B");
      return { total: g.length, alive: g.filter(n => n.alive && !n.suspect).length };
    });
    const quorumSide = computed(() => Math.floor((nodes.length/2)/2)+1);
    const leader = computed(() => nodes.find(n => n.role==="leader" && n.alive && !n.suspect));
    const followersOfLeader = computed(() => {
      if (!leader.value) return [];
      return nodes.filter(n => n !== leader.value && n.alive);
    });
    const selectedNode = computed(() => nodes.find(n => n.name === selected.value));
    const globalHeat = computed(() => {
      const live = nodes.filter(n => n.alive);
      // divide-by-zero-rate-guard
      if (!live.length) return 0;
      return live.reduce((a,n)=>a+n.heat,0) / live.length;
    });

    // ---------- actions ----------
    const select = (name) => { selected.value = name; };
    const togglePlay = () => { playing.value = !playing.value; push("PULSE", playing.value ? "forge stoked" : "forge at rest"); };
    const toggleSplit = () => {
      split.value = !split.value;
      push(split.value ? "PART" : "PULSE",
        split.value ? "forge fractured — minority side loses quorum" : "forge mended");
    };
    const chaos = () => {
      const victim = nodes[Math.floor(Math.random()*nodes.length)];
      victim.suspect = true;
      victim.heat *= 0.4;
      victim.lag += lagBudget.value;
      victim.effect = "scorched";
      push("EFFECT", `${victim.name} doused by chaos draft`);
    };
    const douse = (name) => {
      const n = nodes.find(x => x.name === name); if (!n) return;
      n.alive = false; n.suspect = true; n.heat = 0; n.effect = "extinguished";
      push("EFFECT", `${name} extinguished by operator`);
    };
    const rekindle = (name) => {
      const n = nodes.find(x => x.name === name); if (!n) return;
      n.alive = true; n.suspect = false; n.heat = 0.7; n.effect = "rekindled"; n.lag = 20;
      push("EFFECT", `${name} rekindled`);
    };
    const crown = (name) => {
      const n = nodes.find(x => x.name === name); if (!n || !n.alive) return;
      nodes.forEach(x => { if (x.role === "leader") x.role = "follower"; });
      n.role = "leader"; n.term += 1; term.value = n.term;
      push("ELECT", `${name} manually crowned in term ${n.term}`);
    };

    // ---------- main step (stateless-turn-combat-engine) ----------
    const forgeTick = () => {
      turn.value += 1;
      elapsed.value = +(elapsed.value + 0.25).toFixed(2);

      // flicker pulses
      nodes.forEach(n => {
        // incommensurate-sine-organic-flicker
        const t = turn.value * 0.11;
        const s1 = Math.sin(t + n.idx*1.237);
        const s2 = Math.sin(t*0.713 + n.idx*0.91);
        const s3 = Math.sin(t*1.453 + n.idx*2.31);
        n.pulse = Math.max(0, (s1+s2+s3)/3 * 0.5 + 0.5) * flicker.value;
        n.heat = Math.max(0, Math.min(1, n.heat + (Math.random()-0.5)*0.05));
        n.lag = Math.max(0, Math.round(n.lag + (Math.random()-0.5)*lagBudget.value*0.2));
        n.suspect = n.alive && n.lag > lagBudget.value * 2;
      });

      // frozen-detection-consecutive-count: stuck heartbeat bumps pity
      nodes.forEach(n => {
        if (n.suspect || !n.alive) n.pity = Math.min(pity.value, n.pity + 1);
        if (n.role === "candidate") n.pity = Math.min(pity.value, n.pity + 1);
      });

      // election side-effect: if no alive leader → candidate with max (pity,prio) crowned
      if (!nodes.some(n => n.role === "leader" && n.alive && !n.suspect)) {
        const eligible = nodes.filter(n => n.alive && !n.suspect);
        if (eligible.length >= quorumSize.value) {
          // gacha-soft-hard-pity: rank by pity + prio jitter
          const ranked = eligible.map(n => ({ n, score: n.pity*10 + Math.random() }));
          ranked.sort((a,b)=>b.score - a.score);
          const winner = ranked[0].n;
          nodes.forEach(x => { if (x.role==="leader") x.role="follower"; });
          winner.role = "leader";
          winner.pity = 0;
          term.value += 1;
          winner.term = term.value;
          push("ELECT", `${winner.name} crowned in term ${term.value} (pity decided)`);
        } else {
          push("QUOR", `quorum unavailable (${eligible.length}/${nodes.length}) — no crown this turn`);
        }
      }

      // heartbeat broadcast
      if (turn.value % heartbeatTicks.value === 0 && leader.value) {
        nodes.forEach(n => {
          if (n === leader.value) return;
          if (!n.alive) return;
          if (split.value && n.side !== leader.value.side) return;
          n.lag = Math.max(0, n.lag - 12);
          n.pity = Math.max(0, n.pity - 1);
        });
        push("PULSE", `pulse fan-out from ${leader.value.name}`);
      }

      // circuit breaker
      const lostPct = nodes.filter(n => n.suspect).length / nodes.length;
      failureRate.value = lostPct;
      if (breakerState.value === "CLOSED" && lostPct > 0.4) {
        breakerState.value = "OPEN";
        push("EFFECT", "circuit OPEN — spill channels closed");
      } else if (breakerState.value === "OPEN" && lostPct < 0.2) {
        breakerState.value = "HALF_OPEN";
        probeTicks.value = 0;
        push("EFFECT", "circuit HALF_OPEN — probing");
      } else if (breakerState.value === "HALF_OPEN") {
        probeTicks.value += 1;
        if (probeTicks.value >= 6) {
          breakerState.value = "CLOSED";
          push("EFFECT", "circuit CLOSED — flow restored");
        } else if (lostPct > 0.3) {
          breakerState.value = "OPEN";
          push("EFFECT", "probe failed, re-OPEN");
        }
      }

      // record lag baseline
      const liveLag = nodes.filter(n=>n.alive).reduce((a,n)=>a+n.lag,0) / Math.max(1, nodes.filter(n=>n.alive).length);
      lagHistory.push(liveLag);
      if (lagHistory.length > 120) lagHistory.shift();
    };

    // ---------- animation loop ----------
    let rafId;
    const loop = () => {
      if (playing.value) {
        // slow tick; we don't want 60fps fully-simulated
        const sub = elapsed.value * 1000;
        // tick forge ~6 times/sec when playing
        forgeTick();
      } else {
        // when paused, still animate pulses visually
        nodes.forEach(n => {
          const t = performance.now()*0.001;
          const s1 = Math.sin(t + n.idx*1.237);
          const s2 = Math.sin(t*0.713 + n.idx*0.91);
          n.pulse = Math.max(0, (s1+s2)/2 * 0.5 + 0.5) * flicker.value;
        });
      }
      rafId = setTimeout(loop, 160);
    };

    onMounted(() => { loop(); });
    onUnmounted(() => { clearTimeout(rafId); });

    // keyboard (adaptive-strategy-hot-swap)
    const onKey = (e) => {
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      if (e.key === "p") toggleSplit();
      if (e.key === "c") chaos();
      if (e.key === "ArrowRight") forgeTick();
    };
    onMounted(() => window.addEventListener("keydown", onKey));
    onUnmounted(() => window.removeEventListener("keydown", onKey));

    return {
      tabs, tab, R, ringR, N,
      heartbeatTicks, flicker, pity, lagBudget,
      playing, split, turn, term, elapsed,
      nodes, events, selected, hover, selectedNode,
      quorumSize, quorumSide, sideA, sideB, leader, followersOfLeader,
      globalHeat, histAvg, histDelta, sparkPoints, sparkFill,
      breakerState, failureRate, probeTicks,
      select, togglePlay, toggleSplit, chaos, douse, rekindle, crown, forgeTick,
    };
  }
}).mount("#app");