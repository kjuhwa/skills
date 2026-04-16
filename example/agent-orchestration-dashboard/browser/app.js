/* ============================================
   AI Agent Orchestration Dashboard - App Logic
   ============================================ */

'use strict';

/* ── Constants ─────────────────────────────── */
const AGENT_DEFS = [
  { id: 'planner',   name: 'Planner',   role: '계획 수립',     icon: '🧠', color: '#58a6ff' },
  { id: 'architect', name: 'Architect', role: '설계 & 구조',   icon: '🏗️', color: '#bc8cff' },
  { id: 'executor',  name: 'Executor',  role: '구현 & 실행',   icon: '⚙️', color: '#3fb950' },
  { id: 'reviewer',  name: 'Reviewer',  role: '검토 & 검증',   icon: '🔍', color: '#f0883e' },
  { id: 'designer',  name: 'Designer',  role: 'UI/UX 설계',    icon: '🎨', color: '#f778ba' },
  { id: 'writer',    name: 'Writer',    role: '문서 & 콘텐츠',  icon: '✍️', color: '#79c0ff' }
];

const MSG_TEMPLATES = {
  task: [
    '새로운 작업 할당: {task}',
    '서브태스크 분배: {task}',
    '요구사항 전달 중...',
    '작업 명세서 발송',
    'Sprint 항목 배정'
  ],
  result: [
    '작업 완료 보고',
    '구현 결과물 전달',
    '산출물 준비 완료',
    'PR 제출 완료',
    '빌드 성공 ✓'
  ],
  feedback: [
    '코드 리뷰 의견 3건',
    '개선 사항 발견됨',
    '재작업 요청 (minor)',
    '승인 완료 ✓',
    '보안 이슈 없음'
  ],
  design: [
    'Wireframe 초안 전달',
    'Component 명세 완성',
    'Style Guide 적용',
    'Prototype 링크 공유'
  ],
  content: [
    'API 문서 초안 완성',
    'README 업데이트',
    'Release Notes 작성',
    '사용자 가이드 전달'
  ],
  system: [
    '시스템 초기화',
    '에이전트 활성화',
    '워크플로우 시작',
    '시나리오 전환'
  ]
};

const SCENARIOS = [
  {
    name: '웹 애플리케이션 개발',
    nameEn: 'Web App Development',
    steps: [
      { from: 'planner',   to: 'architect', type: 'task',    delay: 0    },
      { from: 'architect', to: 'executor',  type: 'task',    delay: 1800 },
      { from: 'architect', to: 'designer',  type: 'design',  delay: 2200 },
      { from: 'architect', to: 'writer',    type: 'task',    delay: 2600 },
      { from: 'executor',  to: 'reviewer',  type: 'result',  delay: 4500 },
      { from: 'designer',  to: 'reviewer',  type: 'design',  delay: 5000 },
      { from: 'writer',    to: 'reviewer',  type: 'content', delay: 5400 },
      { from: 'reviewer',  to: 'executor',  type: 'feedback',delay: 6800 },
      { from: 'executor',  to: 'planner',   type: 'result',  delay: 8500 }
    ]
  },
  {
    name: 'AI 모델 파이프라인',
    nameEn: 'AI Model Pipeline',
    steps: [
      { from: 'planner',   to: 'architect', type: 'task',    delay: 0    },
      { from: 'planner',   to: 'writer',    type: 'task',    delay: 400  },
      { from: 'architect', to: 'executor',  type: 'task',    delay: 2000 },
      { from: 'executor',  to: 'reviewer',  type: 'result',  delay: 4000 },
      { from: 'reviewer',  to: 'architect', type: 'feedback',delay: 5500 },
      { from: 'architect', to: 'executor',  type: 'task',    delay: 7000 },
      { from: 'executor',  to: 'writer',    type: 'result',  delay: 8500 },
      { from: 'writer',    to: 'planner',   type: 'content', delay: 9500 }
    ]
  },
  {
    name: '인프라 배포 자동화',
    nameEn: 'Infra Deployment',
    steps: [
      { from: 'planner',   to: 'architect', type: 'task',    delay: 0    },
      { from: 'planner',   to: 'designer',  type: 'task',    delay: 500  },
      { from: 'architect', to: 'executor',  type: 'task',    delay: 1800 },
      { from: 'designer',  to: 'writer',    type: 'design',  delay: 3000 },
      { from: 'executor',  to: 'reviewer',  type: 'result',  delay: 4200 },
      { from: 'reviewer',  to: 'planner',   type: 'feedback',delay: 5800 },
      { from: 'writer',    to: 'planner',   type: 'content', delay: 6200 },
      { from: 'planner',   to: 'executor',  type: 'task',    delay: 7400 },
      { from: 'executor',  to: 'planner',   type: 'result',  delay: 9200 }
    ]
  }
];

/* ── Utility ───────────────────────────────── */
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function formatTime(d) {
  return d.toTimeString().slice(0, 8);
}
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ── Agent Class ───────────────────────────── */
class Agent {
  constructor(def) {
    Object.assign(this, def);
    this.status   = 'idle';
    this.msgCount = 0;
    this.tasksDone = 0;
    this.latencies = [];
    this.x = 0;
    this.y = 0;
  }

  get avgLatency() {
    if (!this.latencies.length) return 0;
    return Math.round(this.latencies.reduce((a,b) => a+b, 0) / this.latencies.length);
  }

  setStatus(status) {
    this.status = status;
    updateAgentCard(this);
    updateNodeStatus(this);
  }
}

/* ── Message Class ──────────────────────────── */
let _msgId = 0;
class Message {
  constructor(from, to, type) {
    this.id        = ++_msgId;
    this.from      = from;
    this.to        = to;
    this.type      = type;
    this.content   = rand(MSG_TEMPLATES[type] || MSG_TEMPLATES.task);
    this.timestamp = new Date();
    this.latency   = randomInt(80, 420);
  }
}

/* ── State ──────────────────────────────────── */
const state = {
  agents: {},
  running: false,
  speed: 1.0,
  scenarioIdx: 0,
  totalMessages: 0,
  tasksCompleted: 0,
  allLatencies: [],
  selectedAgent: null,
  logFilter: 'all',
  logEntries: [],
  activeTimers: [],
  scenarioLoop: null
};

/* ── DOM refs ───────────────────────────────── */
const $ = id => document.getElementById(id);
const dom = {};

/* ── Init ───────────────────────────────────── */
function init() {
  // Cache DOM
  dom.app          = $('app');
  dom.agentList    = $('agent-list');
  dom.agentDetail  = $('agent-detail');
  dom.svg          = $('graph-svg');
  dom.msgLog       = $('message-log');
  dom.btnStart     = $('btn-start');
  dom.btnPause     = $('btn-pause');
  dom.btnReset     = $('btn-reset');
  dom.speedSlider  = $('speed-slider');
  dom.speedValue   = $('speed-value');
  dom.statusDot    = $('status-dot');
  dom.statusText   = $('status-text');
  dom.scenarioBanner = $('scenario-name');

  // Stats
  dom.statMsgs    = $('stat-messages');
  dom.statLatency = $('stat-latency');
  dom.statActive  = $('stat-active');
  dom.statTasks   = $('stat-tasks');

  // Build agents
  AGENT_DEFS.forEach(def => {
    state.agents[def.id] = new Agent(def);
  });

  // Build sidebar
  buildAgentList();

  // Build D3 graph
  buildGraph();

  // Wire controls
  dom.btnStart.addEventListener('click', startSimulation);
  dom.btnPause.addEventListener('click', pauseSimulation);
  dom.btnReset.addEventListener('click', resetSimulation);

  dom.speedSlider.addEventListener('input', e => {
    state.speed = parseFloat(e.target.value);
    dom.speedValue.textContent = state.speed.toFixed(1) + 'x';
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.logFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLog();
    });
  });

  // Initial status
  setSimStatus('idle');
  updateStats();
}

/* ── Sidebar ─────────────────────────────────── */
function buildAgentList() {
  dom.agentList.innerHTML = '';
  AGENT_DEFS.forEach(def => {
    const a = state.agents[def.id];
    const card = document.createElement('div');
    card.className = 'agent-card';
    card.id = `card-${def.id}`;
    card.style.setProperty('--agent-color', def.color);
    card.innerHTML = `
      <div class="agent-avatar" id="avatar-${def.id}">
        <div class="agent-avatar-bg" style="background:${def.color}"></div>
        <span style="position:relative;z-index:1">${def.icon}</span>
      </div>
      <div class="agent-info">
        <div class="agent-name">${def.name}</div>
        <div class="agent-role">${def.role}</div>
      </div>
      <div class="agent-status-wrap">
        <div class="agent-status-pill status-idle" id="status-${def.id}">Idle</div>
        <div class="agent-msg-count" id="msgcount-${def.id}">0 msgs</div>
      </div>`;
    card.addEventListener('click', () => selectAgent(def.id));
    dom.agentList.appendChild(card);
  });
}

function updateAgentCard(agent) {
  const pill = $(`status-${agent.id}`);
  if (!pill) return;
  const statusMap = {
    idle: ['Idle', 'status-idle'],
    thinking: ['Thinking...', 'status-thinking'],
    sending: ['Sending', 'status-sending'],
    receiving: ['Receiving', 'status-receiving'],
    working: ['Working', 'status-working']
  };
  const [label, cls] = statusMap[agent.status] || ['Idle', 'status-idle'];
  pill.textContent = label;
  pill.className = `agent-status-pill ${cls}`;
  $(`msgcount-${agent.id}`).textContent = `${agent.msgCount} msgs`;
  if (state.selectedAgent === agent.id) renderAgentDetail(agent);
}

function selectAgent(id) {
  state.selectedAgent = id;
  document.querySelectorAll('.agent-card').forEach(c => c.classList.remove('selected'));
  const card = $(`card-${id}`);
  if (card) card.classList.add('selected');
  renderAgentDetail(state.agents[id]);

  // Highlight node
  d3.selectAll('.node-group').classed('selected', d => d.id === id);
}

function renderAgentDetail(agent) {
  dom.agentDetail.style.display = 'block';
  dom.agentDetail.innerHTML = `
    <div class="detail-title">에이전트 상세 정보</div>
    <div class="detail-row"><span class="detail-key">이름</span><span class="detail-value" style="color:${agent.color}">${agent.name}</span></div>
    <div class="detail-row"><span class="detail-key">역할</span><span class="detail-value">${agent.role}</span></div>
    <div class="detail-row"><span class="detail-key">상태</span><span class="detail-value">${agent.status}</span></div>
    <div class="detail-row"><span class="detail-key">메시지 수</span><span class="detail-value">${agent.msgCount}</span></div>
    <div class="detail-row"><span class="detail-key">완료 작업</span><span class="detail-value">${agent.tasksDone}</span></div>
    <div class="detail-row"><span class="detail-key">평균 지연</span><span class="detail-value">${agent.avgLatency}ms</span></div>
  `;
}

/* ── D3 Force Graph ──────────────────────────── */
let simulation, svgEl, gMain, linkGroup, nodeGroup, particleGroup;

function buildGraph() {
  const container = document.getElementById('graph-container');
  const W = container.clientWidth;
  const H = container.clientHeight;

  svgEl = d3.select('#graph-svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // Defs: gradients, filters
  const defs = svgEl.append('defs');

  // Glow filter
  const filter = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
  filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
  const merge = filter.append('feMerge');
  merge.append('feMergeNode').attr('in', 'blur');
  merge.append('feMergeNode').attr('in', 'SourceGraphic');

  // Arrow markers per agent
  AGENT_DEFS.forEach(def => {
    defs.append('marker')
      .attr('id', `arrow-${def.id}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', def.color)
        .attr('opacity', 0.7);
  });

  gMain = svgEl.append('g').attr('class', 'g-main');

  // Zoom
  const zoom = d3.zoom().scaleExtent([0.4, 2.5]).on('zoom', e => {
    gMain.attr('transform', e.transform);
  });
  svgEl.call(zoom);

  linkGroup    = gMain.append('g').attr('class', 'links');
  particleGroup = gMain.append('g').attr('class', 'particles');
  nodeGroup    = gMain.append('g').attr('class', 'nodes');

  // Nodes data
  const nodes = AGENT_DEFS.map(def => {
    const a = state.agents[def.id];
    return { id: def.id, ...def, agent: a };
  });

  // Initial positions in a circle
  const cx = W / 2, cy = H / 2;
  const r = Math.min(W, H) * 0.33;
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
    n.x = cx + r * Math.cos(angle);
    n.y = cy + r * Math.sin(angle);
  });

  // Force simulation (light, mostly to prevent overlap)
  simulation = d3.forceSimulation(nodes)
    .force('charge', d3.forceManyBody().strength(-200))
    .force('center', d3.forceCenter(cx, cy).strength(0.05))
    .force('collision', d3.forceCollide(55))
    .alpha(0.3)
    .on('tick', ticked);

  // Build node elements
  const nodeGs = nodeGroup.selectAll('.node-group')
    .data(nodes, d => d.id)
    .join('g')
    .attr('class', 'node-group')
    .attr('id', d => `node-${d.id}`)
    .call(d3.drag()
      .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.15).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end',   (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
    )
    .on('click', (e, d) => { e.stopPropagation(); selectAgent(d.id); });

  // Outer glow circle
  nodeGs.append('circle')
    .attr('class', 'node-glow')
    .attr('r', 32)
    .attr('fill', d => d.color)
    .style('filter', 'blur(10px)');

  // Pulse ring (animated)
  nodeGs.append('circle')
    .attr('class', 'node-ring')
    .attr('r', 26)
    .attr('fill', 'none')
    .attr('stroke', d => d.color);

  // Main circle
  nodeGs.append('circle')
    .attr('class', 'node-circle')
    .attr('r', 24)
    .attr('fill', d => hexToRgba(d.color, 0.18))
    .attr('stroke', d => d.color)
    .attr('stroke-width', 2.5);

  // Icon
  nodeGs.append('text')
    .attr('class', 'node-icon')
    .attr('dy', '-2')
    .text(d => d.icon);

  // Name label
  nodeGs.append('text')
    .attr('class', 'node-label')
    .attr('dy', '40')
    .text(d => d.name);

  // Sub-label
  nodeGs.append('text')
    .attr('class', 'node-sublabel')
    .attr('dy', '52')
    .text(d => d.role);

  // Tooltip
  nodeGs.on('mouseover', showTooltip).on('mousemove', moveTooltip).on('mouseout', hideTooltip);

  // Resize
  window.addEventListener('resize', onResize);
}

function ticked() {
  nodeGroup.selectAll('.node-group')
    .attr('transform', d => `translate(${d.x},${d.y})`);
  linkGroup.selectAll('.edge-path')
    .attr('d', d => edgePath(d.source, d.target));
}

function edgePath(s, t) {
  const dx = t.x - s.x, dy = t.y - s.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  if (dist === 0) return '';
  // Curve offset for clarity
  const cx1 = (s.x + t.x) / 2 - dy * 0.18;
  const cy1 = (s.y + t.y) / 2 + dx * 0.18;
  return `M${s.x},${s.y} Q${cx1},${cy1} ${t.x},${t.y}`;
}

function getNodePos(id) {
  const nodes = simulation.nodes();
  return nodes.find(n => n.id === id);
}

/* ── Live Edge Management ─────────────────── */
const activeEdges = new Map();

function showEdge(fromId, toId, color) {
  const key = `${fromId}-${toId}`;
  const nodes = simulation.nodes();
  const s = nodes.find(n => n.id === fromId);
  const t = nodes.find(n => n.id === toId);
  if (!s || !t) return;

  // Remove stale
  if (activeEdges.has(key)) {
    activeEdges.get(key).remove();
  }

  const path = linkGroup.append('path')
    .datum({ source: s, target: t })
    .attr('class', 'edge-path active')
    .attr('stroke', color)
    .attr('marker-end', `url(#arrow-${fromId})`)
    .attr('d', edgePath(s, t));

  activeEdges.set(key, path);
  return path;
}

function hideEdge(fromId, toId) {
  const key = `${fromId}-${toId}`;
  if (activeEdges.has(key)) {
    activeEdges.get(key).transition().duration(600).style('opacity', 0).remove();
    activeEdges.delete(key);
  }
}

/* ── Particle animation ───────────────────── */
function animateParticle(fromId, toId, color) {
  const s = getNodePos(fromId);
  const t = getNodePos(toId);
  if (!s || !t) return;

  const particle = particleGroup.append('circle')
    .attr('class', 'msg-particle')
    .attr('r', 5)
    .attr('fill', color)
    .attr('filter', 'url(#glow)')
    .attr('cx', s.x)
    .attr('cy', s.y);

  const duration = (600 + Math.random() * 400) / state.speed;

  particle.transition()
    .duration(duration)
    .attrTween('cx', () => {
      const dx = t.x - s.x, dy = t.y - s.y;
      const cx1 = (s.x + t.x)/2 - dy*0.18;
      const cy1 = (s.y + t.y)/2 + dx*0.18;
      const path = d3.path();
      path.moveTo(s.x, s.y);
      path.quadraticCurveTo(cx1, cy1, t.x, t.y);
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', path.toString());
      const totalLen = pathEl.getTotalLength();
      return t2 => {
        const pt = pathEl.getPointAtLength(t2 * totalLen);
        particle.attr('cy', pt.y);
        return pt.x;
      };
    })
    .on('end', () => {
      particle.transition().duration(200).attr('r', 0).remove();
    });
}

/* ── Node status visual ───────────────────── */
function updateNodeStatus(agent) {
  const nodeG = d3.select(`#node-${agent.id}`);
  const isActive = agent.status !== 'idle';

  nodeG.classed('active', isActive);

  nodeG.select('.node-glow')
    .transition().duration(300)
    .style('opacity', isActive ? 0.5 : 0);

  nodeG.select('.node-ring')
    .classed('active', agent.status === 'sending' || agent.status === 'receiving');

  nodeG.select('.node-circle')
    .transition().duration(300)
    .attr('fill', isActive ? hexToRgba(agent.color, 0.35) : hexToRgba(agent.color, 0.18));
}

/* ── Tooltip ─────────────────────────────── */
const tooltip = document.getElementById('graph-tooltip');

function showTooltip(event, d) {
  const a = state.agents[d.id];
  tooltip.innerHTML = `
    <strong style="color:${d.color}">${d.icon} ${d.name}</strong><br>
    <span style="color:#8b949e;font-size:10px">${d.role}</span><br>
    <span style="color:#8b949e;font-size:10px">상태: <span style="color:${d.color}">${a.status}</span></span><br>
    <span style="color:#8b949e;font-size:10px">메시지: ${a.msgCount}</span>
  `;
  tooltip.classList.add('visible');
}
function moveTooltip(event) {
  const rect = document.getElementById('graph-container').getBoundingClientRect();
  tooltip.style.left = (event.clientX - rect.left + 14) + 'px';
  tooltip.style.top  = (event.clientY - rect.top  - 10) + 'px';
}
function hideTooltip() { tooltip.classList.remove('visible'); }

/* ── Simulation Engine ───────────────────── */
function runScenario() {
  if (!state.running) return;

  const scenario = SCENARIOS[state.scenarioIdx];
  dom.scenarioBanner.innerHTML = `시나리오: <span>${scenario.name}</span>`;

  // Mark planner as starting
  const planner = state.agents['planner'];
  planner.setStatus('thinking');
  setTimeout(() => {
    if (!state.running) return;
    addLogEntry(new Message('system', 'all', 'system'), `워크플로우 시작: ${scenario.name}`);
    planner.setStatus('sending');
  }, 400 / state.speed);

  scenario.steps.forEach(step => {
    const delay = step.delay / state.speed;
    const tid = setTimeout(() => {
      if (!state.running) return;
      fireStep(step);
    }, delay + 800);
    state.activeTimers.push(tid);
  });

  const total = Math.max(...scenario.steps.map(s => s.delay));
  const loopDelay = (total + 2500) / state.speed;
  state.scenarioLoop = setTimeout(() => {
    if (!state.running) return;
    resetAgentStatuses();
    state.scenarioIdx = (state.scenarioIdx + 1) % SCENARIOS.length;
    runScenario();
  }, loopDelay + 1000);
}

function fireStep(step) {
  const fromAgent = state.agents[step.from];
  const toAgent   = state.agents[step.to];
  if (!fromAgent || !toAgent) return;

  const msg = new Message(step.from, step.to, step.type);

  fromAgent.msgCount++;
  toAgent.msgCount++;
  fromAgent.latencies.push(msg.latency);
  state.totalMessages++;
  state.allLatencies.push(msg.latency);

  fromAgent.setStatus('sending');
  toAgent.setStatus('receiving');

  const color = fromAgent.color;

  // Show edge
  showEdge(step.from, step.to, color);

  // Animate particles (2-3 particles)
  const numParticles = randomInt(2, 4);
  for (let i = 0; i < numParticles; i++) {
    setTimeout(() => animateParticle(step.from, step.to, color), i * 150 / state.speed);
  }

  // Log
  addLogEntry(msg);

  // After latency: to → working
  const t1 = setTimeout(() => {
    if (!state.running) return;
    toAgent.setStatus('working');
    fromAgent.setStatus('idle');
  }, msg.latency / state.speed);

  // Clear edge + idle
  const t2 = setTimeout(() => {
    if (!state.running) return;
    hideEdge(step.from, step.to);
    toAgent.setStatus('idle');
    toAgent.tasksDone++;
    state.tasksCompleted++;
    updateStats();
  }, (msg.latency + 1200) / state.speed);

  state.activeTimers.push(t1, t2);
  updateStats();
}

function resetAgentStatuses() {
  Object.values(state.agents).forEach(a => {
    a.setStatus('idle');
  });
  // Clear all edges
  activeEdges.forEach((path, key) => { path.remove(); activeEdges.delete(key); });
}

/* ── Controls ─────────────────────────────── */
function startSimulation() {
  if (state.running) return;
  state.running = true;
  setSimStatus('running');
  dom.btnStart.classList.add('active');
  runScenario();
}

function pauseSimulation() {
  if (!state.running) return;
  state.running = false;
  clearAllTimers();
  setSimStatus('paused');
  dom.btnStart.classList.remove('active');
  dom.btnPause.textContent = state.running ? '⏸ 일시정지' : '▶ 재개';
}

function resetSimulation() {
  state.running = false;
  clearAllTimers();
  state.totalMessages = 0;
  state.tasksCompleted = 0;
  state.allLatencies = [];
  state.scenarioIdx = 0;
  state.logEntries = [];
  Object.values(state.agents).forEach(a => {
    a.msgCount = 0;
    a.tasksDone = 0;
    a.latencies = [];
    a.setStatus('idle');
  });
  resetAgentStatuses();
  dom.agentDetail.style.display = 'none';
  dom.msgLog.innerHTML = '';
  dom.btnStart.classList.remove('active');
  setSimStatus('idle');
  updateStats();
  dom.scenarioBanner.innerHTML = 'AI Agent Orchestration';
}

function clearAllTimers() {
  state.activeTimers.forEach(clearTimeout);
  state.activeTimers = [];
  if (state.scenarioLoop) { clearTimeout(state.scenarioLoop); state.scenarioLoop = null; }
}

function setSimStatus(status) {
  const dot  = dom.statusDot;
  const text = dom.statusText;
  dot.className = 'status-dot';
  if (status === 'running') { dot.classList.add('running'); text.textContent = '실행 중'; }
  else if (status === 'paused') { dot.classList.add('paused'); text.textContent = '일시정지'; }
  else { text.textContent = '대기 중'; }
}

/* ── Log ─────────────────────────────────── */
function addLogEntry(msg, overrideContent) {
  const entry = { msg, content: overrideContent || msg.content };
  state.logEntries.push(entry);
  if (state.logEntries.length > 200) state.logEntries.shift();

  if (state.logFilter !== 'all' && msg.type !== state.logFilter) return;
  appendLogEntry(entry);
}

function appendLogEntry(entry) {
  const { msg, content } = entry;
  const from  = state.agents[msg.from];
  const to    = state.agents[msg.to];
  const color = from ? from.color : '#8b949e';

  const el = document.createElement('div');
  el.className = 'log-entry';
  el.style.borderLeftColor = color;

  const fromName = from ? from.name : msg.from;
  const toName   = to   ? to.name   : msg.to;

  el.innerHTML = `
    <div class="log-header">
      <span class="log-from" style="background:${color}">${fromName}</span>
      <span class="log-arrow">→</span>
      <span class="log-to">${toName}</span>
      <span class="log-type-badge type-${msg.type}">${msg.type}</span>
      <span class="log-time">${formatTime(msg.timestamp)}</span>
    </div>
    <div class="log-content">${content}</div>
  `;

  dom.msgLog.appendChild(el);
  dom.msgLog.scrollTop = dom.msgLog.scrollHeight;
}

function renderLog() {
  dom.msgLog.innerHTML = '';
  state.logEntries
    .filter(e => state.logFilter === 'all' || e.msg.type === state.logFilter)
    .slice(-100)
    .forEach(appendLogEntry);
  dom.msgLog.scrollTop = dom.msgLog.scrollHeight;
}

/* ── Stats ───────────────────────────────── */
function updateStats() {
  const active = Object.values(state.agents).filter(a => a.status !== 'idle').length;
  const avgLat = state.allLatencies.length
    ? Math.round(state.allLatencies.reduce((a,b)=>a+b,0) / state.allLatencies.length)
    : 0;

  animateStatValue(dom.statMsgs,    state.totalMessages);
  animateStatValue(dom.statLatency, avgLat, 'ms');
  animateStatValue(dom.statActive,  active);
  animateStatValue(dom.statTasks,   state.tasksCompleted);
}

function animateStatValue(el, newVal, suffix = '') {
  if (!el) return;
  const old = parseInt(el.textContent) || 0;
  if (old === newVal) return;
  el.textContent = newVal + suffix;
  el.classList.add(newVal > old ? 'tick-up' : 'tick-down');
  setTimeout(() => el.classList.remove('tick-up', 'tick-down'), 600);
}

/* ── Resize ──────────────────────────────── */
function onResize() {
  const container = document.getElementById('graph-container');
  const W = container.clientWidth;
  const H = container.clientHeight;
  svgEl.attr('viewBox', `0 0 ${W} ${H}`);
  simulation.force('center', d3.forceCenter(W/2, H/2).strength(0.05));
  simulation.alpha(0.15).restart();
}

/* ── Boot ─────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);
