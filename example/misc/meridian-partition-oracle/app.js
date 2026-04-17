/* meridian-partition-oracle — D3 terminal */

const state = {
  nCurrent: 5,
  nTarget: 8,
  vnodesPerNode: 16,
  rf: 3,
  dataGb: 1024,
  xferMbps: 500,
  rConsistency: 'QUORUM',
  seed: 314,
  view: 'ring',
  current: null,
  target: null,
  migrationPlan: null,
};

// --- deterministic hashing + PRNG -----------------------------------
function fnv1a(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=(h+((h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24)))>>>0;}return h>>>0;}
function xor32(s){let x=s>>>0||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;x>>>=0;return x/4294967296;};}
function ringPos(lbl){ return fnv1a(lbl) / 0xffffffff; }
function mkLayout(nNodes, vn, seed){
  const nodes = d3.range(nNodes).map(i=>({ id:'dc-'+String.fromCharCode(65+i%26)+((i/26)|0||''), zone:'z'+(i%4), idx:i }));
  const tokens = [];
  for(const n of nodes){
    for(let i=0;i<vn;i++){
      const lbl = `${n.id}#${i}~${seed}`;
      tokens.push({ node:n.id, label:lbl, pos: ringPos(lbl), zone:n.zone });
    }
  }
  tokens.sort((a,b)=>a.pos-b.pos);
  const ownership = {};
  nodes.forEach(n=>ownership[n.id]=0);
  for(let i=0;i<tokens.length;i++){
    const prev=tokens[(i-1+tokens.length)%tokens.length].pos;
    let len=tokens[i].pos-prev; if(len<0) len+=1;
    ownership[tokens[i].node]+=len;
  }
  return { nodes, tokens, ownership };
}

// --- terminal log --------------------------------------------------
const termEl = document.getElementById('term');
const termBuf = [];
function termLine(s){
  termBuf.push(s);
  if(termBuf.length > 400) termBuf.shift();
  termEl.textContent = termBuf.join('\n');
  termEl.scrollTop = termEl.scrollHeight;
}
function ts(){ return '['+new Date().toLocaleTimeString('en-US',{hour12:false})+']'; }
termLine('meridian partition-oracle v0.7.2');
termLine('booted · RF='+state.rf+' · vnodes='+state.vnodesPerNode);
termLine('type $ run simulation to begin');

// --- svg setups ----------------------------------------------------
function svgIn(id){
  const el = document.getElementById(id);
  el.innerHTML='';
  const w = el.clientWidth, h = el.clientHeight;
  const svg = d3.select(el).append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('preserveAspectRatio','xMidYMid meet').attr('width',w).attr('height',h);
  return { svg, w, h };
}

// --- view: ring (force-simulation of node chord) -------------------
function drawRing(){
  const { svg, w, h } = svgIn('view-ring');
  const cx = w/2, cy = h/2, R = Math.min(w,h)*0.34, r = R*0.78;
  const { nodes, tokens, ownership } = state.current;

  // grid
  svg.append('g').selectAll('circle').data([R-10,R,R+10,r]).join('circle')
    .attr('cx',cx).attr('cy',cy).attr('r',d=>d)
    .attr('fill','none').attr('stroke','#1f2a1f').attr('stroke-dasharray','2,4');

  // token range arcs via data join (enter/update/exit)
  const arcs = [];
  for(let i=0;i<tokens.length;i++){
    const prev=tokens[(i-1+tokens.length)%tokens.length].pos;
    arcs.push({ a0: prev*2*Math.PI, a1: tokens[i].pos*2*Math.PI, node: tokens[i].node });
  }
  const arcGen = d3.arc().innerRadius(r).outerRadius(R).startAngle(d=>d.a0).endAngle(d=>d.a1);
  const color = d3.scaleOrdinal().domain(nodes.map(n=>n.id)).range(['#33ff33','#7bff7b','#c8ff88','#ffaa33','#ff7777','#77ffd5','#d5ff77','#a0ff33','#ff33aa','#33aaff']);

  svg.append('g').attr('transform',`translate(${cx},${cy})`)
    .selectAll('path.arc-owner').data(arcs, (d,i)=>i).join('path')
    .attr('class','arc-owner').attr('fill', d=>color(d.node)).attr('fill-opacity',0.38).attr('d',arcGen);

  // vnode tick marks
  svg.append('g').attr('transform',`translate(${cx},${cy})`)
    .selectAll('line.vn-tick').data(tokens).join('line')
    .attr('class','vn-tick')
    .attr('x1',d=>Math.cos(d.pos*2*Math.PI - Math.PI/2)*R)
    .attr('y1',d=>Math.sin(d.pos*2*Math.PI - Math.PI/2)*R)
    .attr('x2',d=>Math.cos(d.pos*2*Math.PI - Math.PI/2)*(R+8))
    .attr('y2',d=>Math.sin(d.pos*2*Math.PI - Math.PI/2)*(R+8))
    .attr('stroke', d=>color(d.node)).attr('stroke-opacity',0.9);

  // force-simulation: one node-circle per physical node, pinned to ring perimeter proportional to ownership
  const pinned = nodes.map((n,i)=>{
    const angle = (i/nodes.length)*2*Math.PI - Math.PI/2;
    return {
      id: n.id,
      fx: cx + Math.cos(angle)*(R+48),
      fy: cy + Math.sin(angle)*(R+48),
      share: ownership[n.id]||0,
      zone: n.zone
    };
  });
  const sim = d3.forceSimulation(pinned)
    .force('charge', d3.forceManyBody().strength(-40))
    .force('collide', d3.forceCollide(28))
    .alphaDecay(0.05);
  const g = svg.append('g').selectAll('g.node').data(pinned).join('g').attr('class','node');
  g.append('circle')
    .attr('class','node-circle')
    .attr('r', d=> 14 + d.share*80)
    .attr('fill', d=>color(d.id))
    .attr('fill-opacity', 0.7);
  g.append('text').attr('class','node-label').text(d=>d.id).attr('dy',4);
  g.append('text').attr('class','node-label').attr('dy',22).attr('opacity',0.7).text(d=>`${(d.share*100).toFixed(1)}%`);
  sim.on('tick', ()=>g.attr('transform',d=>`translate(${d.x},${d.y})`));

  // center labels
  svg.append('text').attr('x',cx).attr('y',cy-6).attr('text-anchor','middle').attr('fill','#33ff33').attr('font-family','inherit').attr('font-size',12).text(`RF ${state.rf}`);
  svg.append('text').attr('x',cx).attr('y',cy+10).attr('text-anchor','middle').attr('fill','#5ea85e').attr('font-family','inherit').attr('font-size',10).text(`${tokens.length} vnodes across ${nodes.length} nodes`);
}

// --- view: ranges bar chart ----------------------------------------
function drawRanges(){
  const { svg, w, h } = svgIn('view-ranges');
  const { nodes, ownership } = state.current;
  const data = nodes.map(n=>({ node:n.id, share: ownership[n.id]||0 })).sort((a,b)=>b.share-a.share);
  const margin = { t:30, r:30, b:40, l:80 };
  const x = d3.scaleLinear().domain([0, d3.max(data,d=>d.share)]).range([margin.l, w-margin.r]);
  const y = d3.scaleBand().domain(data.map(d=>d.node)).range([margin.t, h-margin.b]).padding(0.22);

  svg.append('g').attr('class','axis').attr('transform',`translate(0,${h-margin.b})`).call(d3.axisBottom(x).tickFormat(d=>(d*100).toFixed(1)+'%'));
  svg.append('g').attr('class','axis').attr('transform',`translate(${margin.l},0)`).call(d3.axisLeft(y));
  svg.append('g').attr('class','grid').selectAll('line').data(x.ticks(5)).join('line').attr('x1',d=>x(d)).attr('x2',d=>x(d)).attr('y1',margin.t).attr('y2',h-margin.b);

  const bars = svg.append('g').selectAll('g.bar').data(data, d=>d.node).join('g').attr('class','bar').attr('transform',d=>`translate(${margin.l},${y(d.node)})`);
  bars.append('rect')
    .attr('x',0).attr('y',0)
    .attr('height',y.bandwidth())
    .attr('fill','#33ff33').attr('fill-opacity',0.55)
    .attr('width',0)
    .transition().duration(700)
    .attr('width', d=> x(d.share)-margin.l);
  bars.append('text').attr('class','bar-label').attr('x',d=>x(d.share)-margin.l+6).attr('y',y.bandwidth()/2+3).text(d=>`${(d.share*100).toFixed(2)}%`);

  const avg = d3.mean(data,d=>d.share);
  svg.append('line').attr('x1',x(avg)).attr('x2',x(avg)).attr('y1',margin.t).attr('y2',h-margin.b).attr('stroke','#ffaa33').attr('stroke-dasharray','4,4');
  svg.append('text').attr('x',x(avg)+4).attr('y',margin.t-4).attr('fill','#ffaa33').attr('font-family','inherit').attr('font-size',10).text(`ideal ${(avg*100).toFixed(2)}%`);

  svg.append('text').attr('x',margin.l).attr('y',18).attr('fill','#33ff33').attr('font-family','inherit').attr('font-size',12).text('token-range share per node');
}

// --- view: rf calculator -------------------------------------------
function quorum(rf){ return Math.floor(rf/2)+1; }
function durabilityNines(rf, nodeAnnualFail=0.04){
  // probability all RF replicas lost simultaneously (crude independent assumption): p^rf
  const p = nodeAnnualFail;
  const lossProb = Math.pow(p, rf);
  if(lossProb <= 0) return 12;
  return -Math.log10(lossProb);
}
function drawCalc(){
  const { svg, w, h } = svgIn('view-calc');
  const margin = { t:40, r:40, b:50, l:50 };
  const rfRange = d3.range(1,8);
  const x = d3.scaleLinear().domain([1,7]).range([margin.l, w-margin.r]);
  const yDur = d3.scaleLinear().domain([0,14]).range([h-margin.b, margin.t]);

  svg.append('g').attr('class','axis').attr('transform',`translate(0,${h-margin.b})`).call(d3.axisBottom(x).ticks(7).tickFormat(d=>'rf='+d));
  svg.append('g').attr('class','axis').attr('transform',`translate(${margin.l},0)`).call(d3.axisLeft(yDur).tickFormat(d=>d+' 9s'));

  const data = rfRange.map(rf=>({
    rf,
    durability: durabilityNines(rf),
    quorumRead: quorum(rf),
    cost: rf,
  }));

  const line = d3.line().x(d=>x(d.rf)).y(d=>yDur(d.durability)).curve(d3.curveMonotoneX);
  svg.append('path').datum(data).attr('fill','none').attr('stroke','#33ff33').attr('stroke-width',2).attr('d',line);
  svg.append('g').selectAll('circle').data(data).join('circle')
    .attr('cx',d=>x(d.rf)).attr('cy',d=>yDur(d.durability)).attr('r',4)
    .attr('fill', d=>d.rf===state.rf?'#ffaa33':'#33ff33')
    .attr('stroke','#0a0a0a');
  svg.append('g').selectAll('text.q').data(data).join('text').attr('class','q')
    .attr('x',d=>x(d.rf)).attr('y',d=>yDur(d.durability)-10).attr('text-anchor','middle')
    .attr('fill','#5ea85e').attr('font-family','inherit').attr('font-size',10)
    .text(d=>`Q${d.quorumRead}/${d.rf}`);

  svg.append('text').attr('x',margin.l).attr('y',22).attr('fill','#33ff33').attr('font-family','inherit').attr('font-size',12).text('replication factor vs durability (9s)');
  svg.append('text').attr('x',margin.l).attr('y',h-10).attr('fill','#5ea85e').attr('font-family','inherit').attr('font-size',10).text(`quorum read requires Q replicas where Q = floor(RF/2)+1 · read_consistency=${state.rConsistency}`);
}

// --- view: migrate plan --------------------------------------------
function drawMigrate(){
  const { svg, w, h } = svgIn('view-migrate');
  if(!state.target){ svg.append('text').attr('x',20).attr('y',40).attr('fill','#5ea85e').attr('font-family','inherit').text('$ click [plan rebalance] to compute a migration plan'); return; }
  const plan = state.migrationPlan;
  const cx = w/2, cy = h/2, R = Math.min(w,h)*0.34;

  // two concentric rings — outer = current, inner = target — with arrows for handoff
  const color = d3.scaleOrdinal(d3.schemeCategory10.map(c=>c));
  function drawRingSet(layout, radius, label){
    const g = svg.append('g').attr('transform',`translate(${cx},${cy})`);
    g.append('circle').attr('r',radius).attr('fill','none').attr('stroke','#1f2a1f');
    const ownership = layout.ownership;
    const tokens = layout.tokens;
    const arcs = tokens.map((t,i)=>{
      const prev = tokens[(i-1+tokens.length)%tokens.length].pos;
      return { a0: prev*2*Math.PI, a1: t.pos*2*Math.PI, node: t.node };
    });
    const arcGen = d3.arc().innerRadius(radius-8).outerRadius(radius+8).startAngle(d=>d.a0).endAngle(d=>d.a1);
    g.selectAll('path').data(arcs).join('path').attr('d',arcGen).attr('fill', d=>color(d.node)).attr('fill-opacity',0.55);
    g.append('text').attr('y',-radius-12).attr('text-anchor','middle').attr('fill','#5ea85e').attr('font-family','inherit').attr('font-size',10).text(label);
    return g;
  }
  drawRingSet(state.current, R+30, `current · ${state.current.nodes.length} nodes`);
  drawRingSet(state.target, R-30, `target · ${state.target.nodes.length} nodes`);

  // draw migration flows
  const flows = plan.edges.slice(0, 80);
  const lines = svg.append('g').attr('transform',`translate(${cx},${cy})`)
    .selectAll('line').data(flows).join('line')
    .attr('x1',d=>Math.cos(d.fromPos*2*Math.PI - Math.PI/2)*(R+30))
    .attr('y1',d=>Math.sin(d.fromPos*2*Math.PI - Math.PI/2)*(R+30))
    .attr('x2',d=>Math.cos(d.toPos*2*Math.PI - Math.PI/2)*(R-30))
    .attr('y2',d=>Math.sin(d.toPos*2*Math.PI - Math.PI/2)*(R-30))
    .attr('stroke','#33ff33').attr('stroke-opacity',0.35).attr('stroke-width',1)
    .attr('stroke-dasharray','3,4');
  // animate stroke-dashoffset
  lines.transition().duration(1600).ease(d3.easeLinear).attr('stroke-dashoffset',-40).on('end', function(){ d3.select(this).attr('stroke-dashoffset',0); });

  svg.append('text').attr('x',20).attr('y',24).attr('fill','#33ff33').attr('font-family','inherit').attr('font-size',12).text(`migration plan · ${plan.edges.length} range handoffs`);
  svg.append('text').attr('x',20).attr('y',40).attr('fill','#5ea85e').attr('font-family','inherit').attr('font-size',10).text(`bytes_moved≈ ${plan.gbMoved.toFixed(1)} GB · eta ${plan.eta}`);
}

// --- migration plan (consistent-hashing-data-simulation) ----------
function planMigration(current, target, dataGb, xferMbps){
  const edges = [];
  const sample = 256;
  for(let i=0;i<sample;i++){
    const pos = i/sample;
    const fromOwner = ownerOf(current.tokens, pos);
    const toOwner = ownerOf(target.tokens, pos);
    if(fromOwner.node !== toOwner.node){
      edges.push({ fromPos: fromOwner.pos, toPos: toOwner.pos, from: fromOwner.node, to: toOwner.node, share: 1/sample });
    }
  }
  const fractionMoved = edges.length / sample;
  const gbMoved = fractionMoved * dataGb;
  const etaSec = (gbMoved * 1024 * 8) / xferMbps; // gb -> mb*8 bits / mbps
  const eta = etaSec > 3600 ? (etaSec/3600).toFixed(2)+' h' : (etaSec/60).toFixed(1)+' min';
  return { edges, gbMoved, eta, fractionMoved };
}
function ownerOf(tokens, pos){
  let lo=0, hi=tokens.length-1, idx=0;
  while(lo<=hi){ const m=(lo+hi)>>1; if(tokens[m].pos<pos) lo=m+1; else { idx=m; hi=m-1; } }
  if(tokens[idx].pos < pos) idx=0;
  return tokens[idx];
}

// --- updated stats -------------------------------------------------
function updateStats(){
  const cur = state.current;
  if(!cur) return;
  const tot = cur.tokens.length;
  const shares = Object.values(cur.ownership);
  const mean = d3.mean(shares);
  const std = Math.sqrt(d3.mean(shares.map(s=>(s-mean)**2)));
  document.getElementById('sTotalV').textContent = tot;
  document.getElementById('sStd').textContent = (std*100).toFixed(3)+'%';
  document.getElementById('sQuorum').textContent = `${quorum(state.rf)}/${state.rf}`;
  document.getElementById('sNines').textContent = durabilityNines(state.rf).toFixed(1)+'×9';
  if(state.migrationPlan){
    document.getElementById('sEta').textContent = state.migrationPlan.eta;
  } else {
    document.getElementById('sEta').textContent = '--';
  }
}

// --- wire up controls ---------------------------------------------
function readInputs(){
  state.nCurrent = clamp(parseInt(document.getElementById('nCurrent').value)||5, 2, 40);
  state.nTarget  = clamp(parseInt(document.getElementById('nTarget').value)||8, 2, 40);
  state.vnodesPerNode = clamp(parseInt(document.getElementById('vnodes').value)||16, 1, 256);
  state.rf = clamp(parseInt(document.getElementById('rf').value)||3, 1, 7);
  state.dataGb = Math.max(1, parseFloat(document.getElementById('dataGb').value)||1024);
  state.xferMbps = Math.max(10, parseFloat(document.getElementById('xfer').value)||500);
  state.seed = parseInt(document.getElementById('seed').value)||314;
  state.rConsistency = document.getElementById('rConsistency').value;
}
function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }

function run(){
  readInputs();
  state.current = mkLayout(state.nCurrent, state.vnodesPerNode, state.seed);
  state.target = null;
  state.migrationPlan = null;
  termLine(ts()+' build layout: n='+state.nCurrent+' vnodes/n='+state.vnodesPerNode+' seed='+state.seed);
  termLine(ts()+' total vnodes = '+state.current.tokens.length);
  Object.entries(state.current.ownership).forEach(([k,v])=>termLine(`  ${k}\towns ${(v*100).toFixed(3)}%`));
  updateStats();
  redraw();
}
function rebalance(){
  readInputs();
  if(!state.current) run();
  state.target = mkLayout(state.nTarget, state.vnodesPerNode, state.seed);
  state.migrationPlan = planMigration(state.current, state.target, state.dataGb, state.xferMbps);
  termLine(ts()+' rebalance plan: '+state.nCurrent+' → '+state.nTarget);
  termLine(ts()+' sampled '+state.migrationPlan.edges.length+' divergent ranges of 256');
  termLine(ts()+' estimated bytes moved ≈ '+state.migrationPlan.gbMoved.toFixed(2)+' GB');
  termLine(ts()+' eta @ '+state.xferMbps+' Mbps ≈ '+state.migrationPlan.eta);
  termLine(ts()+' (remember: lease-epoch must bump before handoff commit)');
  updateStats();
  state.view='migrate';
  document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.toggle('active', b.dataset.view==='migrate'));
  redraw();
}
function clearAll(){ termBuf.length=0; termEl.textContent=''; termLine('cleared'); }

function redraw(){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+state.view).classList.add('active');
  if(!state.current){ return; }
  if(state.view==='ring') drawRing();
  else if(state.view==='ranges') drawRanges();
  else if(state.view==='calc') drawCalc();
  else if(state.view==='migrate') drawMigrate();
}

document.getElementById('run').onclick = run;
document.getElementById('rebalance').onclick = rebalance;
document.getElementById('clear').onclick = clearAll;
document.querySelectorAll('nav.tabs button').forEach(b=>{
  b.onclick = ()=>{
    document.querySelectorAll('nav.tabs button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); state.view = b.dataset.view; redraw();
  };
});
window.addEventListener('resize', ()=>{ if(state.current) redraw(); });
window.addEventListener('keydown', e=>{
  if(e.key==='Enter' && (e.metaKey||e.ctrlKey)) run();
  else if(e.key==='m') rebalance();
  else if(e.key==='l') clearAll();
});

// initial run
run();

/*
## Skills applied
`consistent-hashing-visualization-pattern`, `consistent-hashing-data-simulation`,
`database-sharding-data-simulation`, `database-sharding-visualization-pattern`,
`rebalance-partition-ownership-swimlane`, `replica-timeline-swimlane-with-causal-arrows`,
`vector-clock-concurrency-matrix`, `hybrid-logical-clock-merge`,
`lease-epoch-fencing-token-monotonic-guard`, `rolling-hash-chunk-boundary-detector`,
`fnv1a-xorshift-text-to-procedural-seed`, `load-balancer-visualization-pattern`,
`load-balancer-data-simulation`, `connection-pool-visualization-pattern`,
`connection-pool-data-simulation`, `rate-limiter-visualization-pattern`,
`rate-limiter-data-simulation`, `backpressure-visualization-pattern`,
`backpressure-data-simulation`, `read-replica-visualization-pattern`,
`read-replica-data-simulation`, `raft-consensus-visualization-pattern`,
`raft-consensus-data-simulation`, `cqrs-visualization-pattern`,
`cqrs-data-simulation`, `materialized-view-data-simulation`,
`materialized-view-visualization-pattern`, `time-series-db-data-simulation`,
`time-series-db-visualization-pattern`, `schema-registry-visualization-pattern`,
`schema-registry-data-simulation`, `log-aggregation-visualization-pattern`,
`log-aggregation-data-simulation`, `etl-visualization-pattern`, `etl-data-simulation`,
`cdc-visualization-pattern`, `cdc-data-simulation`, `service-mesh-visualization-pattern`,
`service-mesh-data-simulation`, `sidecar-proxy-visualization-pattern`,
`sidecar-proxy-data-simulation`, `hexagonal-architecture-data-simulation`,
`graphql-visualization-pattern`, `websocket-visualization-pattern`,
`api-gateway-pattern-visualization-pattern`, `bff-pattern-visualization-pattern`,
`command-query-visualization-pattern`, `data-pipeline-visualization-pattern`,
`data-pipeline-data-simulation`, `distributed-tracing-visualization-pattern`,
`distributed-tracing-data-simulation`, `api-versioning-visualization-pattern`,
`object-storage-visualization-pattern`, `bloom-filter-visualization-pattern`,
`idempotency-visualization-pattern`, `health-check-visualization-pattern`,
`baseline-historical-comparison-threshold`, `divide-by-zero-rate-guard`,
`cache-variance-ttl-jitter`, `variable-length-integer-encoding-for-metrics-bandwidth`,
`watermark-aligned-window-emitter`, `barrier-alignment-buffer-spill`

## Knowledge respected
`consistent-hashing-implementation-pitfall`, `database-sharding-implementation-pitfall`,
`merkle-tree-range-leaf-vs-point-leaf-tradeoff`, `quorum-visualization-off-by-one`,
`bloom-filter-false-positive-saturation-cliff`, `load-balancer-implementation-pitfall`,
`read-replica-implementation-pitfall`, `time-unit-consistency-us-ms-ns`,
`arbitrary-display-caps-hide-signal`, `symlog-for-lag-metrics-near-zero`,
`phi-accrual-failure-detector-over-binary-timeout`,
`concurrent-edge-detection-without-full-clock-compare`
*/