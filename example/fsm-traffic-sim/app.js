const machine={RED:{next:'GREEN',duration:7,color:'r'},GREEN:{next:'YELLOW',duration:5,color:'g'},YELLOW:{next:'RED',duration:2,color:'y'}};
let state='RED',elapsed=0,running=true;
const curEl=document.getElementById('cur'),timerEl=document.getElementById('timer'),histEl=document.getElementById('history');
const lights={r:document.getElementById('light-r'),y:document.getElementById('light-y'),g:document.getElementById('light-g')};
const speedEl=document.getElementById('speed'),toggleBtn=document.getElementById('toggle');
toggleBtn.onclick=()=>{running=!running;toggleBtn.textContent=running?'Pause':'Resume'};
function updateLights(){
  Object.values(lights).forEach(l=>l.className='light');
  lights[machine[state].color].classList.add('on-'+machine[state].color);
}
function addHistory(from,to){
  const d=document.createElement('div');d.textContent=`${from} → ${to}`;histEl.prepend(d);
}
function drawDiagram(){
  const svg=document.getElementById('diagram');
  const nodes=[{id:'RED',x:60,y:100},{id:'GREEN',x:180,y:40},{id:'YELLOW',x:300,y:100}];
  let html='';
  nodes.forEach(n=>{
    const active=n.id===state;
    html+=`<circle cx="${n.x}" cy="${n.y}" r="24" fill="${active?'#6ee7b733':'#262a36'}" stroke="${active?'#6ee7b7':'#444'}" stroke-width="${active?2.5:1}"/>`;
    html+=`<text x="${n.x}" y="${n.y+4}" text-anchor="middle" fill="${active?'#6ee7b7':'#aaa'}" font-size="11" font-weight="bold">${n.id}</text>`;
  });
  const arrows=[[0,1],[1,2],[2,0]];
  arrows.forEach(([i,j])=>{
    const a=nodes[i],b=nodes[j],active=a.id===state;
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.sqrt(dx*dx+dy*dy),ux=dx/len,uy=dy/len;
    const sx=a.x+ux*26,sy=a.y+uy*26,ex=b.x-ux*26,ey=b.y-uy*26;
    html+=`<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${active?'#6ee7b7':'#333'}" stroke-width="${active?2:1}" marker-end="url(#ah)"/>`;
  });
  svg.innerHTML=`<defs><marker id="ah" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#6ee7b7"/></marker></defs>`+html;
}
function tick(){
  if(!running)return;
  const speed=parseInt(speedEl.value);
  elapsed+=speed*.1;
  timerEl.textContent=elapsed.toFixed(1);
  if(elapsed>=machine[state].duration){
    const prev=state;state=machine[state].next;elapsed=0;
    curEl.textContent=state;addHistory(prev,state);updateLights();
  }
  drawDiagram();
}
updateLights();drawDiagram();
setInterval(tick,100);