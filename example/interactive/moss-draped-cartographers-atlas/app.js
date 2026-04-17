const sky=document.getElementById('sky');
const conList=document.getElementById('conList');
const lineage=document.getElementById('lineage');
const coords=document.getElementById('coords');
let showRivers=true,showMoss=true,active=null;

const CARTOGRAPHERS=['Vellin of Ash','Mira Fogborn','Oskar Dwell','Thera Moonquill','Irek Greenlight','Solen Ruinweft'];
const CON_NAMES=['Hollow Lantern','Vesper Moth','Drowned Bridge','Silver Reed','Moss Crown','Ember Doe','Twilight Weir','Forgotten Keel','Bloom Shepherd','Stag of Rue'];
const ERAS=['1247','1318','1402','1488','1503','1621','1684'];

function rnd(a,b){return a+Math.random()*(b-a)}
function pick(a){return a[Math.floor(Math.random()*a.length)]}

function buildSky(){
  sky.innerHTML=`
    <defs>
      <radialGradient id="meadowGrad" cx="50%" cy="100%" r="80%">
        <stop offset="0%" stop-color="#2a4a3a" stop-opacity=".6"/>
        <stop offset="100%" stop-color="#0f1117" stop-opacity="0"/>
      </radialGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="1.4"/></filter>
    </defs>`;
  // meadow ground
  const meadow=document.createElementNS('http://www.w3.org/2000/svg','rect');
  meadow.setAttribute('x',0);meadow.setAttribute('y',500);
  meadow.setAttribute('width',1000);meadow.setAttribute('height',200);
  meadow.setAttribute('class','meadow');sky.appendChild(meadow);
  // moss overlay
  if(showMoss){
    for(let i=0;i<40;i++){
      const m=document.createElementNS('http://www.w3.org/2000/svg','ellipse');
      m.setAttribute('cx',rnd(0,1000));m.setAttribute('cy',rnd(480,690));
      m.setAttribute('rx',rnd(20,60));m.setAttribute('ry',rnd(6,14));
      m.setAttribute('class','moss');sky.appendChild(m);
    }
  }
  // silver rivers — meandering paths murmuring left to right
  if(showRivers){
    for(let r=0;r<3;r++){
      const d=[];let x=0,y=540+r*40;
      d.push(`M ${x} ${y}`);
      for(let i=0;i<10;i++){x+=100;y+=rnd(-12,12);d.push(`Q ${x-50} ${y+rnd(-20,20)} ${x} ${y}`);}
      const p=document.createElementNS('http://www.w3.org/2000/svg','path');
      p.setAttribute('d',d.join(' '));p.setAttribute('class','river');
      p.style.animationDelay=(r*2.5)+'s';sky.appendChild(p);
    }
  }
  // moss-draped ruins as crumbled rectangles on horizon
  for(let i=0;i<8;i++){
    const rx=100+i*110+rnd(-20,20);
    const rw=rnd(40,80),rh=rnd(60,140);
    const ruin=document.createElementNS('http://www.w3.org/2000/svg','rect');
    ruin.setAttribute('x',rx);ruin.setAttribute('y',500-rh);
    ruin.setAttribute('width',rw);ruin.setAttribute('height',rh);
    ruin.setAttribute('class','ruin');sky.appendChild(ruin);
    // lantern flicker on a ruin
    if(Math.random()<0.4){
      const l=document.createElementNS('http://www.w3.org/2000/svg','circle');
      l.setAttribute('cx',rx+rw/2);l.setAttribute('cy',500-rh+10);
      l.setAttribute('r',2.5);l.setAttribute('class','lantern');
      l.style.animationDelay=(i*0.4)+'s';sky.appendChild(l);
    }
    // bloom at base
    const bl=document.createElementNS('http://www.w3.org/2000/svg','circle');
    bl.setAttribute('cx',rx+rw/2);bl.setAttribute('cy',500);
    bl.setAttribute('r',rnd(3,6));bl.setAttribute('class','bloom');
    bl.style.animationDelay=(i*.5)+'s';sky.appendChild(bl);
  }
}

let constellations=[];
function genConstellations(){
  constellations=[];conList.innerHTML='';
  for(let c=0;c<CON_NAMES.length;c++){
    const cx=rnd(80,920),cy=rnd(60,420);
    const stars=[],n=Math.floor(rnd(4,8));
    for(let i=0;i<n;i++)stars.push({x:cx+rnd(-50,50),y:cy+rnd(-40,40)});
    const edges=[];
    for(let i=1;i<n;i++)edges.push([i-1,i]);
    const con={id:c,name:CON_NAMES[c],stars,edges,era:pick(ERAS),author:pick(CARTOGRAPHERS)};
    constellations.push(con);
    const li=document.createElement('li');
    li.innerHTML=`${con.name}<span class="era">${con.era}</span>`;
    li.onclick=()=>activate(c);li.onmouseenter=()=>activate(c);
    conList.appendChild(li);
  }
  drawConstellations();
}

function drawConstellations(){
  sky.querySelectorAll('.star,.edge').forEach(e=>e.remove());
  constellations.forEach(con=>{
    con.edges.forEach(([a,b])=>{
      const e=document.createElementNS('http://www.w3.org/2000/svg','line');
      e.setAttribute('x1',con.stars[a].x);e.setAttribute('y1',con.stars[a].y);
      e.setAttribute('x2',con.stars[b].x);e.setAttribute('y2',con.stars[b].y);
      e.setAttribute('class','edge');e.dataset.con=con.id;sky.appendChild(e);
    });
    con.stars.forEach((s,i)=>{
      const st=document.createElementNS('http://www.w3.org/2000/svg','circle');
      st.setAttribute('cx',s.x);st.setAttribute('cy',s.y);
      st.setAttribute('r',1.5+Math.random()*1.2);
      st.setAttribute('class','star');st.dataset.con=con.id;
      st.addEventListener('click',()=>activate(con.id));
      st.addEventListener('mouseenter',()=>activate(con.id));
      sky.appendChild(st);
    });
  });
}

function activate(id){
  active=id;
  sky.querySelectorAll('.star,.edge').forEach(e=>{
    const is=e.dataset.con==id;
    e.classList.toggle('lit',is);
    if(e.tagName=='circle')e.setAttribute('r',is?3:1.5+Math.random()*1.2);
  });
  conList.querySelectorAll('li').forEach((li,i)=>li.classList.toggle('active',i==id));
  const c=constellations[id];
  lineage.textContent=
`name:    ${c.name}
charted: ${c.era} CE
by:      ${c.author}
stars:   ${c.stars.length}
status:  forgotten
notes:   "above moss-draped ruins,
         where silver rivers murmured
         into the bloom-lit meadow."`;
}

sky.addEventListener('mousemove',e=>{
  const r=sky.getBoundingClientRect();
  const x=((e.clientX-r.left)/r.width*1000)|0;
  const y=((e.clientY-r.top)/r.height*700)|0;
  coords.textContent=`lat ${x} · dec ${y}`;
  // parallax drift
  sky.querySelectorAll('.ruin').forEach((ru,i)=>{
    ru.style.transform=`translateX(${(x-500)*-0.008*(i%3+1)}px)`;
  });
});

document.getElementById('reseed').onclick=()=>{buildSky();genConstellations();};
document.getElementById('toggleRivers').onclick=e=>{showRivers=!showRivers;e.target.classList.toggle('active',showRivers);buildSky();drawConstellations();};
document.getElementById('toggleMoss').onclick=e=>{showMoss=!showMoss;e.target.classList.toggle('active',showMoss);buildSky();drawConstellations();};

buildSky();genConstellations();activate(0);
document.getElementById('toggleRivers').classList.add('active');
document.getElementById('toggleMoss').classList.add('active');