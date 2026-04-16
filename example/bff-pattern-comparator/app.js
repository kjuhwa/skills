const NS='http://www.w3.org/2000/svg';
const svgNo=document.getElementById('svg-no'),svgBff=document.getElementById('svg-bff');
const statsNo=document.getElementById('stats-no'),statsBff=document.getElementById('stats-bff');
const services=['User','Order','Inventory'];
const svcColors=['#60a5fa','#f472b6','#fbbf24'];

function el(svg,tag,attrs){const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));svg.appendChild(e);return e}

function buildNoBFF(){
  svgNo.innerHTML='';
  el(svgNo,'rect',{x:130,y:10,width:80,height:30,rx:6,fill:'#60a5fa22',stroke:'#60a5fa'});
  el(svgNo,'text',{x:170,y:30,fill:'#e2e8f0','font-size':'11','text-anchor':'middle'}).textContent='Client';
  services.forEach((s,i)=>{
    const y=120+i*70;
    el(svgNo,'rect',{x:120,y,width:100,height:30,rx:6,fill:svcColors[i]+'22',stroke:svcColors[i]});
    el(svgNo,'text',{x:170,y:y+20,fill:'#e2e8f0','font-size':'10','text-anchor':'middle'}).textContent=s;
    el(svgNo,'line',{x1:170,y1:40,x2:170,y2:y,stroke:'#334155','stroke-dasharray':'3,3',class:'link-no-'+i});
  });
}
function buildBFF(){
  svgBff.innerHTML='';
  el(svgBff,'rect',{x:130,y:10,width:80,height:30,rx:6,fill:'#60a5fa22',stroke:'#60a5fa'});
  el(svgBff,'text',{x:170,y:30,fill:'#e2e8f0','font-size':'11','text-anchor':'middle'}).textContent='Client';
  el(svgBff,'rect',{x:120,y:80,width:100,height:30,rx:6,fill:'#6ee7b722',stroke:'#6ee7b7'});
  el(svgBff,'text',{x:170,y:100,fill:'#e2e8f0','font-size':'11','text-anchor':'middle'}).textContent='BFF';
  el(svgBff,'line',{x1:170,y1:40,x2:170,y2:80,stroke:'#334155','stroke-dasharray':'3,3'});
  services.forEach((s,i)=>{
    const y=160+i*55;
    el(svgBff,'rect',{x:120,y,width:100,height:30,rx:6,fill:svcColors[i]+'22',stroke:svcColors[i]});
    el(svgBff,'text',{x:170,y:y+20,fill:'#e2e8f0','font-size':'10','text-anchor':'middle'}).textContent=s;
    el(svgBff,'line',{x1:170,y1:110,x2:170,y2:y,stroke:'#334155','stroke-dasharray':'3,3'});
  });
}

function animLine(svg,x1,y1,x2,y2,col,dur){
  const ln=el(svg,'line',{x1,y1,x2:x1,y2:y1,stroke:col,'stroke-width':2});
  const start=performance.now();
  function tick(now){
    const t=Math.min((now-start)/dur,1);
    ln.setAttribute('x2',x1+(x2-x1)*t);ln.setAttribute('y2',y1+(y2-y1)*t);
    if(t<1)requestAnimationFrame(tick);else setTimeout(()=>ln.remove(),400);
  }
  requestAnimationFrame(tick);
}

function rand(a,b){return Math.floor(Math.random()*(b-a)+a)}

document.getElementById('run').onclick=function(){
  buildNoBFF();buildBFF();
  // No BFF: 3 sequential calls
  let noTotal=0;
  services.forEach((s,i)=>{
    const d=rand(80,200);noTotal+=d;
    setTimeout(()=>animLine(svgNo,170,40,170,120+i*70,svcColors[i],d),i===0?0:noTotal-d);
  });
  setTimeout(()=>{statsNo.textContent=`Total: ${noTotal}ms (3 round trips, ${services.length} calls)`;},noTotal+200);
  // BFF: 1 call to BFF, BFF fans out in parallel
  const bffOverhead=rand(10,30);
  const svcDelays=services.map(()=>rand(60,160));
  const bffTotal=bffOverhead+Math.max(...svcDelays);
  animLine(svgBff,170,40,170,80,'#6ee7b7',bffOverhead);
  setTimeout(()=>{
    services.forEach((s,i)=>animLine(svgBff,170,110,170,160+i*55,svcColors[i],svcDelays[i]));
  },bffOverhead);
  setTimeout(()=>{statsBff.textContent=`Total: ${bffTotal}ms (1 round trip, parallel fan-out)`;},bffTotal+200);
};
buildNoBFF();buildBFF();