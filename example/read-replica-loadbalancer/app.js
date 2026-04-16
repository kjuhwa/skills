const reps = [
  { name: 'rep-1', weight: 3, conns: 0, reqs: 0 },
  { name: 'rep-2', weight: 2, conns: 0, reqs: 0 },
  { name: 'rep-3', weight: 1, conns: 0, reqs: 0 },
  { name: 'rep-4', weight: 2, conns: 0, reqs: 0 }
];
let strategy = 'round-robin', rrIndex = 0, totalReq = 0;
const logEl = document.getElementById('log');
const repEl = document.getElementById('replicas');

reps.forEach((r, i) => {
  repEl.innerHTML += `<div class="replica" id="r${i}"><span class="name">${r.name}</span><div class="bar-bg"><div class="bar-fill" id="bf${i}" style="width:0%"></div></div><span class="count" id="rc${i}">0</span></div>`;
});

function setStrategy(s) { strategy = s; document.getElementById('strategy-label').textContent = s; }

function pick() {
  if (strategy === 'round-robin') { rrIndex = (rrIndex + 1) % reps.length; return rrIndex; }
  if (strategy === 'least-conn') { let mi = 0; reps.forEach((r, i) => { if (r.conns < reps[mi].conns) mi = i; }); return mi; }
  const total = reps.reduce((s, r) => s + r.weight, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < reps.length; i++) { rand -= reps[i].weight; if (rand <= 0) return i; }
  return 0;
}

function send() {
  const i = pick();
  reps[i].reqs++; reps[i].conns++; totalReq++;
  logEl.innerHTML += `<div><span style="color:#6ee7b7">${new Date().toLocaleTimeString()}</span> → ${reps[i].name} [${strategy}]</div>`;
  logEl.scrollTop = logEl.scrollHeight;
  document.getElementById('total-req').textContent = totalReq + ' requests';
  setTimeout(() => { reps[i].conns = Math.max(0, reps[i].conns - 1); }, 800 + Math.random() * 1200);
}

function render() {
  const max = Math.max(1, ...reps.map(r => r.reqs));
  reps.forEach((r, i) => {
    document.getElementById('bf' + i).style.width = (r.reqs / max * 100) + '%';
    document.getElementById('rc' + i).textContent = r.reqs + ' req';
  });
}

setInterval(send, 300 + Math.random() * 200);
setInterval(render, 500);