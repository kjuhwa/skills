const serverStore = {};
let requestCount = 0;
let totalDeducted = 0;
const amounts = [49.99, 12.50, 99.00, 25.75, 150.00];

function uid() { return Math.random().toString(36).slice(2, 10); }

function sendRequest() {
  const useKey = document.getElementById('chkKey').checked;
  const idemKey = useKey ? 'key-' + requestCount : null;
  const amount = amounts[requestCount % amounts.length];
  requestCount++;
  processRequest(idemKey, amount);
}

function processRequest(idemKey, amount) {
  const reqLog = document.getElementById('requestLog');
  const tag = idemKey || 'none';
  const entry = document.createElement('div');
  entry.className = 'log-entry new';
  entry.textContent = `→ POST /pay  $${amount.toFixed(2)}  key=${tag}`;
  reqLog.prepend(entry);

  const srvLog = document.getElementById('serverState');
  if (idemKey && serverStore[idemKey]) {
    const dup = document.createElement('div');
    dup.className = 'log-entry dup';
    dup.textContent = `✗ Duplicate key=${tag} — returning cached response, no charge`;
    srvLog.prepend(dup);
  } else {
    if (idemKey) serverStore[idemKey] = { amount, ts: Date.now() };
    totalDeducted += amount;
    document.getElementById('totalDeducted').textContent = totalDeducted.toFixed(2);
    const ok = document.createElement('div');
    ok.className = 'log-entry ok';
    ok.textContent = `✓ Charged $${amount.toFixed(2)}  key=${tag}`;
    srvLog.prepend(ok);
  }
}

function replayAll() {
  const useKey = document.getElementById('chkKey').checked;
  Object.keys(serverStore).forEach(k => {
    const r = serverStore[k];
    for (let i = 0; i < 3; i++) setTimeout(() => processRequest(useKey ? k : null, r.amount), i * 200);
  });
}

function resetLab() {
  Object.keys(serverStore).forEach(k => delete serverStore[k]);
  requestCount = 0; totalDeducted = 0;
  document.getElementById('totalDeducted').textContent = '0.00';
  document.getElementById('requestLog').innerHTML = '';
  document.getElementById('serverState').innerHTML = '';
}