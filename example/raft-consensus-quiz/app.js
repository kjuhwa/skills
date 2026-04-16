const questions = [
  {
    tag: 'Leader Election',
    q: 'A Raft follower has not received a heartbeat within its election timeout. What happens next?',
    opts: [
      'It waits for another follower to start an election',
      'It increments its term and transitions to candidate',
      'It shuts down to avoid a split brain',
      'It sends a heartbeat to the leader'
    ],
    ans: 1,
    why: 'When a follower\'s election timeout fires, it increments its currentTerm, votes for itself, becomes a candidate, and requests votes from other nodes.'
  },
  {
    tag: 'Safety',
    q: 'How many votes does a candidate need to become leader in a 5-node cluster?',
    opts: ['2', '3', '4', '5'],
    ans: 1,
    why: 'A candidate needs a strict majority: floor(N/2) + 1. For N=5 that is 3 votes (including its own self-vote).'
  },
  {
    tag: 'Log Replication',
    q: 'When is a log entry considered "committed" in Raft?',
    opts: [
      'As soon as the leader appends it locally',
      'After the client acknowledges receipt',
      'When replicated to a majority of nodes',
      'When every single follower has written it to disk'
    ],
    ans: 2,
    why: 'An entry is committed once the leader has replicated it to a majority. Only then can it be safely applied to the state machine.'
  },
  {
    tag: 'Terms',
    q: 'Two candidates start an election in the same term with 4 nodes total. What is the likely outcome?',
    opts: [
      'One is always chosen by Raft arbitration',
      'Both become co-leaders',
      'Split vote — new election with higher term',
      'The cluster halts permanently'
    ],
    ans: 2,
    why: 'With a split vote, neither candidate reaches majority. Election timeouts expire and a new election starts at a higher term. Randomized timeouts make repeated splits unlikely.'
  },
  {
    tag: 'Safety',
    q: 'Which property ensures a new leader has all committed entries?',
    opts: [
      'Log Matching Property',
      'Leader Completeness Property',
      'State Machine Safety',
      'Election Restriction'
    ],
    ans: 3,
    why: 'The Election Restriction rule: a node only grants a vote if the candidate\'s log is at least as up-to-date as its own. This ensures leaders contain all committed entries.'
  },
  {
    tag: 'Partitions',
    q: 'A network partition isolates the leader with 2 followers on one side and 2 followers on the other side of a 5-node cluster. What happens?',
    opts: [
      'Both partitions elect independent leaders',
      'Only the majority side (3 nodes) can elect a leader and commit',
      'The entire cluster stops',
      'The minority side keeps the old leader and commits'
    ],
    ans: 1,
    why: 'Only the side with a majority (3 nodes) can elect a new leader and commit entries. The old leader on the minority side cannot commit new entries without a majority.'
  },
  {
    tag: 'Log Replication',
    q: 'If a follower\'s log diverges from the leader\'s, how is it reconciled?',
    opts: [
      'Follower truncates and overwrites with leader\'s entries',
      'Leader merges both logs',
      'Both are kept as forks',
      'Follower is removed from the cluster'
    ],
    ans: 0,
    why: 'The leader forces follower logs to duplicate its own. AppendEntries with consistency check finds the matching point; the follower truncates everything after and copies from the leader.'
  }
];

let idx = 0, score = 0;
const card = document.getElementById('card');
const actions = document.getElementById('actions');
const explain = document.getElementById('explain');
const scoreEl = document.getElementById('score');
const totalEl = document.getElementById('total');
const bar = document.getElementById('bar');

totalEl.textContent = questions.length;

function render() {
  explain.classList.remove('show');
  explain.innerHTML = '';
  actions.innerHTML = '';
  if (idx >= questions.length) {
    card.innerHTML = `<div class="q-tag">Complete</div><h2 style="color:#6ee7b7;margin-bottom:8px;">Well done!</h2>
      <p>You scored <b>${score}</b> out of <b>${questions.length}</b>.</p>
      <p style="margin-top:10px;color:#7a8196;font-size:13px;">
      ${score === questions.length ? 'Perfect — you\'ve mastered Raft basics.'
        : score >= questions.length * 0.7 ? 'Solid understanding of Raft.'
        : 'Review the Raft paper by Ongaro & Ousterhout.'}</p>`;
    const restart = document.createElement('button');
    restart.className = 'next';
    restart.textContent = 'Restart';
    restart.onclick = () => { idx = 0; score = 0; scoreEl.textContent = 0; bar.style.width = '0%'; render(); };
    actions.appendChild(restart);
    return;
  }
  const Q = questions[idx];
  card.innerHTML = `<div class="q-tag">${Q.tag}</div><div>${Q.q}</div>`;
  Q.opts.forEach((opt, i) => {
    const b = document.createElement('button');
    b.className = 'opt'; b.textContent = opt;
    b.onclick = () => choose(i, b);
    actions.appendChild(b);
  });
  bar.style.width = ((idx / questions.length) * 100) + '%';
}

function choose(i, btn) {
  const Q = questions[idx];
  const buttons = actions.querySelectorAll('.opt');
  buttons.forEach((b, bi) => {
    b.disabled = true;
    if (bi === Q.ans) b.classList.add('right');
    else if (bi === i) b.classList.add('wrong');
  });
  if (i === Q.ans) { score++; scoreEl.textContent = score; }
  explain.innerHTML = `<b style="color:#6ee7b7;">Why:</b> ${Q.why}`;
  explain.classList.add('show');
  const next = document.createElement('button');
  next.className = 'next';
  next.textContent = idx === questions.length - 1 ? 'See Results' : 'Next Question';
  next.onclick = () => { idx++; render(); };
  actions.appendChild(next);
  bar.style.width = (((idx + 1) / questions.length) * 100) + '%';
}

render();