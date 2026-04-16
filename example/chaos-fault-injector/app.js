const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
let W,H,nodes=[],edges=[],animFrame;
const NAMES=['API Gateway','Auth','Users','Orders','Payments','Inventory','Notifications','Cache','DB Primary','DB Replica','CDN','Search'];
const COLORS={healthy:'#6ee7b7',degraded:'#fbbf24',down:'#ef4444'};

function resize(){W=canvas.clientWidth;H=Math.min(520,W*0.6);canvas.width=W*devicePixelRatio;canvas.height=H*devicePixelRatio;canvas.style.height=H+'px';ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)}

function init(){
  nodes=NAMES.map((name,i)=>{
    const angle=(i/NAMES.length)*Math.PI*2-Math.PI/2;
    const rx=W*0.34,ry=H*0.36;
    return{id:i,name,x:W/2+Math.cos(angle)*rx,y:H/2+Math.sin(angle)*ry,r:22,state:'healthy',timer:0};
  });
  edges=[];
  [[0,1],[0,2],[0,3],[1,2],[2,8],[3,4],[3,5],[3,6],[4,8],[5,8],[5,9],[6,7],[7,9],[8,9],[2,11],[11,7],[6,10]].forEach(([a,b])=>edges.push({from:a,to:b}));
  updateStats();
}

function neighbors(id){return edges.filter(e=>e.from===id||e.to===id).map(e=>e.from===id?e.to:e.from)}

function inject(id){
  const n=nodes[id];
  if(n.state==='down')return;
  n.state='down';n.timer=0;
  setTimeout(()=>{
    neighbors(id).forEach(nid=>{
      const nb=nodes[nid];
      if(nb.state==='healthy'&&Math.random()<0.6){nb.state='degraded';nb.timer=0}
      else if(nb.state==='degraded'&&Math.random()<0.4){nb.state='down';nb.timer=0;
        setTimeout(()=>neighbors(nid).forEach(nid2=>{if(nodes[nid2].state==='healthy'&&Math.random()<0.3){nodes[nid2].state='degraded';nodes[nid2].timer=0;updateStats()}}),600);
      }
      updateStats();
    });
  },300);
  updateStats();
}

function updateStats(){
  const h=nodes.filter(n=>n.state==='healthy').length;
  const d=nodes.filter(n=>n.state==='degraded').length;
  const f=nodes.filter(n=>n.state==='down').length;
  document.getElementById('hCount').textContent=h;
  document.getElementById('dCount').textContent=d;
  document.getElementById('fCount').textContent=f;
}

function draw(){
  ctx.clearRect(0,0,W,H);
  edges.forEach(e=>{
    const a=nodes[e.from],b=nodes[e.to];
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
    ctx.strokeStyle=(a.state==='down'||b.state==='down')?'#ef444444':'#334155';ctx.lineWidth=1.5;ctx.stroke();
  });
  const t=Date.now()/1000;
  nodes.forEach(n=>{
    n.timer+=0.016;
    const pulse=n.state==='down'?Math.sin(t*4)*3:0;
    ctx.beginPath();ctx.arc(n.x,n.y,n.r+pulse,0,Math.PI*2);
    ctx.fillStyle=COLORS[n.state]+'22';ctx.fill();
    ctx.strokeStyle=COLORS[n.state];ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=COLORS[n.state];ctx.font='bold 10px system-ui';ctx.textAlign='center';
    ctx.fillText(n.name,n.x,n.y+n.r+14);
    ctx.fillStyle='#fff';ctx.font='13px system-ui';ctx.fillText(n.state==='down'?'✕':n.state==='degraded'?'⚠':'✓',n.x,n.y+4);
  });
  animFrame=requestAnimationFrame(draw);
}

canvas.addEventListener('click',e=>{
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left,my=e.clientY-rect.top;
  nodes.forEach(n=>{if(Math.hypot(mx-n.x,my-n.y)<n.r+5)inject(n.id)});
});

document.getElementById('btnReset').onclick=()=>{nodes.forEach(n=>{n.state='healthy';n.timer=0});updateStats()};
window.addEventListener('resize',()=>{resize();init()});
resize();init();draw();