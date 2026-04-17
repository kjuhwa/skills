(() => {
  const scene = document.getElementById('scene');
  const ctx = scene.getContext('2d');
  const cursor = document.getElementById('cursor');
  const eventsEl = document.getElementById('events');
  const effectsEl = document.getElementById('effects');
  const status = document.getElementById('status');
  const hDay = document.getElementById('h-day');
  const hStam = document.getElementById('h-stam');
  const hWater = document.getElementById('h-water');
  const hCopper = document.getElementById('h-copper');
  const hPity = document.getElementById('h-pity');
  const hMoons = document.getElementById('h-moons');

  const W = scene.width, H = scene.height;

  // state (never mutated — always replaced)
  let state = {
    day:1, stamina:100, water:12, copper:7,
    pity:0, phase:0, storm:0.3, progress:0,
    caravan:{x:110,y:330}, effects:{}, moons:['◐','◓']
  };

  const eventsLog = [];

  function clone(s){ return JSON.parse(JSON.stringify(s)); }

  function applyAction(state, action){
    const s = clone(state);
    const events = [];
    const now = performance.now();
    const phase = ((now/700) % 1); // 0..1 loop for rhythm
    const goldenCenter = 0.5;
    const goldenWidthBase = 0.08;
    // pity expands golden window
    const goldenWidth = goldenWidthBase + (s.pity/9)*0.12;
    const stormPenalty = 1 + s.storm*0.8;

    if (action.type === 'march'){
      const dist = Math.abs(phase - goldenCenter);
      const hit = dist < goldenWidth/2;
      const perfect = dist < goldenWidth/6;
      if (perfect){
        s.progress += 12;
        s.stamina -= Math.max(1, 4*stormPenalty);
        s.pity = 0;
        events.push({k:'hit',m:`golden verse · +12 progress · storm ×${stormPenalty.toFixed(2)}`});
      } else if (hit){
        s.progress += 7;
        s.stamina -= Math.max(2, 6*stormPenalty);
        s.pity = Math.max(0, s.pity-1);
        events.push({k:'hit',m:`aligned verse · +7 progress`});
      } else {
        s.stamina -= Math.max(3, 8*stormPenalty);
        s.pity = Math.min(9, s.pity+1);
        events.push({k:'miss',m:`mistimed stride · pity ${s.pity}/9`});
      }
      s.caravan.x += hit ? 22 : 8;
      // divide-by-zero guard on rate calc
      const rate = s.progress / Math.max(1, s.day);
      s.rate = rate;
    } else if (action.type === 'rest'){
      s.stamina = Math.min(100, s.stamina + 22);
      s.water = Math.max(0, s.water - 1);
      s.day += 1;
      events.push({k:'',m:`rested at oasis · +22 stamina · -1 water`});
    } else if (action.type === 'invoke'){
      if (s.copper < 2){ events.push({k:'miss',m:'not enough copper to call the moons'}); }
      else {
        s.copper -= 2;
        s.storm = Math.max(0, s.storm - 0.25);
        s.effects.blessed = 3;
        events.push({k:'moon',m:`twin moons whisper · storm eased`});
      }
    } else if (action.type === 'reroute'){
      // adaptive strategy hot-swap metaphor: re-pick a direction if score improves
      const candidateStorm = Math.max(0, s.storm - 0.1 + (Math.random()-0.5)*0.2);
      if (candidateStorm < s.storm - 0.05){
        s.storm = candidateStorm;
        events.push({k:'',m:`reroute accepted · storm → ${s.storm.toFixed(2)}`});
      } else events.push({k:'miss',m:`reroute rejected · hysteresis held`});
    } else if (action.type === 'commit'){
      events.push({k:'moon', m:`verse committed to the copper map`});
      s.day += 1;
    }

    // tide: storm drifts, moons rotate
    s.storm = Math.max(0, Math.min(1, s.storm + (Math.random()-0.5)*0.04));
    s.phase = (s.phase + 17) % 360;

    // status effect decay
    if (s.effects.blessed){ s.effects.blessed--; if(!s.effects.blessed) delete s.effects.blessed; }

    // layered risk gate: stamina floor
    if (s.stamina <= 0){
      s.stamina = 30; s.day += 1; s.water = Math.max(0, s.water-2);
      events.push({k:'miss',m:`collapse · rescued by the dunes · -2 water`});
    }

    return {state:s, events};
  }

  function render(){
    // backdrop trail fade
    ctx.fillStyle = 'rgba(11,7,8,0.25)';
    ctx.fillRect(0,0,W,H);

    // parallax horizons
    for (let L=0; L<4; L++){
      ctx.beginPath(); ctx.moveTo(0,H);
      const base = H - 90 - L*28;
      const amp = 10 - L*2;
      const ph = performance.now()*0.0005 + L;
      for (let x=0;x<=W;x+=6){
        const y = base + Math.sin(x*0.01 + ph)*amp + Math.sin(x*0.021 + ph*1.7)*amp*0.5;
        ctx.lineTo(x,y);
      }
      ctx.lineTo(W,H); ctx.closePath();
      ctx.fillStyle = `rgba(${80-L*8},${48-L*6},${32-L*4},${0.95 - L*0.2})`;
      ctx.fill();
    }

    // twin moons
    const a = performance.now()*0.0004;
    drawMoon(W*0.22 + Math.cos(a)*12, 90, 32, '#f4e9c1');
    drawMoon(W*0.78 + Math.cos(a+1)*14, 70, 24, '#b9c7ff');

    // sandstorm haze
    ctx.fillStyle = `rgba(245,158,122,${0.08 + state.storm*0.22})`;
    ctx.fillRect(0, H*0.45, W, H*0.55);

    // caravan glyph
    const cx = 110 + (state.progress % 640), cy = 320 + Math.sin(performance.now()*0.003)*4;
    ctx.fillStyle = '#6ee7b7';
    ctx.fillRect(cx-4, cy-10, 8, 10);
    ctx.fillStyle = '#c88a5b';
    ctx.beginPath(); ctx.arc(cx, cy-16, 5, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(200,138,91,.6)';
    ctx.beginPath(); ctx.moveTo(cx-6,cy); ctx.lineTo(cx-18,cy+8); ctx.moveTo(cx+6,cy); ctx.lineTo(cx+18,cy+8); ctx.stroke();

    // rhythm cursor
    const phase = ((performance.now()/700) % 1);
    cursor.style.left = (phase*100) + '%';

    // HUD
    hDay.textContent = state.day;
    hStam.textContent = Math.round(state.stamina);
    hWater.textContent = state.water;
    hCopper.textContent = state.copper;
    hPity.textContent = state.pity;
    hMoons.textContent = state.moons.join(' ');

    requestAnimationFrame(render);
  }

  function drawMoon(x,y,r,color){
    const g = ctx.createRadialGradient(x,y,2,x,y,r*1.7);
    g.addColorStop(0,color); g.addColorStop(0.6,color+'aa'); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }

  function dispatch(type){
    const { state: next, events } = applyAction(state, {type});
    state = next;
    for (const ev of events){
      const li = document.createElement('li');
      li.className = ev.k;
      li.textContent = `d${state.day} · ${ev.m}`;
      eventsEl.prepend(li);
      eventsLog.push(ev);
      if (eventsEl.children.length > 24) eventsEl.lastChild.remove();
    }
    // render effects
    effectsEl.innerHTML = '';
    for (const k of Object.keys(state.effects)){
      const li = document.createElement('li');
      li.textContent = `${k} · ${state.effects[k]} turns`;
      effectsEl.appendChild(li);
    }
    if (!Object.keys(state.effects).length){
      effectsEl.innerHTML = '<li style="color:#666">no wind at your back</li>';
    }
    status.textContent = `turn ${state.day} · progress ${Math.round(state.progress)} · storm ${(state.storm*100).toFixed(0)}%`;
  }

  document.querySelectorAll('.actions button').forEach(b => {
    b.addEventListener('click', () => dispatch(b.dataset.act));
  });
  document.addEventListener('keydown', e => {
    if (e.code === 'KeyJ') dispatch('march');
    if (e.code === 'KeyR') dispatch('rest');
    if (e.code === 'KeyM') dispatch('invoke');
    if (e.code === 'KeyT') dispatch('reroute');
    if (e.code === 'KeyC') dispatch('commit');
  });

  dispatch('commit'); // seed the log
  render();
})();