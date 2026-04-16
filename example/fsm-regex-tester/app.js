const patterns = {
  'ab*c': {states:['S0','S1','S2'],accept:['S2'],transitions:[{from:'S0',to:'S1',on:'a'},{from:'S1',to:'S1',on:'b'},{from:'S1',to:'S2',on:'c'}]},
  'a(b|c)d': {states:['S0','S1','S2'],accept:['S2'],transitions:[{from:'S0',to:'S1',on:'a'},{from:'S1',to:'S2',on:'b'},{from:'S1',to:'S2',on:'c'},{from:'S2',to:'S3',on:'d'}],extra:['S3'],acceptOverride:['S3']},
  'ab+': {states:['S0','S1','S2'],accept:['S2'],transitions:[{from:'S0',to:'S1',on:'a'},{from:'S1',to:'S2',on:'b'},{from:'S2',to:'S2',on:'b'}]}
};
// fix a(b|c)d
patterns['a(b|c)d'].states = ['S0','S1','S2','S3'];
patterns['a(b|c)d'].accept = ['S3'];

let fsm, currentState, inputStr, stepIdx;
const svg = document.getElementById('svg');
const resultEl = document.getElementById('result');

function load(name) {
  fsm = patterns[name]; currentState = fsm.states[0]; stepIdx = 0;
  inputStr = document.getElementById('test-input').value; render(); showResult('Ready — press Step or Run All');
}

function render() {
  const ns = 'http://www.w3.org/2000/svg'; svg.innerHTML = '';
  // defs
  const defs = document.createElementNS(ns,'defs');
  const marker = document.createElementNS(ns,'marker');
  marker.setAttribute('id','arrow'); marker.setAttribute('viewBox','0 0 10 10');
  marker.setAttribute('refX','10'); marker.setAttribute('refY','5');
  marker.setAttribute('markerWidth','6'); marker.setAttribute('markerHeight','6');
  marker.setAttribute('orient','auto-start-reverse');
  const path = document.createElementNS(ns,'path');
  path.setAttribute('d','M 0 0 L 10 5 L 0 10 z'); path.setAttribute('fill','#2d333b');
  marker.appendChild(path); defs.appendChild(marker); svg.appendChild(defs);

  const n = fsm.states.length, spacing = 600/(n+1);
  const pos = fsm.states.map((_,i)=>[80+spacing*(i+1)-spacing/2, 130]);
  // edges
  fsm.transitions.forEach(t => {
    const fi=fsm.states.indexOf(t.from), ti=fsm.states.indexOf(t.to);
    const line = document.createElementNS(ns, fi===ti?'path':'line');
    if(fi===ti){
      const [x,y]=pos[fi];
      line.setAttribute('d',`M${x-15},${y-28} C${x-40},${y-75} ${x+40},${y-75} ${x+15},${y-28}`);
    } else {
      const [x1,y1]=pos[fi],[x2,y2]=pos[ti];
      const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy),ux=dx/len,uy=dy/len;
      line.setAttribute('x1',x1+ux*28); line.setAttribute('y1',y1+uy*28);
      line.setAttribute('x2',x2-ux*28); line.setAttribute('y2',y2-uy*28);
    }
    line.setAttribute('class','edge'); svg.appendChild(line);
    const mx = fi===ti ? pos[fi][0] : (pos[fi][0]+pos[ti][0])/2;
    const my = fi===ti ? pos[fi][1]-65 : (pos[fi][1]+pos[ti][1])/2-16;
    const lbl = document.createElementNS(ns,'text');
    lbl.setAttribute('x',mx); lbl.setAttribute('y',my); lbl.setAttribute('class','edge-label');
    lbl.textContent = t.on; svg.appendChild(lbl);
  });
  // states
  fsm.states.forEach((s,i)=>{
    const [x,y]=pos[i]; const active = s===currentState;
    const c = document.createElementNS(ns,'circle');
    c.setAttribute('cx',x); c.setAttribute('cy',y); c.setAttribute('r',26);
    c.setAttribute('class',`state-circle${active?' state-active':''}${fsm.accept.includes(s)?' state-accept':''}`);
    svg.appendChild(c);
    const t = document.createElementNS(ns,'text');
    t.setAttribute('x',x); t.setAttribute('y',y);
    t.setAttribute('class',`label${active?' label-active':''}`);
    t.textContent = s; svg.appendChild(t);
  });
}

function showResult(msg){resultEl.innerHTML=msg}

function step(){
  if(stepIdx >= inputStr.length){showResult(fsm.accept.includes(currentState)?'<span style="color:#6ee7b7">✓ Accepted</span>':'<span style="color:#f87171">✗ Rejected</span>');return}
  const ch = inputStr[stepIdx]; const t = fsm.transitions.find(tr=>tr.from===currentState&&tr.on===ch);
  if(t){currentState=t.to; stepIdx++; render(); showResult(`Consumed '${ch}' → ${currentState} (${stepIdx}/${inputStr.length})`);}
  else{showResult(`<span style="color:#f87171">✗ No transition for '${ch}' from ${currentState}</span>`);}
}

function runAll(){
  currentState=fsm.states[0]; stepIdx=0; render();
  const iv=setInterval(()=>{if(stepIdx>=inputStr.length){clearInterval(iv);showResult(fsm.accept.includes(currentState)?'<span style="color:#6ee7b7">✓ Accepted</span>':'<span style="color:#f87171">✗ Rejected</span>');return}step()},400);
}

document.getElementById('step-btn').onclick=step;
document.getElementById('run-btn').onclick=runAll;
document.getElementById('reset-btn').onclick=()=>{load(document.getElementById('pattern').value)};
document.getElementById('pattern').onchange=e=>{load(e.target.value)};
document.getElementById('test-input').oninput=()=>{load(document.getElementById('pattern').value)};
load('ab*c');