const $ = id => document.getElementById(id);
const codeWeights = [
  { c: 200, w: 55 }, { c: 429, w: 10 }, { c: 500, w: 10 },
  { c: 502, w: 8 }, { c: 503, w: 10 }, { c: 504, w: 5 }, { c: 400, w: 2 }
];

function rollCode() {
  const total = codeWeights.reduce((a, b) => a + b.w, 0);
  let r = Math.random() * total;
  for (const { c, w } of codeWeights) { if ((r -= w) <= 0) return c; }
  return 200;
}

function computeDelay(attempt, policy) {
  const raw = Math.min(policy.cap, policy.base * Math.pow(policy.mult, attempt));
  if (policy.jitter === 'full') return Math.random() * raw;
  if (policy.jitter === 'equal') return raw / 2 + Math.random() * raw / 2;
  return raw;
}

function run() {
  const policy = {
    max: +$('maxRetries').value, base: +$('baseMs').value,
    mult: +$('mult').value, cap: +$('cap').value,
    jitter: $('jitter').value,
    retryOn: [...document.querySelectorAll('.codes input:checked')].map(i => +i.value)
  };
  const timeline = $('timeline'); timeline.innerHTML = '';
  let succ = 0, failed = 0, totalTries = 0, totalDelay = 0;
  for (let i = 0; i < 20; i++) {
    const row = document.createElement('div'); row.className = 'req';
    row.innerHTML = `<span class="id">#${(i + 1).toString().padStart(2, '0')}</span>`;
    let done = false, attempt = 0, cumDelay = 0;
    while (!done) {
      const code = rollCode(); totalTries++;
      const retryable = policy.retryOn.includes(code);
      const node = document.createElement('span');
      node.className = 'attempt ' + (code === 200 ? 'ok' : retryable && attempt < policy.max ? 'retry' : 'fail');
      if (code === 200) {
        node.textContent = `200 (${Math.round(cumDelay)}ms)`; succ++; done = true;
      } else if (!retryable || attempt >= policy.max) {
        node.textContent = `${code} ✗`; failed++; done = true;
      } else {
        const d = computeDelay(attempt, policy);
        cumDelay += d; totalDelay += d; attempt++;
        node.textContent = `${code} → wait ${Math.round(d)}ms`;
      }
      row.appendChild(node);
    }
    timeline.appendChild(row);
  }
  $('summary').innerHTML = `
    <div><span>Success</span><b>${succ}/20</b></div>
    <div><span>Failed</span><b style="color:#f87171">${failed}</b></div>
    <div><span>Total Attempts</span><b>${totalTries}</b></div>
    <div><span>Avg Wait</span><b>${Math.round(totalDelay / 20)}ms</b></div>`;
}

$('fire').onclick = run;
run();