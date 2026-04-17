(() => {
  const $ = id => document.getElementById(id);
  const scene = $('scene'), ui = $('ui'), ctx = scene.getContext('2d');
  const edgeA = $('window-edge-a'), edgeB = $('window-edge-b'), bellRing = $('bell-ring');
  const judge = $('judgement'), eventsEl = $('events'), bellsEl = $('bells');
  let state = initial();

  function fnv1a(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function xors(seed) { let s = seed | 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296); }; }

  function initial() {
    const seed = fnv1a('drifting-paper-cranes-silver-river-foxes-bells');
    const rand = xors(seed);
    const bells = Array.from({length: 12}, (_, i) => ({
      id: i, period: 1.2 + rand() * 2.4, phase: rand() * 6.283,
      hue: Math.floor(rand() * 360), tolled: false, last: 0,
    }));
    return {
      seed, rand, bells, t: 0, running: false,
      score: 0, streak: 0, pityMiss: 0, pityBonus: 0,
      foxStatus: 'SLEEPING', // SLEEPING | DREAMING | WAKE
      events: [], // immutable action-event log
      cranes: Array.from({length: 6}, (_, i) => ({ x: rand(), y: 0.3 + rand() * 0.2, spd: 0.04 + rand() * 0.06, hue: Math.floor(rand() * 360) })),
    };
  }

  function fit() {
    const r = scene.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    scene.width = r.width * dpr; scene.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ui.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
  }
  window.addEventListener('resize', fit);

  // pure reducer — returns {state, events}
  function reduce(s, action) {
    const log = [];
    switch (action.type) {
      case 'tick': {
        const t = s.t + action.dt;
        const nb = s.bells.map(b => {
          const prevPhase = ((s.t + b.phase) / b.period) % 1;
          const nextPhase = ((t + b.phase) / b.period) % 1;
          const crossed = nextPhase < prevPhase;
          if (crossed) log.push({ t, type: 'bell-toll', id: b.id });
          return { ...b, tolled: crossed, last: crossed ? t : b.last };
        });
        // fox status FSM — wake if recent hum, else dream/sleep
        let foxStatus = s.foxStatus;
        if (s.events.at(-1) && s.events.at(-1).type === 'hum' && (t - s.events.at(-1).t) < 1.2) foxStatus = 'WAKE';
        else if ((t % 7) < 3) foxStatus = 'DREAMING';
        else foxStatus = 'SLEEPING';
        return { ...s, t, bells: nb, foxStatus, events: [...s.events, ...log].slice(-200) };
      }
      case 'hum': {
        // timing-grade: find nearest bell peak
        let best = null, bd = Infinity;
        for (const b of s.bells) {
          const phase = ((s.t + b.phase) / b.period) % 1;
          const d = Math.min(phase, 1 - phase) * b.period;
          if (d < bd) { bd = d; best = b; }
        }
        const pityBonusSec = s.pityMiss >= 3 ? 0.09 : 0;
        const perfect = 0.08 + pityBonusSec;
        const good = 0.22 + pityBonusSec;
        let grade = 'miss', delta = 0;
        if (bd <= perfect) { grade = 'perfect'; delta = 100 + s.streak * 10; }
        else if (bd <= good) { grade = 'good'; delta = 40 + s.streak * 4; }
        const streak = grade === 'miss' ? 0 : s.streak + 1;
        const pityMiss = grade === 'miss' ? s.pityMiss + 1 : 0;
        const ev = { t: s.t, type: 'hum', bellId: best.id, grade, delta, bd };
        return { ...s, score: s.score + delta, streak, pityMiss,
          events: [...s.events, ev].slice(-200) };
      }
      case 'reset': return { ...initial(), running: s.running };
      case 'start': return { ...s, running: !s.running };
    }
    return s;
  }

  function dispatch(action) {
    state = reduce(state, action);
    render();
  }

  // rendering — command-query separation: no mutation in render
  function render() {
    $('score').textContent = state.score;
    $('streak').textContent = state.streak;
    $('pity').textContent = state.pityMiss;
    $('status').textContent = state.foxStatus;
    // bells panel
    bellsEl.innerHTML = '';
    state.bells.forEach(b => {
      const li = document.createElement('li');
      li.className = b.tolled ? 'on' : '';
      const p = ((state.t + b.phase) / b.period) % 1;
      li.textContent = `#${String(b.id).padStart(2,'0')} T=${b.period.toFixed(2)}s φ=${p.toFixed(2)}`;
      bellsEl.appendChild(li);
    });
    // events panel
    eventsEl.innerHTML = '';
    state.events.slice(-40).reverse().forEach(ev => {
      const li = document.createElement('li');
      li.className = ev.grade || '';
      const t = ev.t.toFixed(2);
      if (ev.type === 'hum') li.textContent = `${t}  hum  bell#${ev.bellId}  ${ev.grade}  Δ${ev.bd?.toFixed(3)}`;
      else li.textContent = `${t}  bell#${ev.id}  toll`;
      eventsEl.appendChild(li);
    });
    drawScene();
    updateWindowIndicators();
  }

  function updateWindowIndicators() {
    // active bell: the one closest to its peak
    let best = null, bd = Infinity;
    for (const b of state.bells) {
      const phase = ((state.t + b.phase) / b.period) % 1;
      const d = Math.min(phase, 1 - phase) * b.period;
      if (d < bd) { bd = d; best = b; }
    }
    if (!best) return;
    const pityBonus = state.pityMiss >= 3 ? 0.09 : 0;
    const perfect = 0.08 + pityBonus;
    const r = scene.getBoundingClientRect();
    const cx = r.width / 2, cy = r.height / 2;
    const scale = 120;
    edgeA.setAttribute('x1', cx - perfect * scale); edgeA.setAttribute('x2', cx - perfect * scale);
    edgeA.setAttribute('y1', cy - 80); edgeA.setAttribute('y2', cy + 80);
    edgeB.setAttribute('x1', cx + perfect * scale); edgeB.setAttribute('x2', cx + perfect * scale);
    edgeB.setAttribute('y1', cy - 80); edgeB.setAttribute('y2', cy + 80);
    bellRing.setAttribute('cx', cx); bellRing.setAttribute('cy', cy);
    bellRing.setAttribute('opacity', best.tolled ? 0.9 : 0.3);
    bellRing.setAttribute('stroke', `hsl(${best.hue},55%,70%)`);
  }

  function drawScene() {
    const w = scene.clientWidth, h = scene.clientHeight;
    ctx.clearRect(0, 0, w, h);
    // horizon layers — parallax sines
    for (let L = 0; L < 3; L++) {
      const base = h * (0.58 + L * 0.06);
      ctx.fillStyle = `rgba(${46 + L * 14},${52 + L * 14},${78 + L * 12},${0.85 - L * 0.22})`;
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 6) {
        const y = base
          - Math.sin(x * 0.008 + L * 1.4 + state.t * 0.04) * (26 + L * 8)
          - Math.sin(x * 0.019 + L * 0.3) * (10 + L * 4);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    }
    // cranes (particles)
    state.cranes.forEach(c => {
      const x = ((c.x + state.t * c.spd) % 1) * w;
      const y = c.y * h - Math.sin(state.t * 2 + c.hue) * 4;
      ctx.fillStyle = `hsla(${c.hue},50%,80%,0.85)`;
      ctx.beginPath();
      ctx.moveTo(x - 10, y); ctx.lineTo(x, y - 6); ctx.lineTo(x + 10, y); ctx.lineTo(x, y + 2);
      ctx.closePath(); ctx.fill();
    });
    // bells near top
    state.bells.forEach((b, i) => {
      const bx = 40 + (i / state.bells.length) * (w - 80);
      const by = 56 + Math.sin(state.t * 1.3 + i) * 3;
      const phase = ((state.t + b.phase) / b.period) % 1;
      const swing = Math.sin(phase * 6.283);
      ctx.save(); ctx.translate(bx, by); ctx.rotate(swing * 0.3);
      ctx.fillStyle = `hsla(${b.hue},45%,70%,${0.55 + (b.tolled ? 0.4 : 0)})`;
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(0, -18, 10, 0); ctx.lineTo(8, 14); ctx.lineTo(-8, 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e6ecff'; ctx.beginPath(); ctx.arc(0, 16, 2.5, 0, 6.283); ctx.fill();
      ctx.restore();
    });
    // fox
    const fx = w / 2, fy = h * 0.72;
    const breathing = Math.sin(state.t * 1.1) * 2;
    ctx.save(); ctx.translate(fx, fy);
    ctx.fillStyle = 'rgba(246,193,119,0.92)';
    ctx.beginPath(); ctx.ellipse(0, 0, 70, 22 + breathing, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-70, 0); ctx.quadraticCurveTo(-110, -10, -100, 12); ctx.quadraticCurveTo(-84, 8, -70, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-58, -14); ctx.lineTo(-46, -30); ctx.lineTo(-38, -12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(58, -14); ctx.lineTo(46, -30); ctx.lineTo(38, -12); ctx.fill();
    // eye
    ctx.fillStyle = '#0c0f17';
    if (state.foxStatus === 'WAKE') { ctx.beginPath(); ctx.arc(-18, -6, 2.5, 0, 6.283); ctx.fill(); }
    else { ctx.fillRect(-22, -7, 10, 1.2); }
    // tail
    ctx.fillStyle = 'rgba(246,193,119,0.92)';
    ctx.beginPath();
    ctx.moveTo(60, 10);
    ctx.quadraticCurveTo(120 + Math.sin(state.t) * 6, -10, 90, -22);
    ctx.quadraticCurveTo(70, -6, 60, 10); ctx.fill();
    // dream bubbles while DREAMING
    if (state.foxStatus === 'DREAMING') {
      ctx.fillStyle = 'rgba(110,231,183,0.6)'; ctx.font = '12px ui-monospace';
      const z = (Math.sin(state.t * 1.3) * 0.5 + 0.5);
      ctx.fillText('z', 18, -30 - z * 4);
      ctx.fillText('Z', 28, -48 - z * 10);
    }
    ctx.restore();
    // click hint
    if (!state.running) {
      ctx.fillStyle = 'rgba(200,206,219,0.5)';
      ctx.font = '13px ui-sans-serif';
      ctx.fillText('press start · then space or click to hum', 16, h - 14);
    }
  }

  function showJudgement(grade) {
    judge.className = 'judgement ' + grade + ' show';
    judge.textContent = grade === 'perfect' ? 'PERFECT' : grade === 'good' ? 'GOOD' : 'MISS';
    clearTimeout(showJudgement._t);
    showJudgement._t = setTimeout(() => judge.className = 'judgement ' + grade, 350);
  }

  // input (space + click)
  window.addEventListener('keydown', ev => {
    if (ev.code === 'Space' && state.running) { ev.preventDefault(); hum(); }
  });
  scene.addEventListener('click', () => { if (state.running) hum(); });
  function hum() {
    dispatch({ type: 'hum' });
    const last = state.events.at(-1);
    if (last && last.type === 'hum') showJudgement(last.grade);
  }

  $('start').onclick = () => { state = reduce(state, { type: 'start' }); $('start').textContent = state.running ? 'pause' : 'start'; };
  $('reset').onclick = () => { state = initial(); render(); $('start').textContent = 'start'; };

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (state.running) dispatch({ type: 'tick', dt });
    else render();
    requestAnimationFrame(loop);
  }
  fit(); render(); requestAnimationFrame(loop);
})();