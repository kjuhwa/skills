(()=>{
const $=id=>document.getElementById(id);
const cvs=$('vis'),ctx=cvs.getContext('2d');
let ac=null,master=null,playing=false,t=0;
let sources=[];
const presets=JSON.parse(localStorage.getItem('glacier-presets')||'[]');
const MAX_PRESETS=8;

function fnv(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function truncName(n){const b=new TextEncoder().encode(n);if(b.length<=20)return n;return new TextDecoder().decode(b.slice(0,17))+'...';}
function shortId(n){const h=fnv(n).toString(16).slice(0,4);const base=n.slice(0,8);return `${base}-${h}`;}

function readState(){
  return {
    hue:+$('hue').value,tide:+$('tide').value,drone:+$('drone').value,
    foot:+$('foot').value,rumble:+$('rumble').value,jitter:+$('jitter').value,
    seed:$('seed').value,
  };
}

function updLabels(){
  const s=readState();
  $('hueV').textContent=s.hue;
  $('tideV').textContent=s.tide+'/16';
  $('droneV').textContent=s.drone+' Hz';
  $('footV').textContent=s.foot+'%';
  $('rumbleV').textContent=s.rumble+'%';
  $('jitterV').textContent=s.jitter+'%';
}
document.querySelectorAll('#tuners input').forEach(i=>i.oninput=()=>{updLabels();if(playing)rebuild();});
updLabels();

function log(msg,cls=''){
  const li=document.createElement('li');li.textContent=msg;if(cls)li.style.color=cls;
  $('evlog').prepend(li);
  const items=$('evlog').children;while(items.length>40)items[items.length-1].remove();
}

// FM whalesong drone — carrier + modulator, slow pitch glide, amplitude swell
function buildDrone(freq){
  const mod=ac.createOscillator(),modGain=ac.createGain(),car=ac.createOscillator(),amp=ac.createGain();
  mod.frequency.value=freq*.25;modGain.gain.value=freq*.6;
  mod.connect(modGain);modGain.connect(car.frequency);
  car.frequency.value=freq;
  amp.gain.value=0;
  amp.gain.setTargetAtTime(.12,ac.currentTime,3);
  const lfo=ac.createOscillator(),lfoG=ac.createGain();
  lfo.frequency.value=.11;lfoG.gain.value=.06;
  lfo.connect(lfoG);lfoG.connect(amp.gain);
  car.connect(amp);amp.connect(master);
  mod.start();car.start();lfo.start();
  return [mod,car,lfo];
}

// melody scheduled in bursts on AudioContext clock
function scheduleMelody(){
  const s=readState(),now=ac.currentTime;
  const notes=[];
  const seedVal=fnv(s.seed);let r=seedVal||1;
  function rnd(){r^=r<<13;r^=r>>>17;r^=r<<5;return ((r>>>0)/4294967296);}
  const scale=[0,2,3,5,7,8,10];
  const root=220+s.hue*.6;
  for(let i=0;i<s.tide;i++){
    const base=now+i*(.5+rnd()*.1);
    // ttl jitter — ±N% on note time
    const jit=(rnd()-.5)*(s.jitter/100)*.2;
    notes.push({t:base+jit,f:root*Math.pow(2,scale[Math.floor(rnd()*scale.length)]/12),g:.05+rnd()*.05});
  }
  notes.forEach(n=>{
    const o=ac.createOscillator(),g=ac.createGain();
    o.type='sine';o.frequency.value=n.f;
    g.gain.setValueAtTime(0,n.t);
    g.gain.linearRampToValueAtTime(n.g,n.t+.02);
    g.gain.exponentialRampToValueAtTime(.0001,n.t+.45);
    o.connect(g);g.connect(master);
    o.start(n.t);o.stop(n.t+.5);
    sources.push(o,g);
  });
  // bear footfall noise burst
  if(s.foot>0){
    const buf=ac.createBuffer(1,ac.sampleRate*.1,ac.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
    const src=ac.createBufferSource(),g=ac.createGain(),f=ac.createBiquadFilter();
    src.buffer=buf;f.type='lowpass';f.frequency.value=120;
    g.gain.value=s.foot/400;
    src.connect(f);f.connect(g);g.connect(master);
    src.start(now+.2);
    sources.push(src);
  }
  // volcano rumble — low FM burst
  if(s.rumble>5){
    const o=ac.createOscillator(),g=ac.createGain();
    o.frequency.value=45+s.rumble*.3;o.type='sawtooth';
    g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(s.rumble/800,now+.5);g.gain.exponentialRampToValueAtTime(.0001,now+2);
    o.connect(g);g.connect(master);o.start(now);o.stop(now+2.1);
    sources.push(o,g);
  }
}

let drones=[];
function start(){
  if(playing)return;
  ac=new (window.AudioContext||window.webkitAudioContext)();
  master=ac.createGain();master.gain.value=.5;
  const rev=ac.createDelay(2);rev.delayTime.value=.33;
  const rfb=ac.createGain();rfb.gain.value=.35;
  master.connect(rev);rev.connect(rfb);rfb.connect(rev);rfb.connect(ac.destination);
  master.connect(ac.destination);
  drones=buildDrone(readState().drone);
  playing=true;t=0;
  log('▶ playback started','var(--accent)');
  scheduleMelody();
  setInterval(()=>{if(playing)scheduleMelody();},3200);
  draw();
}
function stop(){
  if(!playing)return;playing=false;
  sources.forEach(s=>{try{s.stop&&s.stop();}catch(e){}});sources=[];
  drones.forEach(d=>{try{d.stop();}catch(e){}});drones=[];
  if(ac){ac.close();ac=null;}
  log('■ stopped');
}
function rebuild(){stop();start();}
$('play').onclick=start;$('stop').onclick=stop;

function draw(){
  if(!playing)return;
  t++;
  const s=readState();
  // fade
  ctx.fillStyle='rgba(10,15,31,.12)';ctx.fillRect(0,0,cvs.width,cvs.height);
  cvs.width=cvs.offsetWidth;cvs.height=cvs.offsetHeight;
  // aurora
  for(let r=0;r<3;r++){
    ctx.beginPath();
    for(let x=0;x<cvs.width;x+=6){
      const y=cvs.height*.3+r*26+Math.sin(x*.01+t*.02+r)*18+Math.sin(x*.023+t*.011)*9;
      if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.strokeStyle=`hsla(${s.hue+r*18},70%,60%,.45)`;
    ctx.lineWidth=12-r*3;ctx.stroke();
  }
  // tide pulses
  for(let i=0;i<s.tide;i++){
    const phase=(t*.015+i/s.tide)%1;
    const x=phase*cvs.width;
    ctx.fillStyle=`hsla(${s.hue},60%,70%,${1-phase})`;
    ctx.fillRect(x,cvs.height*.7,2,cvs.height*.15);
  }
  // drone band
  ctx.fillStyle=`hsla(${s.hue-20},50%,40%,.4)`;
  ctx.fillRect(0,cvs.height*.85,cvs.width*(s.drone/180),cvs.height*.15);
  requestAnimationFrame(draw);
}

// presets
function saveP(){
  const name=truncName($('pname').value.trim()||'untitled');
  if(presets.length>=MAX_PRESETS){presets.shift();log(`dropped oldest preset (cap ${MAX_PRESETS})`,'var(--ember)');}
  const entry={name,id:shortId(name+Date.now()),state:readState(),ts:Date.now()};
  presets.push(entry);
  localStorage.setItem('glacier-presets',JSON.stringify(presets));
  log(`saved preset ${entry.id}`,'var(--accent)');
  renderP();$('pname').value='';
}
function loadP(i){
  const p=presets[i];if(!p)return;
  Object.entries(p.state).forEach(([k,v])=>{if($(k))$(k).value=v;});
  updLabels();if(playing)rebuild();
  log(`loaded ${p.id}`);
}
function delP(i,e){
  e.stopPropagation();presets.splice(i,1);
  localStorage.setItem('glacier-presets',JSON.stringify(presets));renderP();
}
function renderP(){
  const ul=$('plist');ul.innerHTML='';
  presets.forEach((p,i)=>{
    const li=document.createElement('li');
    li.innerHTML=`<span>${p.name}</span><span class="del">×</span>`;
    li.onclick=()=>loadP(i);
    li.querySelector('.del').onclick=e=>delP(i,e);
    ul.appendChild(li);
  });
}
$('save').onclick=saveP;renderP();

// binary export — variable-length encoding of tuner values
function varint(n){
  const out=[];while(n>=0x80){out.push((n&0x7f)|0x80);n>>>=7;}out.push(n&0x7f);
  return out;
}
function exportBin(){
  const s=readState();
  const bytes=[];
  bytes.push(0xAA,0x01); // magic + version
  [s.hue,s.tide,s.drone,s.foot,s.rumble,s.jitter].forEach(v=>{varint(v).forEach(b=>bytes.push(b));});
  const seedEnc=new TextEncoder().encode(s.seed);
  varint(seedEnc.length).forEach(b=>bytes.push(b));
  seedEnc.forEach(b=>bytes.push(b));
  const hex=bytes.map(b=>b.toString(16).padStart(2,'0')).join(' ');
  $('binOut').textContent=`magic=0xAA v=1 size=${bytes.length}B\n${hex}`;
  log(`exported ${bytes.length}B soundscape`,'var(--ice)');
}
$('export').onclick=exportBin;

// keyboard
addEventListener('keydown',e=>{
  if(e.key===' '){e.preventDefault();playing?stop():start();}
  if(e.key==='e')exportBin();
});

log('composer ready — press ▶');
})();