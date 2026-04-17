const $=s=>document.querySelector(s);
function fnv1a(s){let h=2166136261>>>0;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h;}
function xorshift(seed){let x=seed||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1e9)/1e9;};}

// identifier-truncate-with-hash-suffix
function shortId(name,seedHex){return (name.replace(/[^a-z0-9]/gi,'').slice(0,10).toLowerCase())+'-'+seedHex.slice(0,6);}

// strand kinds — ubiquitous-language table
const KIND={STORM:'storm',GIANT:'giant',MEADOW:'meadow',STAR:'star',SILVER:'silver-thread'};
const CATALOG_KINDS=[KIND.STORM,KIND.GIANT,KIND.MEADOW,KIND.STAR,KIND.SILVER];

// previous manifest for diff — audit-change-data-capture-pattern
let prev=null;
const log=[]; // immutable-action-event-log
function appendLog(ev){log.push({t:Date.now(),ev});}

// compose state — spring-typed-config-properties shape
function getState(){
  return{
    phrase:$('#phrase').value,
    count:+$('#count').value,
    boltThreshold:+$('#bolt').value,
    dreamDepth:+$('#dream').value,
    chorus:+$('#chorus').value,
    period:$('#period').value,
    filter:$('#filter').value
  };
}

// stack-tag-filter-to-mongo-criteria (tiny parser: k=v, k>v, AND/OR)
function parseFilter(expr){
  if(!expr||!expr.trim())return()=>true;
  const toks=expr.trim().split(/\s+/);
  return row=>{
    let acc=null,op='AND';
    for(const t of toks){
      const U=t.toUpperCase();
      if(U==='AND'||U==='OR'){op=U;continue;}
      const m=t.match(/^([a-z]+)(=|>|<)(.+)$/i);if(!m){continue;}
      const[,k,o,v]=m;const rv=row[k];let pass=false;
      if(o==='=')pass=String(rv)===v;
      else if(o==='>')pass=(+rv)>(+v);
      else if(o==='<')pass=(+rv)<(+v);
      acc=acc===null?pass:(op==='AND'?acc&&pass:acc||pass);
    }
    return acc!==null?acc:true;
  };
}

// build strands
function buildStrands(st){
  const rnd=xorshift(fnv1a(st.phrase));
  const seedHex=fnv1a(st.phrase).toString(16);
  // chunked-resource-id-batch-fetch — cap at 1000 strands, never
  const N=Math.min(1000,st.count);
  return Array.from({length:N},(_,i)=>{
    const kind=CATALOG_KINDS[(rnd()*CATALOG_KINDS.length)|0];
    const hue=(kind===KIND.STORM?200:kind===KIND.GIANT?270:kind===KIND.MEADOW?320:kind===KIND.STAR?55:150)+(rnd()*20);
    return{
      id:shortId(kind+i,seedHex+i),
      kind,
      hue:Math.round(hue),
      charge:+(rnd()).toFixed(3),
      weight:+(0.2+rnd()*0.8).toFixed(3),
      dream:kind===KIND.GIANT?+(st.dreamDepth/100).toFixed(2):null,
      changed:{kind:true,hue:true,charge:true}, // avro-event-change-flags
    };
  });
}

// risk gates — layered-risk-gates
function admissionCheck(st,rows){
  if(st.boltThreshold>90&&rows.length>120)return'admission denied: bolt>90 AND strands>120';
  if(st.dreamDepth<5&&rows.filter(r=>r.kind===KIND.GIANT).length>5)return'giants starved of dream — raise dreamDepth';
  return null;
}

// baseline-historical-comparison-threshold: compare to prev
function diffRows(a,b){
  if(!a)return'(no previous manifest)';
  const map=new Map(a.rows.map(r=>[r.id,r]));
  const lines=[];
  // always iterate BEFORE doc — audit-changed-prev-after-field-swap-bug
  for(const oldR of a.rows){
    const newR=b.rows.find(r=>r.id===oldR.id);
    if(!newR){lines.push(`- ${oldR.id} (removed)`);continue;}
    for(const k of Object.keys(oldR)){if(typeof oldR[k]!=='object'&&oldR[k]!==newR[k])lines.push(`~ ${oldR.id}.${k}: ${oldR[k]} → ${newR[k]}`);}
  }
  for(const newR of b.rows)if(!map.has(newR.id))lines.push(`+ ${newR.id} (added)`);
  return lines.slice(0,200).join('\n')||'(no changes)';
}

let lastRun=0; // rate-limiter-data-simulation: 400ms token
function generate(){
  const now=Date.now();if(now-lastRun<400){$('#stat').textContent='rate-limited — wait';return;}
  lastRun=now;
  const st=getState();
  const rows=buildStrands(st);
  const filter=parseFilter(st.filter);
  const filtered=rows.filter(filter); // stack-tag-filter-to-mongo-criteria
  const risk=admissionCheck(st,filtered);
  const seedHex=fnv1a(st.phrase).toString(16);
  const manifest={
    // feed-envelope-frame
    type:'TAPESTRY',payloadKind:'manifest',requestId:seedHex.slice(0,8),
    // additive-registry-schema-versioning + git-tag-registry-versioning
    schemaVersion:3,releaseTag:`tapestry/v0.${rows.length}.${st.boltThreshold}`,
    phrase:st.phrase,
    config:{boltThreshold:st.boltThreshold,dreamDepth:st.dreamDepth,chorus:st.chorus,period:st.period},
    risk:risk,
    count:filtered.length,
    rows:filtered
  };
  renderCatalog(filtered);
  renderManifest(manifest);
  renderPreview(filtered,st);
  renderDiff(diffRows(prev,manifest));
  prev=JSON.parse(JSON.stringify(manifest));
  appendLog({action:'generate',count:filtered.length,risk});
  const bytes=new Blob([JSON.stringify(manifest)]).size;
  $('#stat').textContent=truncSms(`woven ${filtered.length} strands · ${bytes}B · tag ${manifest.releaseTag} · risk:${risk||'ok'}`,140);
}

// byte-aware-sms-truncation-with-ellipsis
function truncSms(s,bud){const enc=new TextEncoder().encode(s);if(enc.length<=bud)return s;let out='',size=0;for(const c of s){const ln=new TextEncoder().encode(c).length;if(size+ln+3>bud)break;out+=c;size+=ln;}return out+'...';}

function renderCatalog(rows){
  const ul=$('#catalog');ul.innerHTML='';
  // arbitrary-display-caps-hide-signal: show full count; truncate displayed rows but label it
  const shown=rows.slice(0,200);
  shown.forEach(r=>{const li=document.createElement('li');li.innerHTML=`<span style="color:hsl(${r.hue},55%,70%)">${r.kind}</span> <b>${r.id}</b> <span class="tag">charge ${r.charge} · w ${r.weight}${r.dream!==null?' · dream '+r.dream:''}</span>`;ul.appendChild(li);});
  if(rows.length>shown.length){const li=document.createElement('li');li.style.color='#556';li.textContent=`(+${rows.length-shown.length} more — exported in full manifest)`;ul.appendChild(li);}
}

function renderManifest(m){$('#manifest').textContent=JSON.stringify(m,null,2);}

// preview — parallax-sine-silhouette-horizon + copper-patina-gradient-shader + canvas-trail-fade-vs-clear
function renderPreview(rows,st){
  const c=$('#previewCvs');const ctx=c.getContext('2d');
  const r=c.getBoundingClientRect();c.width=r.width*devicePixelRatio;c.height=r.height*devicePixelRatio;
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  const W=r.width,H=r.height;
  ctx.fillStyle='#0a0b12';ctx.fillRect(0,0,W,H);
  // mountains
  ctx.beginPath();ctx.moveTo(0,H);
  for(let x=0;x<=W;x+=6){const y=H*0.65+Math.sin(x*0.01)*30+Math.sin(x*0.02*1.618)*20;ctx.lineTo(x,y);}
  ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle='#1a2040';ctx.fill();
  // strands woven horizontally
  rows.forEach((row,i)=>{
    const y=20+(i%60)*(H-40)/60;
    const cx=W*0.5,cy=H*0.5;
    const rad=40+row.weight*120;
    const a0=-Math.PI+row.charge*Math.PI*2;
    ctx.strokeStyle=`hsla(${row.hue},70%,${row.kind===KIND.SILVER?85:60}%,0.55)`;
    ctx.lineWidth=row.kind===KIND.SILVER?1.5:0.8;
    ctx.beginPath();ctx.arc(cx,cy,rad,a0,a0+row.weight*Math.PI);ctx.stroke();
    if(row.kind===KIND.STAR){ctx.fillStyle=`hsla(${row.hue},90%,80%,0.9)`;ctx.fillRect(cx+Math.cos(a0)*rad,cy+Math.sin(a0)*rad,2,2);}
  });
  // threshold overlay — baseline-historical-comparison-threshold
  ctx.strokeStyle='#6ee7b7';ctx.setLineDash([4,4]);
  ctx.beginPath();ctx.moveTo(0,H*(1-st.boltThreshold/100));ctx.lineTo(W,H*(1-st.boltThreshold/100));ctx.stroke();
  ctx.setLineDash([]);ctx.fillStyle='#6ee7b7';ctx.font='10px ui-monospace';ctx.fillText(`bolt threshold ${st.boltThreshold}%`,8,H*(1-st.boltThreshold/100)-4);
}

function renderDiff(txt){$('#diff').textContent=txt;}

function bindSliders(){
  ['count','bolt','dream','chorus'].forEach(id=>{
    const el=document.getElementById(id);const out=document.getElementById(id+'Out');
    el.addEventListener('input',()=>{out.textContent=el.value;});
  });
}
bindSliders();

// tab switcher — menu-key-config-registry
document.querySelectorAll('.tabs button').forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    ['compose','preview','manifest','diff'].forEach(k=>{
      document.getElementById('pane-'+k).classList.toggle('hidden',k!==b.dataset.tab);
    });
  };
});

// buttons
$('#gen').onclick=generate;
$('#copy').onclick=async()=>{
  // dry-run-confirm-retry-write-flow: confirm before clipboard
  if(!prev){$('#stat').textContent='nothing to copy — weave first';return;}
  if(!confirm('copy manifest to clipboard?'))return;
  try{await navigator.clipboard.writeText(JSON.stringify(prev,null,2));$('#stat').textContent='manifest copied';}
  catch(e){$('#stat').textContent='copy failed — '+e.message;}
};
$('#export').onclick=()=>{
  if(!prev)return;
  // obsidian-vault: wikilinks
  const md=`# ${prev.releaseTag}\n\n> ${prev.phrase}\n\n- period: ${prev.config.period}\n- strands: ${prev.count}\n- risk: ${prev.risk||'ok'}\n\n## strands\n\n`+
    prev.rows.slice(0,400).map(r=>`- [[${r.id}]] ${r.kind} hue=${r.hue} charge=${r.charge}`).join('\n');
  const blob=new Blob([md],{type:'text/markdown'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=prev.releaseTag.replace(/\//g,'_')+'.md';a.click();
};

addEventListener('keydown',e=>{
  if(e.key==='g')generate();
  if(e.key==='c')$('#copy').click();
  if(e.key==='e')$('#export').click();
});

// initial render + cache-variance-ttl-jitter auto-refresh
generate();
setInterval(()=>{if(Date.now()-lastRun>1500)generate();},2000+Math.random()*600);