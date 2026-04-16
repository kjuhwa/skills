const svg=document.getElementById('flow');
const NS='http://www.w3.org/2000/svg';
const colors={text:'#6ee7b7',binary:'#60a5fa',control:'#f0abfc'};
const labels=['TEXT','BIN','PING','PONG','CLOSE'];
function el(tag,attrs){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e}
// draw client & server
function drawEndpoints(){
  [['CLIENT',100],['SERVER',700]].forEach(([t,x])=>{
    svg.append(el('rect',{x:x-40,y:20,width:80,height:36,rx:8,fill:'#1a1d27',stroke:'#6ee7b7','stroke-width':1.5}));
    const txt=el('text',{x,y:43,fill:'#6ee7b7','text-anchor':'middle','font-size':'12','font-family':'monospace'});
    txt.textContent=t;svg.append(txt);
    svg.append(el('line',{x1:x,y1:56,x2:x,y2:480,stroke:'#2a2e3a','stroke-width':1.5,'stroke-dasharray':'4,4'}));
  });
}
drawEndpoints();
let yPos=80;
function sendFrame(){
  if(yPos>470){svg.querySelectorAll('.frame').forEach(e=>e.remove());yPos=80}
  const toRight=Math.random()>0.35;
  const type=labels[Math.random()*labels.length|0];
  const color=type==='TEXT'?colors.text:type==='BIN'?colors.binary:colors.control;
  const x1=toRight?100:700,x2=toRight?700:100;
  const g=el('g',{class:'frame',opacity:'0'});
  const line=el('line',{x1,y1:yPos,x2:x1,y2:yPos,stroke:color,'stroke-width':2});
  g.append(line);
  const sz=Math.floor(Math.random()*2048)+'B';
  const lbl=el('text',{x:400,y:yPos-6,fill:color,'text-anchor':'middle','font-size':'10','font-family':'monospace',opacity:.7});
  lbl.textContent=`${type} ${sz}`;g.append(lbl);
  const circle=el('circle',{cx:x1,cy:yPos,r:4,fill:color});g.append(circle);
  svg.append(g);
  let progress=0;
  const anim=()=>{progress+=0.03;if(progress>1)progress=1;
    const cx=x1+(x2-x1)*progress;circle.setAttribute('cx',cx);
    line.setAttribute('x2',cx);g.setAttribute('opacity',Math.min(progress*3,1));
    if(progress<1)requestAnimationFrame(anim);
  };
  requestAnimationFrame(anim);
  yPos+=28;
}
setInterval(sendFrame,600);