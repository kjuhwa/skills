const contexts = [
  { id: 'ord', name: 'Ordering', type: 'Core', x: 80, y: 80, w: 180, h: 90,
    aggs: ['Order', 'OrderLine', 'Cart'],
    events: [['OrderPlaced', 'customer completes checkout'], ['OrderCancelled', 'customer aborts']] },
  { id: 'inv', name: 'Inventory', type: 'Supporting', x: 320, y: 80, w: 180, h: 90,
    aggs: ['StockItem', 'Warehouse'],
    events: [['StockReserved', 'item held for order'], ['StockReleased', 'reservation expired']] },
  { id: 'bil', name: 'Billing', type: 'Core', x: 560, y: 80, w: 180, h: 90,
    aggs: ['Invoice', 'Payment'],
    events: [['InvoiceIssued', 'after order placed'], ['PaymentReceived', 'customer paid']] },
  { id: 'shp', name: 'Shipping', type: 'Supporting', x: 200, y: 260, w: 180, h: 90,
    aggs: ['Shipment', 'Carrier'],
    events: [['ShipmentDispatched', 'package left warehouse'], ['Delivered', 'customer signed']] },
  { id: 'cat', name: 'Catalog', type: 'Generic', x: 440, y: 260, w: 180, h: 90,
    aggs: ['Product', 'Category', 'Price'],
    events: [['ProductListed', 'new SKU available']] }
];
const links = [
  { from: 'ord', to: 'inv', label: 'U/D' },
  { from: 'ord', to: 'bil', label: 'Customer/Supplier' },
  { from: 'ord', to: 'shp', label: 'Partnership' },
  { from: 'ord', to: 'cat', label: 'Conformist' }
];

const svg = document.getElementById('map');
const svgNS = 'http://www.w3.org/2000/svg';

function center(c) { return { x: c.x + c.w / 2, y: c.y + c.h / 2 }; }

links.forEach(l => {
  const a = center(contexts.find(c => c.id === l.from));
  const b = center(contexts.find(c => c.id === l.to));
  const line = document.createElementNS(svgNS, 'line');
  line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
  line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
  line.setAttribute('class', 'link');
  svg.appendChild(line);
  const lbl = document.createElementNS(svgNS, 'text');
  lbl.setAttribute('x', (a.x + b.x) / 2); lbl.setAttribute('y', (a.y + b.y) / 2 - 5);
  lbl.setAttribute('class', 'link-label');
  lbl.setAttribute('text-anchor', 'middle');
  lbl.textContent = l.label;
  svg.appendChild(lbl);
});

contexts.forEach(c => {
  const g = document.createElementNS(svgNS, 'g');
  g.setAttribute('class', 'ctx');
  g.setAttribute('data-id', c.id);
  g.innerHTML = `
    <rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="8"/>
    <text x="${c.x + 14}" y="${c.y + 28}">${c.name}</text>
    <text class="type" x="${c.x + 14}" y="${c.y + 48}">${c.type} Domain</text>
    <text class="type" x="${c.x + 14}" y="${c.y + 68}">${c.aggs.length} aggregates</text>
  `;
  g.addEventListener('click', () => select(c.id));
  svg.appendChild(g);
});

function select(id) {
  document.querySelectorAll('#map .ctx').forEach(n =>
    n.classList.toggle('active', n.dataset.id === id));
  const c = contexts.find(x => x.id === id);
  document.getElementById('ctxName').textContent = c.name;
  document.getElementById('ctxMeta').textContent = `${c.type} • ${c.aggs.length} aggregates • ${c.events.length} events`;
  document.getElementById('aggList').innerHTML =
    c.aggs.map(a => `<li>${a}</li>`).join('');
  document.getElementById('evtList').innerHTML =
    c.events.map(([n, d]) => `<li>${n}<small>${d}</small></li>`).join('');
}
select('ord');