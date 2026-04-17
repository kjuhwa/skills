(() => {
  const sky = document.getElementById('sky');
  const svg = document.getElementById('overlay');
  const ctx = sky.getContext('2d');
  const seedInput = document.getElementById('seed');
  const stormInput = document.getElementById('storm');
  const phaseInput = document.getElementById('phase');
  const status = document.getElementById('status');
  const drawer = document.getElementById('drawer');
  const btnDrawer = document.getElementById('toggle-drawer');
  const btnShuffle = document.getElementById('shuffle');
  const kCar = document.getElementById('k-caravan');
  const kCon = document.getElementById('k-constellation');
  const kStorm = document.getElementById('k-storm');
  const kPhase = document.getElementById('k-phase');
  const kCity = document.getElementById('k-city');
  const kMesh = document.getElementById('k-mesh');

  const W = 1200, H = 720;
  let stars = [], edges = [], cities = [], caravans = [], particles = [];
  let t = 0, paused = false, activeStar = null;

  function hashSeed(s){
    let h = 2166136261 >>> 0;
    for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed){
    let x = seed || 1;
    return () => { x ^= x<<13; x ^= x>>>17; x ^= x<<5; return ((x>>>0)%100000)/100000; };
  }

  const CITIES = ['Ankhara','Zavren','Ilmet','Qarisun','Oropheth','Nuithra','Saffrin','Tel-Ochre'];
  const CONSTELLATIONS = ['Copper Jackal','Twin Moons','Winding Caravan','Lost Cartographer','Storm Serpent','Hollow Lantern','Starless Gate','Dune Singer'];

  function rebuild(seedStr){
    const r = rng(hashSeed(seedStr));
    stars = []; edges = []; cities = []; caravans = [];
    const N = 84;
    for (let i=0;i<N;i++){
      stars.push({
        id:i,
        x:60 + r()*(W-120),
        y:60 + r()*(H-200),
        m: 0.4 + r()*1.8,
        twinkle: r()*Math.PI*2,
        hue: r() > .85 ? 'b' : 'a'
      });
    }
    // constellation edges: group by proximity
    for (let i=0;i<N;i++){
      const a = stars[i];
      const neighbors = stars
        .map((s,j)=>({j,d:(s.x-a.x)**2+(s.y-a.y)**2}))
        .filter(o=>o.j!==i)
        .sort((x,y)=>x.d-y.d).slice(0,2);
      for (const n of neighbors){
        if (n.d < 14000 && r() > .55) edges.push([i,n.j, r()<.3 ? CONSTELLATIONS[Math.floor(r()*CONSTELLATIONS.length)] : null]);
      }
    }
    // forgotten cities along horizon
    for (let i=0;i<6;i++){
      cities.push({
        name: CITIES[Math.floor(r()*CITIES.length)],
        x: 80 + i*(W-160)/5 + (r()-.5)*40,
        y: H - 130 - r()*40,
        decay: r()
      });
    }
    // caravans as polylines between 4-6 cities
    for (let c=0;c<3;c++){
      const path = [];
      const count = 4 + Math.floor(r()*3);
      for (let p=0;p<count;p++){
        const src = cities[Math.floor(r()*cities.length)];
        path.push({x:src.x + (r()-.5)*30, y:src.y - r()*20});
      }
      caravans.push({path, phase:r()*Math.PI*2, name:'caravan-'+(c+1)});
    }
    // sand particles (flowfield)
    particles = [];
    for (let i=0;i<240;i++){
      particles.push({x:r()*W, y:H-180 + r()*200, vx:0, vy:0, life:r()});
    }
    renderOverlay();
    status.textContent = `charted · seed=${seedStr} · ${stars.length} stars · ${cities.length} cities · ${caravans.length} caravans`;
  }

  function renderOverlay(){
    svg.innerHTML = '';
    // constellation edges
    for (const [i,j,label] of edges){
      const a = stars[i], b = stars[j];
      const ln = document.createElementNS('http://www.w3.org/2000/svg','line');
      ln.setAttribute('x1',a.x); ln.setAttribute('y1',a.y);
      ln.setAttribute('x2',b.x); ln.setAttribute('y2',b.y);
      ln.setAttribute('class','edge');
      svg.appendChild(ln);
      if (label){
        const tx = document.createElementNS('http://www.w3.org/2000/svg','text');
        tx.setAttribute('x',(a.x+b.x)/2); tx.setAttribute('y',(a.y+b.y)/2-4);
        tx.textContent = label; svg.appendChild(tx);
      }
    }
    for (const s of stars){
      const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('cx',s.x); c.setAttribute('cy',s.y); c.setAttribute('r',1.5+s.m);
      c.setAttribute('fill', s.hue === 'b' ? '#b9c7ff' : '#f4e9c1');
      c.setAttribute('class','star');
      c.addEventListener('mouseenter', () => {
        activeStar = s;
        kCon.textContent = CONSTELLATIONS[s.id % CONSTELLATIONS.length];
        kCar.textContent = caravans[s.id % caravans.length].name;
        kCity.textContent = cities[s.id % cities.length].name;
        kMesh.textContent = ['gateway','bff','sidecar','mesh','materialized'][s.id%5];
      });
      c.addEventListener('click', () => {
        status.textContent = `bound star ${s.id} to constellation ${CONSTELLATIONS[s.id % CONSTELLATIONS.length]}`;
      });
      svg.appendChild(c);
    }
  }

  function draw(){
    t += paused ? 0 : 0.016;
    ctx.fillStyle = 'rgba(5,6,8,0.22)';
    ctx.fillRect(0,0,W,H);

    // parallax horizon silhouettes (sine displaced)
    const layers = 4;
    for (let L=0; L<layers; L++){
      ctx.beginPath();
      ctx.moveTo(0, H);
      const base = H - 140 + L*28;
      const amp = 12 - L*2;
      const freq = 0.004 + L*0.0011;
      for (let x=0;x<=W;x+=6){
        const y = base + Math.sin(x*freq + t*(0.2 + L*0.07)) * amp
                       + Math.sin(x*freq*2.3 + t*0.13) * (amp*0.4);
        ctx.lineTo(x,y);
      }
      ctx.lineTo(W,H); ctx.closePath();
      ctx.fillStyle = `rgba(${60-L*6},${36-L*5},${28-L*4},${0.92 - L*0.18})`;
      ctx.fill();
    }

    // twin moons
    const ph = +phaseInput.value * Math.PI/180;
    drawMoon(W*0.22 + Math.cos(t*0.05)*16, 140 + Math.sin(t*0.07)*10, 46, '#f4e9c1', ph);
    drawMoon(W*0.72 + Math.cos(t*0.04+1)*18, 110 + Math.sin(t*0.06+0.7)*14, 34, '#b9c7ff', ph+Math.PI/3);

    // sand particles (flowfield advection)
    const stormV = +stormInput.value / 100;
    for (const p of particles){
      const a = Math.sin(p.x*0.01 + t*0.4) * 0.8 + Math.cos(p.y*0.013 - t*0.3) * 0.6;
      p.vx += Math.cos(a) * 0.08 * (0.3 + stormV*1.5);
      p.vy += Math.sin(a) * 0.04 * (0.3 + stormV*1.5);
      p.vx *= 0.9; p.vy *= 0.92;
      p.x += p.vx; p.y += p.vy;
      if (p.x<0||p.x>W||p.y<H-200||p.y>H) { p.x=Math.random()*W; p.y=H-180+Math.random()*200; }
      ctx.fillStyle = `rgba(245,158,122,${0.12 + stormV*0.35})`;
      ctx.fillRect(p.x, p.y, 1.4, 1.4);
    }

    // caravans
    for (const c of caravans){
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(110,231,183,0.55)';
      ctx.lineWidth = 1.1;
      ctx.setLineDash([4,3]);
      ctx.lineDashOffset = -t*20;
      c.path.forEach((pt,i)=>{ i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y); });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // cities
    for (const c of cities){
      const flick = 0.6 + 0.4*Math.sin(t*1.3 + c.x*0.01) + 0.2*Math.sin(t*2.1+c.y*0.02);
      ctx.fillStyle = `rgba(200,138,91,${0.35+flick*0.2})`;
      ctx.beginPath(); ctx.arc(c.x,c.y,3+flick,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(231,227,212,0.55)';
      ctx.font = '10px ui-monospace';
      ctx.fillText(c.name, c.x+6, c.y-4);
    }

    // HUD updates
    kStorm.textContent = (stormV*100).toFixed(0) + '%';
    kPhase.textContent = (+phaseInput.value).toFixed(0) + '°';

    requestAnimationFrame(draw);
  }

  function drawMoon(x,y,r,color,phase){
    const g = ctx.createRadialGradient(x,y,2,x,y,r*1.6);
    g.addColorStop(0,color);
    g.addColorStop(0.6, color+'aa');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    // terminator
    ctx.fillStyle = 'rgba(10,10,16,0.75)';
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(phase)*r*0.6, y, r*Math.abs(Math.sin(phase))+2, r, 0, 0, Math.PI*2);
    ctx.fill();
  }

  btnShuffle.addEventListener('click', () => rebuild(seedInput.value + ':' + Date.now().toString(36)));
  seedInput.addEventListener('change', () => rebuild(seedInput.value));
  btnDrawer.addEventListener('click', () => drawer.classList.toggle('collapsed'));
  document.addEventListener('keydown', e => {
    if (e.code === 'Space'){ paused = !paused; status.textContent = paused ? 'time frozen · twin moons still' : 'time flowing · sandstorm awake'; }
  });

  rebuild(seedInput.value);
  draw();
})();