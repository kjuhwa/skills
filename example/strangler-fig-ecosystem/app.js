const svg=document.getElementById('viz'),tip=document.getElementById('tooltip');
const STAGES=['seed','epiphyte','strangling','freestanding'];
const COLORS={seed:'#fbbf24',epiphyte:'#60a5fa',strangling:'#f87171',freestanding:'#6ee7b7'};
const SPECIES=[
  {name:'Ficus benghalensis',common:'Banyan',region:'South Asia',host:'Teak',stage:3,age:120,x:160,y:180,r:38},
  {name:'Ficus aurea',common:'Florida Strangler',region:'Caribbean',host:'Live Oak',stage:2,age:30,x:420,y:140,r:28},
  {name:'Ficus watkinsiana',common:'Watkins Fig',region:'Australia',host:'Hoop Pine',stage:2,age:45,x:300,y:280,r:30},
  {name:'Ficus macrophylla',common:'Moreton Bay Fig',region:'E. Australia',host:'Brush Box',stage:3,age:90,x:100,y:330,r:34},
  {name:'Ficus citrifolia',common:'Shortleaf Fig',region:'C. America',host:'Palm',stage:1,age:8,x:500,y:300,r:18},
  {name:'Ficus tinctoria',common:'Dye Fig',region:'Pacific Islands',host:'Pandanus',stage:0,age:1,x:480,y:80,r:12},
  {name:'Ficus obliqua',common:'Small-leaved Fig',region:'Australia',host:'Eucalyptus',stage:1,age:12,x:260,y:100,r:20},
];
function buildSVG(){
  svg.innerHTML='';
  SPECIES.forEach((sp,i)=>{
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.style.cursor='pointer';
    const pulse=document.createElementNS('http://www.w3.org/2000/svg','circle');
    pulse.setAttribute('cx',sp.x);pulse.setAttribute('cy',sp.y);pulse.setAttribute('r',sp.r+6);
    pulse.setAttribute('fill','none');pulse.setAttribute('stroke',COLORS[STAGES[sp.stage]]);
    pulse.setAttribute('stroke-width','1');pulse.setAttribute('opacity','0.3');
    const anim=document.createElementNS('http://www.w3.org/2000/svg','animate');
    anim.setAttribute('attributeName','r');anim.setAttribute('from',sp.r);
    anim.setAttribute('to',sp.r+14);anim.setAttribute('dur',2+i*0.3+'s');
    anim.setAttribute('repeatCount','indefinite');pulse.appendChild(anim);
    const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx',sp.x);c.setAttribute('cy',sp.y);c.setAttribute('r',sp.r);
    c.setAttribute('fill',COLORS[STAGES[sp.stage]]);c.setAttribute('opacity','0.7');
    const t=document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x',sp.x);t.setAttribute('y',sp.y+4);t.setAttribute('text-anchor','middle');
    t.setAttribute('fill','#0f1117');t.setAttribute('font-size','10');t.setAttribute('font-weight','600');
    t.textContent=sp.common.split(' ')[0];
    g.appendChild(pulse);g.appendChild(c);g.appendChild(t);
    g.onmouseenter=e=>showTip(e,sp);
    g.onmouseleave=()=>{tip.style.display='none';};
    g.onclick=()=>{if(sp.stage<3){sp.stage++;sp.age+=Math.floor(Math.random()*20)+10;sp.r=Math.min(42,sp.r+4);buildSVG();}};
    svg.appendChild(g);
  });
}
function showTip(e,sp){
  tip.style.display='block';
  tip.innerHTML=`<strong>${sp.name}</strong><br>${sp.common}<br>Region: ${sp.region}<br>Host: ${sp.host}<br>Stage: ${STAGES[sp.stage]}<br>Age: ~${sp.age} yrs<br><em>Click to advance stage</em>`;
  const r=document.getElementById('app').getBoundingClientRect();
  tip.style.left=(e.clientX-r.left+12)+'px';tip.style.top=(e.clientY-r.top-10)+'px';
}
buildSVG();