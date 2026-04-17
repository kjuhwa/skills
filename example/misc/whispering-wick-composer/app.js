const stage = document.getElementById('stage');
const recipeEl = document.getElementById('recipe');
const state = {
  shape: 'sphere',
  color: '#fbbf24',
  height: 30,
  width: 24,
  pattern: 'solid',
  flicker: 0.4,
  inscription: 'may the quiet find you',
};

function bindSegmented(id, key) {
  const group = document.getElementById(id);
  group.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      group.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      state[key] = b.dataset.v;
      render();
    });
  });
}
bindSegmented('shape', 'shape');
bindSegmented('pattern', 'pattern');

const colorEl = document.getElementById('color');
const heightEl = document.getElementById('height');
const widthEl = document.getElementById('width');
const flickerEl = document.getElementById('flicker');
const inscriptionEl = document.getElementById('inscription');

colorEl.addEventListener('input', e => { state.color = e.target.value; document.getElementById('colorVal').textContent = state.color; render(); });
heightEl.addEventListener('input', e => { state.height = +e.target.value; document.getElementById('heightVal').textContent = `${state.height} cm`; render(); });
widthEl.addEventListener('input', e => { state.width = +e.target.value; document.getElementById('widthVal').textContent = `${state.width} cm`; render(); });
flickerEl.addEventListener('input', e => { state.flicker = +e.target.value / 100; document.getElementById('flickerVal').textContent = state.flicker.toFixed(2); render(); });
inscriptionEl.addEventListener('input', e => { state.inscription = e.target.value; render(); });

document.getElementById('shuffle').addEventListener('click', () => {
  const shapes = ['sphere','cylinder','diamond','teardrop'];
  const patterns = ['solid','lattice','blossom','glyphs'];
  const palette = ['#fbbf24','#f472b6','#a78bfa','#60a5fa','#34d399','#fb7185'];
  const phrases = ['may the quiet find you','wishes travel lightly','return to the river','remember the warm room','courage at dawn','a soft hour'];
  state.shape = shapes[Math.floor(Math.random()*shapes.length)];
  state.pattern = patterns[Math.floor(Math.random()*patterns.length)];
  state.color = palette[Math.floor(Math.random()*palette.length)];
  state.height = 15 + Math.floor(Math.random()*65);
  state.width = 12 + Math.floor(Math.random()*48);
  state.flicker = Math.random();
  state.inscription = phrases[Math.floor(Math.random()*phrases.length)];
  syncUI(); render();
});

document.getElementById('copy').addEventListener('click', async () => {
  const json = JSON.stringify(recipe(), null, 2);
  await navigator.clipboard.writeText(json);
  const btn = document.getElementById('copy');
  const orig = btn.textContent;
  btn.textContent = 'Copied!';
  setTimeout(() => btn.textContent = orig, 1200);
});

function syncUI() {
  colorEl.value = state.color;
  document.getElementById('colorVal').textContent = state.color;
  heightEl.value = state.height; document.getElementById('heightVal').textContent = `${state.height} cm`;
  widthEl.value = state.width; document.getElementById('widthVal').textContent = `${state.width} cm`;
  flickerEl.value = state.flicker * 100; document.getElementById('flickerVal').textContent = state.flicker.toFixed(2);
  inscriptionEl.value = state.inscription;
  ['shape','pattern'].forEach(k => {
    document.querySelectorAll(`#${k} button`).forEach(b => {
      b.classList.toggle('active', b.dataset.v === state[k]);
    });
  });
}

function recipe() {
  const paper = (state.height * state.width * 0.0021).toFixed(2);
  const wire = ((state.height + state.width) * 0.08).toFixed(2);
  const burn = Math.round((state.height * state.width) / (6 + state.flicker * 4));
  return {
    shape: state.shape,
    pattern: state.pattern,
    color: state.color,
    dimensions: { height_cm: state.height, width_cm: state.width },
    flicker: +state.flicker.toFixed(2),
    inscription: state.inscription,
    materials: { paper_sqm: +paper, wire_m: +wire, est_burn_min: burn },
  };
}

function buildShape(cx, cy, w, h, color) {
  switch (state.shape) {
    case 'sphere': return `<ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="${h}" fill="${color}" />`;
    case 'cylinder':
      return `<ellipse cx="${cx}" cy="${cy - h}" rx="${w}" ry="${w*0.25}" fill="${color}" />
              <rect x="${cx-w}" y="${cy-h}" width="${w*2}" height="${h*2}" fill="${color}" />
              <ellipse cx="${cx}" cy="${cy + h}" rx="${w}" ry="${w*0.25}" fill="${color}" opacity="0.7"/>`;
    case 'diamond':
      return `<polygon points="${cx},${cy-h} ${cx+w},${cy} ${cx},${cy+h} ${cx-w},${cy}" fill="${color}" />`;
    case 'teardrop':
      return `<path d="M ${cx} ${cy-h} Q ${cx+w} ${cy-h/3} ${cx+w*0.9} ${cy+h/2} Q ${cx} ${cy+h*1.1} ${cx-w*0.9} ${cy+h/2} Q ${cx-w} ${cy-h/3} ${cx} ${cy-h} Z" fill="${color}"/>`;
  }
}

function buildPattern(cx, cy, w, h) {
  const stroke = 'rgba(0,0,0,0.35)';
  switch (state.pattern) {
    case 'solid': return '';
    case 'lattice': {
      let s = '';
      for (let y = -h; y <= h; y += 14) s += `<line x1="${cx-w}" y1="${cy+y}" x2="${cx+w}" y2="${cy+y}" stroke="${stroke}" stroke-width="0.8"/>`;
      for (let x = -w; x <= w; x += 14) s += `<line x1="${cx+x}" y1="${cy-h}" x2="${cx+x}" y2="${cy+h}" stroke="${stroke}" stroke-width="0.8"/>`;
      return s;
    }
    case 'blossom': {
      let s = '';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const r = Math.min(w, h) * 0.55;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        s += `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${stroke}" stroke-width="1"/>`;
      }
      return s;
    }
    case 'glyphs': {
      const chars = ['光','願','風','夢','静','火'];
      let s = '';
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.2;
        const x = cx + Math.cos(a) * w * 0.5, y = cy + Math.sin(a) * h * 0.5 + 5;
        s += `<text x="${x}" y="${y}" fill="${stroke}" font-size="16" text-anchor="middle" font-family="serif">${chars[i % chars.length]}</text>`;
      }
      return s;
    }
  }
}

function render() {
  const cx = 200, cy = 240;
  const w = state.width * 2.8, h = state.height * 2.6;
  const glowR = Math.max(w, h) * 1.3;
  const flickerOp = 0.6 + state.flicker * 0.3;

  stage.innerHTML = `
    <defs>
      <radialGradient id="glow"><stop offset="0%" stop-color="${state.color}" stop-opacity="${flickerOp}"/><stop offset="100%" stop-color="${state.color}" stop-opacity="0"/></radialGradient>
      <radialGradient id="inner"><stop offset="0%" stop-color="#fff8e0"/><stop offset="70%" stop-color="${state.color}"/><stop offset="100%" stop-color="${shade(state.color, -40)}"/></radialGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${glowR}" fill="url(#glow)">
      <animate attributeName="r" values="${glowR};${glowR*(1+state.flicker*0.1)};${glowR}" dur="${2-state.flicker*1.5}s" repeatCount="indefinite"/>
    </circle>
    <line x1="${cx}" y1="20" x2="${cx}" y2="${cy - h}" stroke="#555" stroke-width="1"/>
    <g style="filter: drop-shadow(0 0 20px ${state.color}88);">
      ${buildShape(cx, cy, w, h, 'url(#inner)').replace('fill="url(#inner)"', 'fill="url(#inner)"')}
      ${buildPattern(cx, cy, w, h)}
    </g>
    <g opacity="0.8">
      <line x1="${cx - w * 0.3}" y1="${cy + h + 10}" x2="${cx + w * 0.3}" y2="${cy + h + 10}" stroke="#444" stroke-width="2"/>
      <line x1="${cx}" y1="${cy + h + 10}" x2="${cx}" y2="${cy + h + 30}" stroke="#b45309" stroke-width="1"/>
    </g>
    <text x="${cx}" y="${cy + h + 70}" text-anchor="middle" fill="${state.color}" font-size="14" font-style="italic" font-family="Georgia,serif">"${escapeXml(state.inscription)}"</text>
  `;
  renderRecipe();
}

function renderRecipe() {
  const r = recipe();
  recipeEl.innerHTML = `
    <h2>Recipe Card</h2>
    <div class="row"><span>Shape</span><span>${r.shape}</span></div>
    <div class="row"><span>Pattern</span><span>${r.pattern}</span></div>
    <div class="row"><span>Height</span><span>${r.dimensions.height_cm} cm</span></div>
    <div class="row"><span>Width</span><span>${r.dimensions.width_cm} cm</span></div>
    <div class="row"><span>Paper</span><span>${r.materials.paper_sqm} m²</span></div>
    <div class="row"><span>Wire</span><span>${r.materials.wire_m} m</span></div>
    <div class="row"><span>Burn Time</span><span>~${r.materials.est_burn_min} min</span></div>
    <pre>${JSON.stringify(r, null, 2)}</pre>
  `;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
function escapeXml(s) { return s.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c])); }

render();