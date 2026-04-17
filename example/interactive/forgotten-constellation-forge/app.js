// deterministic seeded PRNG (mulberry32)
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}

const WORDS_A=['Hollow','Vesper','Drowned','Silver','Moss','Ember','Twilight','Forgotten','Bloom','Murmuring','Wandering','Pilgrim','Gilded','Quiet'];
const WORDS_B=['Lantern','Moth','Bridge','Reed','Crown','Doe','Weir','Keel','Shepherd','River','Cartographer','Meadow','Ruin','Constellation'];
const CARTO_F=['Vellin','Mira','Oskar','Thera','Irek','Solen','Ansa','Juno','Kael','Ysra'];
const CARTO_L=['of Ash','Fogborn','Dwell','Moonquill','Greenlight','Ruinweft','of the Weir','Brambleshade','Pilgrim','of Still Water'];

function gen(){
  const seed=document.getElementById('seed').value||'moss';
  const n=+document.getElementById('stars').value;
  const ec=+document.getElementById('edges').value;
  const moss=+document.getElementById('moss').value;
  const murmur=+document.getElementById('murmur').value;
  const ruins=+document.getElementById('ruins').value;
  document.getElementById('starsVal').textContent=n;
  document.getElementById('edgesVal').textContent=ec;
  document.getElementById('mossVal').textContent=moss;
  document.getElementById('murmurVal').textContent=murmur;
  document.getElementById('ruinsVal').textContent=ruins;

  const r=rng(hash(seed));
  const stars=[];
  for(let i=0;i<n;i++)stars.push({x:80+r()*540,y:60+r()*260,m:1+r()*2.5});
  // edges: MST-ish by sorted nearest-neighbor pairs limited by ec
  const edges=[];
  for(let i=0;i<stars.length;i++){
    const dists=[];
    for(let j=0;j<stars.length;j++)if(i!==j)dists.push([j,(stars[i].x-stars[j].x)**2+(stars[i].y-stars[j].y)**2]);
    dists.sort((a,b)=>a[1]-b[1]);
    for(let k=0;k<ec;k++)if(dists[k]&&i<dists[k][0])edges.push([i,dists[k][0]]);
  }

  const name=`${WORDS_A[Math.floor(r()*WORDS_A.length)]} ${WORDS_B[Math.floor(r()*WORDS_B.length)]}`;
  const author=`${CARTO_F[Math.floor(r()*CARTO_F.length)]} ${CARTO_L[Math.floor(r()*CARTO_L.length)]}`;
  document.getElementById('genName').textContent=name;
  document.getElementById('genAuthor').textContent=author;

  const svg=document.getElementById('out');
  svg.innerHTML='';
  const defs=`<defs><radialGradient id="meadow" cx="50%" cy="100%" r="80%"><stop offset="0%" stop-color="hsl(${140+moss},30%,22%)" stop-opacity=".7"/><stop offset="100%" stop-color="#0f1117" stop-opacity="0"/></radialGradient></defs>`;
  svg.insertAdjacentHTML('beforeend',defs);
  // meadow
  svg.insertAdjacentHTML('beforeend',`<rect x="0" y="340" width="700" height="160" fill="url(#meadow)"/>`);
  // moss patches
  for(let i=0;i<24;i++){
    const mx=r()*700,my=340+r()*160;
    svg.insertAdjacentHTML('beforeend',`<ellipse cx="${mx|0}" cy="${my|0}" rx="${(15+r()*40)|0}" ry="${(4+r()*8)|0}" class="moss" fill="hsl(${140+moss},30%,${25+r()*10}%)" fill-opacity=".2"/>`);
  }
  // rivers
  for(let i=0;i<murmur;i++){
    let d=`M 0 ${360+i*20}`;let x=0,y=360+i*20;
    for(let k=0;k<8;k++){x+=90;y+=r()*24-12;d+=` Q ${x-45} ${y+r()*30-15} ${x} ${y}`;}
    svg.insertAdjacentHTML('beforeend',`<path d="${d}" class="river"/>`);
  }
  // ruins on horizon
  for(let i=0;i<ruins;i++){
    const rx=40+(700/Math.max(ruins,1))*i+r()*30,rw=30+r()*50,rh=50+r()*90;
    svg.insertAdjacentHTML('beforeend',`<rect x="${rx|0}" y="${(340-rh)|0}" width="${rw|0}" height="${rh|0}" class="ruin"/>`);
    svg.insertAdjacentHTML('beforeend',`<circle cx="${(rx+rw/2)|0}" cy="340" r="${(3+r()*4)|0}" class="bloom"/>`);
  }
  // edges
  edges.forEach(([a,b])=>{
    svg.insertAdjacentHTML('beforeend',`<line x1="${stars[a].x|0}" y1="${stars[a].y|0}" x2="${stars[b].x|0}" y2="${stars[b].y|0}" class="edge"/>`);
  });
  // stars
  stars.forEach(s=>{
    svg.insertAdjacentHTML('beforeend',`<circle cx="${s.x|0}" cy="${s.y|0}" r="${s.m.toFixed(1)}" class="star"><title>magnitude ${s.m.toFixed(2)}</title></circle>`);
  });
  // title text
  svg.insertAdjacentHTML('beforeend',`<text x="20" y="28" fill="#6ee7b7" font-family="ui-monospace,monospace" font-size="13" font-style="italic">"${name}"</text>`);
  svg.insertAdjacentHTML('beforeend',`<text x="20" y="46" fill="#7c8aa4" font-family="ui-monospace,monospace" font-size="10">charted by ${author}</text>`);

  document.getElementById('stats').textContent=
`seed:    ${seed}
hash:    0x${hash(seed).toString(16).padStart(8,'0')}
stars:   ${n}
edges:   ${edges.length}
rivers:  ${murmur}
ruins:   ${ruins}
moss Δh: ${moss>=0?'+':''}${moss}
cart:    ${author}`;
}

function copySvg(){
  const svg=document.getElementById('out').outerHTML;
  navigator.clipboard?.writeText(svg).then(()=>{
    const b=document.getElementById('copy');const old=b.textContent;
    b.textContent='copied ✓';setTimeout(()=>b.textContent=old,1200);
  }).catch(()=>alert('copy failed — your browser may need HTTPS'));
}
function share(){
  const p=new URLSearchParams({seed:document.getElementById('seed').value,n:document.getElementById('stars').value,e:document.getElementById('edges').value,m:document.getElementById('moss').value,r:document.getElementById('murmur').value,u:document.getElementById('ruins').value});
  const url=location.origin+location.pathname+'#'+p.toString();
  navigator.clipboard?.writeText(url).then(()=>{
    const b=document.getElementById('share');const old=b.textContent;
    b.textContent='link ✓';setTimeout(()=>b.textContent=old,1200);
  });
}
function loadHash(){
  if(!location.hash)return;
  const p=new URLSearchParams(location.hash.slice(1));
  if(p.get('seed'))document.getElementById('seed').value=p.get('seed');
  if(p.get('n'))document.getElementById('stars').value=p.get('n');
  if(p.get('e'))document.getElementById('edges').value=p.get('e');
  if(p.get('m'))document.getElementById('moss').value=p.get('m');
  if(p.get('r'))document.getElementById('murmur').value=p.get('r');
  if(p.get('u'))document.getElementById('ruins').value=p.get('u');
}

['seed','stars','edges','moss','murmur','ruins'].forEach(id=>{
  document.getElementById(id).addEventListener('input',gen);
});
document.getElementById('reroll').onclick=()=>{
  document.getElementById('seed').value='seed-'+Math.random().toString(36).slice(2,8);gen();
};
document.getElementById('copy').onclick=copySvg;
document.getElementById('share').onclick=share;

loadHash();gen();