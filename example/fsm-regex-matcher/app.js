// FSM for pattern ab*c
// States: S0(start), S1(saw a), S2(saw c after a/b*) accept, DEAD
const states=[
  {id:'S0',x:80,y:90,accept:false,label:'Start'},
  {id:'S1',x:250,y:90,accept:false,label:'Saw a'},
  {id:'S2',x:420,y:90,accept:true,label:'Accept'},
  {id:'DEAD',x:250,y:170,accept:false,label:'Dead'}
];
const delta={
  S0:{a:'S1',b:'DEAD',c:'DEAD'},
  S1:{a:'DEAD',b:'S1',c:'S2'},
  S2:{a:'DEAD',b:'DEAD',c:'DEAD'},
  DEAD:{a:'DEAD',b:'DEAD',c:'DEAD'}
};
let activeState=null,activeEdge=null,history=[];

function runFSM(str){
  let s='S0',path=['S0'],edges=[];
  for(const ch of str){
    const sym=['a','b','c'].includes(ch)?ch:'a'; // unknown → dead via 'a' trick
    const nxt=delta[s]?.[sym]||'DEAD';
    if(!delta[s]?.[sym])edges.push({from:s,to:'DEAD',label:'?'});
    else edges.push({from:s,to:nxt,label:ch});
    s=nxt;path.push(s);
  }
  return{final:s,accept:s==='S2',path,edges};
}
function drawSVG(highlight,hEdge){
  const svg=document.getElementById('svg');
  const sMap=Object.fromEntries(states.map(s=>[s.id,s]));
  let h=`<defs><marker id="ar" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#555"/></marker>
  <marker id="arH" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#6ee7b7"/></marker></defs>`;
  // start arrow
  h+=`<line x1="20" y1="90" x2="52" y2="90" stroke="#6ee7b7" stroke-width="2" marker-end="url(#arH)"/>`;
  const edges=[{f:'S0',t:'S1',l:'a'},{f:'S1',t:'S2',l:'c'},{f:'S0',t:'DEAD',l:'b,c'},{f:'S1',t:'DEAD',l:'a'},{f:'S2',t:'DEAD',l:'*'}];
  edges.forEach(e=>{
    const a=sMap[e.f],b=sMap[e.t];
    const lit=hEdge&&hEdge.from===e.f&&hEdge.to===e.t;
    const col=lit?'#6ee7b7':'#333',mk=lit?'url(#arH)':'url(#ar)';
    h+=`<line x1="${a.x+28}" y1="${a.y}" x2="${b.x-28}" y2="${b.y}" stroke="${col}" stroke-width="2" marker-end="${mk}"/>`;
    const mx=(a.x+b.x)/2,my=(a.y+b.y)/2-10;
    h+=`<text x="${mx}" y="${my}" text-anchor="middle" fill="#6ee7b7" font-size="11" font-family="monospace">${e.l}</text>`;
  });
  // self-loop S1->S1 for 'b'
  const s1=sMap['S1'];
  const loopLit=hEdge&&hEdge.from==='S1'&&hEdge.to==='S1';
  h+=`<path d="M${s1.x-10} ${s1.y-28} Q${s1.x} ${s1.y-70} ${s1.x+10} ${s1.y-28}" fill="none" stroke="${loopLit?'#6ee7b7':'#333'}" stroke-width="2"/>`;
  h+=`<text x="${s1.x}" y="${s1.y-58}" text-anchor="middle" fill="#6ee7b7" font-size="11" font-family="monospace">b</text>`;
  states.forEach(s=>{
    const act=s.id===highlight;
    h+=`<circle cx="${s.x}" cy="${s.y}" r="26" fill="${act?'#6ee7b7':'#1a1d27'}" stroke="${act?'#6ee7b7':'#444'}" stroke-width="2"/>`;
    if(s.accept)h+=`<circle cx="${s.x}" cy="${s.y}" r="21" fill="none" stroke="${act?'#0f1117':'#6ee7b7'}" stroke-width="1.5"/>`;
    h+=`<text x="${s.x}" y="${s.y+4}" text-anchor="middle" fill="${act?'#0f1117':'#c9d1d9'}" font-size="11" font-weight="bold" font-family="monospace">${s.id}</text>`;
  });
  svg.innerHTML=h;
}
function animate(result,str){
  let step=0;
  const id=setInterval(()=>{
    if(step>=result.path.length){clearInterval(id);return;}
    activeState=result.path[step];
    activeEdge=result.edges[step-1]||null;
    drawSVG(activeState,activeEdge);
    step++;
  },500);
}
function run(){
  const str=document.getElementById('inp').value.toLowerCase();
  if(!str){drawSVG(null,null);return;}
  const r=runFSM(str);
  const el=document.getElementById('result');
  el.textContent=`"${str}" → ${r.accept?'ACCEPTED':'REJECTED'}`;
  el.className='result '+(r.accept?'accept':'reject');
  history.unshift({str,accept:r.accept});
  if(history.length>10)history.pop();
  document.getElementById('history').innerHTML=history.map(h=>`<div><span class="${h.accept?'ok':'no'}">${h.accept?'✓':'✗'}</span> "${h.str}"</div>`).join('');
  animate(r,str);
}
document.getElementById('btnRun').onclick=run;
document.getElementById('inp').addEventListener('keydown',e=>{if(e.key==='Enter')run();});
drawSVG(null,null);
// auto-run with default value
setTimeout(run,300);