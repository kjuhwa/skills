const versions = [
  { ver: "v3.2", date: "2026-03-01", status: "active", desc: "Current stable — added streaming endpoints", endpoints: ["GET /v3.2/stream", "POST /v3.2/events", "GET /v3.2/users"], breaking: false, consumers: 142 },
  { ver: "v3.1", date: "2025-11-15", status: "active", desc: "Pagination overhaul with cursor-based navigation", endpoints: ["GET /v3.1/items?cursor=", "GET /v3.1/search"], breaking: false, consumers: 89 },
  { ver: "v3.0", date: "2025-06-01", status: "deprecated", desc: "Major rewrite — REST resource nesting changed", endpoints: ["GET /v3/users/{id}/orders", "POST /v3/auth/token"], breaking: true, consumers: 34 },
  { ver: "v2.5", date: "2024-09-10", status: "deprecated", desc: "Last v2 release — added webhook support", endpoints: ["POST /v2.5/webhooks", "DELETE /v2.5/webhooks/{id}"], breaking: false, consumers: 12 },
  { ver: "v2.0", date: "2023-12-01", status: "sunset", desc: "Legacy XML+JSON dual-format API", endpoints: ["GET /v2/data.xml", "GET /v2/data.json"], breaking: true, consumers: 0 },
  { ver: "v1.0", date: "2022-04-15", status: "sunset", desc: "Original launch — monolithic single-endpoint", endpoints: ["POST /v1/api"], breaking: false, consumers: 0 }
];
const app = {
  current: 'all',
  filterStatus(s) {
    this.current = s;
    document.querySelectorAll('.controls button').forEach(b => b.classList.toggle('active', b.dataset.filter === s));
    this.render();
  },
  render() {
    const el = document.getElementById('timeline');
    const list = this.current === 'all' ? versions : versions.filter(v => v.status === this.current);
    el.innerHTML = list.map((v, i) => `
      <div class="t-node" onclick="app.showDetail(${versions.indexOf(v)})">
        <div class="t-dot ${v.status}"></div>
        <div class="t-card">
          <h3>${v.ver}<span class="badge ${v.status}">${v.status}</span></h3>
          <div class="date">${v.date}${v.breaking ? ' · ⚠ breaking' : ''}</div>
          <div class="desc">${v.desc}</div>
        </div>
      </div>`).join('');
  },
  showDetail(i) {
    const v = versions[i];
    document.getElementById('detail-content').innerHTML = `<h2>${v.ver}</h2><p><strong>Released:</strong> ${v.date}</p><p><strong>Status:</strong> ${v.status}</p><p><strong>Active consumers:</strong> ${v.consumers}</p><p>${v.desc}</p><h3 style="color:#cbd5e1;margin:12px 0 6px">Endpoints</h3><ul class="ep-list">${v.endpoints.map(e => `<li>${e}</li>`).join('')}</ul>`;
    document.getElementById('detail-panel').classList.add('show');
  },
  closeDetail() { document.getElementById('detail-panel').classList.remove('show'); }
};
app.render();