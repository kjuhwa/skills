const svg = document.getElementById('scene');
const events = document.getElementById('events');

const services = [
  { id: 'order', name: 'Order Svc', x: 120, y: 100, color: '#6ee7b7' },
  { id: 'payment', name: 'Payment Svc', x: 320, y: 100, color: '#ffd36e' },
  { id: 'inventory', name: 'Inventory Svc', x: 520, y: 100, color: '#b794f6' },
  { id: 'shipping', name: 'Shipping Svc', x: 680, y: 100, color: '#7dc9ff' }
];

const reactions = {
  'OrderCreated': { svc: 'payment', next: 'PaymentProcessed', compensate: 'PaymentFailed' },
  'PaymentProcessed': { svc: 'inventory', next: 'StockReserved', compensate: 'StockUnavailable' },
  'StockReserved': { svc: 'shipping', next: 'ShipmentCreated', compensate: 'ShippingFailed' },
  'PaymentFailed': { svc: 'order', next: 'OrderCancelled' },
  'StockUnavailable': { svc: 'payment', next: 'PaymentRefunded' },
  'PaymentRefunded': { svc: 'order', next: 'OrderCancelled' },
  'ShippingFailed': { svc: 'inventory', next: 'StockReleased' },
  'StockReleased': { svc: 'payment', next: 'PaymentRefunded' }
};

let chaos = false;

function drawScene() {
  svg.innerHTML = '';
  const bus = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bus.setAttribute('x', 80); bus.setAttribute('y', 240);
  bus.setAttribute('width', 640); bus.setAttribute('height', 60);
  bus.setAttribute('fill', '#12141c');
  bus.setAttribute('stroke', '#6ee7b7');
  bus.setAttribute('rx', 8);
  svg.appendChild(bus);

  services.forEach(s => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', `svc-${s.id}`);
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', s.x - 60); rect.setAttribute('y', s.y - 30);
    rect.setAttribute('width', 120); rect.setAttribute('height', 60);
    rect.setAttribute('rx', 8);
    rect.setAttribute('fill', '#1a1d27');
    rect.setAttribute('stroke', s.color);
    rect.setAttribute('stroke-width', 2);
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', s.x); txt.setAttribute('y', s.y + 5);
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('fill', s.color);
    txt.setAttribute('font-size', '13');
    txt.setAttribute('font-weight', 'bold');
    txt.textContent = s.name;
    g.appendChild(rect); g.appendChild(txt);
    svg.appendChild(g);
  });
}

function flashService(id) {
  const el = document.querySelector(`#svc-${id} rect`);
  if (!el) return;
  el.setAttribute('fill', '#2a3042');
  setTimeout(() => el.setAttribute('fill', '#1a1d27'), 400);
}

function animateEvent(fromId, eventName, isError) {
  const svc = services.find(s => s.id === fromId);
  if (!svc) return;
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', svc.x);
  circle.setAttribute('cy', svc.y + 30);
  circle.setAttribute('r', 8);
  circle.setAttribute('fill', isError ? '#ff7a90' : '#6ee7b7');
  svg.appendChild(circle);

  const targetX = 100 + Math.random() * 600;
  const anim = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
  anim.setAttribute('attributeName', 'cy');
  anim.setAttribute('from', svc.y + 30);
  anim.setAttribute('to', 270);
  anim.setAttribute('dur', '0.6s');
  anim.setAttribute('fill', 'freeze');
  circle.appendChild(anim);
  anim.beginElement();
  setTimeout(() => circle.remove(), 1200);
}

function logEvent(name, cls) {
  const li = document.createElement('li');
  li.className = cls || '';
  li.textContent = `→ ${name} @${new Date().toLocaleTimeString()}`;
  events.prepend(li);
}

function publish(event, sourceId) {
  const isErr = event.includes('Failed') || event.includes('Unavailable');
  const isComp = event.includes('Refunded') || event.includes('Released') || event.includes('Cancelled');
  logEvent(event, isErr ? 'error' : isComp ? 'compensate' : '');
  if (sourceId) animateEvent(sourceId, event, isErr);

  const r = reactions[event];
  if (!r) return;
  setTimeout(() => {
    flashService(r.svc);
    let outcome = r.next;
    if (chaos && r.compensate && Math.random() < 0.4) outcome = r.compensate;
    publish(outcome, r.svc);
  }, 900);
}

document.getElementById('emit').onclick = () => publish('OrderCreated', 'order');
document.getElementById('chaos').onclick = (e) => {
  chaos = !chaos;
  e.target.textContent = chaos ? 'Chaos: ON' : 'Chaos Mode';
  e.target.style.background = chaos ? '#ff7a90' : '';
};
document.getElementById('clear').onclick = () => events.innerHTML = '';

drawScene();
logEvent('System ready. Click "Emit OrderCreated" to begin.');