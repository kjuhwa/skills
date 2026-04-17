(() => {
  const sky = document.getElementById('sky');
  const hit = document.getElementById('hit');
  const ctx = sky.getContext('2d');
  const logEl = document.getElementById('log');
  const loreEl = document.getElementById('lore');
  const countEl = document.getElementById('count');

  const LORE = [
    'The weaver of Althea traced this arc with silver thread before the second moon.',
    'Comets remember names the parchment has forgotten.',
    'A shepherd in the reed-sea stitched these seven stars into a sail.',
    'No one agrees on this constellation\'s ending; the map leaves it open.',
    'This cluster was called the Whispering Loom in the old dialects.',
    'A cartographer fell asleep here and woke as a comet.',
    'The thread passes through a star that is not a star, but a rumor.'
  ];

  const stars = [];
  const comets = [];
  const stitched = [];
  let t = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = sky.getBoundingClientRect();
    sky.width = r.width * dpr;
    sky.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);

  function seedSky(n = 180) {
    stars.length = 0;
    const r = sky.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      stars.push({
        id: i,
        x: Math.random() * r.width,
        y: Math.random() * r.height,
        base: 0.4 + Math.random() * 0.9,
        f1: 0.6 + Math.random() * 1.4,
        f2: 1.1 + Math.random() * 2.1,
        hue: 40 + Math.random() * 20,
        big: Math.random() < 0.07
      });
    }
    stitched.length = 0;
    renderHit();
    updateCount();
  }

  function spawnComet() {
    const r = sky.getBoundingClientRect();
    comets.push({
      x: Math.random() * r.width,
      y: -20,
      vx: (Math.random() - 0.4) * 2.4,
      vy: 1.2 + Math.random() * 1.6,
      life: 0,
      ttl: 80 + Math.random() * 50,
      tail: []
    });
  }

  function draw() {
    t += 1;
    const r = sky.getBoundingClientRect();
    ctx.fillStyle = 'rgba(10,12,18,0.35)';
    ctx.fillRect(0, 0, r.width, r.height);

    for (const s of stars) {
      const flick = s.base
        + 0.18 * Math.sin((t * 0.04) * s.f1)
        + 0.09 * Math.sin((t * 0.017) * s.f2 + 1.3);
      const a = Math.max(0.05, Math.min(1, flick));
      ctx.fillStyle = `hsla(${s.hue},70%,${60 + a * 20}%,${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.big ? 2.2 : 1.1, 0, Math.PI * 2);
      ctx.fill();
      if (s.big && a > 0.85) {
        ctx.fillStyle = `hsla(${s.hue},70%,80%,0.12)`;
        ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, Math.PI * 2); ctx.fill();
      }
    }

    if (Math.random() < 0.015) spawnComet();
    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i];
      c.tail.push({ x: c.x, y: c.y });
      if (c.tail.length > 22) c.tail.shift();
      c.x += c.vx; c.y += c.vy; c.life++;
      for (let j = 0; j < c.tail.length; j++) {
        const p = c.tail[j];
        const alpha = (j / c.tail.length) * 0.6;
        ctx.fillStyle = `rgba(214,226,238,${alpha})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#eef4ff';
      ctx.beginPath(); ctx.arc(c.x, c.y, 2, 0, Math.PI * 2); ctx.fill();
      if (c.life > c.ttl || c.y > r.height + 40 || c.x < -40 || c.x > r.width + 40) {
        comets.splice(i, 1);
      }
    }

    if (stitched.length) {
      ctx.strokeStyle = 'rgba(110,231,183,0.55)';
      ctx.lineWidth = 1.1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      for (let i = 0; i < stitched.length; i++) {
        const s = stars[stitched[i]];
        if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      for (const idx of stitched) {
        const s = stars[idx];
        ctx.strokeStyle = 'rgba(110,231,183,0.9)';
        ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.stroke();
      }
    }

    requestAnimationFrame(draw);
  }

  function renderHit() {
    hit.innerHTML = '';
    const r = sky.getBoundingClientRect();
    hit.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    for (const s of stars) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', s.x); c.setAttribute('cy', s.y);
      c.setAttribute('r', 10);
      c.setAttribute('fill', 'transparent');
      c.style.cursor = 'crosshair';
      c.addEventListener('click', () => stitch(s.id));
      hit.appendChild(c);
    }
  }

  function stitch(id) {
    if (stitched[stitched.length - 1] === id) return;
    stitched.push(id);
    const li = document.createElement('li');
    li.innerHTML = `<span class="n">${stitched.length}.</span>star #${id.toString().padStart(3,'0')} @ (${stars[id].x|0}, ${stars[id].y|0})`;
    logEl.prepend(li);
    updateCount();
    loreEl.textContent = LORE[(stitched.length + id) % LORE.length];
  }

  function updateCount() {
    countEl.textContent = `${stitched.length} stars stitched`;
  }

  document.getElementById('clear').addEventListener('click', () => {
    stitched.length = 0;
    logEl.innerHTML = '';
    loreEl.textContent = 'The thread has been pulled out. Begin again.';
    updateCount();
  });
  document.getElementById('seed').addEventListener('click', () => {
    resize(); seedSky();
  });

  resize(); seedSky(); draw();
})();