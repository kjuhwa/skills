```js
const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
let events=[],drawing=false,current=null;

function resize(){canvas.width=canvas.clientWidth;canvas.height=400;reproject()}
window.onresize=resize;

function reproject(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  events.forEach(e=>{
    if(e.type!=='stroke')return;
    ctx.beginPath();ctx.strokeStyle=e.color;ctx.lineWidth=e.size;ctx.lineCap='round';ctx.lineJoin='round';
    e.pts.forEach((p,i)=>i===0?ctx.moveTo(p[0],p[1]):ctx.lineTo(p[0],p[1]));
    ctx.stroke();
  });
}

function pos(e){const r=canvas.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}

canvas.onmousedown=e=>{drawing=true;current={type:'stroke',color:document.getElementById('color').value,size:+document.getElementById('size').value,pts:[pos(e)],ts:Date.now()}};
canvas.onmousemove=e=>{if(!drawing)return;current.pts.push(pos(e));ctx.beginPath();ctx.strokeStyle=current.color;ctx.lineWidth=current.size;ctx.lineCap='round';const p=current.pts;ctx.moveTo(p[p.length-2][0],p[p.length-2][1]);ctx.lineTo(p[p.length-1][0],p[p.length-1][1]);ctx.stroke()};
canvas.onmouseup=()=>{if(!drawing)return;drawing=false;if(current&&current.pts.length>1)events.push(current);current=null;updateCount()};
canvas.onmouseleave=canvas.onmouseup;

function updateCount(){document.getElementById('evtCount').textContent=events.length+' events'}

document.getElementById('btnUndo').onclick=()=>{events.pop();reproject();updateCount()};
document.getElementById('btnClear').onclick=()=>{events=[];reproject();updateCount()};
document.getElementById('btnReplay').onclick=()=>{
  const saved=[...events];ctx.clearRect(0,0,canvas.width,canvas.height);
  let i=0;
  const iv=setInterval(()=>{
    if(i>=saved.length){clearInterval(iv);return}
    const e=saved[i++];
    ctx.beginPath();ctx.strokeStyle=e.color;ctx.lineWidth=e.size;ctx.lineCap='round';ctx.lineJoin='round';
    e.pts.forEach((p,j)=>j===0?ctx.moveTo(p[0],p[1]):ctx.lineTo(p[0],p[1]));
    ctx.stroke();
    updateCount();
  },120);
};

// seed demo strokes
function seedDemo(){
  const colors=['#6ee7b7','#f97316','#818cf8','#fb7185'];
  for(let s=0;s<4;s++){
    const pts=[],cx=150+s*150,cy=200;
    for(let a=0;a<Math.PI*2;a+=.2)pts.push([cx+Math.cos(a)*(30+s*10),cy+Math.sin(a)*(30+s*10)]);
    events.push({type:'stroke',color:colors[s],size:2+s,pts,ts:Date.now()-4000+s*1000});
  }
}
seedDemo();resize();
```