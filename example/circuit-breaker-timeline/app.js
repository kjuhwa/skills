const canvas=document.getElementById("canvas"),ctx=canvas.getContext("2d");
const W=canvas.width=Math.min(800,window.innerWidth-48),H=canvas.height=320;
const infoEl=document.getElementById("info");
let playing=true,speed=1,elapsed=0;
const speeds=[1,2,4];let si=0;
const colors={closed:"#6ee7b7",open:"#f87171","half-open":"#fbbf24"};
let state="closed",fails=0,threshold=4,coolTimer=0;
const history=[];const requests=[];

document.getElementById("btnPlay").onclick=function(){playing=!playing;this.textContent=playing?"⏸ Pause":"▶ Play"};
document.getElementById("btnSpeed").onclick=function(){si=(si+1)%speeds.length;speed=speeds[si];this.textContent=speed+"×"};

function simulate(){
  for(let s=0;s<speed;s++){
    elapsed++;
    if(state==="open"){coolTimer--;if(coolTimer<=0){state="half-open";fails=0}}
    else{
      if(Math.random()<0.3){
        const ok=state==="half-open"?Math.random()>0.55:Math.random()>0.25;
        requests.push({t:elapsed,ok});
        if(!ok){fails++;if(fails>=threshold){state="open";coolTimer=12+Math.floor(Math.random()*8)}}
        else if(state==="half-open"){state="closed";fails=0}
      }
    }
    history.push({t:elapsed,state});
  }
}

function draw(){
  if(playing)simulate();
  ctx.clearRect(0,0,W,H);
  const margin={l:50,r:20,t:30,b:40};
  const gw=W-margin.l-margin.r,gh=H-margin.t-margin.b;
  const visible=Math.min(history.length,200);
  const start=Math.max(0,history.length-visible);
  // grid
  ctx.strokeStyle="#2a2d37";ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const y=margin.t+gh*i/4;ctx.beginPath();ctx.moveTo(margin.l,y);ctx.lineTo(margin.l+gw,y);ctx.stroke()}
  // state bands
  const stateY={closed:margin.t+gh*0.15,"half-open":margin.t+gh*0.5,open:margin.t+gh*0.85};
  ctx.font="10px system-ui";ctx.textAlign="right";
  Object.entries(stateY).forEach(([s,y])=>{ctx.fillStyle=colors[s];ctx.fillText(s.toUpperCase(),margin.l-6,y+4)});
  // timeline
  if(visible>1){
    ctx.lineWidth=2;ctx.beginPath();
    for(let i=0;i<visible;i++){
      const d=history[start+i];
      const x=margin.l+(i/(visible-1))*gw;
      const y=stateY[d.state];
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      ctx.strokeStyle=colors[d.state];ctx.stroke();ctx.beginPath();ctx.moveTo(x,y);
    }
  }
  // request dots
  const tStart=history.length>0?history[start].t:0;
  const tEnd=history.length>0?history[history.length-1].t:1;
  const tRange=tEnd-tStart||1;
  requests.forEach(r=>{
    if(r.t<tStart)return;
    const x=margin.l+((r.t-tStart)/tRange)*gw;
    const y=r.ok?margin.t+gh*0.15:margin.t+gh*0.85;
    ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle=r.ok?"#6ee7b744":"#f8717144";ctx.fill();
  });
  // time axis
  ctx.fillStyle="#64748b";ctx.font="10px system-ui";ctx.textAlign="center";
  for(let i=0;i<=5;i++){
    const t=tStart+Math.round(tRange*i/5);
    const x=margin.l+(i/5)*gw;
    ctx.fillText(t+"s",x,H-margin.b+20);
  }
  infoEl.textContent=`Elapsed: ${elapsed}s | State: ${state.toUpperCase()}`;
  requestAnimationFrame(draw);
}
draw();