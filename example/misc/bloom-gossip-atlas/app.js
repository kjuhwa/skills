const {useState,useEffect,useRef,useMemo,useCallback,memo} = React;

// FNV-1a + xorshift seeded RNG (per `fnv1a-xorshift-text-to-procedural-seed`)
function fnv1a(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=(h*0x01000193)>>>0}return h>>>0}
function mkRng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return ((s>>>0)/4294967296)}}

// Bloom filter model (see `bloom-filter-data-simulation`)
function bloomHashes(key,k,m){
  const h1=fnv1a(key);
  const h2=fnv1a('salt-'+key);
  return Array.from({length:k},(_,i)=>(h1+i*h2)%m);
}
function makeBloom(m){return {m,bits:new Uint8Array(m),count:0}}
function bloomAdd(b,key,k){for(const i of bloomHashes(key,k,b.m)){b.bits[i]=1}b.count++}
function bloomHas(b,key,k){return bloomHashes(key,k,b.m).every(i=>b.bits[i]===1)}

// Merkle tree over sorted key/value pairs
function djb2(s){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(16).padStart(8,'0')}
function buildMerkle(pairs){
  const leaves=pairs.map(([k,v])=>({h:djb2(k+'='+v),k,v,leaf:true}));
  if(!leaves.length) return {h:'00000000',leaf:true,k:'',v:''};
  let level=leaves;
  while(level.length>1){
    const next=[];
    for(let i=0;i<level.length;i+=2){
      const a=level[i], b=level[i+1]||level[i];
      next.push({h:djb2(a.h+b.h),l:a,r:b});
    }
    level=next;
  }
  return level[0];
}
function flattenMerkle(root,depth=0,x=0,w=1,out=[]){
  out.push({node:root,depth,x,w});
  if(!root.leaf){
    flattenMerkle(root.l,depth+1,x,w/2,out);
    flattenMerkle(root.r,depth+1,x+w/2,w/2,out);
  }
  return out;
}

// Simulated peer cluster state
function makeCluster(seed){
  const rng=mkRng(seed);
  const peers=['alpha','bravo','charlie','delta','echo','foxtrot'].map((id,i)=>{
    const pairs=[];
    const count=18+Math.floor(rng()*10);
    for(let j=0;j<count;j++){
      const key='k'+(1000+Math.floor(rng()*40));
      const ver=Math.floor(rng()*9)+1;
      pairs.push([key, 'v'+ver+'-'+id.slice(0,1)]);
    }
    // dedupe keys keeping last
    const m=new Map();pairs.forEach(([k,v])=>m.set(k,v));
    const dedup=[...m.entries()].sort(([a],[b])=>a<b?-1:1);
    const bloom=makeBloom(256);
    dedup.forEach(([k])=>bloomAdd(bloom,k,4));
    return {id,idx:i,pairs:dedup,bloom,clock:peers_clock(i,6,rng)};
  });
  return peers;
}
function peers_clock(idx,n,rng){
  const v=new Array(n).fill(0);
  for(let i=0;i<n;i++) v[i]=Math.floor(rng()*8);
  v[idx]+=3;
  return v;
}

// Vector clock happens-before / concurrent (see `vector-clock-concurrency-matrix`)
function vcRel(a,b){
  let le=true,ge=true,eq=true;
  for(let i=0;i<a.length;i++){
    if(a[i]<b[i]){ge=false;eq=false}
    if(a[i]>b[i]){le=false;eq=false}
  }
  if(eq) return 'eq';
  if(le) return 'hb';
  if(ge) return 'ha';
  return 'co';
}

// Gossip rounds (anti-entropy) simulation
function simulateRounds(peers,rounds=12,seed=1){
  const rng=mkRng(seed);
  const log=[];
  for(let r=0;r<rounds;r++){
    const a=Math.floor(rng()*peers.length);
    let b=Math.floor(rng()*peers.length);
    if(b===a) b=(b+1)%peers.length;
    const diffs=mergeDiff(peers[a],peers[b]);
    log.push({round:r,from:peers[a].id,to:peers[b].id,ai:a,bi:b,diffs});
  }
  return log;
}
function mergeDiff(a,b){
  const ma=new Map(a.pairs), mb=new Map(b.pairs);
  const keys=new Set([...ma.keys(),...mb.keys()]);
  const out=[];
  keys.forEach(k=>{
    const va=ma.get(k), vb=mb.get(k);
    if(va===vb) out.push({k,op:'same',v:va});
    else if(va && !vb) out.push({k,op:'b-missing',v:va});
    else if(!va && vb) out.push({k,op:'a-missing',v:vb});
    else out.push({k,op:'conflict',va,vb});
  });
  return out.sort((x,y)=>x.k<y.k?-1:1);
}

// ---------- React components ----------

const BloomInspector = memo(function BloomInspector({peer,k,testKey}){
  if(!peer) return null;
  const hashes = testKey ? bloomHashes(testKey,k,peer.bloom.m) : [];
  const has = testKey ? bloomHas(peer.bloom,testKey,k) : false;
  const known = testKey ? peer.pairs.some(([kk])=>kk===testKey) : false;
  return (
    <div className="fade-in">
      <h3>Bloom filter (m={peer.bloom.m}, k={k})</h3>
      <div className="bitgrid">
        {Array.from(peer.bloom.bits).map((b,i)=>{
          const hit = hashes.includes(i);
          const cls = hit ? (b?'bit on':'bit fp') : (b?'bit on':'bit');
          return <div key={i} className={cls} title={'bit '+i}/>;
        })}
      </div>
      <div className="kv"><span>set bits</span><span>{peer.bloom.bits.reduce((s,x)=>s+x,0)}/{peer.bloom.m}</span></div>
      <div className="kv"><span>items added</span><span>{peer.bloom.count}</span></div>
      {testKey && (
        <>
          <div className="kv"><span>queried key</span><span>{testKey}</span></div>
          <div className="kv"><span>bloom says</span><span style={{color:has?'var(--ok)':'var(--err)'}}>{has?'possibly':'definitely no'}</span></div>
          <div className="kv"><span>actually present</span><span style={{color:known?'var(--ok)':'var(--err)'}}>{known?'yes':'no'}</span></div>
          {has && !known && <div className="round-banner" style={{borderColor:'var(--warn)'}}>False positive — bloom bits collided. Respected `bloom-filter-implementation-pitfall`.</div>}
        </>
      )}
    </div>
  );
});

function MerkleCanvas({peers,selA,selB,onHover}){
  const ref=useRef(null);
  const trees=useMemo(()=>peers.map(p=>buildMerkle(p.pairs)),[peers]);
  useEffect(()=>{
    const c=ref.current; if(!c) return;
    const dpr=window.devicePixelRatio||1;
    const w=c.clientWidth,h=c.clientHeight;
    c.width=w*dpr;c.height=h*dpr;
    const ctx=c.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    // alpha-rect overpaint per `canvas-trail-fade-vs-clear`
    ctx.fillStyle='rgba(13,21,36,0.92)';
    ctx.fillRect(0,0,w,h);
    const pairW=w/2-20;
    function drawTree(root,ox){
      const flat=flattenMerkle(root);
      const maxDepth=flat.reduce((m,n)=>Math.max(m,n.depth),0);
      const levelH=Math.min(60,(h-40)/(maxDepth+1));
      flat.forEach(({node,depth,x,w:ww})=>{
        const cx=ox+10+(x+ww/2)*pairW;
        const cy=20+depth*levelH;
        const diff = selA>=0 && selB>=0 && selA!==selB ? nodeDiffersBetween(node,trees[selA],trees[selB]) : false;
        ctx.fillStyle=diff?'#ffaa33':'#00d4ff';
        ctx.globalAlpha=node.leaf?1:0.7;
        ctx.beginPath();ctx.arc(cx,cy,node.leaf?4:6,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1;
        if(!node.leaf){
          ['l','r'].forEach(side=>{
            const child=node[side];
            const idx=flat.indexOf(flat.find(f=>f.node===child));
            if(idx>=0){
              const c2=flat[idx];
              const cx2=ox+10+(c2.x+c2.w/2)*pairW;
              const cy2=20+c2.depth*levelH;
              ctx.strokeStyle=diff?'#ffaa33':'#16253d';
              ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx2,cy2);ctx.stroke();
            }
          });
        }
      });
      ctx.fillStyle='#5a7a95';ctx.font='10px monospace';
      ctx.fillText(root.h,ox+10,h-6);
    }
    if(selA>=0) drawTree(trees[selA],0);
    if(selB>=0) drawTree(trees[selB],w/2);
    // divider
    ctx.strokeStyle='#16253d';ctx.beginPath();ctx.moveTo(w/2,10);ctx.lineTo(w/2,h-10);ctx.stroke();
  },[peers,selA,selB,trees]);
  function nodeDiffersBetween(n,a,b){
    // recursively check if node.h appears in the other tree
    function contains(r,h){if(!r)return false;if(r.h===h)return true;if(r.leaf)return false;return contains(r.l,h)||contains(r.r,h)}
    if(a===b) return false;
    return !contains(a,n.h) || !contains(b,n.h);
  }
  return (
    <canvas ref={ref} onMouseMove={e=>{
      const r=e.currentTarget.getBoundingClientRect();
      // canvas-event-coord-devicepixel-rescale pitfall respected
      onHover && onHover({x:(e.clientX-r.left),y:(e.clientY-r.top)});
    }} onMouseLeave={()=>onHover&&onHover(null)}/>
  );
}

function GossipTimeline({rounds,peers,cur,setCur}){
  const ref=useRef(null);
  useEffect(()=>{
    const c=ref.current;if(!c)return;
    const dpr=window.devicePixelRatio||1;
    const w=c.clientWidth,h=c.clientHeight;
    c.width=w*dpr;c.height=h*dpr;
    const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='#0d1524';ctx.fillRect(0,0,w,h);
    const laneH=(h-30)/peers.length;
    peers.forEach((p,i)=>{
      ctx.fillStyle=i%2?'#0e1627':'#111a2e';
      ctx.fillRect(0,20+i*laneH,w,laneH);
      ctx.fillStyle='#5a7a95';ctx.font='10px monospace';
      ctx.fillText(p.id.toUpperCase(),6,20+i*laneH+14);
    });
    const stepX=(w-80)/Math.max(rounds.length,1);
    rounds.forEach((r,i)=>{
      const x=80+i*stepX+stepX/2;
      const y1=20+r.ai*laneH+laneH/2;
      const y2=20+r.bi*laneH+laneH/2;
      const conflicts=r.diffs.filter(d=>d.op==='conflict').length;
      ctx.strokeStyle=conflicts?'#ff4470':(i<=cur?'#00d4ff':'#16253d');
      ctx.lineWidth=i===cur?2.5:1;
      ctx.beginPath();ctx.moveTo(x,y1);ctx.lineTo(x,y2);ctx.stroke();
      ctx.fillStyle=ctx.strokeStyle;
      ctx.beginPath();ctx.arc(x,y1,3,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(x,y2,4,0,Math.PI*2);ctx.fill();
      // arrowhead at receiver
      const dir=y2>y1?1:-1;
      ctx.beginPath();ctx.moveTo(x,y2);ctx.lineTo(x-3,y2-4*dir);ctx.lineTo(x+3,y2-4*dir);ctx.closePath();ctx.fill();
    });
    // watermark line (lag-watermark-dual-axis-timeline)
    ctx.strokeStyle='#33ffaa';ctx.setLineDash([3,3]);
    ctx.beginPath();ctx.moveTo(80+cur*stepX+stepX/2,18);ctx.lineTo(80+cur*stepX+stepX/2,h-4);ctx.stroke();
    ctx.setLineDash([]);
  },[rounds,peers,cur]);
  return <canvas ref={ref} style={{height:'100%'}} onClick={e=>{
    const r=e.currentTarget.getBoundingClientRect();
    const x=e.clientX-r.left;
    const w=r.width;
    const stepX=(w-80)/Math.max(rounds.length,1);
    const i=Math.max(0,Math.min(rounds.length-1,Math.floor((x-80)/stepX)));
    setCur(i);
  }}/>;
}

function VectorClockMatrix({peers}){
  const rels=useMemo(()=>peers.map(a=>peers.map(b=>vcRel(a.clock,b.clock))),[peers]);
  return (
    <div className="matrix" style={{gridTemplateColumns:'28px repeat('+peers.length+',1fr)'}}>
      <div className="cell" />
      {peers.map(p=><div key={p.id} className="cell" style={{background:'#06101c',color:'var(--accent)'}}>{p.id.slice(0,2).toUpperCase()}</div>)}
      {peers.map((a,i)=>(
        <React.Fragment key={a.id}>
          <div className="cell" style={{background:'#06101c',color:'var(--accent)'}}>{a.id.slice(0,2).toUpperCase()}</div>
          {peers.map((b,j)=>{
            const r=rels[i][j];
            const cls = r==='eq'?'cell eq': (r==='hb'||r==='ha'?'cell hb':'cell co');
            return <div key={b.id} className={cls} title={a.id+' vs '+b.id+': '+r}>{r}</div>;
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

function DiffList({diffs}){
  if(!diffs) return <div className="diff same">no round selected</div>;
  return (
    <div className="diff">
      {diffs.map((d,i)=>{
        if(d.op==='same') return <div key={i} className="same">= {d.k} = {d.v}</div>;
        if(d.op==='a-missing') return <div key={i} className="add">+ {d.k} ← {d.v} (pull to A)</div>;
        if(d.op==='b-missing') return <div key={i} className="add">+ {d.k} → {d.v} (push to B)</div>;
        return <div key={i} className="del">! {d.k} conflict A={d.va} B={d.vb}</div>;
      })}
    </div>
  );
}

function SparkLine({values,color}){
  const ref=useRef(null);
  useEffect(()=>{
    const c=ref.current;if(!c)return;
    const dpr=window.devicePixelRatio||1;
    const w=c.clientWidth,h=c.clientHeight;
    c.width=w*dpr;c.height=h*dpr;
    const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='rgba(6,16,28,0.9)';ctx.fillRect(0,0,w,h);
    if(!values.length)return;
    const mx=Math.max(...values,1);
    ctx.strokeStyle=color||'#00d4ff';ctx.beginPath();
    values.forEach((v,i)=>{
      const x=i/(values.length-1||1)*w;
      const y=h-(v/mx)*(h-4)-2;
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    });
    ctx.stroke();
  },[values,color]);
  return <canvas ref={ref} className="spark"/>;
}

function App(){
  const [seed,setSeed]=useState('gossip-alpha');
  const [tab,setTab]=useState('atlas');
  const [k,setK]=useState(4);
  const [testKey,setTestKey]=useState('k1003');
  const [selA,setSelA]=useState(0);
  const [selB,setSelB]=useState(1);
  const [cur,setCur]=useState(0);
  const [hover,setHover]=useState(null);
  const peers=useMemo(()=>makeCluster(fnv1a(seed)),[seed]);
  const rounds=useMemo(()=>simulateRounds(peers,14,fnv1a(seed+'-rounds')),[peers,seed]);
  const conflictsPerRound=useMemo(()=>rounds.map(r=>r.diffs.filter(d=>d.op==='conflict').length),[rounds]);
  const missingPerRound=useMemo(()=>rounds.map(r=>r.diffs.filter(d=>d.op.endsWith('missing')).length),[rounds]);

  useEffect(()=>{
    function onKey(e){
      if(e.key==='ArrowRight') setCur(c=>Math.min(rounds.length-1,c+1));
      if(e.key==='ArrowLeft') setCur(c=>Math.max(0,c-1));
      if(e.key==='r') setSeed(s=>s+'!');
      if(e.key==='1') setTab('atlas');
      if(e.key==='2') setTab('bloom');
      if(e.key==='3') setTab('vector');
    }
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[rounds.length]);

  const curRound=rounds[cur];

  return (
    <>
      <div className="topbar">
        <span className="dot"/>
        <h1>Bloom Gossip Atlas</h1>
        <span className="meta">seed: {seed} · peers: {peers.length} · rounds: {rounds.length}</span>
        <div className="tabs">
          <div className={'tab'+(tab==='atlas'?' active':'')} onClick={()=>setTab('atlas')}>Atlas</div>
          <div className={'tab'+(tab==='bloom'?' active':'')} onClick={()=>setTab('bloom')}>Bloom</div>
          <div className={'tab'+(tab==='vector'?' active':'')} onClick={()=>setTab('vector')}>Vector</div>
        </div>
      </div>
      <div className="layout">
        <div className="panel">
          <h2>Peers</h2>
          {peers.map((p,i)=>(
            <div key={p.id} className={'peer'+((i===selA||i===selB)?' sel':'')} onClick={()=>{
              if(i===selA){ /* noop */ } else if(selA===-1 || (selB!==-1 && i!==selB)){ setSelB(selA); setSelA(i);} else setSelB(i);
            }}>
              <span className="id">{p.id}</span>
              <span className="lag">{p.pairs.length} keys</span>
            </div>
          ))}
          <h3>Controls</h3>
          <div className="kv"><span>seed</span><span><input style={{background:'#06101c',color:'var(--accent)',border:'1px solid var(--grid)',width:110,padding:2,fontFamily:'monospace'}} value={seed} onChange={e=>setSeed(e.target.value)}/></span></div>
          <div className="kv"><span>bloom k</span><span>{k}</span></div>
          <input className="slider" type="range" min="1" max="8" value={k} onChange={e=>setK(+e.target.value)}/>
          <div className="kv"><span>test key</span><span><input style={{background:'#06101c',color:'var(--accent)',border:'1px solid var(--grid)',width:90,padding:2,fontFamily:'monospace'}} value={testKey} onChange={e=>setTestKey(e.target.value)}/></span></div>
          <div style={{marginTop:10}}>
            <button className="btn" onClick={()=>setSeed('seed-'+Math.floor(Math.random()*9999))}>reseed</button>
            <button className="btn primary" onClick={()=>setCur(0)}>rewind</button>
          </div>
          <h3>Per-round conflicts</h3>
          <SparkLine values={conflictsPerRound} color="#ff4470"/>
          <h3>Per-round missing</h3>
          <SparkLine values={missingPerRound} color="#ffaa33"/>
          <div className="legend">
            <span><i className="swatch" style={{background:'var(--accent)'}}/>matched</span>
            <span><i className="swatch" style={{background:'var(--warn)'}}/>mismatch</span>
            <span><i className="swatch" style={{background:'var(--err)'}}/>conflict</span>
            <span><i className="swatch" style={{background:'var(--ok)'}}/>converged</span>
          </div>
        </div>
        <div className="canvas-wrap">
          {tab==='atlas' && <>
            <div style={{position:'absolute',inset:0,display:'grid',gridTemplateRows:'60% 40%'}}>
              <MerkleCanvas peers={peers} selA={selA} selB={selB} onHover={setHover}/>
              <GossipTimeline rounds={rounds} peers={peers} cur={cur} setCur={setCur}/>
            </div>
            {hover && <div className="tooltip" style={{left:hover.x+12,top:hover.y+12}}>merkle node · click peers to re-pair</div>}
          </>}
          {tab==='bloom' && <div style={{position:'absolute',inset:0,padding:18,overflow:'auto'}}>
            <BloomInspector peer={peers[selA]} k={k} testKey={testKey}/>
            <BloomInspector peer={peers[selB]} k={k} testKey={testKey}/>
          </div>}
          {tab==='vector' && <div style={{position:'absolute',inset:0,padding:18,overflow:'auto'}}>
            <h2 style={{color:'var(--accent)',marginTop:0}}>Vector clock relation matrix</h2>
            <VectorClockMatrix peers={peers}/>
            <div className="legend">
              <span><i className="swatch" style={{background:'var(--accent-dim)'}}/>happens-before</span>
              <span><i className="swatch" style={{background:'var(--warn)'}}/>concurrent</span>
              <span><i className="swatch" style={{background:'#0e1a2e'}}/>equal</span>
            </div>
          </div>}
        </div>
        <div className="panel">
          <h2>Round {cur}{curRound?` · ${curRound.from} → ${curRound.to}`:''}</h2>
          <DiffList diffs={curRound?.diffs}/>
          <h3>Peer A clock</h3>
          <div className="diff same">[{peers[selA]?.clock.join(', ')}]</div>
          <h3>Peer B clock</h3>
          <div className="diff same">[{peers[selB]?.clock.join(', ')}]</div>
          <h3>Relation</h3>
          <div className="diff" style={{color:'var(--accent)'}}>{selA>=0&&selB>=0?vcRel(peers[selA].clock,peers[selB].clock):'—'}</div>
          <h3>Merkle roots</h3>
          <div className="diff same">A {buildMerkle(peers[selA]?.pairs||[]).h}</div>
          <div className="diff same">B {buildMerkle(peers[selB]?.pairs||[]).h}</div>
        </div>
      </div>
      <div className="footbar">
        <span>keys: <kbd>←</kbd>/<kbd>→</kbd> scrub · <kbd>r</kbd> perturb seed · <kbd>1/2/3</kbd> switch views</span>
        <span style={{marginLeft:'auto'}}>tracks watermark-aligned anti-entropy per `watermark-aligned-window-emitter`</span>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<App/>);