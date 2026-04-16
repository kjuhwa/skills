/* ============================================================
   Distributed Lock Visualizer — app.js
   Zero dependencies, vanilla JS + Canvas
   ============================================================ */

'use strict';

// ── Constants ────────────────────────────────────────────────
const NODE_COLORS = ['#6ee7b7', '#818cf8', '#38bdf8', '#fbbf24', '#f87171'];
const EVENT_COLORS = {
  ACQUIRE:  '#6ee7b7',
  RELEASE:  '#818cf8',
  EXPIRE:   '#fbbf24',
  DEADLOCK: '#f87171',
  RETRY:    '#38bdf8',
  CONFLICT: '#fb923c',
  RECHECK:  '#a78bfa',
};

// ── State ────────────────────────────────────────────────────
const state = {
  running: false,
  speed: 1,
  scenario: 'happy',
  lockType: 'mongo',   // 'mongo' | 'redis'
  nodeCount: 3,
  baseTTL: 30,         // seconds (simulated)
  jitter: false,
  jitterPct: 15,
  simTime: 0,          // seconds elapsed (simulated)
  lastRaf: null,
  accum: 0,

  nodes: [],
  locks: {},           // resource -> { holder, acquiredAt, expiresAt, value }
  events: [],
  packets: [],         // animated dots on canvas
  pulses: [],          // ring pulses on canvas
  commandLog: [],

  scenarioPhase: 0,
  scenarioTimer: 0,
  scenarioDone: false,

  canvasW: 0,
  canvasH: 0,
};

// ── DOM refs ─────────────────────────────────────────────────
const canvas      = document.getElementById('main-canvas');
const ctx         = canvas.getContext('2d');
const tlCanvas    = document.getElementById('timeline-canvas');
const tlCtx       = tlCanvas.getContext('2d');
const lockDocView = document.getElementById('lock-doc-view');
const nodeStatusList = document.getElementById('node-status-list');
const ttlBarsEl   = document.getElementById('ttl-bars');
const commandLogEl = document.getElementById('command-log');
const simTimeDisp = document.getElementById('sim-time-display');
const lockStoreTitle = document.getElementById('lock-store-title');
const tooltip     = document.getElementById('tooltip');

// ── Controls ─────────────────────────────────────────────────
document.getElementById('btn-play').addEventListener('click', () => play());
document.getElementById('btn-pause').addEventListener('click', () => pause());
document.getElementById('btn-step').addEventListener('click', () => step());
document.getElementById('btn-reset').addEventListener('click', () => reset());

const speedSlider = document.getElementById('speed-slider');
speedSlider.addEventListener('input', () => {
  state.speed = parseFloat(speedSlider.value);
  document.getElementById('speed-label').textContent = state.speed + 'x';
});

const scenarioSelect = document.getElementById('scenario-select');
scenarioSelect.addEventListener('change', () => {
  state.scenario = scenarioSelect.value;
  reset();
});

document.getElementById('btn-mongo').addEventListener('click', () => setLockType('mongo'));
document.getElementById('btn-redis').addEventListener('click', () => setLockType('redis'));

const nodeCountSlider = document.getElementById('node-count');
nodeCountSlider.addEventListener('input', () => {
  state.nodeCount = parseInt(nodeCountSlider.value);
  document.getElementById('node-count-label').textContent = state.nodeCount;
  reset();
});

const ttlSlider = document.getElementById('ttl-slider');
ttlSlider.addEventListener('input', () => {
  state.baseTTL = parseInt(ttlSlider.value);
  document.getElementById('ttl-label').textContent = state.baseTTL + 's';
});

const jitterToggle = document.getElementById('jitter-toggle');
jitterToggle.addEventListener('change', () => { state.jitter = jitterToggle.checked; });

const jitterPctSlider = document.getElementById('jitter-pct');
jitterPctSlider.addEventListener('input', () => {
  state.jitterPct = parseInt(jitterPctSlider.value);
  document.getElementById('jitter-label').textContent = state.jitterPct + '%';
});

function setLockType(type) {
  state.lockType = type;
  document.getElementById('btn-mongo').classList.toggle('active', type === 'mongo');
  document.getElementById('btn-redis').classList.toggle('active', type === 'redis');
  const dot = lockStoreTitle.querySelector('.dot');
  dot.className = 'dot ' + (type === 'mongo' ? 'dot-mongo' : 'dot-redis');
  document.getElementById('lock-store-label').textContent = type === 'mongo' ? 'MongoDB Lock Store' : 'Redis Lock Store';
  reset();
}

// ── Node factory ─────────────────────────────────────────────
function makeNode(i, total) {
  return {
    id: 'node-' + (i + 1),
    label: 'Node-' + (i + 1),
    color: NODE_COLORS[i],
    status: 'idle',    // idle | waiting | holding | releasing | conflict
    attempts: 0,
    heldResource: null,
    retryTimer: 0,
    retryDelay: 0,
    retryCount: 0,
    ttlRemaining: 0,
    ttlMax: 0,
    actualTTL: 0,
    x: 0, y: 0,       // set in layout
    pulseRadius: 0,
    pulseAlpha: 0,
    pulseColor: '#6ee7b7',
    // split brain: thinks it holds even after expiry
    splitBrainMode: false,
  };
}

// ── Layout helpers ───────────────────────────────────────────
function layoutNodes() {
  const w = state.canvasW, h = state.canvasH;
  const cx = w * 0.5, nodeY = h * 0.22;
  const n = state.nodes.length;
  state.nodes.forEach((nd, i) => {
    const spread = Math.min(w * 0.75, 600);
    nd.x = cx + (i - (n - 1) / 2) * (spread / Math.max(n - 1, 1));
    nd.y = nodeY;
  });
}

function storePos() {
  return { x: state.canvasW * 0.5, y: state.canvasH * 0.62 };
}

// ── Simulation init ──────────────────────────────────────────
function initNodes() {
  state.nodes = [];
  for (let i = 0; i < state.nodeCount; i++) state.nodes.push(makeNode(i, state.nodeCount));
  layoutNodes();
}

function reset() {
  state.running = false;
  state.simTime = 0;
  state.accum = 0;
  state.events = [];
  state.packets = [];
  state.pulses = [];
  state.commandLog = [];
  state.locks = {};
  state.scenarioPhase = 0;
  state.scenarioTimer = 0;
  state.scenarioDone = false;
  state.deadlockCycle = null;
  _deferrals.length = 0;
  initNodes();
  renderSidebar();
  renderTimeline();
  drawFrame();
  // Auto-start
  play();
}

function play() {
  if (state.running) return;
  state.running = true;
  state.lastRaf = performance.now();
  requestAnimationFrame(loop);
}

function pause() {
  state.running = false;
}

function step() {
  pause();
  tickSim(0.25);
  drawFrame();
  renderSidebar();
  renderTimeline();
}

// ── Main loop ────────────────────────────────────────────────
function loop(now) {
  if (!state.running) return;
  const wallDelta = Math.min((now - state.lastRaf) / 1000, 0.1);
  state.lastRaf = now;
  const simDelta = wallDelta * state.speed;

  tickSim(simDelta);
  drawFrame();
  renderSidebar();
  renderTimeline();

  requestAnimationFrame(loop);
}

// ── Tick ─────────────────────────────────────────────────────
function tickSim(dt) {
  state.simTime += dt;
  state.scenarioTimer += dt;

  // Advance packets
  state.packets.forEach(p => {
    p.progress += dt * p.speed;
    if (p.progress >= 1) p.done = true;
  });
  state.packets = state.packets.filter(p => !p.done);

  // Advance pulses
  state.pulses.forEach(p => {
    p.radius += dt * 60;
    p.alpha -= dt * 1.5;
  });
  state.pulses = state.pulses.filter(p => p.alpha > 0);

  // TTL countdown for held locks
  Object.keys(state.locks).forEach(res => {
    const lk = state.locks[res];
    if (!lk) return;
    lk.expiresAt -= dt;
    // Find holder node
    const nd = state.nodes.find(n => n.id === lk.holder);
    if (nd) {
      nd.ttlRemaining = Math.max(0, lk.expiresAt);
    }
    if (lk.expiresAt <= 0) {
      expireLock(res, lk);
    }
  });

  // Run scenario
  if (!state.scenarioDone) {
    runScenario(dt);
  }
}

// ── Lock operations ──────────────────────────────────────────
function effectiveTTL() {
  let ttl = state.baseTTL;
  if (state.jitter) {
    const pct = state.jitterPct / 100;
    ttl = ttl * (1 + (Math.random() * 2 - 1) * pct);
  }
  return ttl;
}

function tryAcquire(nodeId, resource) {
  const nd = state.nodes.find(n => n.id === nodeId);
  if (!nd) return false;
  nd.attempts++;

  const lk = state.locks[resource];
  const now = 0; // relative, expiresAt is countdown

  if (state.lockType === 'mongo') {
    addLog(`[${fmtT()}] findAndModify({_id:"${resource}", holder:null})`, 'cmd');
    if (!lk || lk.expiresAt <= 0) {
      acquireLock(nodeId, resource, nd);
      return true;
    } else {
      addLog(`  → nil (held by ${lk.holder})`, 'fail');
      addEvent('RETRY', nodeId, resource);
      triggerPulse(nd, '#f87171');
      return false;
    }
  } else {
    // Redis SET NX
    const val = nodeId + '-' + Math.random().toString(36).slice(2, 7);
    addLog(`[${fmtT()}] SET lock:${resource} ${val} NX PX ${Math.round(effectiveTTL()*1000)}`, 'cmd');
    if (!lk || lk.expiresAt <= 0) {
      acquireLock(nodeId, resource, nd, val);
      addLog(`  → OK`, 'ok');
      // Re-check flag pattern
      setTimeout_sim(() => {
        addLog(`[${fmtT()}] GET lock:${resource} (re-check)`, 'cmd');
        const current = state.locks[resource];
        if (current && current.holder === nodeId && current.value === val) {
          addLog(`  → ${val} ✓ (owner confirmed)`, 'ok');
          addEvent('RECHECK', nodeId, resource);
          firePacket(nd, storePos(), '#a78bfa', 0.6);
        } else {
          addLog(`  → MISMATCH (lost lock!)`, 'fail');
        }
      }, 0.3);
      return true;
    } else {
      addLog(`  → nil (held by ${lk.holder})`, 'fail');
      addEvent('RETRY', nodeId, resource);
      triggerPulse(nd, '#f87171');
      return false;
    }
  }
}

function acquireLock(nodeId, resource, nd, redisValue) {
  const ttl = effectiveTTL();
  state.locks[resource] = {
    holder: nodeId,
    acquiredAt: state.simTime,
    expiresAt: ttl,
    value: redisValue || nodeId,
    resource,
  };
  nd.status = 'holding';
  nd.heldResource = resource;
  nd.ttlMax = ttl;
  nd.ttlRemaining = ttl;
  nd.actualTTL = ttl;
  nd.retryCount = 0;

  addEvent('ACQUIRE', nodeId, resource);
  triggerPulse(nd, '#6ee7b7');
  firePacket(storePos(), nd, nd.color, 0.8);
  addLog(`  → OK (TTL=${ttl.toFixed(1)}s)`, 'ok');
}

function releaseLock(nodeId, resource) {
  const lk = state.locks[resource];
  if (!lk || lk.holder !== nodeId) return;
  const nd = state.nodes.find(n => n.id === nodeId);

  if (state.lockType === 'mongo') {
    addLog(`[${fmtT()}] findAndModify({_id:"${resource}", holder:"${nodeId}"}, {$set:{holder:null}})`, 'cmd');
  } else {
    addLog(`[${fmtT()}] EVAL "if GET == myId then DEL" lock:${resource}`, 'cmd');
  }
  addLog(`  → OK (released)`, 'ok');

  delete state.locks[resource];
  if (nd) {
    nd.status = 'idle';
    nd.heldResource = null;
    nd.ttlRemaining = 0;
    nd.splitBrainMode = false;
  }
  addEvent('RELEASE', nodeId, resource);
  triggerPulse(nd, '#818cf8');
  firePacket(nd, storePos(), '#818cf8', 0.7);
}

function expireLock(resource, lk) {
  const nd = state.nodes.find(n => n.id === lk.holder);
  addLog(`[${fmtT()}] TTL expired: ${resource} (was ${lk.holder})`, 'warn');
  delete state.locks[resource];
  if (nd && !nd.splitBrainMode) {
    nd.status = 'idle';
    nd.heldResource = null;
    nd.ttlRemaining = 0;
  }
  addEvent('EXPIRE', lk.holder, resource);
  if (nd) triggerPulse(nd, '#fbbf24');
}

// ── Sim-time deferred callbacks ───────────────────────────────
const _deferrals = [];
function setTimeout_sim(fn, delay) {
  _deferrals.push({ at: state.simTime + delay, fn });
}

// ── Packets (animated dots) ───────────────────────────────────
function firePacket(from, to, color, speed = 1) {
  state.packets.push({
    x1: from.x, y1: from.y,
    x2: to.x,   y2: to.y,
    color,
    progress: 0,
    speed: speed * 1.2,
    done: false,
  });
}

function triggerPulse(nd, color) {
  if (!nd) return;
  state.pulses.push({ x: nd.x, y: nd.y, radius: 20, alpha: 1, color });
}

// ── Events ────────────────────────────────────────────────────
function addEvent(type, nodeId, resource, extra) {
  state.events.push({
    type,
    nodeId,
    resource,
    time: state.simTime,
    extra: extra || '',
  });
}

function addLog(msg, cls) {
  state.commandLog.unshift({ msg, cls });
  if (state.commandLog.length > 80) state.commandLog.pop();
}

function fmtT() {
  return state.simTime.toFixed(1) + 's';
}

// ── Scenarios ─────────────────────────────────────────────────
function runScenario(dt) {
  switch (state.scenario) {
    case 'happy':      runHappy(dt); break;
    case 'deadlock':   runDeadlock(dt); break;
    case 'thundering': runThundering(dt); break;
    case 'splitbrain': runSplitBrain(dt); break;
    case 'backoff':    runBackoff(dt); break;
  }
  // Process sim-time deferrals
  const now = state.simTime;
  for (let i = _deferrals.length - 1; i >= 0; i--) {
    if (_deferrals[i].at <= now) {
      _deferrals[i].fn();
      _deferrals.splice(i, 1);
    }
  }
}

// ── Happy Path ────────────────────────────────────────────────
function runHappy(dt) {
  const phase = state.scenarioPhase;
  const t = state.scenarioTimer;
  const nodes = state.nodes;
  const n = nodes.length;

  if (phase === 0) {
    // Node-0 tries to acquire
    nodes.forEach(nd => { nd.status = 'waiting'; });
    nodes[0].status = 'waiting';
    firePacket(nodes[0], storePos(), nodes[0].color, 1);
    state.scenarioPhase = 1;
    state.scenarioTimer = 0;
  } else if (phase === 1 && t > 0.6) {
    tryAcquire(nodes[0].id, 'resource-A');
    state.scenarioPhase = 2;
    state.scenarioTimer = 0;
  } else if (phase === 2 && t > 1.0) {
    // Others fail
    for (let i = 1; i < n; i++) {
      nodes[i].status = 'waiting';
      setTimeout_sim(() => {
        firePacket(nodes[i], storePos(), nodes[i].color, 0.9);
        setTimeout_sim(() => {
          tryAcquire(nodes[i].id, 'resource-A');
          nodes[i].status = 'waiting';
        }, 0.4);
      }, i * 0.4);
    }
    state.scenarioPhase = 3;
    state.scenarioTimer = 0;
  } else if (phase === 3 && t > 3.0) {
    // Node-0 releases
    nodes[0].status = 'releasing';
    firePacket(nodes[0], storePos(), '#818cf8', 0.9);
    state.scenarioPhase = 4;
    state.scenarioTimer = 0;
  } else if (phase === 4 && t > 0.8) {
    releaseLock(nodes[0].id, 'resource-A');
    state.scenarioPhase = 5;
    state.scenarioTimer = 0;
  } else if (phase === 5 && t > 0.5 && n > 1) {
    // Next node acquires
    nodes[1].status = 'waiting';
    firePacket(nodes[1], storePos(), nodes[1].color, 1);
    state.scenarioPhase = 6;
    state.scenarioTimer = 0;
  } else if (phase === 6 && t > 0.6) {
    tryAcquire(nodes[1].id, 'resource-A');
    state.scenarioPhase = 7;
    state.scenarioTimer = 0;
  } else if (phase === 7 && t > 2.5) {
    releaseLock(nodes[1].id, 'resource-A');
    // Loop back
    state.nodes.forEach(nd => { nd.status = 'idle'; nd.heldResource = null; });
    state.scenarioPhase = 0;
    state.scenarioTimer = 0;
  }
}

// ── Deadlock ──────────────────────────────────────────────────
function runDeadlock(dt) {
  const phase = state.scenarioPhase;
  const t = state.scenarioTimer;
  const nodes = state.nodes;
  if (nodes.length < 2) return;

  if (phase === 0) {
    addLog('[scenario] Deadlock: Node-1 acquires R-A, Node-2 acquires R-B', 'warn');
    firePacket(nodes[0], storePos(), nodes[0].color, 1);
    firePacket(nodes[1], storePos(), nodes[1].color, 1);
    state.scenarioPhase = 1;
    state.scenarioTimer = 0;
  } else if (phase === 1 && t > 0.8) {
    tryAcquire(nodes[0].id, 'resource-A');
    tryAcquire(nodes[1].id, 'resource-B');
    state.scenarioPhase = 2;
    state.scenarioTimer = 0;
  } else if (phase === 2 && t > 1.5) {
    // Each tries to acquire the other's resource → deadlock
    addLog('[scenario] Each node wants the other\'s resource — DEADLOCK', 'fail');
    nodes[0].status = 'waiting';
    nodes[1].status = 'waiting';
    firePacket(nodes[0], storePos(), '#f87171', 0.8);
    firePacket(nodes[1], storePos(), '#f87171', 0.8);
    addEvent('DEADLOCK', nodes[0].id, 'resource-B');
    addEvent('DEADLOCK', nodes[1].id, 'resource-A');
    // Visualize deadlock cycle
    state.deadlockCycle = [nodes[0].id, nodes[1].id];
    state.scenarioPhase = 3;
    state.scenarioTimer = 0;
  } else if (phase === 3 && t > 2.0) {
    // Fail to acquire
    tryAcquire(nodes[0].id, 'resource-B');
    tryAcquire(nodes[1].id, 'resource-A');
    state.scenarioPhase = 4;
    state.scenarioTimer = 0;
  } else if (phase === 4) {
    // Wait for TTL to expire both locks
    const lkA = state.locks['resource-A'];
    const lkB = state.locks['resource-B'];
    if ((!lkA || lkA.expiresAt <= 0) && (!lkB || lkB.expiresAt <= 0)) {
      addLog('[scenario] TTL expiry broke the deadlock!', 'ok');
      state.deadlockCycle = null;
      nodes.forEach(nd => { nd.status = 'idle'; });
      state.scenarioPhase = 5;
      state.scenarioTimer = 0;
    }
  } else if (phase === 5 && t > 2.0) {
    // Restart
    state.scenarioPhase = 0;
    state.scenarioTimer = 0;
  }
}

// ── Thundering Herd ──────────────────────────────────────────
function runThundering(dt) {
  const phase = state.scenarioPhase;
  const t = state.scenarioTimer;
  const nodes = state.nodes;

  if (phase === 0) {
    addLog('[scenario] Thundering Herd: 1 node holds lock', 'cmd');
    nodes.forEach(nd => { nd.status = 'waiting'; });
    firePacket(nodes[0], storePos(), nodes[0].color, 1);
    state.scenarioPhase = 1;
    state.scenarioTimer = 0;
  } else if (phase === 1 && t > 0.7) {
    tryAcquire(nodes[0].id, 'resource-A');
    nodes.slice(1).forEach(nd => { nd.status = 'waiting'; });
    state.scenarioPhase = 2;
    state.scenarioTimer = 0;
  } else if (phase === 2) {
    // Wait for lock to expire
    if (!state.locks['resource-A']) {
      addLog('[scenario] Lock expired — all nodes racing!', 'warn');
      state.scenarioPhase = 3;
      state.scenarioTimer = 0;
    }
  } else if (phase === 3 && t > 0.2) {
    // All nodes race
    const jitterOn = state.jitter;
    addLog(`[scenario] Jitter is ${jitterOn ? 'ON' : 'OFF'} — ${jitterOn ? 'staggered' : 'simultaneous'} retries`, jitterOn ? 'ok' : 'fail');
    nodes.forEach((nd, i) => {
      const delay = jitterOn ? (Math.random() * 1.5) : 0;
      setTimeout_sim(() => {
        nd.status = 'waiting';
        firePacket(nd, storePos(), nd.color, 0.9);
        setTimeout_sim(() => {
          const ok = tryAcquire(nd.id, 'resource-A');
          if (!ok) nd.status = 'waiting';
        }, delay + 0.3);
      }, delay);
    });
    state.scenarioPhase = 4;
    state.scenarioTimer = 0;
  } else if (phase === 4 && t > 5.0) {
    // Release and loop
    const holder = Object.values(state.locks).find(l => l);
    if (holder) releaseLock(holder.holder, holder.resource);
    nodes.forEach(nd => { nd.status = 'idle'; nd.heldResource = null; });
    state.scenarioPhase = 0;
    state.scenarioTimer = 0;
  }
}

// ── Split Brain ───────────────────────────────────────────────
function runSplitBrain(dt) {
  const phase = state.scenarioPhase;
  const t = state.scenarioTimer;
  const nodes = state.nodes;
  if (nodes.length < 2) return;

  if (phase === 0) {
    addLog('[scenario] Split Brain: Node-1 acquires lock', 'cmd');
    firePacket(nodes[0], storePos(), nodes[0].color, 1);
    state.scenarioPhase = 1;
    state.scenarioTimer = 0;
  } else if (phase === 1 && t > 0.7) {
    tryAcquire(nodes[0].id, 'resource-A');
    state.scenarioPhase = 2;
    state.scenarioTimer = 0;
  } else if (phase === 2) {
    // Wait for lock to expire naturally
    if (!state.locks['resource-A']) {
      // Node-0 enters split brain: thinks it still holds
      nodes[0].splitBrainMode = true;
      nodes[0].status = 'holding';
      nodes[0].heldResource = 'resource-A';
      addLog('[scenario] NETWORK PARTITION — Node-1 thinks it still holds!', 'fail');
      addEvent('CONFLICT', nodes[0].id, 'resource-A');
      state.scenarioPhase = 3;
      state.scenarioTimer = 0;
    }
  } else if (phase === 3 && t > 1.0) {
    // Node-2 acquires
    addLog('[scenario] Node-2 acquires (TTL expired), CONFLICT zone!', 'fail');
    tryAcquire(nodes[1].id, 'resource-A');
    addEvent('CONFLICT', nodes[1].id, 'resource-A');
    nodes[0].status = 'conflict';
    nodes[1].status = 'holding';
    state.scenarioPhase = 4;
    state.scenarioTimer = 0;
  } else if (phase === 4 && t > 3.0) {
    // Resolve
    addLog('[scenario] Fencing token resolves split brain', 'ok');
    nodes[0].splitBrainMode = false;
    nodes[0].status = 'idle';
    releaseLock(nodes[1].id, 'resource-A');
    state.scenarioPhase = 5;
    state.scenarioTimer = 0;
  } else if (phase === 5 && t > 2.0) {
    state.scenarioPhase = 0;
    state.scenarioTimer = 0;
    nodes.forEach(nd => { nd.status = 'idle'; nd.heldResource = null; nd.splitBrainMode = false; });
  }
}

// ── Retry with Backoff ────────────────────────────────────────
function runBackoff(dt) {
  const phase = state.scenarioPhase;
  const t = state.scenarioTimer;
  const nodes = state.nodes;
  if (nodes.length < 2) return;

  if (phase === 0) {
    addLog('[scenario] Retry Backoff: Node-1 holds, Node-2 retries with exponential backoff', 'cmd');
    firePacket(nodes[0], storePos(), nodes[0].color, 1);
    state.scenarioPhase = 1;
    state.scenarioTimer = 0;
    nodes[1].retryCount = 0;
    nodes[1].retryDelay = 0.5; // 500ms sim
  } else if (phase === 1 && t > 0.7) {
    tryAcquire(nodes[0].id, 'resource-A');
    state.scenarioPhase = 2;
    state.scenarioTimer = 0;
  } else if (phase === 2 && t > 0.5) {
    // Node-1 starts retrying
    scheduleRetry(nodes[1], 'resource-A', 0);
    state.scenarioPhase = 3;
    state.scenarioTimer = 0;
  } else if (phase === 3 && t > 6.0) {
    // Node-0 releases
    releaseLock(nodes[0].id, 'resource-A');
    state.scenarioPhase = 4;
    state.scenarioTimer = 0;
  } else if (phase === 4 && t > 0.8) {
    // Node-1 finally gets it
    tryAcquire(nodes[1].id, 'resource-A');
    state.scenarioPhase = 5;
    state.scenarioTimer = 0;
  } else if (phase === 5 && t > 2.0) {
    releaseLock(nodes[1].id, 'resource-A');
    nodes.forEach(nd => { nd.status = 'idle'; nd.heldResource = null; });
    state.scenarioPhase = 0;
    state.scenarioTimer = 0;
  }
}

function scheduleRetry(nd, resource, attempt) {
  const delays = [0.5, 1.0, 2.0, 4.0, 8.0]; // exponential
  if (attempt >= delays.length) return;
  const delay = delays[attempt];
  nd.retryCount = attempt + 1;
  nd.retryDelay = delay;
  nd.status = 'waiting';
  addLog(`[${fmtT()}] Node-${nd.id.split('-')[1]} retry #${attempt + 1} in ${delay.toFixed(1)}s (backoff)`, 'warn');
  setTimeout_sim(() => {
    firePacket(nd, storePos(), nd.color, 0.9);
    setTimeout_sim(() => {
      const ok = tryAcquire(nd.id, resource);
      if (!ok) scheduleRetry(nd, resource, attempt + 1);
    }, 0.4);
  }, delay);
}

// ── Canvas drawing ────────────────────────────────────────────
function resizeCanvas() {
  const wrap = document.getElementById('canvas-wrapper');
  const dpr = window.devicePixelRatio || 1;
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);
  state.canvasW = w;
  state.canvasH = h;
  layoutNodes();
}

function drawFrame() {
  if (!state.canvasW) return;
  ctx.clearRect(0, 0, state.canvasW, state.canvasH);

  drawGrid();
  drawConnections();
  drawPulses();
  drawLockStore();
  drawPackets();
  drawNodes();
  drawDeadlockCycle();
  drawSplitBrainZone();

  simTimeDisp.textContent = 'T: ' + state.simTime.toFixed(1) + 's';
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = 'rgba(42,45,62,0.5)';
  ctx.lineWidth = 1;
  const step = 40;
  for (let x = 0; x < state.canvasW; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, state.canvasH); ctx.stroke();
  }
  for (let y = 0; y < state.canvasH; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(state.canvasW, y); ctx.stroke();
  }
  ctx.restore();
}

function drawConnections() {
  const sp = storePos();
  state.nodes.forEach(nd => {
    const held = nd.heldResource && state.locks[nd.heldResource];
    const isActive = nd.status !== 'idle';
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = isActive ? 1.5 : 0.8;
    ctx.strokeStyle = isActive
      ? hexAlpha(nd.color, 0.35)
      : 'rgba(42,45,62,0.6)';
    ctx.beginPath();
    ctx.moveTo(nd.x, nd.y);
    ctx.lineTo(sp.x, sp.y);
    ctx.stroke();
    ctx.restore();
  });
}

function drawLockStore() {
  const sp = storePos();
  const w = 140, h = 80;
  const x = sp.x - w / 2, y = sp.y - h / 2;
  const hasLock = Object.keys(state.locks).length > 0;

  // Glow if locked
  if (hasLock) {
    ctx.save();
    ctx.shadowColor = '#6ee7b7';
    ctx.shadowBlur = 20;
  }

  // Draw database cylinder shape
  ctx.save();
  // Body
  ctx.fillStyle = '#1a1d27';
  ctx.strokeStyle = hasLock ? '#6ee7b7' : '#2a2d3e';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y + 12, w, h - 12, 6);
  ctx.fill(); ctx.stroke();
  // Top ellipse
  ctx.beginPath();
  ctx.ellipse(sp.x, y + 12, w / 2, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#20243a';
  ctx.fill(); ctx.stroke();
  // Second stripe
  ctx.beginPath();
  ctx.ellipse(sp.x, y + 24, w / 2, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(110,231,183,0.06)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(110,231,183,0.15)';
  ctx.stroke();
  ctx.restore();

  if (hasLock) ctx.restore();

  // Label
  ctx.save();
  ctx.fillStyle = '#8892a4';
  ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily;
  ctx.textAlign = 'center';
  ctx.fillText(state.lockType === 'mongo' ? 'MongoDB' : 'Redis', sp.x, y + h + 18);

  // Resource labels inside
  const resources = Object.keys(state.locks);
  resources.forEach((res, i) => {
    const lk = state.locks[res];
    const col = state.nodes.find(n => n.id === lk.holder)?.color || '#6ee7b7';
    ctx.fillStyle = col;
    ctx.font = '500 10px monospace';
    ctx.fillText(res, sp.x, y + 46 + i * 16);
  });
  ctx.restore();
}

function drawNodes() {
  state.nodes.forEach(nd => drawNode(nd));
}

function drawNode(nd) {
  const r = 32;
  ctx.save();

  // Shadow/glow based on status
  if (nd.status === 'holding') {
    ctx.shadowColor = nd.color;
    ctx.shadowBlur = 18;
  } else if (nd.status === 'conflict') {
    ctx.shadowColor = '#f87171';
    ctx.shadowBlur = 18;
  }

  // Circle fill
  const gradient = ctx.createRadialGradient(nd.x - 8, nd.y - 8, 4, nd.x, nd.y, r);
  gradient.addColorStop(0, hexAlpha(nd.color, 0.25));
  gradient.addColorStop(1, hexAlpha(nd.color, 0.06));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(nd.x, nd.y, r, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.strokeStyle = nd.status === 'conflict' ? '#f87171' : nd.color;
  ctx.lineWidth = nd.status === 'holding' ? 2.5 : 1.5;
  ctx.stroke();
  ctx.restore();

  // Status ring (animated rotation for waiting)
  if (nd.status === 'waiting') {
    ctx.save();
    ctx.strokeStyle = hexAlpha(nd.color, 0.5);
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -state.simTime * 40;
    ctx.beginPath();
    ctx.arc(nd.x, nd.y, r + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Lock icon if holding
  if (nd.status === 'holding' || nd.splitBrainMode) {
    ctx.save();
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔒', nd.x, nd.y - 2);
    ctx.restore();
  }

  // Node label
  ctx.save();
  ctx.fillStyle = nd.color;
  ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily;
  ctx.textAlign = 'center';
  ctx.fillText(nd.label, nd.x, nd.y + r + 14);

  // Status badge
  const statusColor = {
    idle: '#8892a4', waiting: '#fbbf24', holding: '#6ee7b7',
    releasing: '#818cf8', conflict: '#f87171'
  }[nd.status] || '#8892a4';
  ctx.fillStyle = statusColor;
  ctx.font = '500 9px ' + getComputedStyle(document.body).fontFamily;
  ctx.fillText(nd.status.toUpperCase(), nd.x, nd.y + r + 26);

  // Attempts badge
  ctx.fillStyle = '#8892a4';
  ctx.font = '9px monospace';
  ctx.fillText('×' + nd.attempts, nd.x, nd.y + r + 38);

  // Retry backoff indicator
  if (nd.status === 'waiting' && nd.retryCount > 0) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = '9px monospace';
    ctx.fillText(`retry#${nd.retryCount}`, nd.x, nd.y + r + 50);
  }
  ctx.restore();
}

function drawPackets() {
  state.packets.forEach(p => {
    const t = Math.min(p.progress, 1);
    const x = p.x1 + (p.x2 - p.x1) * t;
    const y = p.y1 + (p.y2 - p.y1) * t;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
  });
}

function drawPulses() {
  state.pulses.forEach(p => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.strokeStyle = hexAlpha(p.color, p.alpha);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  });
}

function drawDeadlockCycle() {
  if (!state.deadlockCycle || state.deadlockCycle.length < 2) return;
  const [id0, id1] = state.deadlockCycle;
  const n0 = state.nodes.find(n => n.id === id0);
  const n1 = state.nodes.find(n => n.id === id1);
  if (!n0 || !n1) return;

  const t = state.simTime;
  ctx.save();
  ctx.strokeStyle = 'rgba(248,113,113,0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.lineDashOffset = -t * 30;

  // Arc between n0 and n1
  const mx = (n0.x + n1.x) / 2;
  const my = (n0.y + n1.y) / 2 - 40;
  ctx.beginPath();
  ctx.moveTo(n0.x, n0.y);
  ctx.quadraticCurveTo(mx, my, n1.x, n1.y);
  ctx.stroke();
  ctx.restore();

  // DEADLOCK label
  ctx.save();
  ctx.fillStyle = '#f87171';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⚠ DEADLOCK', mx, my - 10);
  ctx.restore();
}

function drawSplitBrainZone() {
  const splitNode = state.nodes.find(n => n.splitBrainMode);
  if (!splitNode) return;
  const sp = storePos();

  ctx.save();
  ctx.strokeStyle = 'rgba(248,113,113,0.4)';
  ctx.fillStyle = 'rgba(248,113,113,0.04)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(splitNode.x - 40, splitNode.y);
  ctx.lineTo(sp.x, sp.y - 20);
  ctx.lineTo(sp.x, sp.y + 20);
  ctx.lineTo(splitNode.x - 40, splitNode.y + 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#f87171';
  ctx.font = '600 10px monospace';
  ctx.textAlign = 'center';
  const mx = (splitNode.x + sp.x) / 2;
  const my = (splitNode.y + sp.y) / 2 - 10;
  ctx.fillText('⚡ SPLIT BRAIN', mx, my);
  ctx.restore();
}

// ── Timeline ─────────────────────────────────────────────────
const TL_H = 68;
const TL_ROW = 10;
const TL_PX_PER_SEC = 40;
const TL_MARGIN_LEFT = 60;

function renderTimeline() {
  const scroll = document.getElementById('timeline-scroll');
  const totalSec = Math.max(state.simTime + 5, 30);
  const w = Math.max(scroll.clientWidth, TL_MARGIN_LEFT + totalSec * TL_PX_PER_SEC);
  const dpr = window.devicePixelRatio || 1;
  tlCanvas.width  = w * dpr;
  tlCanvas.height = TL_H * dpr;
  tlCanvas.style.width  = w + 'px';
  tlCanvas.style.height = TL_H + 'px';
  tlCtx.scale(dpr, dpr);

  tlCtx.clearRect(0, 0, w, TL_H);

  // Background rows
  state.nodes.forEach((nd, i) => {
    const y = 8 + i * 12;
    tlCtx.fillStyle = i % 2 === 0 ? 'rgba(26,29,39,0.5)' : 'rgba(32,36,58,0.3)';
    tlCtx.fillRect(0, y, w, 12);
    // Row label
    tlCtx.fillStyle = nd.color;
    tlCtx.font = '9px monospace';
    tlCtx.textAlign = 'right';
    tlCtx.fillText(nd.label, TL_MARGIN_LEFT - 4, y + 9);
  });

  // Time axis ticks
  tlCtx.fillStyle = '#3a3d4e';
  tlCtx.font = '8px monospace';
  tlCtx.textAlign = 'center';
  for (let s = 0; s <= totalSec; s += 5) {
    const x = TL_MARGIN_LEFT + s * TL_PX_PER_SEC;
    tlCtx.fillStyle = '#3a3d4e';
    tlCtx.fillRect(x, 0, 1, TL_H - 14);
    tlCtx.fillStyle = '#8892a4';
    tlCtx.fillText(s + 's', x, TL_H - 4);
  }

  // Events
  state.events.forEach(ev => {
    const nodeIdx = state.nodes.findIndex(n => n.id === ev.nodeId);
    if (nodeIdx < 0) return;
    const x = TL_MARGIN_LEFT + ev.time * TL_PX_PER_SEC;
    const y = 8 + nodeIdx * 12 + 1;
    const color = EVENT_COLORS[ev.type] || '#8892a4';
    tlCtx.save();
    tlCtx.fillStyle = color;
    tlCtx.shadowColor = color;
    tlCtx.shadowBlur = 6;
    tlCtx.beginPath();
    tlCtx.arc(x, y + 5, 4, 0, Math.PI * 2);
    tlCtx.fill();
    tlCtx.restore();
  });

  // Current time indicator
  const nowX = TL_MARGIN_LEFT + state.simTime * TL_PX_PER_SEC;
  tlCtx.save();
  tlCtx.strokeStyle = 'rgba(110,231,183,0.7)';
  tlCtx.lineWidth = 1.5;
  tlCtx.beginPath();
  tlCtx.moveTo(nowX, 0);
  tlCtx.lineTo(nowX, TL_H - 14);
  tlCtx.stroke();
  tlCtx.restore();

  // Auto-scroll to keep current time visible
  const scrollTarget = nowX - scroll.clientWidth * 0.7;
  if (scrollTarget > 0) scroll.scrollLeft = scrollTarget;
}

// ── Sidebar ───────────────────────────────────────────────────
function renderSidebar() {
  renderLockDoc();
  renderNodeStatus();
  renderTTLBars();
  renderCommandLog();
}

function renderLockDoc() {
  const keys = Object.keys(state.locks);
  if (keys.length === 0) {
    lockDocView.textContent = 'No lock held';
    return;
  }
  const obj = {};
  keys.forEach(k => {
    const lk = state.locks[k];
    if (state.lockType === 'mongo') {
      obj[k] = {
        _id: k,
        holder: lk.holder,
        acquiredAt: 'ISODate(' + lk.acquiredAt.toFixed(1) + 's)',
        expiresAt: 'ISODate(+' + lk.expiresAt.toFixed(1) + 's)',
      };
    } else {
      obj['lock:' + k] = {
        value: lk.value,
        ttl: lk.expiresAt.toFixed(1) + 's',
        holder: lk.holder,
      };
    }
  });
  lockDocView.textContent = JSON.stringify(obj, null, 2);
}

function renderNodeStatus() {
  nodeStatusList.innerHTML = '';
  state.nodes.forEach(nd => {
    const div = document.createElement('div');
    div.className = 'node-status-item';
    div.innerHTML = `
      <div class="node-color-dot" style="background:${nd.color}"></div>
      <span class="node-name">${nd.label}</span>
      <span class="node-state-badge state-${nd.status}">${nd.status}</span>
      <span class="node-attempts">×${nd.attempts}</span>
    `;
    nodeStatusList.appendChild(div);
  });
}

function renderTTLBars() {
  ttlBarsEl.innerHTML = '';
  state.nodes.forEach(nd => {
    if (nd.status !== 'holding' && !nd.splitBrainMode) return;
    const pct = nd.ttlMax > 0 ? (nd.ttlRemaining / nd.ttlMax) * 100 : 0;
    const barColor = pct > 50 ? nd.color : pct > 25 ? '#fbbf24' : '#f87171';
    const jitterLow  = nd.ttlMax * (1 - state.jitterPct / 100);
    const jitterHigh = nd.ttlMax * (1 + state.jitterPct / 100);
    const jitterLowPct  = nd.ttlMax > 0 ? (jitterLow  / nd.ttlMax) * 100 : 0;
    const jitterHighPct = nd.ttlMax > 0 ? (jitterHigh / nd.ttlMax) * 100 : 0;

    const div = document.createElement('div');
    div.className = 'ttl-bar-item';
    div.innerHTML = `
      <div class="ttl-bar-header">
        <span class="ttl-bar-name" style="color:${nd.color}">${nd.label}</span>
        <span class="ttl-bar-val">${nd.ttlRemaining.toFixed(1)}s / ${nd.ttlMax.toFixed(1)}s</span>
      </div>
      <div class="ttl-bar-track">
        <div class="ttl-bar-fill" style="width:${pct}%;background:${barColor}">
        </div>
        ${state.jitter ? `
          <div class="ttl-jitter-marker" style="left:${jitterLowPct}%" title="Jitter low"></div>
          <div class="ttl-jitter-marker" style="left:${Math.min(jitterHighPct,100)}%" title="Jitter high"></div>
        ` : ''}
      </div>
    `;
    ttlBarsEl.appendChild(div);
  });
}

function renderCommandLog() {
  commandLogEl.innerHTML = '';
  state.commandLog.slice(0, 30).forEach(entry => {
    const div = document.createElement('div');
    div.className = 'log-line log-' + entry.cls;
    div.textContent = entry.msg;
    commandLogEl.appendChild(div);
  });
}

// ── Tooltip on timeline ───────────────────────────────────────
document.getElementById('timeline-scroll').addEventListener('mousemove', e => {
  const scroll = document.getElementById('timeline-scroll');
  const rect = tlCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left + scroll.scrollLeft;
  const my = e.clientY - rect.top;
  const time = (mx - TL_MARGIN_LEFT) / TL_PX_PER_SEC;
  const nodeIdx = Math.floor((my - 8) / 12);

  // Find nearest event
  let best = null, bestDist = Infinity;
  state.events.forEach(ev => {
    const ex = TL_MARGIN_LEFT + ev.time * TL_PX_PER_SEC;
    const ey = 8 + state.nodes.findIndex(n => n.id === ev.nodeId) * 12 + 5;
    const dist = Math.hypot(mx - ex, my - ey);
    if (dist < 12 && dist < bestDist) { best = ev; bestDist = dist; }
  });

  if (best) {
    tooltip.classList.remove('hidden');
    tooltip.style.left = e.clientX + 12 + 'px';
    tooltip.style.top  = e.clientY - 10 + 'px';
    tooltip.innerHTML = `<strong>${best.type}</strong><br>Node: ${best.nodeId}<br>Resource: ${best.resource}<br>Time: ${best.time.toFixed(2)}s`;
  } else {
    tooltip.classList.add('hidden');
  }
});
document.getElementById('timeline-scroll').addEventListener('mouseleave', () => {
  tooltip.classList.add('hidden');
});

// ── Helpers ───────────────────────────────────────────────────
function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Resize handling ───────────────────────────────────────────
const resizeObserver = new ResizeObserver(() => {
  resizeCanvas();
  drawFrame();
});
resizeObserver.observe(document.getElementById('canvas-wrapper'));

// ── Bootstrap ─────────────────────────────────────────────────
function init() {
  resizeCanvas();
  initNodes();
  renderSidebar();
  renderTimeline();
  drawFrame();
  // Auto-start happy path
  play();
}

init();
