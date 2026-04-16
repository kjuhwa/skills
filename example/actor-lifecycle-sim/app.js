const grid = document.getElementById('grid');
const stats = document.getElementById('stats');
const actors = [];
let totalSpawned = 0, totalCrashed = 0, totalRestarted = 0;

const STATES = ['idle', 'processing', 'waiting', 'overloaded'];
const NAMES = ['guardian', 'worker', 'dispatcher', 'aggregator', 'monitor', 'scheduler', 'handler', 'router', 'sink', 'source'];

function spawnActor() {
  const a = { id: ++totalSpawned, name: NAMES[Math.random() * NAMES.length | 0] + '-' + totalSpawned, state: 'idle', health: 100, alive: true, processed: 0 };
  actors.push(a);
  render();
}
function killRandom() {
  const alive = actors.filter(a => a.alive);
  if (alive.length) { const a = alive[Math.random() * alive.length | 0]; a.alive = false; a.state = 'crashed'; a.health = 0; totalCrashed++; render(); }
}
function restartAll() {
  actors.forEach(a => { if (!a.alive) { a.alive = true; a.state = 'idle'; a.health = 100; totalRestarted++; } });
  render();
}
function render() {
  grid.innerHTML = '';
  actors.forEach(a => {
    const card = document.createElement('div');
    card.className = 'actor-card' + (a.alive ? '' : ' dead');
    card.innerHTML = `<div class="name">${a.name}</div><div class="state">${a.state} | msgs: ${a.processed}</div><div class="bar"><div class="bar-fill" style="width:${a.health}%"></div></div>`;
    card.onclick = () => { if (a.alive) { a.alive = false; a.state = 'crashed'; a.health = 0; totalCrashed++; } else { a.alive = true; a.state = 'idle'; a.health = 100; totalRestarted++; } render(); };
    grid.appendChild(card);
  });
  stats.innerHTML = `<span>Actors: <span class="stat-val">${actors.length}</span></span><span>Alive: <span class="stat-val">${actors.filter(a=>a.alive).length}</span></span><span>Crashed: <span class="stat-val">${totalCrashed}</span></span><span>Restarted: <span class="stat-val">${totalRestarted}</span></span>`;
}
for (let i = 0; i < 8; i++) spawnActor();

setInterval(() => {
  actors.forEach(a => {
    if (!a.alive) return;
    a.state = STATES[Math.random() * STATES.length | 0];
    a.processed += Math.random() * 3 | 0;
    a.health = a.state === 'overloaded' ? Math.max(10, a.health - 15) : Math.min(100, a.health + 5);
    if (a.health <= 10 && Math.random() > 0.6) { a.alive = false; a.state = 'crashed'; a.health = 0; totalCrashed++; setTimeout(() => { a.alive = true; a.state = 'idle'; a.health = 100; totalRestarted++; render(); }, 2000); }
  });
  render();
}, 1000);