const KEYS = Array.from({length:5000}, (_,i)=>'req-'+i);
let vnodes = 1, servers = 5;
const history = [];
const HMAX = 60;

function h32(s){
  let h=2166136261>>>0;
  for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h,16777619); }
  return h>>>0;
}

function buildRing(n,v){
  const ring = [];
  for(let i=0;i<n;i++){
    for(let j=0;j<v;j++) ring.push({pos:h32('srv-'+i+'#'+j), srv:i});
  }
  ring.sort((a,b)=>a.pos-b.pos);
  return ring;
}

function distribute(){
  const ring = buildRing(servers, vnodes);
  const counts = new Array(servers).fill(0);
  for(const k of KEYS){
    const p = h32(k);
    let lo=0, hi=ring.length-1, idx=0;
    while(lo<=hi){
      const m=(lo+hi)>>1;
      if(ring[m].pos>=p){ idx=m; hi=m-1; } else lo=m+1;
    }
    if(lo>=ring.length) idx=0;
    counts[ring[idx].srv]++;
  }
  return counts;
}

function stats(arr){
  const mean = arr.reduce((a,b)=>a+b,0)/arr.length;
  const variance = arr.reduce((s,x)=>s+(x-mean)**2,0)/arr.length;
  const sd = Math.sqrt(variance);
  return {mean, sd, min:Math.min(...arr), max:Math.max(...arr)};
}

function renderBars(counts){
  const svg = document.getElementById('bars');
  const max = Math.max(...counts,1);
  const W = 600, H = 240, pad=18;
  const bw = (W - pad*2) / counts.length - 6;
  let html = '';
  counts.forEach((c,i)=>{
    const x = pad + i*((W-pad*2)/counts.length);
    const h = (c/max)*(H-40);
    html += `<g class="bar"><rect x="${x}" y="${H-h-20}" width="${bw}" height="${h}" fill="#6ee7b7" rx="4"/>
      <text x="${x+bw/2}" y="${H-6}" text-anchor="middle">srv-${i}</text>
      <text x="${x+bw/2}" y="${H-h-26}" text-anchor="middle" fill="#7c8499">${c}</text></g>`;
  });
  svg.innerHTML = html;
}

function renderLine(){
  const svg = document.getElementById('line');
  const W=600, H=200, pad=20;
  const max = Math.max(...history, 1);
  let d = '';
  history.forEach((v,i)=>{
    const x = pad + (i/(HMAX-1))*(W-pad*2);
    const y = H-pad - (v/max)*(H-pad*2);
    d += (i===0?'M':'L')+x+','+y+' ';
  });
  svg.innerHTML = `
    <line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="#2a2f3d"/>
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}" stroke="#2a2f3d"/>
    <path d="${d}" fill="none" stroke="#6ee7b7" stroke-width="2"/>
    <text x="${W-pad}" y="${pad-4}" text-anchor="end">peak σ ${max.toFixed(1)}</text>`;
}

function tick(){
  const counts = distribute();
  const s = stats(counts);
  document.getElementById('sd').textContent = s.sd.toFixed(1);
  document.getElementById('mn').textContent = s.min;
  document.getElementById('mx').textContent = s.max;
  document.getElementById('sp').textContent = (s.max - s.min);
  renderBars(counts);
  history.push(s.sd);
  if(history.length>HMAX) history.shift();
  renderLine();
}

document.getElementById('vn').oninput = e=>{
  vnodes = +e.target.value;
  document.getElementById('vL').textContent = vnodes;
  tick();
};
document.getElementById('sv').oninput = e=>{
  servers = +e.target.value;
  document.getElementById('sL').textContent = servers;
  tick();
};

tick();
setInterval(()=>{ // gentle pulse so the line keeps moving
  history.push(history[history.length-1] || 0);
  if(history.length>HMAX) history.shift();
  renderLine();
}, 1500);