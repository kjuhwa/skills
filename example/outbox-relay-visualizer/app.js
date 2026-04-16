const svg=document.getElementById('viz'),NS='http://www.w3.org/2000/svg';
const speedEl=document.getElementById('speed'),failEl=document.getElementById('failRate');
let msgId=0;

const nodes=[
  {id:'svc',x:120,y:250,label:'Service',r:45},
  {id:'db',x:330,y:250,label:'DB + Outbox',r:50},
  {id:'relay',x:540,y:250,label:'Relay',r:40},
  {id:'broker',x:750,y:250,label:'Broker',r:45}
];

const edges=[{from:'svc',to:'db'},{from:'db',to:'relay'},{from:'relay',to:'broker'}];

function el(tag,attrs){
  const e=document.createElementNS(NS,tag);
  Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;
}

// Draw edges
edges.forEach(e=>{
  const a=nodes.find(n=>n.id===e.from),b=nodes.find(n=>n.id===e.to);
  svg.appendChild(el('line',{x1:a.x+a.r,y1:a.y,x2:b.x-b.r,y2:b.y,stroke:'#2a2d37','stroke-width':2}));
});

// Draw nodes
nodes.forEach(n=>{
  svg.appendChild(el('circle',{cx:n.x,cy:n.y,r:n.r,fill:'#1a1d27',stroke:'#6ee7b7','stroke-width':1.5}));
  const t=el('text',{x:n.x,y:n.y+4,fill:'#6ee7b7','text-anchor':'middle','font-size':'12','font-family':'system-ui'});
  t.textContent=n.label;svg.appendChild(t);
});

// Counters
const counterG=el('g',{});svg.appendChild(counterG);
let counts={success:0,fail:0,inflight:0};
function drawCounters(){
  counterG.innerHTML='';
  const items=[`Success: ${counts.success}`,`Failed: ${counts.fail}`,`In-flight: ${counts.inflight}`];
  items.forEach((txt,i)=>{
    const t=el('text',{x:30,y:30+i*18,fill:i===1?'#f87171':'#6ee7b7','font-size':'12','font-family':'monospace'});
    t.textContent=txt;counterG.appendChild(t);
  });
}
drawCounters();

function animateMsg(){
  const id=++msgId;
  counts.inflight++;drawCounters();
  const fail=Math.random()*100<parseInt(failEl.value);
  const dot=el('circle',{cx:nodes[0].x,cy:nodes[0].y,r:5,fill:'#6ee7b7'});
  svg.appendChild(dot);

  const path=fail?nodes.slice(0,3):nodes;
  let step=0;const speed=11-parseInt(speedEl.value);

  function move(){
    if(step>=path.length-1){
      if(fail){dot.setAttribute('fill','#f87171');counts.fail++;counts.inflight--;drawCounters();
        setTimeout(()=>{dot.remove();retryMsg()},500);
      }else{counts.success++;counts.inflight--;drawCounters();
        setTimeout(()=>dot.remove(),300);
      }
      return;
    }
    const a=path[step],b=path[step+1];
    let t=0;
    function frame(){
      t+=0.02*(11-speed+2);if(t>1)t=1;
      dot.setAttribute('cx',a.x+(b.x-a.x)*t);
      dot.setAttribute('cy',a.y+(b.y-a.y)*t+Math.sin(t*Math.PI)*-20);
      if(t<1)requestAnimationFrame(frame);
      else{step++;move();}
    }
    requestAnimationFrame(frame);
  }
  move();
}

function retryMsg(){
  const dot=el('circle',{cx:nodes[2].x,cy:nodes[2].y,r:4,fill:'#fbbf24'});
  svg.appendChild(dot);counts.inflight++;drawCounters();
  let t=0;
  function frame(){
    t+=0.015;if(t>1)t=1;
    const a=nodes[2],b=nodes[3];
    dot.setAttribute('cx',a.x+(b.x-a.x)*t);
    dot.setAttribute('cy',a.y+(b.y-a.y)*t+Math.sin(t*Math.PI)*-15);
    if(t<1)requestAnimationFrame(frame);
    else{dot.setAttribute('fill','#6ee7b7');counts.success++;counts.inflight--;drawCounters();setTimeout(()=>dot.remove(),200);}
  }
  requestAnimationFrame(frame);
}

function loop(){
  animateMsg();
  const delay=800/(parseInt(speedEl.value)/3);
  setTimeout(loop,delay+Math.random()*400);
}
loop();