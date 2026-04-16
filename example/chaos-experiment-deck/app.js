const deck = [
  { title: 'Kill a Primary DB Replica', hypo: 'Read traffic shifts to secondary without user-visible errors.', blast: 'Medium', rollback: 'Promote standby; automated failover in 45s.' },
  { title: 'Inject 500ms Network Latency', hypo: 'p99 stays under 2s due to circuit-breaker timeouts.', blast: 'Low', rollback: 'Remove tc rule; < 5s recovery.' },
  { title: 'Saturate CPU on Checkout Pod', hypo: 'HPA scales out; new pods absorb load within 60s.', blast: 'Medium', rollback: 'Kill stress process; HPA stabilizes.' },
  { title: 'Block DNS Resolution for 30s', hypo: 'Local resolver cache protects in-flight requests.', blast: 'High', rollback: 'Restore /etc/resolv.conf.' },
  { title: 'Drop 40% of Kafka Packets', hypo: 'Idempotent consumers retry without duplicates.', blast: 'Medium', rollback: 'Unload iptables rule.' },
  { title: 'Clock Skew +5 Minutes', hypo: 'JWT validation tolerates NTP drift up to 5min.', blast: 'High', rollback: 'NTP re-sync within 1 minute.' },
  { title: 'Fill Disk to 95%', hypo: 'Log rotation prevents service crash.', blast: 'High', rollback: 'Truncate chaos file; alert after.' },
  { title: 'Throttle S3 Uploads to 10KB/s', hypo: 'Async queue absorbs slow uploads without blocking API.', blast: 'Low', rollback: 'Remove egress shaping.' },
  { title: 'Randomly Kill 3 Worker Pods', hypo: 'Kubernetes reschedules within SLA budget.', blast: 'Low', rollback: 'Pods auto-recreate; no action.' },
  { title: 'Corrupt Cache Response Headers', hypo: 'Origin-revalidation path catches bad entries.', blast: 'Medium', rollback: 'Flush cache keys; warm again.' }
];

const cardEl = document.getElementById('card');
const historyEl = document.getElementById('history');
let current = null;

function renderFront(card) {
  const front = cardEl.querySelector('.front');
  front.innerHTML = `
    <span class="tag">${card.blast.toUpperCase()} BLAST</span>
    <h2>${card.title}</h2>
    <div class="field"><b>HYPOTHESIS</b><span>${card.hypo}</span></div>
    <div class="field"><b>ROLLBACK</b><span>${card.rollback}</span></div>
    <div class="field"><b>ACTION</b><span>Run game day for 10 minutes with observability pinned.</span></div>
  `;
}

function draw() {
  const pick = deck[Math.floor(Math.random()*deck.length)];
  current = pick;
  cardEl.classList.add('flipping');
  setTimeout(() => {
    renderFront(pick);
    cardEl.classList.remove('flipping');
    simulateRun(pick);
  }, 400);
}

function simulateRun(card) {
  setTimeout(() => {
    const r = Math.random();
    let outcome = r < 0.55 ? 'pass' : r < 0.85 ? 'flaky' : 'fail';
    const entry = document.createElement('div');
    entry.className = 'run';
    const labels = { pass: 'HYPOTHESIS HELD', flaky: 'PARTIAL / FLAKY', fail: 'HYPOTHESIS BROKEN' };
    entry.innerHTML = `<span>${card.title}</span><span class="res-${outcome}">${labels[outcome]}</span>`;
    historyEl.prepend(entry);
  }, 1200);
}

document.getElementById('draw').onclick = draw;
document.getElementById('shuffle').onclick = () => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const front = cardEl.querySelector('.front');
  front.innerHTML = '<span class="tag">DECK SHUFFLED</span><h2>Ready</h2><p>Tap Draw to reveal the next experiment.</p>';
};
cardEl.addEventListener('click', draw);