const source = [
  { id: 1, name: '  alice  ', email: 'a@x.io', amount: 123.456, status: 'A' },
  { id: 2, name: 'Bob ', email: 'b@x.io', amount: 45.2, status: 'P' },
  { id: 3, name: 'charlie', email: 'c@x.io', amount: 789.01, status: 'A' },
  { id: 4, name: ' DANA', email: 'd@x.io', amount: 12.5, status: 'C' },
  { id: 5, name: 'eve', email: 'e@x.io', amount: 210.9, status: 'A' },
  { id: 6, name: 'frank', email: 'f@x.io', amount: 55.5, status: 'P' },
  { id: 7, name: '  gary', email: 'g@x.io', amount: 33.3, status: 'A' },
];

const transforms = {
  filter: { label: 'filter: amount > 50', fn: rows => rows.filter(r => r.amount > 50) },
  upper: { label: 'uppercase: name', fn: rows => rows.map(r => ({...r, name: r.name.toUpperCase()})) },
  trim: { label: 'trim: name', fn: rows => rows.map(r => ({...r, name: r.name.trim()})) },
  tax: { label: 'add column: tax (8%)', fn: rows => rows.map(r => ({...r, tax: +(r.amount * 0.08).toFixed(2)})) },
  status: { label: 'map: status → label', fn: rows => rows.map(r => {
    const m = {A: 'Active', P: 'Pending', C: 'Cancelled'};
    return {...r, status: m[r.status] || r.status};
  })},
  dropcol: { label: 'drop: email', fn: rows => rows.map(r => { const {email, ...rest} = r; return rest; }) },
  round: { label: 'round: amount', fn: rows => rows.map(r => ({...r, amount: Math.round(r.amount)})) },
};

let chain = [];

document.getElementById('source').textContent = JSON.stringify(source, null, 2);

function renderChain() {
  const el = document.getElementById('chain');
  if (chain.length === 0) {
    el.innerHTML = '<div style="color:#9ca3af;font-size:12px;padding:20px;text-align:center">No transformations. Add a step below.</div>';
    return;
  }
  el.innerHTML = chain.map((k, i) =>
    `<div class="step"><span>${i+1}. ${transforms[k].label}</span><button data-i="${i}">remove</button></div>`
  ).join('');
  el.querySelectorAll('button').forEach(b => {
    b.onclick = () => { chain.splice(+b.dataset.i, 1); renderChain(); runChain(); };
  });
}

function runChain() {
  let rows = JSON.parse(JSON.stringify(source));
  chain.forEach(k => { rows = transforms[k].fn(rows); });
  const keys = rows.length ? Object.keys(rows[0]) : [];
  document.getElementById('count').textContent = `${rows.length} rows`;
  const out = document.getElementById('output');
  if (rows.length === 0) {
    out.innerHTML = '<div style="color:#9ca3af;padding:20px;text-align:center">No rows after transformations</div>';
    return;
  }
  out.innerHTML = `<table><thead><tr>${keys.map(k => `<th>${k}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${keys.map(k => `<td>${r[k]}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

document.getElementById('addOp').onclick = () => {
  chain.push(document.getElementById('opPick').value);
  renderChain();
  runChain();
};
document.getElementById('clearOp').onclick = () => {
  chain = [];
  renderChain();
  runChain();
};

renderChain();
runChain();