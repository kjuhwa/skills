const stateConfig={
  RED:{color:'red',duration:5,next:'GREEN'},
  GREEN:{color:'green',duration:4,next:'YELLOW'},
  YELLOW:{color:'yellow',duration:2,next:'RED'},
  EMERGENCY:{color:'yellow',duration:3,next:'RED'}
};
let current='RED',timer=0,running=true,log=[];
const els={red:document.getElementById('red'),yellow:document.getElementById('yellow'),green:document.getElementById('green'),
  curState:document.getElementById('curState'),timer:document.getElementById('timer'),transLog:document.getElementById('transLog')};

function render(){
  ['red','yellow','green'].forEach(c=>els[c].className='light');
  const col=stateConfig[current].color;
  els[col].classList.add('on-'+col);
  els.curState.textContent=current;
  els.timer.textContent=timer;
  renderSVG();
}
function transition(to){
  log.unshift(current+' → '+to);
  if(log.length>8)log.pop();
  els.transLog.innerHTML=log.map(l=>'<div>'+l+'</div>').join('');
  current=to;timer=0;render();
}
function tick(){
  if(!running)return;
  timer++;
  if(timer>=stateConfig[current].duration)transition(stateConfig[current].next);
  else render();
}
function renderSVG(){
  const svg=document.getElementById('diagram');
  const nodes=[{id:'RED',x:80,y:80},{id:'GREEN',x:250,y:80},{id:'YELLOW',x:420,y:80}];
  let h='';
  const arrows=[[0,1],[1,2],[2,0]];
  arrows.forEach(([i,j])=>{
    const a=nodes[i],b=nodes[j];
    if(j===0&&i===2){
      h+=`<path d="M${a.x} ${a.y+30} Q250 155 ${b.x} ${b.y+30}" fill="none" stroke="#333" stroke-width="2" marker-end="url(#ah)"/>`;
    }else{
      h+=`<line x1="${a.x+30}" y1="${a.y}" x2="${b.x-30}" y2="${b.y}" stroke="#333" stroke-width="2" marker-end="url(#ah)"/>`;
    }
  });
  nodes.forEach(n=>{
    const active=n.id===current;
    h+=`<circle cx="${n.x}" cy="${n.y}" r="28" fill="${active?'#6ee7b7':'#1a1d27'}" stroke="${active?'#6ee7b7':'#444'}" stroke-width="2"/>`;
    h+=`<text x="${n.x}" y="${n.y+5}" text-anchor="middle" fill="${active?'#0f1117':'#c9d1d9'}" font-size="12" font-weight="bold" font-family="monospace">${n.id}</text>`;
  });
  svg.innerHTML=`<defs><marker id="ah" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#555"/></marker></defs>`+h;
}
document.getElementById('btnToggle').onclick=function(){running=!running;this.textContent=running?'Pause':'Play';};
document.getElementById('btnEmergency').onclick=()=>{transition('EMERGENCY');};
setInterval(tick,1000);render();