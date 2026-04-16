const customers = ["Alice", "Bob", "Carol", "Dan", "Eve"];
const statuses = ["paid", "pending", "cancelled"];
let source = [], mv = [], nextId = 1, stale = 0, autoId = null;

function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }

function computeMV() {
  const map = {};
  for (const r of source) {
    if (r.status === "cancelled") continue;
    if (!map[r.customer]) map[r.customer] = { customer: r.customer, orders: 0, total: 0 };
    map[r.customer].orders += 1;
    map[r.customer].total += r.amount;
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

function log(msg, cls = "") {
  const li = document.createElement("li");
  if (cls) li.className = cls;
  const t = new Date().toLocaleTimeString();
  li.innerHTML = `<span class="ts">${t}</span>${msg}`;
  const ul = document.getElementById("log");
  ul.insertBefore(li, ul.firstChild);
  while (ul.children.length > 30) ul.removeChild(ul.lastChild);
}

function renderSource(newIds = []) {
  const tb = document.querySelector("#sourceTable tbody");
  tb.innerHTML = "";
  for (const r of source) {
    const tr = document.createElement("tr");
    if (newIds.includes(r.id)) tr.className = "new";
    tr.innerHTML = `<td>${r.id}</td><td>${r.customer}</td><td>$${r.amount}</td><td>${r.status}</td>`;
    tb.appendChild(tr);
  }
}

function renderMV() {
  const tb = document.querySelector("#mvTable tbody");
  tb.innerHTML = "";
  for (const r of mv) {
    const tr = document.createElement("tr");
    tr.className = "new";
    tr.innerHTML = `<td>${r.customer}</td><td>${r.orders}</td><td>$${r.total.toFixed(2)}</td>`;
    tb.appendChild(tr);
  }
}

function updateStale() {
  const pct = Math.min(100, stale * 12);
  document.getElementById("staleFill").style.width = pct + "%";
  const el = document.getElementById("staleText");
  if (stale === 0) el.textContent = "fresh";
  else if (stale < 4) el.textContent = `${stale} change(s) behind`;
  else el.textContent = `STALE — ${stale} changes pending`;
}

function insertRow() {
  const r = { id: nextId++, customer: rnd(customers), amount: Math.floor(Math.random() * 500) + 20, status: rnd(statuses) };
  source.push(r);
  stale++;
  log(`INSERT id=${r.id} customer=${r.customer} amount=$${r.amount}`);
  renderSource([r.id]);
  updateStale();
}

function updateRow() {
  if (!source.length) return;
  const r = rnd(source);
  const old = r.amount;
  r.amount = Math.floor(Math.random() * 500) + 20;
  stale++;
  log(`UPDATE id=${r.id} amount $${old}→$${r.amount}`);
  renderSource([r.id]);
  updateStale();
}

function deleteRow() {
  if (!source.length) return;
  const idx = Math.floor(Math.random() * source.length);
  const [r] = source.splice(idx, 1);
  stale++;
  log(`DELETE id=${r.id}`);
  renderSource();
  updateStale();
}

function refresh() {
  mv = computeMV();
  log(`REFRESH MATERIALIZED VIEW mv_customer_totals (${stale} changes applied)`, "refresh");
  stale = 0;
  renderMV();
  updateStale();
}

document.getElementById("insertBtn").onclick = insertRow;
document.getElementById("updateBtn").onclick = updateRow;
document.getElementById("deleteBtn").onclick = deleteRow;
document.getElementById("refreshBtn").onclick = refresh;
document.getElementById("autoRefresh").onchange = (e) => {
  if (e.target.checked) autoId = setInterval(refresh, 3000);
  else { clearInterval(autoId); autoId = null; }
};

for (let i = 0; i < 6; i++) insertRow();
refresh();