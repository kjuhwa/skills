const SIZE = 32, K = 3;
const bits = new Uint8Array(SIZE);
const svg = document.getElementById('ring');
const spamWords = ['viagra','prince','winner','lottery','click-here','free-money','nigerian','jackpot','pills','casino'];
const safeWords = ['meeting','report','update','invoice','schedule','hello','project','review','lunch','deploy'];

function hash(s, seed) { let h = seed; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % SIZE; }

// Train on known spam
spamWords.forEach(w => { for (let i = 0; i < K; i++) bits[hash(w, i + 1)] = 1; });

function drawRing(highlights = [], color = '#6ee7b7') {
  let html = '';
  for (let i = 0; i < SIZE; i++) {
    const angle = (i / SIZE) * Math.PI * 2 - Math.PI / 2;
    const x = 100 + 80 * Math.cos(angle), y = 100 + 80 * Math.sin(angle);
    const fill = highlights.includes(i) ? color : bits[i] ? '#6ee7b7' : '#2d3348';
    const r = highlights.includes(i) ? 9 : 7;
    html += `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity="${highlights.includes(i) ? 1 : .7}"/>`;
  }
  svg.innerHTML = html;
}

function check(w) {
  for (let i = 0; i < K; i++) if (!bits[hash(w, i + 1)]) return false;
  return true;
}

const emails = [];
[...spamWords, ...safeWords].sort(() => Math.random() - .5).forEach(w => {
  const isSpam = spamWords.includes(w);
  emails.push({ from: isSpam ? 'scam@shady.biz' : 'coworker@corp.com', subject: w, actual: isSpam });
});

let idx = 0;
function sendNext() {
  if (idx >= emails.length) return;
  const e = emails[idx++];
  const inbox = document.getElementById('inbox');
  inbox.innerHTML = `<div class="msg pending">${e.from}: "${e.subject}"</div>` + inbox.innerHTML;
  const hl = Array.from({length: K}, (_, i) => hash(e.subject, i + 1));
  const flagged = check(e.subject);
  drawRing(hl, flagged ? '#f87171' : '#6ee7b7');
  setTimeout(() => {
    const results = document.getElementById('results');
    const cls = flagged ? 'spam' : 'safe';
    const label = flagged ? 'BLOCKED (spam)' : 'PASSED';
    results.innerHTML = `<div class="msg ${cls}">${label}: "${e.subject}"</div>` + results.innerHTML;
  }, 400);
}

document.getElementById('send').onclick = sendNext;
drawRing();
for (let i = 0; i < 3; i++) setTimeout(() => sendNext(), i * 600);