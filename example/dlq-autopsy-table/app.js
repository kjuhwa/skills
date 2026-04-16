const topics = ['order.created','payment.process','user.signup','inventory.update','email.send','audit.log'];
const errors = ['TimeoutException','NullPointerException','ConnectionRefused','SchemaValidationError','RateLimitExceeded','DeserializationError'];
const sevs = ['critical','warning','info'];

function mockData(n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      id: 'dlq-' + String(1000 + i),
      topic: topics[Math.random() * topics.length | 0],
      error: errors[Math.random() * errors.length | 0],
      severity: sevs[Math.random() * sevs.length | 0],
      retries: Math.random() * 5 | 0,
      ts: new Date(Date.now() - Math.random() * 864e5).toISOString().slice(0, 19).replace('T', ' '),
      payload: { key: 'usr_' + (Math.random()*9999|0), data: { amount: +(Math.random()*500).toFixed(2), currency: 'USD' } }
    });
  }
  return rows;
}

let data = mockData(60);
const tbody = document.getElementById('tbody');

function render(rows) {
  tbody.innerHTML = rows.map(r => `<tr>
    <td><input type="checkbox" data-id="${r.id}"></td>
    <td>${r.id}</td><td>${r.topic}</td><td>${r.error}</td>
    <td class="sev-${r.severity}">${r.severity}</td><td>${r.retries}</td><td>${r.ts}</td>
    <td><button class="payload-btn" onclick="app.showDetail('${r.id}')">view</button></td>
  </tr>`).join('');
}

const app = {
  filter() {
    const q = document.getElementById('search').value.toLowerCase();
    const s = document.getElementById('severity').value;
    render(data.filter(r => (!q || r.error.toLowerCase().includes(q) || r.topic.includes(q)) && (!s || r.severity === s)));
  },
  toggleAll(cb) { tbody.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = cb.checked); },
  getSelected() { return [...tbody.querySelectorAll('input:checked')].map(c => c.dataset.id); },
  purgeSelected() { const ids = new Set(this.getSelected()); data = data.filter(r => !ids.has(r.id)); this.filter(); },
  retrySelected() { const ids = new Set(this.getSelected()); data.forEach(r => { if (ids.has(r.id)) r.retries++; }); this.filter(); },
  showDetail(id) { const r = data.find(d => d.id === id); document.getElementById('detail-json').textContent = JSON.stringify(r, null, 2); document.getElementById('detail').classList.remove('hidden'); },
  closeDetail() { document.getElementById('detail').classList.add('hidden'); }
};
render(data);