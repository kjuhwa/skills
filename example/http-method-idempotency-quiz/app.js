const items = [
  { m: 'GET', u: '/users/42', idem: 'yes', why: 'Reading is safe and repeatable.' },
  { m: 'PUT', u: '/users/42', idem: 'yes', why: 'Replaces resource with same payload — same result.' },
  { m: 'DELETE', u: '/users/42', idem: 'yes', why: 'Second DELETE is a no-op; state remains deleted.' },
  { m: 'POST', u: '/orders', idem: 'no', why: 'Each POST typically creates a new resource.' },
  { m: 'PATCH', u: '/counter (+1)', idem: 'no', why: 'Relative updates compound on each call.' },
  { m: 'HEAD', u: '/status', idem: 'yes', why: 'Like GET, no side effects.' },
  { m: 'POST', u: '/payments (retry)', idem: 'no', why: 'Without a key, repeated POST may double-charge.' },
  { m: 'PUT', u: '/flag=true', idem: 'yes', why: 'Setting to true twice still yields true.' },
];

const pool = document.getElementById('pool');
const drops = document.querySelectorAll('.drop');
let round = [];

function shuffle(a) { return a.slice().sort(() => Math.random()-0.5); }

function newRound() {
  round = shuffle(items).slice(0, 6);
  pool.innerHTML = '';
  drops.forEach(d => d.innerHTML = '');
  round.forEach((it, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;
    card.dataset.i = i;
    card.innerHTML = `<span class="method">${it.m}</span>${it.u}`;
    card.ondragstart = e => e.dataTransfer.setData('text', i);
    pool.appendChild(card);
  });
  document.getElementById('feedback').textContent = '';
  document.getElementById('score').textContent = 0;
  document.getElementById('total').textContent = round.length;
}

drops.forEach(drop => {
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => {
    e.preventDefault();
    drop.classList.remove('over');
    const i = e.dataTransfer.getData('text');
    const card = document.querySelector(`.card[data-i="${i}"]`);
    if (card) { card.className = 'card'; drop.appendChild(card); }
  };
});

document.getElementById('check').onclick = () => {
  let score = 0;
  const fb = [];
  drops.forEach(drop => {
    const target = drop.dataset.val;
    drop.querySelectorAll('.card').forEach(card => {
      const it = round[card.dataset.i];
      if (it.idem === target) { card.classList.add('correct'); score++; }
      else { card.classList.add('wrong'); fb.push(`${it.m} ${it.u}: ${it.why}`); }
    });
  });
  document.getElementById('score').textContent = score;
  document.getElementById('feedback').textContent = fb.length ? fb[0] : 'All correct — idempotency mastered!';
};

document.getElementById('reset').onclick = newRound;
newRound();