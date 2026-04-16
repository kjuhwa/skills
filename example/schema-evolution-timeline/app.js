const data={
  "UserCreated":[
    {ver:1,date:"2024-01",changes:[{t:"add",f:"id, email"}]},
    {ver:2,date:"2024-04",changes:[{t:"add",f:"created_at"},{t:"mod",f:"email → nullable"}]},
    {ver:3,date:"2024-09",changes:[{t:"add",f:"role"},{t:"del",f:"legacy_name"}]}
  ],
  "OrderPlaced":[
    {ver:1,date:"2023-06",changes:[{t:"add",f:"order_id, user_id, total"}]},
    {ver:2,date:"2023-08",changes:[{t:"add",f:"items"}]},
    {ver:3,date:"2023-11",changes:[{t:"mod",f:"total → decimal"}]},
    {ver:4,date:"2024-02",changes:[{t:"add",f:"coupon_code"},{t:"del",f:"discount_pct"}]},
    {ver:5,date:"2024-05",changes:[{t:"add",f:"shipping_method"}]},
    {ver:6,date:"2024-08",changes:[{t:"mod",f:"items → nested record"}]},
    {ver:7,date:"2025-01",changes:[{t:"add",f:"metadata"}]}
  ],
  "PaymentProcessed":[
    {ver:1,date:"2024-03",changes:[{t:"add",f:"tx_id, amount, status"}]},
    {ver:2,date:"2024-10",changes:[{t:"add",f:"currency"},{t:"mod",f:"status → enum"}]}
  ]
};
const colors={add:"#6ee7b7",mod:"#f0c674",del:"#f87171"};
const sel=document.getElementById("subject"),canvas=document.getElementById("canvas"),ctx=canvas.getContext("2d"),tip=document.getElementById("tooltip");
let nodes=[];
Object.keys(data).forEach(k=>{const o=document.createElement("option");o.value=k;o.textContent=k;sel.appendChild(o)});
function draw(){
  const dpr=devicePixelRatio||1;canvas.width=canvas.clientWidth*dpr;canvas.height=canvas.clientHeight*dpr;ctx.scale(dpr,dpr);
  const w=canvas.clientWidth,h=canvas.clientHeight,items=data[sel.value];nodes=[];
  ctx.clearRect(0,0,w,h);
  const pad=60,gap=(w-pad*2)/(items.length-1||1);
  const y0=h/2;
  ctx.strokeStyle="#2a2d37";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(pad,y0);ctx.lineTo(w-pad,y0);ctx.stroke();
  items.forEach((v,i)=>{
    const x=pad+i*gap;
    ctx.fillStyle="#1a1d27";ctx.strokeStyle="#6ee7b7";ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(x,y0,18,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle="#6ee7b7";ctx.font="bold 13px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText("v"+v.ver,x,y0);
    ctx.fillStyle="#8b949e";ctx.font="11px sans-serif";ctx.fillText(v.date,x,y0+34);
    v.changes.forEach((c,ci)=>{
      const cy=y0-50-ci*16;
      ctx.fillStyle=colors[c.t];ctx.beginPath();ctx.arc(x,cy,4,0,Math.PI*2);ctx.fill();
    });
    nodes.push({x,y:y0,r:18,v});
  });
}
canvas.addEventListener("mousemove",e=>{
  const r=canvas.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
  const hit=nodes.find(n=>Math.hypot(mx-n.x,my-n.y)<n.r);
  if(hit){
    tip.style.display="block";tip.style.left=e.clientX+12+"px";tip.style.top=e.clientY-10+"px";
    tip.innerHTML=`<b>v${hit.v.ver}</b> — ${hit.v.date}<br>`+hit.v.changes.map(c=>`<span style="color:${colors[c.t]}">${c.t.toUpperCase()}</span> ${c.f}`).join("<br>");
  }else tip.style.display="none";
});
sel.addEventListener("change",draw);
window.addEventListener("resize",draw);
draw();