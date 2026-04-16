const colors=['#6ee7b7','#60a5fa','#f472b6','#fbbf24','#a78bfa'];
const configs=[{size:64,hashes:2},{size:64,hashes:4},{size:128,hashes:3},{size:256,hashes:3},{size:256,hashes:5}];
function hash(s,seed,m){let h=seed;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return((h%m)+m)%m}
function rndStr(n){let s='';for(let i=0;i<n;i++)s+=String.fromCharCode(97+Math.random()*26|0);return s}
function run(){const nItems=+document.getElementById('nItems').value,nLookups=+document.getElementById('nLookups').value;
const inserted=new Set();while(inserted.size<nItems)inserted.add(rndStr(6));
const results=configs.map(cfg=>{const bits=new Uint8Array(cfg.size);
inserted.forEach(w=>{for(let h=0;h<cfg.hashes;h++)bits[hash(w,h*31+7,cfg.size)]=1});
let fp=0;for(let i=0;i<nLookups;i++){const w=rndStr(7);if(!inserted.has(w)){const found=Array.from({length:cfg.hashes},(_,h)=>hash(w,h*31+7,cfg.size)).every(idx=>bits[idx]);if(found)fp++}}
return fp/nLookups});draw(results)}
function draw(rates){const canvas=document.getElementById('chart'),ctx=canvas.getContext('2d');
const dpr=devicePixelRatio||1,w=canvas.clientWidth,h=260;canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);
ctx.clearRect(0,0,w,h);const pad=50,bw=(w-pad*2)/configs.length/1.5,gap=((w-pad*2)-bw*configs.length)/(configs.length+1);
const maxR=Math.max(...rates,0.01);
rates.forEach((r,i)=>{const x=pad+gap*(i+1)+bw*i,bh=(r/maxR)*(h-pad*2),y=h-pad-bh;
ctx.fillStyle=colors[i];ctx.beginPath();ctx.roundRect(x,y,bw,bh,4);ctx.fill();
ctx.fillStyle='#e2e8f0';ctx.font='12px monospace';ctx.textAlign='center';ctx.fillText((r*100).toFixed(1)+'%',x+bw/2,y-8)});
ctx.strokeStyle='#2d3348';ctx.beginPath();ctx.moveTo(pad,h-pad);ctx.lineTo(w-pad,h-pad);ctx.stroke();
const leg=document.getElementById('legend');leg.innerHTML=configs.map((c,i)=>`<span><i style="background:${colors[i]}"></i>size=${c.size} h=${c.hashes}</span>`).join('')}
document.getElementById('nItems').oninput=e=>document.getElementById('nVal').textContent=e.target.value;
document.getElementById('nLookups').oninput=e=>document.getElementById('lVal').textContent=e.target.value;
document.getElementById('runBtn').onclick=run;run();