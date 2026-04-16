let pending = [
  { fwd: 'ReserveSeat', comp: 'ReleaseSeat', amt: 250 },
  { fwd: 'BookHotel', comp: 'CancelHotel', amt: 420 },
  { fwd: 'RentCar', comp: 'ReturnCar', amt: 180 }
];
let committed = [];
let compensated = [];
let balance = 0;

const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function render() {
  $('pending').innerHTML = pending.map(s =>
    `<li>${s.fwd}<span class="amt">-$${s.amt}</span></li>`).join('');
  $('committed').innerHTML = committed.map(s =>
    `<li class="${s.failed ? 'fail' : 'ok'}">${s.fwd}<span class="amt">-$${s.amt}</span></li>`).join('');
  $('compensated').innerHTML = compensated.map(s =>
    `<li class="undo">${s.comp}<span class="amt">+$${s.amt}</span></li>`).join('');
  $('balance').textContent = `Balance: $${balance.toFixed(2)}`;
}

$('addStep').onclick = () => {
  const f = $('stepName').value.trim();
  const c = $('compName').value.trim();
  const a = parseFloat($('amount').value) || 0;
  if (!f || !c) return;
  pending.push({ fwd: f, comp: c, amt: a });
  $('stepName').value = ''; $('compName').value = '';
  render();
};

async function commitSaga(failAt = -1) {
  $('status').textContent = 'Executing...';
  $('status').style.color = '#6ee7b7';
  while (pending.length) {
    const step = pending.shift();
    if (committed.length === failAt) {
      step.failed = true;
      committed.push(step);
      render();
      $('status').textContent = `Failure at step ${failAt + 1} — rolling back`;
      $('status').style.color = '#f87171';
      await sleep(600);
      while (committed.length) {
        const undo = committed.pop();
        if (!undo.failed) { balance += undo.amt; compensated.push(undo); }
        render();
        await sleep(500);
      }
      $('status').textContent = 'Rolled back';
      return;
    }
    committed.push(step);
    balance -= step.amt;
    render();
    await sleep(500);
  }
  $('status').textContent = 'Committed';
  $('status').style.color = '#6ee7b7';
}

$('commit').onclick = () => commitSaga(-1);
$('failAt').onclick = () => {
  if (!pending.length) return;
  commitSaga(Math.floor(Math.random() * pending.length));
};
$('resetAll').onclick = () => {
  pending = [
    { fwd: 'ReserveSeat', comp: 'ReleaseSeat', amt: 250 },
    { fwd: 'BookHotel', comp: 'CancelHotel', amt: 420 },
    { fwd: 'RentCar', comp: 'ReturnCar', amt: 180 }
  ];
  committed = []; compensated = []; balance = 0;
  $('status').textContent = 'Idle'; $('status').style.color = '#9ca3af';
  render();
};

render();