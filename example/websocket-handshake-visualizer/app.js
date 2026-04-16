const steps=[
 {from:'c',to:'s',label:'HTTP GET /chat',detail:'GET /chat HTTP/1.1\\nHost: example.com\\nUpgrade: websocket\\nConnection: Upgrade\\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\\nSec-WebSocket-Version: 13',clientState:'upgrading',serverState:'received'},
 {from:'s',to:'c',label:'101 Switching Protocols',detail:'HTTP/1.1 101 Switching Protocols\\nUpgrade: websocket\\nConnection: Upgrade\\nSec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=',clientState:'established',serverState:'established'},
 {from:'c',to:'s',label:'TEXT frame: "hello"',detail:'FIN=1 OPCODE=0x1 MASK=1 PAYLOAD="hello"',clientState:'sending',serverState:'receiving'},
 {from:'s',to:'c',label:'TEXT frame: "hi there"',detail:'FIN=1 OPCODE=0x1 MASK=0 PAYLOAD="hi there"',clientState:'receiving',serverState:'sending'},
 {from:'c',to:'s',label:'PING',detail:'FIN=1 OPCODE=0x9 PAYLOAD=""',clientState:'ping',serverState:'ping-recv'},
 {from:'s',to:'c',label:'PONG',detail:'FIN=1 OPCODE=0xA PAYLOAD=""',clientState:'pong-recv',serverState:'pong'},
 {from:'c',to:'s',label:'CLOSE 1000',detail:'FIN=1 OPCODE=0x8 STATUS=1000 REASON="normal"',clientState:'closed',serverState:'closed'}
];
let idx=0,autoTimer=null;
const svg=document.getElementById('wire'),msgs=document.getElementById('messages');
const cBox=document.getElementById('clientBox'),sBox=document.getElementById('serverBox');
const label=document.getElementById('stepLabel');

function drawArrow(from,to){
  svg.innerHTML='';
  const y=100+idx*40;
  const x1=from==='c'?20:380,x2=to==='c'?20:380;
  const ns='http://www.w3.org/2000/svg';
  const defs=document.createElementNS(ns,'defs');
  defs.innerHTML='<marker id="m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L10,5 L0,10" fill="#6ee7b7"/></marker>';
  svg.appendChild(defs);
  const line=document.createElementNS(ns,'line');
  line.setAttribute('x1',x1);line.setAttribute('y1',y);
  line.setAttribute('x2',x2);line.setAttribute('y2',y);
  line.setAttribute('stroke','#6ee7b7');line.setAttribute('stroke-width','2');
  line.setAttribute('marker-end','url(#m)');
  line.style.strokeDasharray='400';line.style.strokeDashoffset='400';
  line.style.animation='dash 0.8s forwards';
  svg.appendChild(line);
  const style=document.createElementNS(ns,'style');
  style.textContent='@keyframes dash{to{stroke-dashoffset:0}}';
  svg.appendChild(style);
}

function renderStep(){
  if(idx>=steps.length){label.textContent='Complete';return;}
  const s=steps[idx];
  drawArrow(s.from,s.to);
  cBox.textContent=s.clientState;sBox.textContent=s.serverState;
  cBox.classList.toggle('active',s.from==='c'||s.to==='c');
  sBox.classList.toggle('active',s.from==='s'||s.to==='s');
  const d=document.createElement('div');
  d.className=s.from==='c'?'sent':'';
  d.innerHTML=`<b>[${idx+1}]</b> ${s.from==='c'?'C→S':'S→C'} ${s.label} — <i>${s.detail.split('\\n')[0]}</i>`;
  msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;
  label.textContent=`Step ${idx+1} / ${steps.length}`;
  idx++;
}

document.getElementById('next').onclick=renderStep;
document.getElementById('auto').onclick=e=>{
  if(autoTimer){clearInterval(autoTimer);autoTimer=null;e.target.textContent='Auto Play';}
  else{autoTimer=setInterval(()=>{if(idx>=steps.length){clearInterval(autoTimer);autoTimer=null;e.target.textContent='Auto Play';}else renderStep();},1200);e.target.textContent='Stop';}
};
document.getElementById('reset').onclick=()=>{
  idx=0;msgs.innerHTML='';svg.innerHTML='';
  cBox.textContent='idle';sBox.textContent='listening';
  cBox.classList.remove('active');sBox.classList.remove('active');
  label.textContent='Step 0 / '+steps.length;
};
renderStep();