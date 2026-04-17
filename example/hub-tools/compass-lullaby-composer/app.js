const NOTES = ['A','A♯','B','C','C♯','D','D♯','E','F','F♯','G','G♯'];

// period-mode-enum-config — one source of truth per length
const DURATION = {
  q: { symbol: '¼', seconds: 0.35, beats: 0.25, label: '¼ ♩' },
  h: { symbol: '½', seconds: 0.7,  beats: 0.5,  label: '½ ♩' },
  w: { symbol: '1', seconds: 1.2,  beats: 1.0,  label: '1 ♩' },
  d: { symbol: '2', seconds: 2.2,  beats: 2.0,  label: '2 ♩' },
};

function headingToNote(h) {
  const s = Math.round(h / 30) % 12;
  const oct = 3 + Math.floor(h / 360);
  return {
    semitone: s,
    name: NOTES[s] + oct,
    freq: 220 * Math.pow(2, s / 12),
    heading: h,
  };
}

// immutable-action-event-log
let log = [];
function dispatch(evt) {
  if (evt.type === 'add')   log = [...log, evt];
  if (evt.type === 'undo')  log = log.slice(0, -1);
  if (evt.type === 'clear') log = [];
  render();
}
const notesFromLog = () => log.map(e => ({ ...e, note: headingToNote(e.bearing) }));

// brass dial (lantern-visualization-pattern glow)
const dial = document.getElementById('dial');
function drawDial(bearing, humGlow) {
  const ns = 'http://www.w3.org/2000/svg';
  dial.innerHTML = '';
  const mk = (tag, attrs) => {
    const el = document.createElementNS(ns, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  };
  // outer brass ring with flicker halo
  const halo = mk('circle', { r: 104, cx: 0, cy: 0, fill: 'none',
    stroke: '#6ee7b7', 'stroke-width': 1,
    opacity: 0.12 + 0.18 * humGlow });
  dial.appendChild(halo);
  dial.appendChild(mk('circle', { r: 100, cx: 0, cy: 0, fill: 'none', stroke: '#c4a472', 'stroke-width': 4 }));
  dial.appendChild(mk('circle', { r: 86,  cx: 0, cy: 0, fill: 'none', stroke: 'rgba(196,164,114,0.32)' }));
  dial.appendChild(mk('circle', { r: 68,  cx: 0, cy: 0, fill: 'none', stroke: 'rgba(196,164,114,0.22)' }));
  // ticks
  for (let i = 0; i < 360; i += 10) {
    const big = i % 30 === 0;
    const a = (i - 90) * Math.PI / 180;
    dial.appendChild(mk('line', {
      x1: Math.cos(a) * (big ? 78 : 84),
      y1: Math.sin(a) * (big ? 78 : 84),
      x2: Math.cos(a) * 94,
      y2: Math.sin(a) * 94,
      stroke: big ? '#c4a472' : 'rgba(196,164,114,0.45)',
      'stroke-width': big ? 2 : 1,
    }));
  }
  for (const [txt, x, y] of [['N',0,-56],['E',56,0],['S',0,58],['W',-56,0]]) {
    const t = mk('text', { x, y, 'text-anchor':'middle', 'dominant-baseline':'middle',
      fill: '#e6eaf2', 'font-size': 14, 'font-family': 'serif', 'font-style': 'italic' });
    t.textContent = txt;
    dial.appendChild(t);
  }
  // glowing arcs for note semitones (12 segments)
  for (let i = 0; i < 12; i++) {
    const a0 = (i * 30 - 90 - 2) * Math.PI / 180;
    const a1 = (i * 30 - 90 + 2) * Math.PI / 180;
    dial.appendChild(mk('path', {
      d: `M ${Math.cos(a0)*62} ${Math.sin(a0)*62} A 62 62 0 0 1 ${Math.cos(a1)*62} ${Math.sin(a1)*62}`,
      stroke: '#6ee7b7', 'stroke-width': 3, fill: 'none', opacity: 0.35,
    }));
  }
  // needle
  const rad = (bearing - 90) * Math.PI / 180;
  const nx = Math.cos(rad) * 84, ny = Math.sin(rad) * 84;
  dial.appendChild(mk('line', {
    x1: 0, y1: 0, x2: nx, y2: ny,
    stroke: '#6ee7b7', 'stroke-width': 2.5, 'stroke-linecap': 'round',
    filter: 'drop-shadow(0 0 4px #6ee7b7)',
  }));
  // counter-weight
  dial.appendChild(mk('line', {
    x1: 0, y1: 0, x2: -nx * 0.3, y2: -ny * 0.3,
    stroke: '#c4a472', 'stroke-width': 2,
  }));
  dial.appendChild(mk('circle', { r: 6, cx: 0, cy: 0, fill: '#c4a472', stroke: '#e6eaf2' }));
}

// staff with note heads
const staff = document.getElementById('staff');
const sctx = staff.getContext('2d');
function drawStaff() {
  const Ws = staff.width, Hs = staff.height;
  sctx.clearRect(0, 0, Ws, Hs);
  sctx.strokeStyle = 'rgba(196,164,114,0.4)';
  for (let i = 0; i < 5; i++) {
    const y = 45 + i * 16;
    sctx.beginPath(); sctx.moveTo(20, y); sctx.lineTo(Ws - 20, y); sctx.stroke();
  }
  const ns = notesFromLog();
  if (!ns.length) {
    sctx.fillStyle = 'rgba(230,234,242,0.28)';
    sctx.font = 'italic 14px serif';
    sctx.textAlign = 'center';
    sctx.fillText('— chart a bearing and add the first hummed note —', Ws/2, Hs/2);
    return;
  }
  const step = Math.min(64, (Ws - 60) / ns.length);
  let x = 40;
  for (const n of ns) {
    const d = DURATION[n.duration];
    const y = 45 + 4 * 16 - (n.note.semitone / 12) * 64;
    sctx.fillStyle = 'rgba(110,231,183,0.2)';
    sctx.beginPath(); sctx.arc(x, y, 10, 0, Math.PI*2); sctx.fill();
    sctx.fillStyle = '#6ee7b7';
    sctx.beginPath();
    sctx.ellipse(x, y, 7.5, 5.5, -0.3, 0, Math.PI*2);
    sctx.fill();
    sctx.strokeStyle = '#e6eaf2';
    sctx.lineWidth = 1.5;
    sctx.beginPath();
    sctx.moveTo(x + 6, y); sctx.lineTo(x + 6, y - 30); sctx.stroke();
    sctx.fillStyle = 'rgba(230,234,242,0.7)';
    sctx.font = '10px sans-serif';
    sctx.textAlign = 'center';
    sctx.fillText(n.note.name, x, Hs - 18);
    sctx.fillStyle = 'rgba(196,164,114,0.7)';
    sctx.fillText(d.symbol, x, Hs - 4);
    x += step;
  }
}

function renderList() {
  const ul = document.getElementById('notes');
  ul.innerHTML = '';
  const ns = notesFromLog();
  ns.forEach((n, i) => {
    const li = document.createElement('li');
    const d = DURATION[n.duration];
    li.innerHTML = `<b>${n.note.name}</b> · ${n.note.freq.toFixed(1)} Hz · ${n.bearing}° · ${d.label}`;
    ul.appendChild(li);
  });
  document.getElementById('count').textContent = ns.length;
  document.getElementById('export').value = ns.length
    ? ns.map(n => `${n.note.name}/${DURATION[n.duration].symbol}`).join(' ')
    : '';
}

function render() {
  const bearing = Number(document.getElementById('bearing').value);
  const humGlow = Math.min(1, log.length / 8);
  drawDial(bearing, humGlow);
  const n = headingToNote(bearing);
  document.getElementById('heading').textContent = bearing + '°';
  document.getElementById('freq').textContent = n.freq.toFixed(1) + ' Hz';
  document.getElementById('note').textContent = n.name;
  document.getElementById('lenout').textContent = DURATION[document.getElementById('duration').value].label;
  drawStaff();
  renderList();
}

let audio;
const getCtx = () => audio || (audio = new (window.AudioContext || window.webkitAudioContext)());

function playOne(freq, seconds) {
  const ac = getCtx();
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  osc.connect(gain); gain.connect(ac.destination);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.22, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
  osc.start(now);
  osc.stop(now + seconds + 0.05);
}

async function playLullaby() {
  const ns = notesFromLog();
  for (const n of ns) {
    const s = DURATION[n.duration].seconds;
    playOne(n.note.freq, s * 0.9);
    await new Promise(r => setTimeout(r, s * 800));
  }
}

document.getElementById('bearing').addEventListener('input', render);
document.getElementById('duration').addEventListener('change', render);
document.getElementById('add').addEventListener('click', () => {
  dispatch({
    type: 'add',
    bearing: Number(document.getElementById('bearing').value),
    duration: document.getElementById('duration').value,
    at: Date.now(),
  });
});
document.getElementById('undo').addEventListener('click', () => dispatch({ type: 'undo' }));
document.getElementById('clear').addEventListener('click', () => dispatch({ type: 'clear' }));
document.getElementById('play').addEventListener('click', playLullaby);

document.addEventListener('keydown', ev => {
  if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT' || ev.target.tagName === 'TEXTAREA') return;
  if (ev.key === 'Enter') { document.getElementById('add').click(); ev.preventDefault(); }
  else if (ev.key === 'u' || ev.key === 'U') document.getElementById('undo').click();
  else if (ev.key === 'p' || ev.key === 'P') playLullaby();
  else if (ev.key === 'ArrowLeft') {
    const b = document.getElementById('bearing');
    b.value = (Number(b.value) + 355) % 360;
    render();
  } else if (ev.key === 'ArrowRight') {
    const b = document.getElementById('bearing');
    b.value = (Number(b.value) + 5) % 360;
    render();
  }
});

render();