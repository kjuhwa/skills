const log = [];
const startTime = Date.now() - 1000 * 60 * 60 * 6;

function seedEvents() {
  const seeds = [
    { type: "Deposit",  amount: 1000, memo: "opening balance", offset: 0 },
    { type: "Deposit",  amount: 2500, memo: "salary",          offset: 45 },
    { type: "Withdraw", amount: 120,  memo: "groceries",       offset: 90 },
    { type: "Withdraw", amount: 48,   memo: "coffee run",      offset: 150 },
    { type: "Interest", amount: 3.75, memo: "monthly accrual", offset: 200 },
    { type: "Fee",      amount: 5,    memo: "atm",             offset: 240 },
    { type: "Deposit",  amount: 75,   memo: "refund",          offset: 300 }
  ];
  seeds.forEach((s, i) => {
    log.push({
      seq: i,
      type: s.type,
      amount: s.amount,
      memo: s.memo,
      at: new Date(startTime + s.offset * 60000).toISOString()
    });
  });
}

function project() {
  let balance = 0;
  for (const e of log) {
    if (e.type === "Deposit" || e.type === "Interest") balance += e.amount;
    else if (e.type === "Withdraw" || e.type === "Fee") balance -= e.amount;
  }
  return balance;
}

function render() {
  const host = document.getElementById("log");
  host.innerHTML = "";
  log.forEach(e => {
    const negative = e.type === "Withdraw" || e.type === "Fee";
    const row = document.createElement("div");
    row.className = "event" + (negative ? " neg" : "");
    const sign = negative ? "-" : "+";
    const cls = negative ? "neg" : "pos";
    row.innerHTML =
      '<span class="seq">#' + e.seq + '</span>' +
      '<div><div class="type">' + e.type + '</div>' +
      '<div class="memo">' + (e.memo || "") + '</div></div>' +
      '<span class="amt ' + cls + '">' + sign + '$' + e.amount.toFixed(2) + '</span>' +
      '<span class="ts">' + new Date(e.at).toLocaleTimeString() + '</span>';
    host.appendChild(row);
  });

  const balance = project();
  const bEl = document.getElementById("balance");
  bEl.textContent = (balance < 0 ? "-$" : "$") + Math.abs(balance).toFixed(2);
  bEl.style.color = balance < 0 ? "#f87171" : "#6ee7b7";
  document.getElementById("derive-note").textContent = "derived from " + log.length + " events";
}

document.getElementById("emit-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const type = document.getElementById("e-type").value;
  const amount = parseFloat(document.getElementById("e-amount").value);
  const memo = document.getElementById("e-memo").value.trim() || "(no memo)";
  if (!isFinite(amount) || amount <= 0) return;
  log.push({
    seq: log.length,
    type, amount, memo,
    at: new Date().toISOString()
  });
  document.getElementById("e-memo").value = "";
  render();
});

seedEvents();
render();