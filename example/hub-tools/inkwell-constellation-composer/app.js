"use strict";
const $=s=>document.querySelector(s);

// --- strategy registry: pluggable-sender-factory-pattern / strategy-spi-list-to-map-autoinject ---
const STRATEGIES=new Map();
function reg(k,fn){STRATEGIES.set(k,fn)}
reg("velvet",  t=>pref("velvet",t));
reg("inkwell", t=>pref("inkwell",t));
reg("cartographer", t=>pref("cartographer",t));
reg("tidal",   t=>pref("tidal",t));
reg("lantern", t=>pref("lantern",t));
reg("nebular", t=>pref("nebular",t));
reg("whale",   t=>pref("whale-of",t));
reg("fleet",   t=>pref("fleet-of",t));
function pref(label,tokens){
  const a=pick(tokens)||"forgotten", b=pick(tokens)||"paper";
  return `${label} ${a}-${b}`;
}
function pick(a){if(!a||!a.length) return null;return a[(Math.random()*a.length)|0]}

// --- seeded rng ---
function srng(seed){let s=(seed>>>0)||1;return ()=>((s=Math.imul(1664525,s)+1013904223>>>0)/2**32)}

// --- byte-aware-sms-truncation-with-ellipsis ---
function truncBytes(str,max){
  const enc=new TextEncoder();
  let bytes=enc.encode(str);
  if(bytes.length<=max) return str;
  const dec=new TextDecoder("utf-8",{fatal:false});
  return dec.decode(bytes.slice(0,max-3))+"...";
}
// --- identifier-truncate-with-hash-suffix ---
function idHash(str){let h=5381;for(let i=0;i<str.length;i++)h=((h<<5)+h+str.charCodeAt(i))>>>0;return h.toString(36).slice(0,6)}

// --- preset store — zustand-preset-manager semantics ---
const PRESETS_KEY="icc-presets";
function loadPresets(){try{return JSON.parse(localStorage.getItem(PRESETS_KEY)||"[]")}catch{return[]}}
function savePresets(p){localStorage.setItem(PRESETS_KEY,JSON.stringify(p.slice(0,12)))}
function renderPresets(){
  const list=loadPresets();
  $("#presets").innerHTML=list.length? list.map((p,i)=>
    `<li><span>${truncBytes(p.name,28)}</span><span><button data-i="${i}" data-op="load">load</button> <button data-i="${i}" data-op="del">×</button></span></li>`
  ).join("") : `<li style="border:none;color:var(--muted)">(none yet)</li>`;
}

// --- lore generator — ai-call-with-mock-fallback / llm-json-extraction compatible shape ---
const VERBS=["charts","traces","veils","unspools","whispers","lantern-reads","ink-names","fathoms"];
const NOUNS=["the forgotten tide","velvet paper seas","an inkwell whale","a drifting atlas","pale lantern-skies","a cartographer's quill","the unchartered gulf"];
function lore(tokens,rng){
  const v=VERBS[(rng()*VERBS.length)|0], n=NOUNS[(rng()*NOUNS.length)|0];
  const t1=pick(tokens)||"velvet", t2=pick(tokens)||"forgotten";
  return `A ${t1} cartographer ${v} ${n}; only a ${t2} lantern remains.`;
}

// --- forge ---
function forge(){
  const raw=$("#tokens").value.trim().split(/\s+/).filter(Boolean);
  const strat=$("#strategy").value;
  const N=Math.max(5,Math.min(24,+$("#stars").value||11));
  const seed=+$("#seed").value|0;
  const rng=srng(seed);
  // single-keyword-formulaic-llm-output guard
  const w=$("#warn");
  if(raw.length<2){w.hidden=false;w.textContent="⚠ tip: supply at least 2 theme tokens — single keywords yield formulaic output."}
  else w.hidden=true;

  // cache-variance-ttl-jitter — stamp TTL with ±10% jitter
  const ttl=Math.round(300*(0.9+rng()*0.2));

  const gen=STRATEGIES.get(strat)||STRATEGIES.get("velvet");
  const rawName=gen(raw);
  const name=truncBytes(rawName,64)+" ·"+idHash(rawName+seed);
  const stars=[];
  for(let i=0;i<N;i++){
    stars.push({
      id:`s${i}`,
      x:30+rng()*340,
      y:30+rng()*240,
      m:+(0.6+rng()*2.4).toFixed(2),
      label:pick(raw)||"unnamed",
    });
  }
  // divide-by-zero-rate-guard — density with guard
  const density=stars.length? +((stars.length/(400*300))*1e4).toFixed(3) : 0;

  const edges=[];
  for(let i=0;i<stars.length-1;i++){
    if(rng()<.6) edges.push([i,i+1]);
    if(rng()<.2) edges.push([i,(i+2)%stars.length]);
  }
  return {name,strategy:strat,seed,tokens:raw,stars,edges,lore:lore(raw,rng),ttl,density};
}
function render(c){
  $("#cname").textContent=c.name;
  $("#clore").textContent=c.lore;
  $("#cn").textContent=c.stars.length;
  $("#clist").innerHTML=c.stars.map(s=>`<li><b>${s.label}</b> @ (${s.x.toFixed(0)},${s.y.toFixed(0)}) mag ${s.m}</li>`).join("");
  $("#cjson").textContent=JSON.stringify(c,null,2);
  let svg="";
  for(const [a,b] of c.edges){
    const p=c.stars[a],q=c.stars[b];
    svg+=`<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="rgba(110,231,183,.3)" stroke-width=".6"/>`;
  }
  for(const s of c.stars){
    svg+=`<circle cx="${s.x}" cy="${s.y}" r="${Math.max(1,s.m)}" fill="#6ee7b7" opacity=".9"><title>${s.label} mag ${s.m}</title></circle>`;
    if(s.m>1.8) svg+=`<circle cx="${s.x}" cy="${s.y}" r="${s.m*3}" fill="none" stroke="rgba(110,231,183,.15)"/>`;
  }
  $("#chart").innerHTML=svg;
}

let current=null;
$("#forge").onclick=()=>{current=forge();render(current)};
$("#jitter").onclick=()=>{
  if(!current){current=forge()}
  $("#seed").value=(+$("#seed").value|0)+((Math.random()*9)|0)+1;
  current=forge();render(current);
};
$("#savep").onclick=()=>{
  if(!current){current=forge();render(current)}
  const list=loadPresets();
  list.unshift({name:current.name,seed:current.seed,strategy:current.strategy,tokens:current.tokens});
  savePresets(list);renderPresets();
};
$("#presets").addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b) return;
  const i=+b.dataset.i, list=loadPresets();
  if(b.dataset.op==="del"){list.splice(i,1);savePresets(list);renderPresets();return}
  if(b.dataset.op==="load"){
    const p=list[i];$("#tokens").value=p.tokens.join(" ");$("#strategy").value=p.strategy;$("#seed").value=p.seed;
    current=forge();render(current);
  }
});
$("#export").onclick=()=>{
  if(!current){current=forge();render(current)}
  const md=`---\nname: "${current.name}"\nstrategy: ${current.strategy}\nseed: ${current.seed}\ntokens: [${current.tokens.join(", ")}]\nttl: ${current.ttl}\n---\n\n# ${current.name}\n\n> ${current.lore}\n\n## Stars (${current.stars.length})\n${current.stars.map(s=>`- **${s.label}** @ (${s.x.toFixed(0)}, ${s.y.toFixed(0)}) · mag ${s.m}`).join("\n")}\n\n## Edges\n${current.edges.map(([a,b])=>`- s${a} — s${b}`).join("\n")}\n`;
  const blob=new Blob([md],{type:"text/markdown;charset=utf-8"});
  const u=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=u;a.download=current.name.replace(/[^a-z0-9]+/gi,"-").slice(0,40)+".md";a.click();
  setTimeout(()=>URL.revokeObjectURL(u),500);
};
addEventListener("keydown",e=>{
  if(e.key==="Enter"&&document.activeElement.tagName==="INPUT") $("#forge").click();
  else if(e.key==="j") $("#jitter").click();
  else if(e.key==="s"&&e.ctrlKey){e.preventDefault();$("#savep").click()}
});
renderPresets();
current=forge();render(current);