// fnv1a-xorshift seed
function seedFrom(s){ let h=2166136261>>>0; for(const c of s){h^=c.charCodeAt(0); h=Math.imul(h,16777619)>>>0;} return ()=>{ h^=h<<13; h^=h>>>17; h^=h<<5; return ((h>>>0)%100000)/100000; }; }

// period-mode-enum-config: one registry for mode tuples
const MODES = {
  aeolian:     {steps:[0,2,3,5,7,8,10], root:50, hue:150},
  dorian:      {steps:[0,2,3,5,7,9,10], root:52, hue:170},
  phrygian:    {steps:[0,1,3,5,7,8,10], root:48, hue:120},
  lydian:      {steps:[0,2,4,6,7,9,11], root:55, hue:190},
  pentatonic:  {steps:[0,3,5,7,10],     root:53, hue:45}
};

// definition-registry: glyph namespaces
const GLYPH_NS = ['eresh','nammu','tiamat','abzu','ketos','dagon','morrigan','nereus','thalassa','ondine'];
const GLYPH_CAT = ['current','spire','kelp','song','ward','bell','relic','reef','grotto','lantern'];

let R;
let melody = [];      // [{t, midi, dur}]
let legend = [];      // [{glyph, ns, bearing}]
let logText = '';

const $ = id => document.getElementById(id);

function forge(){
  const phrase = $('seed').value.trim() || 'deep current';
  if(phrase.split(/\s+/).length < 3) { // knowledge: single-keyword-formulaic-llm-output
    $('log').textContent = '# phrase too thin — add at least three words.'; return;
  }
  R = seedFrom(phrase);
  const modeKey = $('mode').value;
  const mode = MODES[modeKey];
  const bpm = Math.max(30, +$('bpm').value || 60);
  const bars = Math.max(1, +$('bars').value || 4);
  const jit = +$('jit').value / 100;
  const beat = 60/bpm;
  melody = [];
  let t = 0;
  // 4 beats per bar, 2 notes per beat average
  for(let b=0; b<bars*8; b++){
    if(R() < 0.15) { t += beat/2; continue; } // rest
    const step = mode.steps[Math.floor(R()*mode.steps.length)];
    const oct  = Math.floor(R()*3) - 1;
    const midi = mode.root + step + oct*12;
    const jitter = (R()-.5)*jit*beat;           // cache-variance-ttl-jitter
    const dur = (R()<.3? beat : beat/2) * (0.8 + R()*.5);
    melody.push({t: Math.max(0,t+jitter), midi, dur});
    t += beat/2;
  }
  // legend
  legend = [];
  const n = 4 + Math.floor(R()*4);
  const used = new Set();
  for(let i=0;i<n;i++){
    let ns = GLYPH_NS[Math.floor(R()*GLYPH_NS.length)];
    let cat = GLYPH_CAT[Math.floor(R()*GLYPH_CAT.length)];
    let name = `${ns}.${cat}`;
    let k = 1;
    while(used.has(name)){ name = `${ns}.${cat}-${++k}`; } // copy-naming-suffix-numbered
    used.add(name);
    // identifier-truncate-with-hash-suffix: cap at 24 chars
    if(name.length > 24){
      const h = hash32(name).toString(16).slice(0,4);
      name = name.slice(0,19) + '·' + h;
    }
    legend.push({ glyph: name, bearing: Math.floor(R()*360), depth: 40 + Math.floor(R()*860) });
  }
  // log text
  const initials = phrase.split(/\s+/).map(w=>w[0].toUpperCase()).join('').slice(0,3);
  const id = initials + '-' + hash32(phrase).toString(16).slice(0,5);
  const header = `log ${id} · ${bars} bars · ${bpm}bpm · ${modeKey}`;
  const body = legend.map(g=>`  ${g.glyph.padEnd(22,' ')} bearing ${String(g.bearing).padStart(3,' ')}° · ${g.depth}m`).join('\n');
  logText = header + '\n\n' + body + '\n\n# ' + truncBytes('seed: ' + phrase, 80);
  $('log').textContent = logText;
  $('legend').innerHTML = legend.map(g=>`<li><span>${g.glyph}</span><b>${g.bearing}° · ${g.depth}m</b></li>`).join('');
  drawRoll();
}

// byte-aware-sms-truncation-with-ellipsis
function truncBytes(s, max){
  const enc = new TextEncoder();
  if(enc.encode(s).length <= max) return s;
  let out = '';
  for(const ch of s){
    if(enc.encode(out + ch + '…').length > max) break;
    out += ch;
  }
  return out + '…';
}
function hash32(s){ let h=2166136261>>>0; for(const c of s){h^=c.charCodeAt(0); h=Math.imul(h,16777619)>>>0;} return h>>>0; }

// piano-roll canvas
const roll = $('roll'), rx = roll.getContext('2d');
const dpr = Math.max(1,devicePixelRatio||1);
function fitRoll(){ roll.width=roll.clientWidth*dpr; roll.height=roll.clientHeight*dpr; drawRoll(); }
addEventListener('resize', fitRoll); setTimeout(fitRoll,0);

function drawRoll(){
  const W=roll.width,H=roll.height;
  rx.fillStyle='#0a0d14'; rx.fillRect(0,0,W,H);
  if(!melody.length) return;
  const totalT = melody.reduce((m,n)=>Math.max(m,n.t+n.dur),0) || 1;
  const midis = melody.map(n=>n.midi);
  const lo = Math.min(...midis)-2, hi = Math.max(...midis)+2;
  const range = Math.max(1, hi-lo); // divide-by-zero-rate-guard
  const mode = MODES[$('mode').value];
  rx.strokeStyle='rgba(110,231,183,.08)'; rx.lineWidth=1;
  for(let i=0;i<=range;i++){
    const y = H - ((i/range)*H);
    rx.beginPath(); rx.moveTo(0,y); rx.lineTo(W,y); rx.stroke();
  }
  for(const n of melody){
    const x = (n.t/totalT)*W;
    const w = Math.max(3,(n.dur/totalT)*W - 2);
    const y = H - ((n.midi-lo)/range)*H - 5;
    rx.fillStyle = `hsla(${mode.hue}, 65%, 62%, .85)`;
    rx.fillRect(x, y, w, 5);
  }
}

// audio — burst-schedule melody
let ac=null, nodes=[], playhead=0;
function play(){
  stop();
  if(!melody.length) return;
  ac = new (window.AudioContext||window.webkitAudioContext)();
  const start = ac.currentTime + 0.05;
  const mode = MODES[$('mode').value];
  for(const n of melody){
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type='sine';
    o.frequency.setValueAtTime(440*Math.pow(2,(n.midi-69)/12), start+n.t);
    g.gain.setValueAtTime(0, start+n.t);
    g.gain.linearRampToValueAtTime(.12, start+n.t+0.03);
    g.gain.linearRampToValueAtTime(0.0, start+n.t+n.dur);
    o.connect(g).connect(ac.destination);
    o.start(start+n.t); o.stop(start+n.t+n.dur+0.1);
    nodes.push(o);
  }
}
function stop(){ if(ac){ try{ac.close();}catch(e){} ac=null; nodes=[]; } }

function exportLog(){
  const blob = new Blob([logText || '# empty log — forge first'],{type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download='cartographers-log.txt'; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 800);
}

$('forge').onclick = forge;
$('play').onclick = play;
$('stop').onclick = stop;
$('export').onclick = exportLog;
$('seed').addEventListener('keydown', e=>{ if(e.key==='Enter') forge(); });
addEventListener('keydown', e=>{
  if(document.activeElement === $('seed')) return;
  if(e.key==='p') play();
  if(e.key==='s') stop();
  if(e.key==='e') exportLog();
});

forge();