const events = [
  { type: 'AccountOpened', owner: 'Alice Chen', amount: 0, ts: '09:01' },
  { type: 'Deposited', amount: 500, ts: '09:15' },
  { type: 'Deposited', amount: 250.75, ts: '10:02' },
  { type: 'Withdrew', amount: 120, ts: '11:40' },
  { type: 'Deposited', amount: 1000, ts: '13:05' },
  { type: 'Withdrew', amount: 300, ts: '14:22' },
  { type: 'InterestAccrued', amount: 13.42, ts: '15:00' },
  { type: 'Withdrew', amount: 50, ts: '16:10' },
  { type: 'Deposited', amount: 75, ts: '16:45' },
  { type: 'Withdrew', amount: 200, ts: '17:30' }
];

const streamEl = document.getElementById('stream');
const scrubber = document.getElementById('scrubber');
const balanceEl = document.getElementById('balance');
const ownerEl = document.getElementById('owner');
const activityEl = document.getElementById('activity');
const countEl = document.getElementById('evt-count');
const indexEl = document.getElementById('evt-index');
const statBalance = document.getElementById('evt-balance');

scrubber.max = events.length;
countEl.textContent = events.length;

function renderStream(pos) {
  streamEl.innerHTML = events.map((e, i) => {
    const cls = i === pos - 1 ? 'active' : i >= pos ? 'future' : '';
    const amt = e.amount != null ? ` $${e.amount.toFixed(2)}` : '';
    return `<li class="${cls}"><span class="type">${e.type}</span>${amt} <span class="meta">${e.ts}</span></li>`;
  }).join('');
}

function project(pos) {
  const read = { balance: 0, owner: '—', activity: [] };
  for (let i = 0; i < pos; i++) {
    const e = events[i];
    if (e.type === 'AccountOpened') { read.owner = e.owner; read.balance = e.amount; }
    else if (e.type === 'Deposited' || e.type === 'InterestAccrued') read.balance += e.amount;
    else if (e.type === 'Withdrew') read.balance -= e.amount;
    read.activity.unshift(`${e.ts} · ${e.type}${e.amount != null ? ' $' + e.amount.toFixed(2) : ''}`);
  }
  return read;
}

function renderView(pos) {
  const v = project(pos);
  balanceEl.textContent = '$' + v.balance.toFixed(2);
  ownerEl.textContent = v.owner;
  activityEl.innerHTML = v.activity.slice(0, 6).map(a => `<li>${a}</li>`).join('');
  indexEl.textContent = pos;
  statBalance.textContent = '$' + v.balance.toFixed(0);
  renderStream(pos);
}

scrubber.addEventListener('input', e => renderView(+e.target.value));

document.getElementById('step').addEventListener('click', () => {
  if (+scrubber.value < events.length) { scrubber.value = +scrubber.value + 1; renderView(+scrubber.value); }
});
document.getElementById('back').addEventListener('click', () => {
  if (+scrubber.value > 0) { scrubber.value = +scrubber.value - 1; renderView(+scrubber.value); }
});
document.getElementById('rewind').addEventListener('click', () => { scrubber.value = 0; renderView(0); });

let playing = null;
document.getElementById('play').addEventListener('click', e => {
  if (playing) { clearInterval(playing); playing = null; e.target.textContent = '▶ Play'; return; }
  e.target.textContent = '⏸ Pause';
  playing = setInterval(() => {
    if (+scrubber.value >= events.length) { clearInterval(playing); playing = null; e.target.textContent = '▶ Play'; return; }
    scrubber.value = +scrubber.value + 1;
    renderView(+scrubber.value);
  }, 700);
});

renderView(0);