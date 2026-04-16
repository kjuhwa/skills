const amount = 49.99;
let running = false;

document.getElementById('retries').oninput = e => document.getElementById('retryVal').textContent = e.target.value;
document.getElementById('failRate').oninput = e => document.getElementById('failVal').textContent = e.target.value + '%';

document.getElementById('btnReset').onclick = reset;
document.getElementById('btnRun').onclick = runScenario;

function reset() {
  running = false;
  ['badLog','goodLog'].forEach(id => document.getElementById(id).innerHTML = '');
  document.getElementById('badTotal').textContent = '0.00';
  document.getElementById('goodTotal').textContent = '0.00';
  document.getElementById('summary').textContent = '';
}

async function runScenario() {
  if (running) return; running = true; reset();
  const retries = +document.getElementById('retries').value;
  const failRate = +document.getElementById('failRate').value / 100;
  const idempKey = crypto.randomUUID().slice(0, 8);
  let badCharges = 0, goodCharges = 0;
  const seen = new Set();

  for (let i = 0; i <= retries; i++) {
    const networkFail = i < retries && Math.random() < failRate;
    await delay(300);
    // BAD side — no idempotency
    if (!networkFail) {
      badCharges++;
      log('badLog', 'charge', `#${i + 1} ✗ Charged $${amount} (duplicate!)`);
    } else {
      log('badLog', 'fail', `#${i + 1} ⚠ Network timeout — will retry...`);
      badCharges++; // server got it but client didn't know
      log('badLog', 'charge', `    → Server DID charge $${amount} (client unaware)`);
    }
    document.getElementById('badTotal').textContent = (badCharges * amount).toFixed(2);
    // GOOD side — with idempotency key
    if (!networkFail) {
      if (seen.has(idempKey)) {
        log('goodLog', 'dedup', `#${i + 1} ↩ key=${idempKey} — returned cached result`);
      } else {
        seen.add(idempKey);
        goodCharges++;
        log('goodLog', 'ok', `#${i + 1} ✓ key=${idempKey} — charged $${amount}`);
      }
    } else {
      if (!seen.has(idempKey)) { seen.add(idempKey); goodCharges++; }
      log('goodLog', 'fail', `#${i + 1} ⚠ Network timeout — will retry with same key...`);
    }
    document.getElementById('goodTotal').textContent = (goodCharges * amount).toFixed(2);
  }
  const s = document.getElementById('summary');
  const overcharge = ((badCharges - 1) * amount).toFixed(2);
  s.innerHTML = badCharges > 1
    ? `<span style="color:#f87171">Without: $${overcharge} overcharged (${badCharges}× charges)</span> &nbsp;|&nbsp; <span style="color:#6ee7b7">With: exactly $${amount} (${retries} safe retries)</span>`
    : `<span style="color:#6ee7b7">Lucky run — no duplicates! Try increasing fail rate.</span>`;
  running = false;
}

function log(id, cls, text) {
  const el = document.createElement('div');
  el.className = 'evt ' + cls; el.textContent = text;
  document.getElementById(id).appendChild(el);
  el.scrollIntoView({ block: 'end' });
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Auto-run on load
setTimeout(runScenario, 400);