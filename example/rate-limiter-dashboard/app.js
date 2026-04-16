const endpoints=[
  {id:'card-users',limit:100,data:[],blocked:0,total:0},
  {id:'card-orders',limit:60,data:[],blocked:0,total:0},
  {id:'card-search',limit:30,data:[],blocked:0,total:0},
  {id:'card-upload',limit:10,data:[],blocked:0,total:0}
];

function drawSparkline(canvas,data,limit){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  if(data.length<2)return;
  const max=Math.max(limit*1.3,...data);
  ctx.strokeStyle='rgba(110,231,183,0.15)';ctx.setLineDash([4,4]);
  const ly=h-(limit/max)*h;
  ctx.beginPath();ctx.moveTo(0,ly);ctx.lineTo(w,ly);ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();
  data.forEach((v,i)=>{
    const x=(i/(data.length-1))*w,y=h-(v/max)*h;
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.strokeStyle='#6ee7b7';ctx.lineWidth=2;ctx.stroke();
  data.forEach((v,i)=>{
    if(v>limit){
      const x=(i/(data.length-1))*w,y=h-(v/max)*h;
      ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle='#f87171';ctx.fill();
    }
  });
}

function tick(){
  endpoints.forEach(ep=>{
    const load=Math.floor(Math.random()*ep.limit*1.6);
    ep.data.push(load);
    if(ep.data.length>40)ep.data.shift();
    ep.total++;
    if(load>ep.limit)ep.blocked++;
    const card=document.getElementById(ep.id);
    const canvas=card.querySelector('canvas');
    drawSparkline(canvas,ep.data,ep.limit);
    const pct=ep.total?((ep.blocked/ep.total)*100).toFixed(1):'0';
    card.querySelector('.stats').innerHTML=`<span>Reqs: ${ep.total}</span><span class="red">Blocked: ${ep.blocked}</span><span class="green">Pass: ${100-pct}%</span>`;
  });
}

setInterval(tick,700);
tick();