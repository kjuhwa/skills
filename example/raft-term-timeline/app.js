const svg=document.getElementById('timeline');
const detail=document.getElementById('detail');
const W=900,H=360,LEFT=60,TOP=40,NODE_H=36;
const COLORS=['#6ee7b7','#60a5fa','#fbbf24','#f472b6','#a78bfa'];
let history=[];

function genHistory(chaos){
  const events=[];
  const terms=[];
  let t=0,term=1,leader=Math.floor(Math.random()*5);
  while(t<100){
    const dur=Math.max(3,10-Math.floor(chaos/15)+Math.floor(Math.random()*6));
    terms.push({term,leader,start:t,end:Math.min(t+dur,100)});
    events.push({t,type:'elect',node:leader,term,msg:`Node ${leader} elected leader in term ${term}`});
    const appends=Math.floor(Math.random()*3)+1;
    for(let i=0;i<appends;i++){
      const et=t+1+Math.floor(Math.random()*(dur-1));
      if(et<t+dur)events.push({t:et,type:'commit',node:leader,term,msg:`Committed entry idx=${events.filter(e=>e.type==='commit').length+1} at term ${term}`});
    }
    if(Math.random()*100<chaos){
      events.push({t:t+dur-1,type:'crash',node:leader,term,msg:`Node ${leader} partitioned/crashed; term ${term} ends`});
    }
    t+=dur;term++;
    leader=(leader+1+Math.floor(Math.random()*3))%5;
    if(term>40)break;
  }
  return{terms,events};
}

function render(){
  svg.innerHTML='';
  const ns='http://www.w3.org/2000/svg';
  const maxT=Math.max(...history.terms.map(t=>t.end),100);
  const scale=(W-LEFT-20)/maxT;
  for(let i=0;i<5;i++){
    const y=TOP+i*NODE_H+NODE_H/2;
    const line=document.createElementNS(ns,'line');
    line.setAttribute('x1',LEFT);line.setAttribute('x2',W-20);
    line.setAttribute('y1',y);line.setAttribute('y2',y);
    line.setAttribute('stroke','#2a2e3c');line.setAttribute('stroke-dasharray','2 4');
    svg.appendChild(line);
    const lbl=document.createElementNS(ns,'text');
    lbl.setAttribute('x',8);lbl.setAttribute('y',y+4);lbl.setAttribute('fill',COLORS[i]);
    lbl.textContent=`N${i}`;svg.appendChild(lbl);
  }
  history.terms.forEach(tm=>{
    const x=LEFT+tm.start*scale,w=(tm.end-tm.start)*scale;
    const y=TOP+tm.leader*NODE_H+6;
    const rect=document.createElementNS(ns,'rect');
    rect.setAttribute('x',x);rect.setAttribute('y',y);rect.setAttribute('width',Math.max(w-2,1));rect.setAttribute('height',NODE_H-12);
    rect.setAttribute('fill',COLORS[tm.leader]);rect.setAttribute('opacity',0.22);
    rect.setAttribute('rx',3);rect.setAttribute('class','term-bar');
    rect.addEventListener('mouseenter',()=>showDetail({type:'term',...tm}));
    svg.appendChild(rect);
    if(w>18){
      const t=document.createElementNS(ns,'text');
      t.setAttribute('x',x+4);t.setAttribute('y',y+14);t.setAttribute('fill',COLORS[tm.leader]);
      t.textContent=`T${tm.term}`;svg.appendChild(t);
    }
  });
  history.events.forEach(ev=>{
    const x=LEFT+ev.t*scale,y=TOP+ev.node*NODE_H+NODE_H/2;
    const g=document.createElementNS(ns,'g');g.setAttribute('class','event');
    const c=document.createElementNS(ns,'circle');
    c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',ev.type==='elect'?6:ev.type==='crash'?7:4);
    c.setAttribute('fill',ev.type==='crash'?'#f87171':ev.type==='elect'?COLORS[ev.node]:'#6ee7b7');
    c.setAttribute('stroke','#0f1117');c.setAttribute('stroke-width',2);
    g.appendChild(c);
    if(ev.type==='crash'){
      const x1=document.createElementNS(ns,'line');
      x1.setAttribute('x1',x-3);x1.setAttribute('y1',y-3);x1.setAttribute('x2',x+3);x1.setAttribute('y2',y+3);
      x1.setAttribute('stroke','#0f1117');x1.setAttribute('stroke-width',1.5);g.appendChild(x1);
      const x2=document.createElementNS(ns,'line');
      x2.setAttribute('x1',x+3);x2.setAttribute('y1',y-3);x2.setAttribute('x2',x-3);x2.setAttribute('y2',y+3);
      x2.setAttribute('stroke','#0f1117');x2.setAttribute('stroke-width',1.5);g.appendChild(x2);
    }
    g.addEventListener('mouseenter',()=>showDetail({type:'event',...ev}));
    svg.appendChild(g);
  });
  const axis=document.createElementNS(ns,'text');
  axis.setAttribute('x',LEFT);axis.setAttribute('y',H-10);axis.textContent=`Tick 0 ────────── ${maxT} (${history.terms.length} terms, ${history.events.length} events)`;
  svg.appendChild(axis);
}

function showDetail(d){
  if(d.type==='term'){
    detail.innerHTML=`<div><span class="k">Term:</span> ${d.term}</div><div><span class="k">Leader:</span> Node ${d.leader}</div><div><span class="k">Range:</span> t=${d.start}→${d.end}</div><div><span class="k">Duration:</span> ${d.end-d.start} ticks</div>`;
  }else{
    detail.innerHTML=`<div><span class="k">Time:</span> t=${d.t}</div><div><span class="k">Type:</span> ${d.type}</div><div><span class="k">Node:</span> N${d.node}</div><div><span class="k">Term:</span> ${d.term}</div><div style="margin-top:8px">${d.msg}</div>`;
  }
}

function regen(){
  const c=+document.getElementById('chaos').value;
  document.getElementById('chaosVal').textContent=c+'%';
  history=genHistory(c);
  render();
}

document.getElementById('regen').onclick=regen;
document.getElementById('chaos').addEventListener('input',regen);
regen();