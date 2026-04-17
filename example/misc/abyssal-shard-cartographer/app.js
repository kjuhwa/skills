const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;

// --- deterministic PRNG (fnv1a-xorshift-text-to-procedural-seed) -----
function fnv1a(str){ let h=0x811c9dc5; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=(h+((h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24)))>>>0; } return h>>>0; }
function xorshift32(seed){ let s=seed>>>0||1; return ()=>{ s^=s<<13; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; }

// --- hash helpers (fnv1a for ring positions, cheap) ---------------------
function ringPos(label){ return fnv1a(label) / 0xffffffff; }

// --- default topology bootstrap ---------------------------------------
function mkNodes(count, seed=42){
  const rng = xorshift32(seed);
  const zones = ['alpha','bravo','charlie','delta','echo','foxtrot'];
  return Array.from({length:count}, (_,i)=>({
    id:`node-${i+1}`,
    zone:zones[i%zones.length],
    weight: 1 + Math.floor(rng()*3),
    status:'up',
    createdAt: Date.now() - Math.floor(rng()*3600e3),
    health: 0.85 + rng()*0.15,
  }));
}
function mkVirtualTokens(nodes, vnodeCount){
  const tokens=[];
  for(const n of nodes){
    const k = vnodeCount * n.weight;
    for(let i=0;i<k;i++){
      const label = `${n.id}#v${i}`;
      tokens.push({ node:n.id, zone:n.zone, label, pos: ringPos(label) });
    }
  }
  tokens.sort((a,b)=>a.pos-b.pos);
  return tokens;
}
function mkKeys(count=256, seed=7){
  const rng = xorshift32(seed);
  const prefixes = ['user','order','cart','event','session','invoice','trace','metric','audit'];
  return Array.from({length:count}, (_,i)=>{
    const p = prefixes[Math.floor(rng()*prefixes.length)];
    const id = Math.floor(rng()*999999).toString(16).padStart(6,'0');
    const k = `${p}:${id}`;
    return { key:k, pos: ringPos(k) };
  });
}
// N-successor replica lookup honoring replication factor + zone awareness
function lookupReplicas(tokens, keyPos, rf, zoneAware){
  if(!tokens.length) return [];
  let lo=0, hi=tokens.length-1, idx=0;
  while(lo<=hi){
    const m = (lo+hi)>>1;
    if(tokens[m].pos < keyPos) lo=m+1; else { idx=m; hi=m-1; }
  }
  if(tokens[idx].pos < keyPos) idx=0;
  const picks=[], seenNodes=new Set(), seenZones=new Set();
  for(let i=0; i<tokens.length && picks.length<rf; i++){
    const t = tokens[(idx+i) % tokens.length];
    if(seenNodes.has(t.node)) continue;
    if(zoneAware && seenZones.has(t.zone) && tokens.length > 3*rf) continue;
    picks.push(t);
    seenNodes.add(t.node); seenZones.add(t.zone);
  }
  return picks;
}

// --- canvas ring renderer (memoized so state churn doesn't rebuild)  
const RingCanvas = memo(function RingCanvas({ tokens, nodes, keys, rf, zoneAware, hoverKey, animT, migration }){
  const ref = useRef(null);
  useEffect(()=>{
    const cvs = ref.current; if(!cvs) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cvs.clientWidth, h = cvs.clientHeight;
    cvs.width = w*dpr; cvs.height = h*dpr;
    const ctx = cvs.getContext('2d'); ctx.scale(dpr,dpr);
    ctx.clearRect(0,0,w,h);
    const cx=w/2, cy=h/2, R=Math.min(w,h)*0.36, r=R*0.80;

    // alpha-rect overpaint trail (canvas-trail-fade-vs-clear)
    ctx.fillStyle='rgba(10,14,26,0.15)'; ctx.fillRect(0,0,w,h);

    // outer axis ring
    ctx.strokeStyle='#1d2a46'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
    // hash-range tick marks (token ranges)
    for(let i=0;i<32;i++){
      const a = (i/32)*Math.PI*2 - Math.PI/2;
      const x1 = cx + Math.cos(a)*R, y1=cy+Math.sin(a)*R;
      const x2 = cx + Math.cos(a)*(R+6), y2=cy+Math.sin(a)*(R+6);
      ctx.strokeStyle = i%8===0 ? '#2a4070' : '#162745'; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    }

    // node color map
    const palette = ['#00d4ff','#6bffb9','#ffb86b','#ff6b9d','#b57bff','#7de3ff','#ffe27d','#7dffb0'];
    const nodeColor = {};
    nodes.forEach((n,i)=>{ nodeColor[n.id] = palette[i%palette.length]; });

    // token range arcs (each vnode owns the arc from prev to self)
    for(let i=0;i<tokens.length;i++){
      const a0 = ((tokens[(i-1+tokens.length)%tokens.length].pos)*Math.PI*2)-Math.PI/2;
      const a1 = (tokens[i].pos*Math.PI*2)-Math.PI/2;
      const node = tokens[i].node;
      ctx.strokeStyle = (nodeColor[node]||'#00d4ff')+'60';
      ctx.lineWidth = 10;
      ctx.beginPath();
      const aStart = a0 < a1 ? a0 : a0 - Math.PI*2;
      ctx.arc(cx,cy,(R+r)/2,aStart,a1,false);
      ctx.stroke();
    }

    // virtual node markers
    for(const t of tokens){
      const a = t.pos*Math.PI*2 - Math.PI/2;
      const x = cx+Math.cos(a)*R, y = cy+Math.sin(a)*R;
      ctx.fillStyle = nodeColor[t.node]||'#00d4ff';
      ctx.beginPath(); ctx.arc(x,y,2.4,0,Math.PI*2); ctx.fill();
    }

    // inner keyspace heat: small dots for keys, with pulse for hover
    for(const k of keys){
      const a = k.pos*Math.PI*2 - Math.PI/2;
      const x = cx+Math.cos(a)*(r-8), y = cy+Math.sin(a)*(r-8);
      ctx.fillStyle='#00d4ff40';
      ctx.fillRect(x-1,y-1,2,2);
    }

    // hover key rays: show replicas chosen
    if(hoverKey){
      const a = hoverKey.pos*Math.PI*2 - Math.PI/2;
      const kx = cx+Math.cos(a)*(r-8), ky = cy+Math.sin(a)*(r-8);
      ctx.fillStyle='#00d4ff'; ctx.beginPath(); ctx.arc(kx,ky,4,0,Math.PI*2); ctx.fill();
      const reps = lookupReplicas(tokens, hoverKey.pos, rf, zoneAware);
      reps.forEach((t,i)=>{
        const a2 = t.pos*Math.PI*2 - Math.PI/2;
        const tx = cx+Math.cos(a2)*R, ty = cy+Math.sin(a2)*R;
        ctx.strokeStyle = (nodeColor[t.node]||'#00d4ff')+(i===0?'ff':'80');
        ctx.lineWidth = i===0 ? 1.6 : 1;
        ctx.setLineDash(i===0 ? [] : [3,3]);
        ctx.beginPath(); ctx.moveTo(kx,ky); ctx.lineTo(tx,ty); ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // migration arrows (rebalance mode)
    if(migration && migration.edges && migration.edges.length){
      migration.edges.forEach((e,idx)=>{
        const a0 = e.from*Math.PI*2 - Math.PI/2;
        const a1 = e.to*Math.PI*2 - Math.PI/2;
        const r0 = R+10, r1=R+10;
        const cxc = cx+Math.cos((a0+a1)/2)*(R*0.6);
        const cyc = cy+Math.sin((a0+a1)/2)*(R*0.6);
        const x0 = cx+Math.cos(a0)*r0, y0=cy+Math.sin(a0)*r0;
        const x1 = cx+Math.cos(a1)*r1, y1=cy+Math.sin(a1)*r1;
        const phase = (animT + idx*0.07) % 1;
        ctx.strokeStyle = '#ffb86b80'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(x0,y0); ctx.quadraticCurveTo(cxc,cyc,x1,y1); ctx.stroke();
        // moving dot
        const bx = (1-phase)*(1-phase)*x0 + 2*(1-phase)*phase*cxc + phase*phase*x1;
        const by = (1-phase)*(1-phase)*y0 + 2*(1-phase)*phase*cyc + phase*phase*y1;
        ctx.fillStyle='#ffb86b'; ctx.beginPath(); ctx.arc(bx,by,2.8,0,Math.PI*2); ctx.fill();
      });
    }

    // center label
    ctx.fillStyle='#7892b0'; ctx.font='10px ui-monospace'; ctx.textAlign='center';
    ctx.fillText(`${nodes.length} nodes · ${tokens.length} vnodes · RF=${rf}`, cx, cy);
    ctx.fillText(zoneAware?'zone-aware replicas':'replica zones unconstrained', cx, cy+14);
  }, [tokens, nodes, keys, rf, zoneAware, hoverKey, animT, migration]);
  return <canvas ref={ref}/>;
});

// --- partition heatmap panel ------------------------------------
function useOwnership(tokens, keys){
  return useMemo(()=>{
    const counts = {};
    const ranges = {};
    for(const t of tokens){ counts[t.node] = counts[t.node]||0; }
    // ring-range lengths per node
    for(let i=0;i<tokens.length;i++){
      const prev = tokens[(i-1+tokens.length)%tokens.length].pos;
      const cur  = tokens[i].pos;
      let len = cur - prev; if(len < 0) len += 1;
      ranges[tokens[i].node] = (ranges[tokens[i].node]||0) + len;
    }
    // key dist
    for(const k of keys){
      const reps = lookupReplicas(tokens, k.pos, 1, false);
      if(reps[0]) counts[reps[0].node] = (counts[reps[0].node]||0) + 1;
    }
    return { counts, ranges };
  }, [tokens, keys]);
}

function PartitionHeat({ nodes, ownership }){
  const max = Math.max(1, ...Object.values(ownership.counts));
  return (
    <div>
      <h3>Partition Ownership</h3>
      <table className="tbl">
        <thead><tr><th>node</th><th>keys</th><th>range</th><th></th></tr></thead>
        <tbody>
          {nodes.map(n=>(
            <tr key={n.id}>
              <td>{n.id} <span className="chip">{n.zone}</span></td>
              <td>{ownership.counts[n.id]||0}</td>
              <td>{((ownership.ranges[n.id]||0)*100).toFixed(1)}%</td>
              <td style={{width:90}}>
                <div className="mini-bar"><i style={{width:`${(100*(ownership.counts[n.id]||0)/max).toFixed(1)}%`}}/></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- replica lag matrix (replica-timeline-swimlane-with-causal-arrows style) ---
function ReplicaMatrix({ nodes }){
  const n = nodes.length;
  const cells = [];
  for(let i=0;i<n;i++) for(let j=0;j<n;j++) {
    const lag = i===j ? 0 : Math.abs(nodes[i].health - nodes[j].health)*1200 + (i*17+j*31)%180;
    cells.push({ i, j, lag });
  }
  return (
    <div>
      <h3>Replica Lag (ms)</h3>
      <div style={{display:'grid', gridTemplateColumns:`60px repeat(${n}, 1fr)`, gap:2, fontSize:10}}>
        <div></div>
        {nodes.map(n2=>(<div key={n2.id} style={{color:'var(--ink-dim)', textAlign:'center'}}>{n2.id.replace('node-','n')}</div>))}
        {nodes.map((n1,i)=>[
          <div key={`h${i}`} style={{color:'var(--ink-dim)'}}>{n1.id.replace('node-','n')}</div>,
          ...nodes.map((_,j)=>{
            const c = cells.find(c=>c.i===i && c.j===j);
            const bg = i===j ? '#0a1528' : `rgba(0,212,255,${Math.min(0.7, c.lag/1200)})`;
            return <div key={`${i}-${j}`} style={{background:bg, textAlign:'center', padding:'2px 0', color:c.lag>600?'#ffb86b':'#cfe8ff'}}>{c.lag|0}</div>;
          })
        ])}
      </div>
    </div>
  );
}

// --- hazard log (scrolls like a log-aggregation feed) -------------
function HazardLog({ events }){
  return (
    <div className="log">
      <h3>Hazard Log</h3>
      {events.slice(-12).reverse().map(e=>(
        <div className="line" key={e.id}>
          <span className="t">{e.time}</span>
          <span className="e">{e.msg}</span>
        </div>
      ))}
    </div>
  );
}

// --- main app ---------------------------------------------------
function App(){
  const [nodeCount, setNodeCount] = useState(6);
  const [vnodes, setVnodes] = useState(64);
  const [rf, setRf] = useState(3);
  const [zoneAware, setZoneAware] = useState(true);
  const [seed, setSeed] = useState(42);
  const [keyCount, setKeyCount] = useState(512);
  const [mode, setMode] = useState('ring');
  const [hoverKey, setHoverKey] = useState(null);
  const [animT, setAnimT] = useState(0);
  const [events, setEvents] = useState([]);
  const [migration, setMigration] = useState({ edges:[], active:false });

  const nodes = useMemo(()=>mkNodes(nodeCount, seed), [nodeCount, seed]);
  const tokens = useMemo(()=>mkVirtualTokens(nodes, vnodes), [nodes, vnodes]);
  const keys = useMemo(()=>mkKeys(keyCount, seed*7), [keyCount, seed]);
  const ownership = useOwnership(tokens, keys);

  const pushEvent = useCallback((msg)=>{
    const time = new Date().toLocaleTimeString('en-US',{hour12:false});
    setEvents(evts => [...evts, { id: evts.length+1, time, msg }].slice(-256));
  }, []);

  // raf animation loop for migration arrows (canvas-flowfield-particle-advection idiom)
  useEffect(()=>{
    let raf, t0 = performance.now();
    const tick = (t)=>{ setAnimT((t-t0)/2200); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  }, []);

  // keyboard shortcuts
  useEffect(()=>{
    const onKey = (e)=>{
      if(e.key==='+'||e.key==='='){ setNodeCount(c=>Math.min(12, c+1)); pushEvent(`node join requested → count=${nodeCount+1}`); }
      else if(e.key==='-'){ setNodeCount(c=>Math.max(2, c-1)); pushEvent(`node leave requested → count=${nodeCount-1}`); }
      else if(e.key==='r'){ setSeed(s=>(s*31+7)>>>0); pushEvent('ring reshuffled'); }
      else if(e.key==='z'){ setZoneAware(z=>!z); pushEvent('toggled zone-awareness'); }
      else if(e.key==='m'){ stageMigration(); }
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, [nodeCount, pushEvent]);

  function stageMigration(){
    // compute edges: old owner -> new owner for a sample of keys (rebalance-partition-ownership-swimlane)
    const edges = [];
    for(let i=0;i<32;i++){
      const from = Math.random();
      const to = Math.random();
      edges.push({ from, to });
    }
    setMigration({ edges, active:true });
    pushEvent(`migration staged · ${edges.length} token handoffs queued (lease-epoch bumped)`);
    setTimeout(()=>{ setMigration({edges:[], active:false}); pushEvent('migration complete · state-transfer settled'); }, 8000);
  }

  function pickKey(idx){
    const k = keys[idx % keys.length];
    setHoverKey(k);
    const reps = lookupReplicas(tokens, k.pos, rf, zoneAware);
    pushEvent(`lookup ${k.key} → [${reps.map(r=>r.node).join(',')}]`);
  }

  return (
    <div className="app">
      <header className="bar">
        <h1>ABYSSAL · SHARD · CARTOGRAPHER</h1>
        <span className="pill">consistent-hash atlas</span>
        <span className="pill">rf={rf}</span>
        <span className="pill">{tokens.length} vnodes</span>
        <div className="spacer"/>
        <button className={mode==='ring'?'active':''} onClick={()=>setMode('ring')}>RING</button>
        <button className={mode==='heat'?'active':''} onClick={()=>setMode('heat')}>HEAT</button>
        <button className={mode==='matrix'?'active':''} onClick={()=>setMode('matrix')}>MATRIX</button>
        <button onClick={stageMigration}>REBALANCE</button>
      </header>

      <aside className="left">
        <div className="group">
          <h3>Topology</h3>
          <label><span>nodes<b>{nodeCount}</b></span><input type="range" min="2" max="12" value={nodeCount} onChange={e=>setNodeCount(+e.target.value)}/></label>
          <label><span>vnodes/node<b>{vnodes}</b></span><input type="range" min="4" max="256" step="4" value={vnodes} onChange={e=>setVnodes(+e.target.value)}/></label>
          <label><span>replication factor<b>{rf}</b></span><input type="range" min="1" max="5" value={rf} onChange={e=>setRf(+e.target.value)}/></label>
          <label><span>key sample<b>{keyCount}</b></span><input type="range" min="32" max="4096" step="32" value={keyCount} onChange={e=>setKeyCount(+e.target.value)}/></label>
          <label style={{flexDirection:'row',alignItems:'center',gap:8}}>
            <input type="checkbox" checked={zoneAware} onChange={e=>setZoneAware(e.target.checked)}/> zone-aware replicas
          </label>
          <label><span>seed<b>{seed}</b></span><input type="text" value={seed} onChange={e=>setSeed(+e.target.value||1)}/></label>
        </div>
        <div className="group">
          <h3>Nodes</h3>
          {nodes.map(n=>(
            <div className="node-card" key={n.id}>
              <div className="n">{n.id} <span className="chip">{n.zone}</span> <span className="chip">w={n.weight}</span></div>
              <div className="m">health {(n.health*100).toFixed(1)}% · owns {((ownership.ranges[n.id]||0)*100).toFixed(1)}% of ring</div>
              <div className="mini-bar"><i style={{width:`${(ownership.ranges[n.id]||0)*100}%`}}/></div>
            </div>
          ))}
        </div>
      </aside>

      <main className="canvas-wrap">
        {mode==='ring' && <RingCanvas tokens={tokens} nodes={nodes} keys={keys} rf={rf} zoneAware={zoneAware} hoverKey={hoverKey} animT={animT} migration={migration}/>}
        {mode==='heat' && <HeatGrid keys={keys} tokens={tokens} nodes={nodes}/>}
        {mode==='matrix' && <ReplicaCanvasMatrix nodes={nodes}/>}
        <div className="hud">hover keys below · arrows map replica chains · zone chips mark rack awareness</div>
        <div className="key-hint"><kbd>+</kbd>/<kbd>-</kbd> node · <kbd>r</kbd> reshuffle · <kbd>z</kbd> zone · <kbd>m</kbd> migrate</div>
        <div className="legend">
          <span><i style={{background:'#00d4ff'}}/>virtual node</span>
          <span><i style={{background:'#ffb86b'}}/>migration</span>
          <span><i style={{background:'#6bffb9'}}/>replica ok</span>
          <span><i style={{background:'#ff6b9d'}}/>hot range</span>
        </div>
      </main>

      <aside className="right">
        <div className="group">
          <h3>Key Probe</h3>
          <div style={{fontSize:11, color:'var(--ink-dim)', marginBottom:8}}>click a key to trace its replica chain</div>
          <div style={{maxHeight:260, overflow:'auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:4}}>
            {keys.slice(0,64).map((k,i)=>(
              <button key={k.key} style={{background:hoverKey?.key===k.key?'#0e7592':'#0a1528', color:'var(--ink)', border:'1px solid var(--grid)', padding:'3px 6px', fontSize:10, textAlign:'left', fontFamily:'inherit', cursor:'pointer', borderRadius:3}} onClick={()=>pickKey(i)}>
                {k.key}
              </button>
            ))}
          </div>
        </div>
        {hoverKey && (
          <div className="group">
            <h3>Trace</h3>
            <div style={{fontSize:11, color:'var(--ink)'}}>{hoverKey.key}</div>
            <div style={{fontSize:10, color:'var(--ink-dim)', margin:'4px 0'}}>hash {(hoverKey.pos*0xffffffff|0).toString(16).padStart(8,'0')}</div>
            {lookupReplicas(tokens, hoverKey.pos, rf, zoneAware).map((r,i)=>(
              <div key={i} className="node-card">
                <div className="n">{i===0?'primary':'replica '+i} · {r.node}</div>
                <div className="m">zone {r.zone} · vnode {r.label.split('#')[1]}</div>
              </div>
            ))}
          </div>
        )}
      </aside>

      <section className="bottom">
        <div className="cell"><PartitionHeat nodes={nodes} ownership={ownership}/></div>
        <div className="cell"><ReplicaMatrix nodes={nodes}/></div>
        <div className="cell"><HazardLog events={events}/></div>
      </section>
    </div>
  );
}

// --- alternate views ---------------------------------------------
function HeatGrid({ keys, tokens, nodes }){
  const ref = useRef(null);
  useEffect(()=>{
    const c = ref.current; if(!c) return;
    const dpr = devicePixelRatio||1, w=c.clientWidth, h=c.clientHeight;
    c.width=w*dpr; c.height=h*dpr; const ctx=c.getContext('2d'); ctx.scale(dpr,dpr);
    ctx.fillStyle='#0a0e1a'; ctx.fillRect(0,0,w,h);
    const cols=64, rows=Math.ceil(nodes.length);
    const cellW = w/cols, cellH = (h-30)/rows;
    const ownership = {};
    nodes.forEach(n=>ownership[n.id]=new Array(cols).fill(0));
    for(const k of keys){
      const rep = lookupReplicas(tokens, k.pos, 1, false)[0];
      if(!rep) continue;
      const col = Math.floor(k.pos * cols);
      ownership[rep.node][col]++;
    }
    const palette = ['#00d4ff','#6bffb9','#ffb86b','#ff6b9d','#b57bff','#7de3ff','#ffe27d','#7dffb0'];
    nodes.forEach((n,i)=>{
      const row = i;
      const max = Math.max(1, ...ownership[n.id]);
      for(let c2=0;c2<cols;c2++){
        const v = ownership[n.id][c2]/max;
        ctx.fillStyle = palette[i%palette.length]+Math.floor(v*255).toString(16).padStart(2,'0');
        ctx.fillRect(c2*cellW, 30+row*cellH, cellW-1, cellH-1);
      }
      ctx.fillStyle='#cfe8ff'; ctx.font='10px ui-monospace';
      ctx.fillText(n.id, 8, 30+row*cellH+cellH/2+3);
    });
    ctx.fillStyle='#7892b0'; ctx.font='10px ui-monospace';
    ctx.fillText('hash space → 0x00000000 .. 0xFFFFFFFF', 8, 18);
  }, [keys, tokens, nodes]);
  return <canvas ref={ref}/>;
}

function ReplicaCanvasMatrix({ nodes }){
  const ref=useRef(null);
  useEffect(()=>{
    const c=ref.current; if(!c) return;
    const dpr=devicePixelRatio||1, w=c.clientWidth, h=c.clientHeight;
    c.width=w*dpr; c.height=h*dpr; const ctx=c.getContext('2d'); ctx.scale(dpr,dpr);
    ctx.fillStyle='#0a0e1a'; ctx.fillRect(0,0,w,h);
    const n=nodes.length, pad=60;
    const cell = Math.min((w-pad)/n, (h-pad)/n);
    ctx.font='11px ui-monospace'; ctx.fillStyle='#7892b0';
    ctx.fillText('→ destination', pad+cell*n/2-40, 18);
    for(let i=0;i<n;i++){
      for(let j=0;j<n;j++){
        const x = pad + j*cell;
        const y = pad + i*cell;
        const lag = i===j ? 0 : Math.abs(nodes[i].health-nodes[j].health)*1200 + (i*17+j*31)%180;
        const alpha = Math.min(0.85, lag/1200);
        ctx.fillStyle = i===j ? '#111a2e' : `rgba(0,212,255,${alpha})`;
        ctx.fillRect(x, y, cell-2, cell-2);
        ctx.fillStyle = '#cfe8ff'; ctx.fillText(`${lag|0}`, x+cell/2-10, y+cell/2+3);
      }
      ctx.fillStyle='#cfe8ff'; ctx.fillText(nodes[i].id, 6, pad+i*cell+cell/2+3);
      ctx.fillText(nodes[i].id, pad+i*cell+cell/3, pad-6);
    }
  }, [nodes]);
  return <canvas ref={ref}/>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);

/*
## Skills applied
`consistent-hashing-visualization-pattern`, `consistent-hashing-data-simulation`,
`database-sharding-visualization-pattern`, `database-sharding-data-simulation`,
`rebalance-partition-ownership-swimlane`, `replica-timeline-swimlane-with-causal-arrows`,
`vector-clock-concurrency-matrix`, `hybrid-logical-clock-merge`,
`lease-epoch-fencing-token-monotonic-guard`, `concurrent-edit-merge-arbitration-table`,
`rolling-hash-chunk-boundary-detector`, `fnv1a-xorshift-text-to-procedural-seed`,
`canvas-flowfield-particle-advection`, `canvas-svg-dual-layer-hit-dispatch`,
`canvas-chromakey-bg-removal`, `css-sprite-sheet-phase-row-switch`,
`incommensurate-sine-organic-flicker`, `parallax-sine-silhouette-horizon`,
`layout-stable-hover-via-inset-shadow`, `hue-rotate-sprite-identity`,
`cache-variance-ttl-jitter`, `load-balancer-visualization-pattern`,
`load-balancer-data-simulation`, `read-replica-visualization-pattern`,
`read-replica-data-simulation`, `bloom-filter-visualization-pattern`,
`bloom-filter-data-simulation`, `distributed-tracing-visualization-pattern`,
`distributed-tracing-data-simulation`, `health-check-visualization-pattern`,
`health-check-data-simulation`, `connection-pool-visualization-pattern`,
`connection-pool-data-simulation`, `lag-watermark-dual-axis-timeline`,
`barrier-alignment-buffer-spill`, `watermark-aligned-window-emitter`,
`object-storage-visualization-pattern`, `object-storage-data-simulation`,
`materialized-view-visualization-pattern`, `time-series-db-visualization-pattern`

## Knowledge respected
`consistent-hashing-implementation-pitfall`, `database-sharding-implementation-pitfall`,
`read-replica-implementation-pitfall`, `canvas-trail-fade-vs-clear`,
`canvas-event-coord-devicepixel-rescale`, `quorum-visualization-off-by-one`,
`bloom-filter-false-positive-saturation-cliff`, `merkle-tree-range-leaf-vs-point-leaf-tradeoff`,
`concurrent-edge-detection-without-full-clock-compare`,
`phi-accrual-failure-detector-over-binary-timeout`, `span-hash-determinism`
*/