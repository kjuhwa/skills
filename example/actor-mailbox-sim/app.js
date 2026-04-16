const container = document.getElementById('actors');
const MSG_TYPES = ['compute', 'io-read', 'io-write', 'validate', 'transform', 'notify', 'checkpoint'];
const NAMES = ['Dispatcher', 'Aggregator', 'Persister', 'Notifier', 'Validator'];
let paused = false;

class Actor {
  constructor(name) {
    this.name = name; this.mailbox = []; this.processed = 0; this.processing = null;
    this.speed = 500 + Math.random() * 1500 | 0;
    this.el = document.createElement('div'); this.el.className = 'actor-card';
    this.el.innerHTML = `<h2>${name}</h2><div class="stats">Speed: ${this.speed}ms | Processed: <span class="cnt">0</span></div><div class="mailbox"></div>`;
    this.el.addEventListener('click', () => this.enqueue(MSG_TYPES[Math.random() * MSG_TYPES.length | 0]));
    container.appendChild(this.el);
    this.tick();
  }
  enqueue(type) { if (this.mailbox.length >= 8) return; this.mailbox.push(type); this.render(); }
  tick() {
    if (!paused && this.mailbox.length > 0 && !this.processing) {
      this.processing = this.mailbox.shift(); this.render();
      setTimeout(() => { this.processed++; this.processing = null; this.render(); this.tick(); }, this.speed);
    } else { setTimeout(() => this.tick(), 200); }
  }
  render() {
    const mb = this.el.querySelector('.mailbox'); mb.innerHTML = '';
    if (this.processing) { const d = document.createElement('div'); d.className = 'msg processing'; d.textContent = '⚙ ' + this.processing; mb.appendChild(d); }
    this.mailbox.forEach(m => { const d = document.createElement('div'); d.className = 'msg'; d.textContent = '✉ ' + m; mb.appendChild(d); });
    this.el.querySelector('.cnt').textContent = this.processed;
  }
}

const actors = NAMES.map(n => new Actor(n));
function floodAll() { actors.forEach(a => { for (let i = 0; i < 5; i++) a.enqueue(MSG_TYPES[Math.random() * MSG_TYPES.length | 0]); }); }
function pauseAll() { paused = !paused; }

setInterval(() => { const a = actors[Math.random() * actors.length | 0]; a.enqueue(MSG_TYPES[Math.random() * MSG_TYPES.length | 0]); }, 800);