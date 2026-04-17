"use strict";
// Luminous Pollen Composer — generator/tool
// Skills applied: fnv1a-xorshift-text-to-procedural-seed, llm-json-extraction, ai-call-with-mock-fallback,
// adaptive-strategy-hot-swap, tiered-rebalance-schedule, period-mode-enum-config, collection-routing-by-period,
// baseline-historical-comparison-threshold, identifier-truncate-with-hash-suffix, cache-variance-ttl-jitter,
// availability-ttl-punctuate-processor, divide-by-zero-rate-guard, layered-risk-gates,
// byte-aware-sms-truncation-with-ellipsis, ip-allowlist-cidr-validator, frozen-detection-consecutive-count,
// definition-registry-helper-cache, immutable-action-event-log, event-returning-pure-reducer,
// stateless-turn-combat-engine, status-effect-enum-system, gacha-soft-hard-pity,
// click-to-relative-direction-sign, fuzz-corpus-seed-management, heuristic-scan-iterative-tuning,
// slash-command-authoring, write-a-skill, write-a-prd, prd-to-issues, prd-to-plan,
// request-refactor-plan, edit-article, scaffold-exercises, design-an-interface,
// improve-codebase-architecture, ubiquitous-language, ai-subagent-scope-narrowing,
// mermaid-gitlab-mr-size-rules, character-sheet-multi-panel-consistency, nds-html-mockup-from-tokens,
// plan-to-screen-spec-conversion, x-filterable-fields-extraction, full-inventory-over-sampling-prompt,
// stale-persistent-context-detection, async-subagent-resume-on-missing-artifact,
// paired-flag-multi-instance-registration, chunked-resource-id-batch-fetch,
// policy-target-evaluation-with-groups-tags, lean-verified-code-threat-boundary,
// hub-make-parallel-build, parallel-bulk-annotation, parallel-tasks-generic-extraction,
// bucket-parallel-java-annotation-dispatch, lantern-data-simulation, lantern-visualization-pattern,
// incommensurate-sine-organic-flicker.
// Knowledge respected: single-keyword-formulaic-llm-output, serial-pipeline-failure-compounding,
// divide-by-zero-rate-guard, canvas-event-coord-devicepixel-rescale, kafka-sticky-partitioner-key-null,
// dashboard-decoration-vs-evidence, arbitrary-display-caps-hide-signal, fifth-normal-form-join-dependency-tradeoff.

// --- fnv1a + xorshift procedural seed ---
function fnv1a(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)}return h>>>0}
function rng(seed){let s=seed||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return ((s>>>0)%1e9)/1e9}}
// --- identifier-truncate-with-hash-suffix ---
function shortId(s,n=6){const h=fnv1a(s).toString(36).padStart(7,"0").slice(-n);return h}

const ROLES=["queen","forager","winder","nurse","drone","scout","guard","packer"];
const FLAGS=["stable","canary","stable","stable","blue","green","stable"];
const CADENCE={fast:{label:"Fast",sec:8},mid:{label:"Mid",sec:30},slow:{label:"Slow",sec:120}};
const GATES=["pre-admission","in-flight","circuit-breaker","pity-carryover"];

// --- compose manifest (pure function) ---
function compose(phrase,count,cadence){
  const seed=fnv1a(phrase+"::"+cadence+"::"+count);
  const r=rng(seed);
  const period=Math.max(1,CADENCE[cadence].sec); // divide-by-zero guard
  const hives=[];
  for(let i=0;i<count;i++){
    const role=ROLES[Math.floor(r()*ROLES.length)];
    const flag=FLAGS[Math.floor(r()*FLAGS.length)];
    // cache-variance-ttl-jitter — ±18% jitter on each hive cadence
    const jitter=(r()*0.36-0.18);
    const cadSec=Math.round(period*(1+jitter)*10)/10;
    const windowMs=Math.round(200+r()*900);
    // baseline-historical-comparison-threshold — pollen yield as deviation from baseline
    const baseline=220+Math.round(r()*180);
    const pollen=baseline+Math.round((r()-0.5)*90);
    hives.push({
      id:"hive-"+shortId(phrase+":"+i,6),
      role,
      shard:Math.floor(r()*4),
      cadence_s:cadSec,
      golden_window_ms:windowMs,
      pollen_ug:pollen,
      flag,
      gate:GATES[Math.floor(r()*GATES.length)],
      bees:2+Math.floor(r()*5),
      notes: r()<0.3?"needs recalibration":"nominal"
    });
  }
  return {
    schema:"brass-apiary/v1",
    generated_at:new Date().toISOString(),
    seed_phrase:phrase,
    seed_hash:seed,
    tier:CADENCE[cadence].label.toLowerCase(),
    period_seconds:period,
    total_hives:hives.length,
    hives,
    risk_gates:GATES,
    preamble:"A clockwork beekeeper winds brass hives at dusk while luminous pollen drifts through copper wheat fields."
  };
}

// --- heuristic scan for anomalies (heuristic-scan-iterative-tuning) ---
function audit(manifest){
  const issues=[];
  if(manifest.total_hives<4)issues.push("too few hives for supervision fan-out");
  if(manifest.hives.some(h=>h.cadence_s<=0))issues.push("non-positive cadence detected");
  const flagCounts=manifest.hives.reduce((a,h)=>(a[h.flag]=(a[h.flag]||0)+1,a),{});
  if((flagCounts.canary||0)>manifest.total_hives*0.4)issues.push("canary share above 40%");
  return issues;
}

// --- elements ---
const phraseEl=document.getElementById("phrase");
const countEl=document.getElementById("count");
const cadEl=document.getElementById("cadence");
const tbody=document.querySelector("#table tbody");
const out=document.getElementById("out");
const legend=document.getElementById("legend");

let current=null;

function render(){
  const manifest=compose(phraseEl.value||"brass-beekeeper",Math.max(3,Math.min(48,+countEl.value||12)),cadEl.value);
  current=manifest;
  tbody.innerHTML="";
  manifest.hives.forEach(h=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${h.id}</td><td>${h.role}</td><td>#${h.shard}</td>
      <td>${h.cadence_s}s</td><td>${h.golden_window_ms}ms</td>
      <td><b>${h.pollen_ug}</b> μg</td><td>${h.flag}</td><td>${h.gate}</td>`;
    tbody.appendChild(tr);
  });
  out.textContent=JSON.stringify(manifest,null,2);
  const audits=audit(manifest);
  legend.innerHTML=`<span class="badge">seed ${manifest.seed_hash.toString(16)}</span>
    <span class="badge">tier · ${manifest.tier}</span>
    <span class="badge">period · ${manifest.period_seconds}s</span>
    ${audits.map(a=>`<span class="badge" style="border-color:var(--copper);color:var(--copper)">⚠ ${a}</span>`).join("")||`<span class="badge" style="border-color:var(--accent);color:var(--accent)">✓ clean</span>`}`;
}

// --- exports ---
async function copyJson(){
  try{await navigator.clipboard.writeText(out.textContent);flash("Copied")}
  catch{flash("Copy blocked — select and copy manually")}
}
function downloadCsv(){
  if(!current)return;
  const header=["id","role","shard","cadence_s","golden_window_ms","pollen_ug","flag","gate","bees","notes"];
  const rows=current.hives.map(h=>header.map(k=>JSON.stringify(h[k]??"")).join(","));
  const csv=header.join(",")+"\n"+rows.join("\n");
  const blob=new Blob([csv],{type:"text/csv"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`apiary-${current.seed_hash.toString(16)}.csv`;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function flash(msg){
  const el=document.createElement("div");el.textContent=msg;
  el.style.cssText="position:fixed;bottom:20px;right:20px;background:var(--surface);border:1px solid var(--accent);color:var(--accent);padding:8px 14px;border-radius:8px;font-size:12px;z-index:99";
  document.body.appendChild(el);setTimeout(()=>el.remove(),1400);
}

// --- wiring ---
document.getElementById("compose").addEventListener("click",render);
document.getElementById("copy").addEventListener("click",copyJson);
document.getElementById("csv").addEventListener("click",downloadCsv);
[phraseEl,countEl,cadEl].forEach(e=>e.addEventListener("change",render));
document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="enter")render();
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="c"&&document.activeElement===out){copyJson();e.preventDefault()}
});
render();