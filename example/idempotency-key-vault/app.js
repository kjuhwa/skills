const state = { key: null, sent: 0, processed: 0, deduped: 0, store: {} };
const $ = id => document.getElementById(id);
function genKey() { return 'idk_' + crypto.randomUUID().slice(0, 8); }
function ts() { return new Date().toLocaleTimeString('en', { hour12: false }); }
function addLog(target, text, cls) {
  const d = document.createElement('div');
  d.className = 'log-entry ' + cls;
  d.textContent = `[${ts()}] ${text}`;
  $(target).prepend(d);
}
function updateStats() {
  $('sentCount').textContent = state.sent;
  $('processedCount').textContent = state.processed;
  $('dedupedCount').textContent = state.deduped;
}
function sendRequest(isRetry) {
  if (!state.key) state.key = genKey();
  const key = state.key;
  const amount = (Math.random() * 500 + 10).toFixed(2);
  state.sent++;
  addLog('requestLog', `${isRetry ? 'RETRY' : 'POST'} /pay key=${key} $${amount}`, isRetry ? 'dup' : 'new');
  setTimeout(() => {
    if (state.store[key]) {
      state.deduped++;
      addLog('responseLog', `200 OK (cached) txn=${state.store[key].txn}`, 'dup');
      addLog('keyStore', `HIT ${key} → already processed`, 'dup');
    } else {
      const txn = 'txn_' + Math.random().toString(36).slice(2, 8);
      state.store[key] = { txn, amount };
      state.processed++;
      addLog('responseLog', `201 Created txn=${txn} $${amount}`, 'new');
      addLog('keyStore', `STORE ${key} → ${txn}`, 'stored');
    }
    updateStats();
  }, 300 + Math.random() * 400);
  updateStats();
}
$('sendBtn').addEventListener('click', () => sendRequest(false));
$('retryBtn').addEventListener('click', () => sendRequest(true));
$('resetBtn').addEventListener('click', () => { state.key = genKey(); addLog('requestLog', `New key: ${state.key}`, 'new'); });
// Seed some initial activity
setTimeout(() => sendRequest(false), 200);
setTimeout(() => sendRequest(true), 900);
setTimeout(() => sendRequest(true), 1400);