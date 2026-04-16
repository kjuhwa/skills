const data={
  "User":[
    {v:1,date:"2024-01",fields:3,change:"Initial schema"},
    {v:2,date:"2024-04",fields:4,change:"Added roles array"},
    {v:3,date:"2024-09",fields:5,change:"Added created_at timestamp"}],
  "Order":[
    {v:1,date:"2023-06",fields:3,change:"Initial schema"},
    {v:2,date:"2023-08",fields:4,change:"Added currency field"},
    {v:3,date:"2023-11",fields:5,change:"Added items array"},
    {v:4,date:"2024-01",fields:5,change:"Made total required"},
    {v:5,date:"2024-03",fields:6,change:"Added status enum"},
    {v:6,date:"2024-07",fields:6,change:"Deprecated old_total"},
    {v:7,date:"2024-12",fields:6,change:"Removed old_total"}],
  "Payment":[
    {v:1,date:"2024-02",fields:2,change:"Initial schema"},
    {v:2,date:"2024-05",fields:3,change:"Added method enum"},
    {v:3,date:"2024-08",fields:4,change:"Added processed flag"},
    {v:4,date:"2024-11",fields:4,change:"Widened amount to double"}]
};
const pick=document.getElementById("schemaPick"),canvas=document.getElementById("canvas"),ctx=canvas.getContext("2d"),tip=document.getElementById("tooltip");
let nodes=[],current="User";
Object.keys(data).forEach(k=>{const o=document.createElement("option");o.value=k;o.textContent=k;pick.appendChild(o)});
pick.onchange=()=>{current=pick.value;draw()};
function resize(){canvas.width=canvas.clientWidth*devicePixelRatio;canvas.height=canvas.clientHeight*devicePixelRatio;ctx.scale(devicePixelRatio,devicePixelRatio);draw()}
window.addEventListener("resize",resize);setTimeout(resize,0);
function draw(){
  const w=canvas.clientWidth,h=canvas.clientHeight,entries=data[current];nodes=[];
  ctx.clearRect(0,0,w,h);
  const padX=60,padY=50,stepX=(w-padX*2)/(entries.length-1||1);
  // draw line
  ctx.strokeStyle="#2a2d37";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(padX,h/2);ctx.lineTo(w-padX,h/2);ctx.stroke();
  entries.forEach((e,i)=>{
    const x=padX+i*stepX,y=h/2,r=8+e.fields*2;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle="#6ee7b733";ctx.fill();ctx.strokeStyle="#6ee7b7";ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle="#6ee7b7";ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#c9d1d9";ctx.font="12px Segoe UI";ctx.textAlign="center";ctx.fillText("v"+e.v,x,y-r-10);
    ctx.fillStyle="#666";ctx.font="11px Segoe UI";ctx.fillText(e.date,x,y+r+18);
    nodes.push({x,y,r:Math.max(r,14),e});
  });
}
canvas.addEventListener("mousemove",ev=>{
  const rect=canvas.getBoundingClientRect(),mx=ev.clientX-rect.left,my=ev.clientY-rect.top;
  const hit=nodes.find(n=>Math.hypot(n.x-mx,n.y-my)<n.r);
  if(hit){tip.style.display="block";tip.style.left=ev.clientX+12+"px";tip.style.top=ev.clientY-10+"px";
    tip.innerHTML=`<b>v${hit.e.v}</b> — ${hit.e.date}<br>${hit.e.fields} fields<br>${hit.e.change}`}
  else tip.style.display="none";
});