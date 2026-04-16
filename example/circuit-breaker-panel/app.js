const zones = [
  { id: 'kitchen', name: 'Kitchen', rated: 20, draw: 14 },
  { id: 'bedroom', name: 'Bedroom', rated: 15, draw: 6 },
  { id: 'living', name: 'Living', rated: 15, draw: 8 },
  { id: 'bath', name: 'Bath', rated: 20, draw: 9 },
  { id: 'office', name: 'Office', rated: 15, draw: 11 },
  { id: 'garage', name: 'Garage', rated: 20, draw: 5 }
];
const breakers = zones.map(z => ({ ...z, on: true, load: 0 }));
const CAP = 60;

function render() {
  const container = document.getElementById('breakers');
  container.innerHTML = '';
  breakers.forEach(b => {
    const div = document.createElement('div');
    div.className = 'breaker' + (b.on ? '' : ' off');
    div.innerHTML = `<div class="switch"></div>
      <div class="breaker-info">
        <div class="n">${b.name}</div>
        <div class="a">${b.load.toFixed(1)}A / ${b.rated}A</div>
      </div>`;
    div.onclick = () => { b.on = !b.on; tick(); };
    container.appendChild(div);
  });
  document.querySelectorAll('.light').forEach(l => {
    const z = breakers.find(b => b.id === l.dataset.zone);
    l.classList.toggle('on', z.on);
  });
}

function tick() {
  let total = 0;
  breakers.forEach(b => {
    if (b.on) {
      b.load = b.draw + (Math.random() - 0.5) * 2;
      if (b.load > b.rated) { b.on = false; b.load = 0; flash(b.id); }
      else total += b.load;
    } else b.load = 0;
  });
  document.getElementById('amps').textContent = total.toFixed(1);
  const pct = Math.min(100, (total / CAP) * 100);
  document.getElementById('barFill').style.width = pct + '%';
  render();
}

function flash(id) {
  const el = document.querySelector(`[data-zone="${id}"]`);
  if (!el) return;
  el.animate([
    { background: '#ff6b6b' }, { background: '#1a1d27' }
  ], { duration: 600 });
}

function surge() {
  breakers.forEach(b => { if (b.on) b.draw += 5 + Math.random() * 10; });
  tick();
  setTimeout(() => { breakers.forEach((b, i) => b.draw = zones[i].draw); tick(); }, 1500);
}

document.getElementById('surge').onclick = surge;
document.getElementById('resetAll').onclick = () => {
  breakers.forEach((b, i) => { b.on = true; b.draw = zones[i].draw; });
  tick();
};

render(); tick();
setInterval(tick, 1500);