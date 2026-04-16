const pendingEl = document.getElementById('pending');
const writeSvg = document.getElementById('write-svg');
const readSvg = document.getElementById('read-svg');
const lagEl = document.getElementById('lag');
const delayEl = document.getElementById('delay');
const delayVal = document.getElementById('delay-val');

let writeState = { items: [] };
let readState = { items: [] };
let pending = [];
let lastCmdTs = 0;

const seed = [
  { product: 'Mouse', qty: 1, price: 24.5 },
  { product: 'Monitor', qty: 1, price: 299.0 }
];
seed.forEach(s => { writeState.items.push(s); readState.items.push({ ...s }); });

document.getElementById('cmd-form').addEventListener('submit', e => {
  e.preventDefault();
  const cmd = {
    product: document.getElementById('f-product').value,
    qty: +document.getElementById('f-qty').value,
    price: +document.getElementById('f-price').value,
    ts: Date.now()
  };
  writeState.items.push(cmd);
  pending.push(cmd);
  lastCmdTs = cmd.ts;
  renderPending();
  renderSvg(writeSvg, writeState.items, '#6ee7b7');
  updateMetrics();
  const delay = +delayEl.value;
  setTimeout(() => {
    readState.items.push(cmd);
    pending = pending.filter(p => p !== cmd);
    renderPending();
    renderSvg(readSvg, readState.items, '#60a5fa');
    updateMetrics();
  }, delay);
});

function renderPending() {
  pendingEl.innerHTML = pending.map(p =>
    `<li>${p.product} × ${p.qty} @ $${p.price}</li>`).join('');
}

function renderSvg(svg, items, color) {
  svg.innerHTML = '';
  const max = Math.max(...items.map(i => i.qty * i.price), 100);
  const w = 300 / Math.max(items.length, 1);
  items.forEach((item, i) => {
    const h = (item.qty * item.price / max) * 150;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', i * w + 4);
    rect.setAttribute('y', 180 - h);
    rect.setAttribute('width', w - 8);
    rect.setAttribute('height', h);
    rect.setAttribute('fill', color);
    rect.setAttribute('opacity', '0.8');
    rect.setAttribute('rx', '3');
    svg.appendChild(rect);
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', i * w + w / 2);
    label.setAttribute('y', 195);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', '#8b92a7');
    label.setAttribute('font-size', '9');
    label.textContent = item.product.slice(0, 6);
    svg.appendChild(label);
  });
}

function updateMetrics() {
  const wc = writeState.items.reduce((a, b) => a + b.qty, 0);
  const wt = writeState.items.reduce((a, b) => a + b.qty * b.price, 0);
  const rc = readState.items.reduce((a, b) => a + b.qty, 0);
  const rt = readState.items.reduce((a, b) => a + b.qty * b.price, 0);
  document.getElementById('write-count').textContent = wc;
  document.getElementById('write-total').textContent = '$' + wt.toFixed(2);
  document.getElementById('read-count').textContent = rc;
  document.getElementById('read-total').textContent = '$' + rt.toFixed(2);
}

delayEl.addEventListener('input', () => { delayVal.textContent = delayEl.value; });

document.getElementById('flush').addEventListener('click', () => {
  readState.items = [...writeState.items];
  pending = [];
  renderPending();
  renderSvg(readSvg, readState.items, '#60a5fa');
  updateMetrics();
});

setInterval(() => {
  const lag = pending.length ? Date.now() - lastCmdTs : 0;
  lagEl.textContent = lag;
}, 100);

renderSvg(writeSvg, writeState.items, '#6ee7b7');
renderSvg(readSvg, readState.items, '#60a5fa');
updateMetrics();