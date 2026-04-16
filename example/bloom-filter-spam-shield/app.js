const M = 512, K = 4;
const bits = new Uint8Array(M);
const blacklist = [
  'viagra', 'lottery', 'winner', 'prince', 'crypto', 'bitcoin',
  'inheritance', 'wire', 'transfer', 'urgent', 'millionaire', 'mlm',
  'nigerian', 'pharmacy', 'discount', 'cialis', 'loan', 'prize',
  'congratulations', 'claim', 'risk-free', 'guaranteed', 'weight-loss'
];
let scanned = 0, blocked = 0;

function hash(str, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15;
  return h % M;
}
function positions(tok) {
  return [hash(tok, 2166136261), hash(tok, 3266489917), hash(tok, 374761393), hash(tok, 2246822519)];
}
function addToFilter(tok) {
  positions(tok).forEach(p => { bits[p] = 1; });
}
function inFilter(tok) {
  return positions(tok).every(p => bits[p] === 1);
}
function tokens(text) {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

blacklist.forEach(addToFilter);

const samples = [
  "Hey, lunch at 12? I'll grab sandwiches.",
  "URGENT: claim your lottery PRIZE — wire transfer details attached.",
  "Meeting notes from yesterday are in the shared drive.",
  "Congratulations! You have been selected as our millionaire winner.",
  "PR review is ready when you have a minute.",
  "Risk-free crypto investment: turn $100 into $10,000 overnight!",
  "Reminder: dentist appointment Thursday at 3pm.",
  "Nigerian prince needs your help with an inheritance — claim now.",
  "The staging build is green, deploying in 10.",
  "Discount pharmacy — guaranteed cialis at half price."
];

function scan(text) {
  scanned++;
  const toks = tokens(text);
  const hits = toks.filter(inFilter);
  const isSpam = hits.length > 0;
  if (isSpam) blocked++;
  return { isSpam, hits };
}

function renderInbox() {
  const ul = document.getElementById('messages');
  ul.innerHTML = '';
  samples.forEach(m => {
    const { isSpam, hits } = scan(m);
    const li = document.createElement('li');
    li.className = 'msg' + (isSpam ? ' blocked' : '');
    li.innerHTML = `
      <span class="tag ${isSpam ? 'spam' : 'ok'}">${isSpam ? 'BLOCK' : 'PASS'}</span>
      <div>
        <p>${m}</p>
        ${hits.length ? `<span class="matches">⚑ matched: ${hits.join(', ')}</span>` : ''}
      </div>`;
    ul.appendChild(li);
  });
  updateStats();
}

function updateStats() {
  let set = 0;
  for (let i = 0; i < M; i++) if (bits[i]) set++;
  document.getElementById('listN').textContent = blacklist.length;
  document.getElementById('listBits').textContent = `${set}/${M}`;
  document.getElementById('scanned').textContent = scanned;
  document.getElementById('blocked').textContent = blocked;
}

document.getElementById('sendBtn').onclick = () => {
  const text = document.getElementById('custom').value.trim();
  if (!text) return;
  const { isSpam, hits } = scan(text);
  const v = document.getElementById('verdict');
  v.className = isSpam ? 'spam' : 'ok';
  v.textContent = isSpam
    ? `Blocked — suspicious tokens: ${hits.join(', ')}`
    : 'Passed — no blacklist tokens matched.';
  updateStats();
};

renderInbox();