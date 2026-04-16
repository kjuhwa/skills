class EventBus {
  constructor() { this.subs = []; }
  subscribe(pattern) {
    const id = Date.now() + Math.random();
    const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '[^.]+') + '$');
    this.subs.push({ id, pattern, regex, hits: 0 });
    return id;
  }
  unsubscribe(id) { this.subs = this.subs.filter(s => s.id !== id); }
  publish(channel, payload) {
    const matched = this.subs.filter(s => s.regex.test(channel));
    matched.forEach(s => s.hits++);
    return matched.map(s => s.pattern);
  }
}

const bus = new EventBus();
bus.subscribe('user.*');
bus.subscribe('cart.add');

const subsEl = document.getElementById('subs');
const logEl = document.getElementById('log');

function renderSubs() {
  subsEl.innerHTML = bus.subs.map(s =>
    `<li><span>${s.pattern}</span><span><span class="hits">${s.hits} hits</span> <span class="rm" data-id="${s.id}">✕</span></span></li>`
  ).join('');
  subsEl.querySelectorAll('.rm').forEach(el => el.onclick = () => {
    bus.unsubscribe(parseFloat(el.dataset.id));
    renderSubs();
  });
}

function publish(channel, payload) {
  const matched = bus.publish(channel, payload);
  const evt = document.createElement('div');
  evt.className = 'evt' + (matched.length ? ' match' : '');
  evt.innerHTML = `<span class="ch">${channel}</span> <span class="pl">${payload}</span>${matched.length ? `<div class="matched">→ matched: ${matched.join(', ')}</div>` : '<div class="matched" style="color:#6b7280">→ no subscribers</div>'}`;
  logEl.prepend(evt);
  while (logEl.children.length > 30) logEl.lastChild.remove();
  renderSubs();
}

document.getElementById('pub').onclick = () => {
  publish(document.getElementById('ch').value.trim(), document.getElementById('pl').value.trim());
};
document.getElementById('sub').onclick = () => {
  const p = document.getElementById('pat').value.trim();
  if (p) { bus.subscribe(p); document.getElementById('pat').value = ''; renderSubs(); }
};
document.querySelectorAll('.quick button').forEach(b => {
  b.onclick = () => publish(b.dataset.ch, b.dataset.pl);
});

const demo = [
  ['user.login', '{"id":1}'], ['user.logout', '{"id":1}'],
  ['cart.add', '{"item":"hat"}'], ['order.ship', '{"order":42}'],
  ['user.signup', '{"id":99}']
];
let i = 0;
setInterval(() => { const [c, p] = demo[i++ % demo.length]; publish(c, p); }, 2500);

renderSubs();
publish('user.login', '{"id":1}');