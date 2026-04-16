const canvas=document.getElementById('chart'),ctx=canvas.getContext('2d');
const colors=['#6ee7b7','#f472b6','#60a5fa'];
const series=[{name:'CPU %',data:[],color:colors[0]},{name:'Memory %',data:[],color:colors[1]},{name:'Disk IO',data:[],color:colors[2]}];
const maxPoints=80;let totalPoints=0,ingestRate=0,lastCount=0;

function resize(){canvas.width=canvas.clientWidth*devicePixelRatio;canvas.height=canvas.clientHeight*devicePixelRatio;ctx.scale(devicePixelRatio,devicePixelRatio)}
resize();window.onresize=resize;

function addPoint(){
  series[0].data.push(40+Math.sin(Date.now()/2000)*20+Math.random()*10);
  series[1].data.push(55+Math.cos(Date.now()/3000)*15+Math.random()*8);
  series[2].data.push(20+Math.sin(Date.now()/1500)*18+Math.random()*12);
  series.forEach(s=>{if(s.data.length>maxPoints)s.data.shift()});
  totalPoints+=3;
}

function draw(){
  const w=canvas.clientWidth,h=canvas.clientHeight;
  ctx.clearRect(0,0,w,h);
  for(let i=1;i<5;i++){ctx.strokeStyle='#ffffff08';ctx.beginPath();ctx.moveTo(0,h*i/5);ctx.lineTo(w,h*i/5);ctx.stroke()}
  series.forEach(s=>{
    if(s.data.length<2)return;
    ctx.beginPath();ctx.strokeStyle=s.color;ctx.lineWidth=2;ctx.lineJoin='round';
    const step=w/(maxPoints-1);
    s.data.forEach((v,i)=>{const x=i*step,y=h-v/100*h;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)});
    ctx.stroke();
    ctx.lineTo((s.data.length-1)*step,h);ctx.lineTo(0,h);ctx.closePath();
    ctx.fillStyle=s.color+'15';ctx.fill();
  });
}

function updateStats(){
  ingestRate=totalPoints-lastCount;lastCount=totalPoints;
  const avg=v=>v.length?(v.reduce((a,b)=>a+b)/v.length).toFixed(1):0;
  document.getElementById('stats').innerHTML=
    [{lbl:'Total Points',val:totalPoints.toLocaleString()},{lbl:'Ingest/sec',val:ingestRate},{lbl:'Avg CPU',val:avg(series[0].data)+'%'},{lbl:'Avg Mem',val:avg(series[1].data)+'%'}]
    .map(s=>`<div class="stat-card"><div class="val">${s.val}</div><div class="lbl">${s.lbl}</div></div>`).join('');
}

const leg=document.getElementById('legend');
series.forEach(s=>{const sp=document.createElement('span');sp.textContent=s.name;sp.style.cssText=`--c:${s.color}`;sp.setAttribute('style',`color:${s.color}`);sp.innerHTML=`<span style="width:10px;height:10px;border-radius:50%;background:${s.color};display:inline-block"></span>${s.name}`;leg.appendChild(sp)});

setInterval(()=>{addPoint();addPoint();addPoint()},200);
setInterval(updateStats,1000);
(function loop(){draw();requestAnimationFrame(loop)})();