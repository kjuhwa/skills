const canvas=document.getElementById("canvas"),ctx=canvas.getContext("2d");
const badge=document.getElementById("badge"),failEl=document.getElementById("failCount");
const coolEl=document.getElementById("cooldown"),logEl=document.getElementById("log");
let state="closed",fails=0,threshold=5,cooldown=0,timer=null,particles=[];
const colors={closed:"#6ee7b7",open:"#f87171","half-open":"#fbbf24"};

function log(msg,cls){logEl.innerHTML=`<div><span class="${cls}">[${new Date().toLocaleTimeString()}]</span> ${msg}</div>`+logEl.innerHTML}

function updateUI(){
  badge.textContent=state.toUpperCase().replace("-"," ");
  badge.style.color=colors[state];
  failEl.textContent=`${fails} / ${threshold}`;
  coolEl.textContent=state==="open"?cooldown+"s":"—";
}

function send(fail){
  if(state==="open"){log("REJECTED — circuit is OPEN","err");return}
  const success=!fail&&(state==="half-open"?Math.random()>0.5:true);
  particles.push({x:80,y:110,dx:3,ok:success&&!fail,t:0});
  if(success&&!fail){
    log("Request succeeded","ok");
    if(state==="half-open"){state="closed";fails=0;log("State → CLOSED","ok");clearInterval(timer);timer=null}
  }else{
    fails++;log("Request FAILED","err");
    if(fails>=threshold&&state!=="open"){
      state="open";cooldown=10;log("State → OPEN (cooldown 10s)","err");
      timer=setInterval(()=>{cooldown--;updateUI();if(cooldown<=0){state="half-open";fails=0;log("State → HALF-OPEN","warn");clearInterval(timer);timer=null;updateUI()}},1000);
    }
  }
  updateUI();
}

function reset(){state="closed";fails=0;cooldown=0;particles=[];if(timer)clearInterval(timer);timer=null;logEl.innerHTML="";updateUI();log("Circuit reset","ok")}
document.getElementById("btnReq").onclick=()=>send(false);
document.getElementById("btnFail").onclick=()=>send(true);
document.getElementById("btnReset").onclick=reset;

function drawNode(x,y,label,c){ctx.beginPath();ctx.arc(x,y,28,0,Math.PI*2);ctx.fillStyle="#1a1d27";ctx.fill();ctx.lineWidth=3;ctx.strokeStyle=c;ctx.stroke();ctx.fillStyle=c;ctx.font="bold 11px system-ui";ctx.textAlign="center";ctx.fillText(label,x,y+4)}

function draw(){
  ctx.clearRect(0,0,520,220);
  ctx.strokeStyle="#2a2d37";ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(120,110);ctx.lineTo(260,110);ctx.stroke();
  ctx.beginPath();ctx.moveTo(300,110);ctx.lineTo(400,60);ctx.stroke();
  ctx.beginPath();ctx.moveTo(300,110);ctx.lineTo(400,160);ctx.stroke();
  const a=state==="closed";const b=state==="open";const c=state==="half-open";
  drawNode(80,110,"CLIENT","#94a3b8");
  drawNode(280,110,"CB",colors[state]);
  drawNode(430,60,"OK","#6ee7b7");
  drawNode(430,160,"FAIL","#f87171");
  particles=particles.filter(p=>{p.x+=p.dx;p.t++;ctx.beginPath();ctx.arc(p.x,p.y+(p.x>280?(p.ok?-((p.x-280)/120)*50:((p.x-280)/120)*50):0),5,0,Math.PI*2);ctx.fillStyle=p.ok?"#6ee7b7":"#f87171";ctx.fill();return p.t<80});
  requestAnimationFrame(draw);
}
draw();updateUI();