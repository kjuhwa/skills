const frequencies = [
  { freq: '88.1', name: 'Jazz FM', color: '#6ee7b7' },
  { freq: '94.3', name: 'Rock Wave', color: '#fbbf24' },
  { freq: '101.7', name: 'Classical', color: '#a78bfa' },
  { freq: '106.9', name: 'News Beat', color: '#60a5fa' },
  { freq: '112.5', name: 'Pop Hits', color: '#f472b6' }
];
const messages = ['🎵 smooth jazz', '🎸 power riff', '🎻 symphony no.9', '📰 breaking news', '🎤 top 40 hit'];
const subscribed = new Set(['88.1']);
const svg = document.getElementById('scene');
const freqsEl = document.getElementById('freqs');
const logEl = document.getElementById('log');

svg.innerHTML = `
  <defs><radialGradient id="g"><stop offset="0%" stop-color="#6ee7b7" stop-opacity="0.4"/><stop offset="100%" stop-color="#6ee7b7" stop-opacity="0"/></radialGradient></defs>
  <rect width="600" height="400" fill="#0f1117"/>
  <polygon points="300,60 280,340 320,340" fill="#2a2d37" stroke="#6ee7b7"/>
  <line x1="300" y1="60" x2="290" y2="100" stroke="#6ee7b7" stroke-width="2"/>
  <line x1="300" y1="60" x2="310" y2="100" stroke="#6ee7b7" stroke-width="2"/>
  <circle cx="300" cy="60" r="6" fill="#6ee7b7"/>
  <g id="waves"></g>
  <g id="receivers"></g>
`;

const receiversG = svg.querySelector('#receivers');
const waveG = svg.querySelector('#waves');
const positions = [[80, 300], [200, 350], [400, 350], [520, 300], [450, 200]];
frequencies.forEach((f, i) => {
  const [x, y] = positions[i];
  receiversG.innerHTML += `<g data-freq="${f.freq}"><rect x="${x-20}" y="${y-15}" width="40" height="30" rx="4" fill="#242834" stroke="${f.color}"/><text x="${x}" y="${y+5}" text-anchor="middle" fill="${f.color}" font-size="10" font-family="monospace">${f.freq}</text></g>`;
});

function renderFreqs() {
  freqsEl.innerHTML = '<h3>SUBSCRIBE</h3>' + frequencies.map(f =>
    `<div class="freq ${subscribed.has(f.freq) ? 'active' : ''}" data-freq="${f.freq}"><span>${f.freq} ${f.name}</span><span>${subscribed.has(f.freq) ? '✓' : '+'}</span></div>`
  ).join('');
  freqsEl.querySelectorAll('.freq').forEach(el => el.onclick = () => {
    const f = el.dataset.freq;
    subscribed.has(f) ? subscribed.delete(f) : subscribed.add(f);
    renderFreqs();
  });
}

logEl.innerHTML = '<h3>RECEIVED</h3><div id="log-inner"></div>';

function broadcast() {
  const i = Math.floor(Math.random() * frequencies.length);
  const f = frequencies[i];
  const [rx, ry] = positions[i];
  const msg = messages[i];

  const wave = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  wave.setAttribute('cx', 300); wave.setAttribute('cy', 60);
  wave.setAttribute('r', 10); wave.setAttribute('fill', 'none');
  wave.setAttribute('stroke', f.color); wave.setAttribute('stroke-width', 2);
  waveG.appendChild(wave);
  let r = 10;
  const anim = setInterval(() => {
    r += 8; wave.setAttribute('r', r);
    wave.setAttribute('stroke-opacity', Math.max(0, 1 - r / 350));
    if (r > 350) { clearInterval(anim); wave.remove(); }
  }, 30);

  setTimeout(() => {
    const inner = document.getElementById('log-inner');
    const isSub = subscribed.has(f.freq);
    const entry = document.createElement('div');
    entry.className = 'log-entry' + (isSub ? '' : ' missed');
    entry.style.borderLeftColor = isSub ? f.color : '#4b5563';
    entry.textContent = `[${f.freq}] ${isSub ? msg : '(not subscribed — signal ignored)'}`;
    inner.prepend(entry);
    while (inner.children.length > 15) inner.lastChild.remove();
  }, 800);
}

renderFreqs();
setInterval(broadcast, 1800);