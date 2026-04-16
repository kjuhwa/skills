const svg=document.getElementById('diagram'),detail=document.getElementById('detail');
const opcodes={text:{op:'0x1',color:'#7dd3fc'},binary:{op:'0x2',color:'#c084fc'},ping:{op:'0x9',color:'#6ee7b7'},close:{op:'0x8',color:'#fca5a5'}};
let frames=[],selected=null;
function makeFrame(type,dir){
  const payloads={text:['"hello"','{"event":"join"}','{"typing":true}','{"msg":"hi!"}'],
    binary:['[0x89 0x00]','[0xFF 0xFE 0x01]','[0xCA 0xFE]'],ping:['ping','pong'],close:['1000 Normal','1001 Going Away']};
  const list=payloads[type];
  return{type,dir,payload:list[Math.floor(Math.random()*list.length)],
    size:Math.floor(Math.random()*512)+2,masked:dir==='send',fin:true,ts:Date.now()};
}
function render(){
  svg.innerHTML='';
  const ns='http://www.w3.org/2000/svg';
  const mkEl=(t,a)=>{const e=document.createElementNS(ns,t);Object.entries(a).forEach(([k,v])=>e.setAttribute(k,v));return e};
  svg.appendChild(mkEl('text',{x:60,y:25,fill:'#6ee7b7','font-size':'13','text-anchor':'middle'})).textContent='Client';
  svg.appendChild(mkEl('text',{x:640,y:25,fill:'#6ee7b7','font-size':'13','text-anchor':'middle'})).textContent='Server';
  svg.appendChild(mkEl('line',{x1:60,y1:35,x2:60,y2:310,stroke:'#2a2d37','stroke-width':2}));
  svg.appendChild(mkEl('line',{x1:640,y1:35,x2:640,y2:310,stroke:'#2a2d37','stroke-width':2}));
  const maxShow=Math.min(frames.length,8);
  const startIdx=Math.max(0,frames.length-maxShow);
  for(let i=0;i<maxShow;i++){
    const f=frames[startIdx+i],y=50+i*33;
    const isSend=f.dir==='send',x1=isSend?65:635,x2=isSend?635:65;
    const g=document.createElementNS(ns,'g');g.classList.add('frame-arrow');
    g.appendChild(mkEl('line',{x1,y1:y,x2,y2:y,stroke:opcodes[f.type].color,'stroke-width':1.5,'stroke-dasharray':f.type==='ping'?'5,4':'none'}));
    const triX=isSend?x2-8:x2+8;
    g.appendChild(mkEl('polygon',{points:`${x2},${y} ${triX},${y-4} ${triX},${y+4}`,fill:opcodes[f.type].color}));
    g.appendChild(mkEl('text',{x:350,y:y-5,fill:'#94a3b8','font-size':'10','text-anchor':'middle'})).textContent=`${f.type.toUpperCase()} ${f.payload}`;
    const idx=startIdx+i;
    g.addEventListener('click',()=>{selected=idx;showDetail()});
    svg.appendChild(g);
  }
}
function showDetail(){
  if(selected===null)return;const f=frames[selected];
  detail.textContent=`Frame #${selected+1}  [${f.dir.toUpperCase()}]\n`+
    `Opcode: ${opcodes[f.type].op} (${f.type})\nFIN: ${f.fin}\nMasked: ${f.masked}\n`+
    `Payload length: ${f.size} bytes\nPayload: ${f.payload}\nTimestamp: ${new Date(f.ts).toISOString()}`;
}
function addFrame(type){frames.push(makeFrame(type,'send'));
  setTimeout(()=>{frames.push(makeFrame(type==='ping'?'ping':type==='close'?'close':'text','recv'));render()},300);render()}
document.getElementById('btnText').onclick=()=>addFrame('text');
document.getElementById('btnBin').onclick=()=>addFrame('binary');
document.getElementById('btnPing').onclick=()=>addFrame('ping');
document.getElementById('btnClose').onclick=()=>addFrame('close');
setInterval(()=>{const types=['text','text','text','binary','ping'];
  addFrame(types[Math.floor(Math.random()*types.length)])},2500);
addFrame('text');setTimeout(()=>addFrame('ping'),500);