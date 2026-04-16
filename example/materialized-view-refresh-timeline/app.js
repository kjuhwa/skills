const VIEWS=["mv_daily_sales","mv_user_segments","mv_top_products","mv_inventory_roll","mv_funnel_metrics","mv_revenue_geo"];
const COLORS={fresh:"#6ee7b7",stale:"#f0a868",refresh:"#7aa2f7",fail:"#f87171"};
const canvas=document.getElementById("timeline");
const ctx=canvas.getContext("2d");
const tooltip=document.getElementById("tooltip");
let events=[];
let selected=null;
let paused=false;
let now=Date.now();
const WINDOW=60_000;

function seed(){
  const start=now-WINDOW;
  VIEWS.forEach(v=>{
    let t=start;
    while(t<now){
      const dur=2000+Math.random()*4000;
      const status=Math.random()<0.85?"fresh":(Math.random()<0.5?"stale":"fail");
      events.push({view:v,start:t,end:t+dur,status});
      t+=dur+Math.random()*5000;
    }
  });
}

function renderList(){
  const ul=document.getElementById("viewList");
  ul.innerHTML=VIEWS.map(v=>{
    const last=[...events].reverse().find(e=>e.view===v);
    const status=last?last.status:"stale";
    return `<li data-v="${v}" class="${selected===v?'active':''}"><span><i class="dot ${status}"></i>${v}</span><small>${status}</small></li>`;
  }).join("");
  ul.querySelectorAll("li").forEach(li=>{
    li.onclick=()=>{selected=selected===li.dataset.v?null:li.dataset.v;renderList();draw();};
  });
}

function tick(){
  if(!paused){
    now=Date.now();
    VIEWS.forEach(v=>{
      const last=[...events].reverse().find(e=>e.view===v);
      if(!last||last.end<now-Math.random()*8000){
        const dur=1500+Math.random()*3500;
        const start=last?last.end+Math.random()*4000:now;
        if(start<now){
          const status=Math.random()<0.8?"fresh":(Math.random()<0.5?"stale":"fail");
          events.push({view:v,start,end:start+dur,status});
        }
      }
    });
    events=events.filter(e=>e.end>now-WINDOW);
  }
  draw();renderList();
  requestAnimationFrame(tick);
}

function draw(){
  const W=canvas.width=canvas.clientWidth;
  const H=canvas.height=canvas.clientHeight;
  ctx.clearRect(0,0,W,H);
  const rowH=H/VIEWS.length;
  const t0=now-WINDOW;
  ctx.strokeStyle="#2a2f3d";ctx.lineWidth=1;
  for(let i=0;i<=6;i++){const x=i*W/6;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();
    ctx.fillStyle="#7a8294";ctx.font="10px monospace";ctx.fillText(`-${60-i*10}s`,x+4,12);}
  VIEWS.forEach((v,i)=>{
    const y=i*rowH;
    ctx.fillStyle=selected===v?"rgba(110,231,183,.06)":"transparent";ctx.fillRect(0,y,W,rowH);
    ctx.fillStyle="#aab1c0";ctx.font="11px sans-serif";ctx.fillText(v,8,y+rowH/2+4);
    events.filter(e=>e.view===v).forEach(e=>{
      const x=(e.start-t0)/WINDOW*W;
      const w=Math.max(2,(e.end-e.start)/WINDOW*W);
      const isRefreshing=e.end>now;
      ctx.fillStyle=isRefreshing?COLORS.refresh:COLORS[e.status];
      ctx.fillRect(x,y+rowH*0.3,w,rowH*0.4);
      e._bbox={x,y:y+rowH*0.3,w,h:rowH*0.4};
    });
  });
  ctx.strokeStyle=COLORS.accent||"#6ee7b7";ctx.beginPath();ctx.moveTo(W-1,0);ctx.lineTo(W-1,H);ctx.stroke();
}

canvas.addEventListener("mousemove",e=>{
  const r=canvas.getBoundingClientRect();
  const x=(e.clientX-r.left)*(canvas.width/r.width);
  const y=(e.clientY-r.top)*(canvas.height/r.height);
  const hit=events.find(ev=>ev._bbox&&x>=ev._bbox.x&&x<=ev._bbox.x+ev._bbox.w&&y>=ev._bbox.y&&y<=ev._bbox.y+ev._bbox.h);
  if(hit){
    tooltip.hidden=false;
    tooltip.style.left=(e.clientX-r.left+12)+"px";
    tooltip.style.top=(e.clientY-r.top+12)+"px";
    tooltip.innerHTML=`<b>${hit.view}</b><br>status: ${hit.status}<br>duration: ${Math.round((hit.end-hit.start))}ms`;
  } else tooltip.hidden=true;
});
canvas.addEventListener("mouseleave",()=>tooltip.hidden=true);

document.getElementById("pause").onclick=function(){paused=!paused;this.textContent=paused?"Resume":"Pause";};
document.getElementById("refreshAll").onclick=()=>{
  VIEWS.forEach(v=>{const dur=1500+Math.random()*2500;events.push({view:v,start:now,end:now+dur,status:"fresh"});});
};

seed();renderList();tick();