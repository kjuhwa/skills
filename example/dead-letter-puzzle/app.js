const queueMap = {
  orders: ['New order placed','Order cancelled','Order shipped','Refund requested'],
  auth: ['User logged in','Password reset','Session expired','MFA triggered'],
  payments: ['Payment received','Invoice generated','Charge failed','Subscription renewed'],
  notifications: ['Email sent','Push delivered','SMS queued','Alert triggered'],
};
const queueNames = Object.keys(queueMap);
let score = 0, dlqCount = 0, streak = 0, current = null;

function pick() {
  const q = queueNames[Math.floor(Math.random() * queueNames.length)];
  const msgs = queueMap[q];
  return { queue: q, text: msgs[Math.floor(Math.random() * msgs.length)] };
}

function render() {
  current = pick();
  const card = document.getElementById('message');
  card.className = 'msg-card';
  card.innerHTML = `<div class="type">message</div><div class="body">${current.text}</div>`;
  const tEl = document.getElementById('targets');
  const shuffled = [...queueNames].sort(() => Math.random() - .5);
  tEl.innerHTML = shuffled.map(q => `<button data-q="${q}">${q}</button>`).join('');
  tEl.querySelectorAll('button').forEach(b => b.onclick = () => choose(b.dataset.q));
}

function choose(q) {
  const card = document.getElementById('message');
  if (q === current.queue) {
    score += 10 + streak * 2;
    streak++;
    card.classList.add('correct');
  } else {
    dlqCount++;
    streak = 0;
    card.classList.add('wrong');
    const dlqList = document.getElementById('dlqList');
    const div = document.createElement('div');
    div.className = 'dlq-item';
    div.textContent = `DLQ: "${current.text}" → sent to ${q}, expected ${current.queue}`;
    dlqList.prepend(div);
    if (dlqList.children.length > 8) dlqList.lastChild.remove();
  }
  document.getElementById('score').textContent = score;
  document.getElementById('dlq').textContent = dlqCount;
  document.getElementById('streak').textContent = streak;
  setTimeout(render, 500);
}

render();