const DATA = [
  { name: 'alice', age: 22, active: true, price: 100 },
  { name: 'bob', age: 17, active: true, price: 80 },
  { name: 'carol', age: 45, active: false, price: 200 },
  { name: 'dan', age: 31, active: true, price: 150 },
  { name: 'eve', age: 28, active: true, price: 90 },
  { name: 'frank', age: 16, active: false, price: 60 },
  { name: 'grace', age: 52, active: true, price: 250 },
];

const OPS = {
  users: { type: 'source', fn: () => [...DATA] },
  active: { type: 'filter', fn: arr => arr.filter(x => x.active) },
  adult: { type: 'filter', fn: arr => arr.filter(x => x.age >= 18) },
  upper: { type: 'map', fn: arr => arr.map(x => ({ ...x, name: x.name.toUpperCase() })) },
  addTax: { type: 'map', fn: arr => arr.map(x => ({ ...x, price: +(x.price * 1.1).toFixed(2) })) },
  count: { type: 'reduce', fn: arr => ({ count: arr.length }) },
  sumAge: { type: 'reduce', fn: arr => ({ sumAge: arr.reduce((s, x) => s + x.age, 0) }) },
  byAge: { type: 'sort', fn: arr => [...arr].sort((a, b) => b.age - a.age) },
};

const palette = document.getElementById('palette');
const pipeline = document.getElementById('pipeline');
const result = document.getElementById('result');
const output = document.getElementById('output');

palette.querySelectorAll('.block').forEach(b => {
  b.draggable = true;
  b.addEventListener('dragstart', e => {
    e.dataTransfer.setData('op', b.dataset.op);
  });
});

pipeline.addEventListener('dragover', e => { e.preventDefault(); pipeline.classList.add('drag-over'); });
pipeline.addEventListener('dragleave', () => pipeline.classList.remove('drag-over'));
pipeline.addEventListener('drop', e => {
  e.preventDefault();
  pipeline.classList.remove('drag-over');
  const op = e.dataTransfer.getData('op');
  addBlock(op);
});

function addBlock(op) {
  const src = palette.querySelector(`.block[data-op="${op}"]`);
  if (!src) return;
  const clone = src.cloneNode(true);
  clone.draggable = false;
  clone.title = 'Click to remove';
  clone.onclick = () => { clone.remove(); run(); };
  pipeline.appendChild(clone);
  run();
}

document.getElementById('clearBtn').onclick = () => {
  pipeline.innerHTML = '';
  result.textContent = 'Run to see output';
  output.textContent = '—';
};

document.getElementById('runBtn').onclick = run;

function run() {
  const blocks = [...pipeline.querySelectorAll('.block')];
  if (!blocks.length) { result.textContent = '(empty pipeline)'; return; }
  let data = null;
  const ops = [];
  for (const b of blocks) {
    const op = OPS[b.dataset.op];
    ops.push(b.dataset.op);
    if (op.type === 'source') data = op.fn();
    else if (data == null) { result.textContent = 'Error: pipeline needs a source first'; return; }
    else data = op.fn(data);
  }
  output.textContent = ops.join(' → ');
  result.textContent = JSON.stringify(data, null, 2);
}

addBlock('users');
addBlock('active');
addBlock('adult');
addBlock('byAge');