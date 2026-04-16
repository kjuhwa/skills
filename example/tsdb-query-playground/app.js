const canvas=document.getElementById('chart'),ctx=canvas.getContext('2d'),
  tooltip=document.getElementById('tooltip'),statsEl=document.getElementById('stats');
let W,H,data=[],hoverIdx=-1;

function resize(){const r=canvas.getBoundingClientRect();canvas.width=W=r.width*devicePixelRatio;canvas.height=H=r.height*devicePixelRatio;ctx.scale(devicePixelRatio,devicePixelRatio);draw()}
window.addEventListener('resize',resize);

function genData(q){
  const n=48,out=[];const now=Date.now();
  const isLatency=q.includes('latency')||q.includes('percentile');
  const isMem=q.includes('mem');
  for(let i=0;i<n;i++){
    const t=now-((n-i)*1800000);
    let v=isLatency?80+Math.random()*120+Math.sin(i/6)*40:isMem?55+Math.random()*25+Math.sin(i/8)*10:20+Math.random()*60+Math.sin(i/5)*15;
    out.push({t,v:Math.round(v*100)/100});
  }
  return out;
}

function parseQuery(q){
  const fn=(q.match(/SELECT\s+(\w+)/i)||[])[1]||'mean';
  const field=(q.match(/\((\w+)/)||[])[1]||'value';
  const interval=(q.match(/time\(([^)]+)\)/)||[])[1]||'30m';
  return{fn,field,interval};
}

function draw(){
  const cw=W/devicePixelRatio,ch=H/devicePixelRatio;
  ctx.clearRect(0,0,cw,ch);
  if(!data.length)return;
  const pad={t:20,r:20,b:40,l:55},pw=cw-pad.l-pad.r,ph=ch-pad.t-pad.b;
  const vals=data.map(d=>d.v),mn=Math.min(...vals)*0.9,mx=Math.max(...vals)*1.1;
  const x=i=>pad.l+(i/(data.length-1))*pw, y=v=>pad.t+(1-(v-mn)/(mx-mn))*ph;

  // grid
  ctx.strokeStyle='#2d333b';ctx.lineWidth=0.5;
  for(let i=0;i<5;i++){const gy=pad.t+ph*i/4;ctx.beginPath();ctx.moveTo(pad.l,gy);ctx.lineTo(cw-pad.r,gy);ctx.stroke();
    ctx.fillStyle='#484f58';ctx.font='10px monospace';ctx.textAlign='right';ctx.fillText((mx-(mx-mn)*i/4).toFixed(1),pad.l-8,gy+3)}

  // area
  ctx.beginPath();ctx.moveTo(x(0),y(data[0].v));
  for(let i=1;i<data.length;i++)ctx.lineTo(x(i),y(data[i].v));
  ctx.lineTo(x(data.length-1),ch-pad.b);ctx.lineTo(x(0),ch-pad.b);ctx.closePath();
  const grad=ctx.createLinearGradient(0,pad.t,0,ch-pad.b);grad.addColorStop(0,'#6ee7b733');grad.addColorStop(1,'#6ee7b700');
  ctx.fillStyle=grad;ctx.fill();

  // line
  ctx.beginPath();ctx.moveTo(x(0),y(data[0].v));
  for(let i=1;i<data.length;i++)ctx.lineTo(x(i),y(data[i].v));
  ctx.strokeStyle='#6ee7b7';ctx.lineWidth=2;ctx.stroke();

  // dots
  data.forEach((d,i)=>{ctx.beginPath();ctx.arc(x(i),y(d.v),i===hoverIdx?5:2,0,Math.PI*2);ctx.fillStyle=i===hoverIdx?'#fff':'#6ee7b7';ctx.fill()});

  // x labels
  ctx.fillStyle='#484f58';ctx.font='10px monospace';ctx.textAlign='center';
  for(let i=0;i<data.length;i+=Math.ceil(data.length/6)){
    const d=new Date(data[i].t);ctx.fillText(d.getHours()+':'+String(d.getMinutes()).padStart(2,'0'),x(i),ch-pad.b+18)}
}

function run(){
  const q=document.getElementById('query').value;
  const info=parseQuery(q);data=genData(q);
  const vals=data.map(d=>d.v);
  statsEl.innerHTML=`Series: <span>1</span> · Points: <span>${data.length}</span> · Fn: <span>${info.fn}</span><br>Min: <span>${Math.min(...vals).toFixed(1)}</span> · Max: <span>${Math.max(...vals).toFixed(1)}</span> · Avg: <span>${(vals.reduce((a,b)=>a+b)/vals.length).toFixed(1)}</span><br>Interval: <span>${info.interval}</span> · Exec: <span>${(Math.random()*15+2).toFixed(1)}ms</span>`;
  draw();
}

canvas.addEventListener('mousemove',e=>{
  const r=canvas.getBoundingClientRect(),mx=e.clientX-r.left;
  const pad=55,pw=r.width-pad-20;
  hoverIdx=Math.round(((mx-pad)/pw)*(data.length-1));
  if(hoverIdx<0||hoverIdx>=data.length){hoverIdx=-1;tooltip.style.display='none';draw();return}
  const d=data[hoverIdx],dt=new Date(d.t);
  tooltip.style.display='block';tooltip.style.left=e.clientX-r.left+12+'px';tooltip.style.top=e.clientY-r.top-30+'px';
  tooltip.textContent=`${dt.toLocaleTimeString()} → ${d.v}`;draw()});
canvas.addEventListener('mouseleave',()=>{hoverIdx=-1;tooltip.style.display='none';draw()});

document.getElementById('run').onclick=run;
document.getElementById('presets').onchange=e=>{if(e.target.value){document.getElementById('query').value=e.target.value;run()}};
resize();run();