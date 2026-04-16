const vColors = {v4:"#6ee7b7",v3:"#60a5fa",v2:"#f59e0b",v1:"#ef4444"};
const traffic = {v4:[30,35,42,50,58,64,70,74],v3:[45,42,38,32,28,24,20,18],v2:[20,18,15,13,10,9,7,6],v1:[5,5,5,5,4,3,3,2]};
const consumers = [
  {name:"Mobile iOS",ver:"v4",calls:"1.2M/day",migrated:"100%"},
  {name:"Mobile Android",ver:"v4",calls:"980K/day",migrated:"100%"},
  {name:"Web Dashboard",ver:"v3",calls:"540K/day",migrated:"72%"},
  {name:"Partner: Acme",ver:"v3",calls:"320K/day",migrated:"60%"},
  {name:"Partner: Globex",ver:"v2",calls:"85K/day",migrated:"30%"},
  {name:"Legacy Batch",ver:"v1",calls:"12K/day",migrated:"0%"},
];
function drawChart(){
  const c=document.getElementById("chart"),ctx=c.getContext("2d"),W=c.width,H=c.height;
  ctx.clearRect(0,0,W,H);
  const weeks=traffic.v4.length,mx=100,gx=50,gy=30,gw=W-gx-20,gh=H-gy-20;
  ctx.strokeStyle="#2a2d3a";ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const y=gy+gh-i*(gh/4);ctx.beginPath();ctx.moveTo(gx,y);ctx.lineTo(gx+gw,y);ctx.stroke();ctx.fillStyle="#64748b";ctx.font="11px sans-serif";ctx.fillText(i*25+"%",5,y+4)}
  for(const[key,data] of Object.entries(traffic)){
    ctx.beginPath();ctx.strokeStyle=vColors[key];ctx.lineWidth=2.5;
    data.forEach((v,i)=>{const x=gx+i*(gw/(weeks-1)),y=gy+gh-v*(gh/mx);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)});
    ctx.stroke();
    ctx.fillStyle=vColors[key];ctx.font="bold 11px sans-serif";
    const last=data[data.length-1];ctx.fillText(key,gx+gw+4,gy+gh-last*(gh/mx)+4);
  }
  ctx.fillStyle="#64748b";ctx.font="11px sans-serif";
  for(let i=0;i<weeks;i++){ctx.fillText("W"+(i+1),gx+i*(gw/(weeks-1))-6,H-4)}
}
function renderStats(){
  const latest=k=>traffic[k][traffic[k].length-1];
  const rows=[
    ["Current (v4)",latest("v4")+"%",""],["Previous (v3)",latest("v3")+"%",""],
    ["Deprecated (v2)",latest("v2")+"%","warn"],["Sunset (v1)",latest("v1")+"%","danger"],
    ["Migration velocity","+6%/wk",""],["Est. full migration","~8 weeks",""]
  ];
  document.getElementById("stats").innerHTML="<h3 style='color:#6ee7b7;margin-bottom:12px;font-size:.95rem'>Distribution</h3>"+rows.map(r=>`<div class="stat-row"><span class="stat-label">${r[0]}</span><span class="stat-val ${r[2]}">${r[1]}</span></div>`).join("");
}
function renderConsumers(){
  document.getElementById("consumers").innerHTML=`<table><tr><th>Consumer</th><th>Version</th><th>Traffic</th><th>Migrated</th></tr>${consumers.map(c=>`<tr><td>${c.name}</td><td><span class="pill ${c.ver}">${c.ver}</span></td><td>${c.calls}</td><td>${c.migrated}</td></tr>`).join("")}</table>`;
}
drawChart();renderStats();renderConsumers();