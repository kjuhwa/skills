const events = [
  { type: 'AccountOpened',     amount: 0,    note: 'Account created' },
  { type: 'Deposited',         amount: 500,  note: 'Initial deposit' },
  { type: 'Deposited',         amount: 1200, note: 'Paycheck' },
  { type: 'Withdrew',          amount: 150,  note: 'Groceries' },
  { type: 'Withdrew',          amount: 80,   note: 'Gas' },
  { type: 'Deposited',         amount: 2000, note: 'Bonus' },
  { type: 'TierUpgraded',      amount: 0,    note: 'Promoted to silver' },
  { type: 'Withdrew',          amount: 600,  note: 'Rent' },
  { type: 'Deposited',         amount: 3500, note: 'Contract' },
  { type: 'TierUpgraded',      amount: 0,    note: 'Promoted to gold' },
  { type: 'Withdrew',          amount: 400,  note: 'Travel' },
  { type: 'Deposited',         amount: 900,  note: 'Refund' },
];

const tiers = ['bronze', 'silver', 'gold', 'platinum'];
const streamEl = document.getElementById('stream');
const scrub = document.getElementById('scrub');
const chart = document.getElementById('chart');
const ctx = chart.getContext('2d');

events.forEach((e, i) => {
  const li = document.createElement('li');
  li.textContent = `#${i} ${e.type} ${e.amount ? '$' + e.amount : ''} — ${e.note}`;
  streamEl.appendChild(li);
});
scrub.max = events.length;

function project(upto) {
  let balance = 0, tierIdx = 0;
  const history = [0];
  for (let i = 0; i < upto; i++) {
    const e = events[i];
    if (e.type === 'Deposited') balance += e.amount;
    else if (e.type === 'Withdrew') balance -= e.amount;
    else if (e.type === 'TierUpgraded') tierIdx = Math.min(tierIdx + 1, tiers.length - 1);
    history.push(balance);
  }
  return { balance, tier: tiers[tierIdx], history };
}

function render(n) {
  const s = project(n);
  document.getElementById('balance').textContent = '$' + s.balance.toLocaleString();
  document.getElementById('tier').textContent = s.tier;
  document.getElementById('count').textContent = n;
  [...streamEl.children].forEach((li, i) => {
    li.classList.toggle('applied', i < n);
    li.classList.toggle('current', i === n - 1);
  });
  drawChart(s.history);
}

function drawChart(h) {
  ctx.clearRect(0, 0, chart.width, chart.height);
  const max = Math.max(...h, 1);
  ctx.strokeStyle = '#6ee7b7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  h.forEach((v, i) => {
    const x = (i / events.length) * chart.width;
    const y = chart.height - (v / max) * (chart.height - 10) - 5;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = 'rgba(110,231,183,0.1)';
  ctx.lineTo(chart.width, chart.height);
  ctx.lineTo(0, chart.height);
  ctx.fill();
}

scrub.addEventListener('input', () => render(+scrub.value));
document.getElementById('rewind').onclick = () => { scrub.value = 0; render(0); };
document.getElementById('step').onclick = () => {
  scrub.value = Math.min(+scrub.value + 1, events.length);
  render(+scrub.value);
};
let playing = null;
document.getElementById('play').onclick = (e) => {
  if (playing) { clearInterval(playing); playing = null; e.target.textContent = 'Play'; return; }
  e.target.textContent = 'Pause';
  playing = setInterval(() => {
    if (+scrub.value >= events.length) { clearInterval(playing); playing = null; e.target.textContent = 'Play'; return; }
    scrub.value = +scrub.value + 1;
    render(+scrub.value);
  }, 500);
};
render(0);