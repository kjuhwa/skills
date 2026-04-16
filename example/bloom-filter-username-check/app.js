const M = 2048, K = 4;
const bits = new Uint8Array(M);
let queries = 0, saved = 0;

const taken = new Set();
const syllables = ['ax','bo','ca','de','eli','fu','gi','ho','iro','jak','ko','li','mo','nu','om','pi','qu','ro','so','tu','ul','va','wi','xo','yu','ze'];
function gen() {
  const n = 2 + Math.floor(Math.random() * 2);
  let s = '';
  for (let i = 0; i < n; i++) s += syllables[Math.floor(Math.random() * syllables.length)];
  if (Math.random() < 0.4) s += Math.floor(Math.random() * 100);
  return s;
}
while (taken.size < 5000) taken.add(gen());

function h(str, seed) {
  let x = seed * 2166136261;
  for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619);
  return Math.abs(x) % M;
}
function hashes(s) { return Array.from({length: K}, (_, i) => h(s, i + 1)); }

taken.forEach(u => hashes(u).forEach(p => bits[p] = 1));

function mightContain(s) {
  return hashes(s).every(p => bits[p] === 1);
}

function drawBar() {
  const svg = document.getElementById('bar');
  svg.innerHTML = '';
  const groups = 200;
  const per = M / groups;
  for (let i = 0; i < groups; i++) {
    let count = 0;
    for (let j = 0; j < per; j++) count += bits[i * per + j];
    const density = count / per;
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', i * (400 / groups));
    r.setAttribute('y', 0);
    r.setAttribute('width', 400 / groups);
    r.setAttribute('height', 24);
    const alpha = 0.15 + density * 0.85;
    r.setAttribute('fill', `rgba(110, 231, 183, ${alpha.toFixed(2)})`);
    svg.appendChild(r);
  }
}

function updateMetrics() {
  document.getElementById('queries').textContent = queries;
  document.getElementById('saved').textContent = saved;
}

function check(name) {
  queries++;
  const status = document.getElementById('status');
  const hint = document.getElementById('hint');
  const hist = document.getElementById('history');
  status.className = 'status';
  hint.className = 'hint';
  if (!name) { hint.textContent = 'Start typing to check instantly.'; return; }
  const maybe = mightContain(name);
  if (!maybe) {
    saved++;
    status.classList.add('ok');
    hint.classList.add('ok');
    hint.textContent = `✓ @${name} is available. (bloom said no, zero DB hit)`;
    prepend(hist, `available  @${name}`, 'ok');
  } else {
    const actually = taken.has(name);
    if (actually) {
      status.classList.add('taken');
      hint.classList.add('taken');
      hint.textContent = `✗ @${name} is taken.`;
      prepend(hist, `taken      @${name}`, 'taken');
    } else {
      status.classList.add('maybe');
      hint.classList.add('maybe');
      hint.textContent = `! Bloom said maybe — DB confirmed @${name} is free.`;
      prepend(hist, `fp→free    @${name}`, 'maybe');
    }
  }
  updateMetrics();
}
function prepend(list, text, cls) {
  const li = document.createElement('li');
  li.innerHTML = `<span class="n">${text}</span>`;
  list.prepend(li);
  while (list.children.length > 8) list.lastChild.remove();
}

document.getElementById('uname').addEventListener('input', e => check(e.target.value.trim().toLowerCase()));
document.getElementById('form').addEventListener('submit', e => {
  e.preventDefault();
  check(document.getElementById('uname').value.trim().toLowerCase());
});

drawBar();
updateMetrics();
document.getElementById('m').textContent = `${M} bits`;
document.getElementById('k').textContent = K;