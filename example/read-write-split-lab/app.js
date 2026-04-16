let writeDb = [
  { id: 1, name: 'Alice', city: 'Seoul' },
  { id: 2, name: 'Bob', city: 'Tokyo' },
  { id: 3, name: 'Carol', city: 'Seoul' }
];
let readDb = [...writeDb];
let queue = [];
let nextId = 4;

const writeTbl = document.querySelector('#writeTbl tbody');
const readCards = document.getElementById('readCards');
const queueList = document.getElementById('queueList');
const lag = document.getElementById('lag');
const lagVal = document.getElementById('lagVal');
const search = document.getElementById('search');

lag.oninput = () => lagVal.textContent = lag.value;

function renderWrite() {
  writeTbl.innerHTML = writeDb.map(u => 
    `<tr><td>${u.id}</td><td>${u.name}</td><td>${u.city}</td></tr>`
  ).join('');
}

function renderRead() {
  const term = search.value.toLowerCase();
  const filtered = readDb.filter(u => 
    !term || u.name.toLowerCase().includes(term) || u.city.toLowerCase().includes(term)
  );
  readCards.innerHTML = filtered.map(u =>
    `<div class="card"><b>${u.name}</b> <small>#${u.id} · ${u.city}</small></div>`
  ).join('');
  document.getElementById('userCount').textContent = readDb.length;
  document.getElementById('cityCount').textContent = new Set(readDb.map(u => u.city)).size;
}

function renderQueue() {
  queueList.innerHTML = queue.map(q => 
    `<li>⏳ UserCreated #${q.user.id} (${q.user.name})</li>`
  ).join('');
}

function createUser(name, city) {
  const user = { id: nextId++, name, city };
  writeDb.push(user);
  renderWrite();
  const evt = { user, ts: Date.now() };
  queue.push(evt);
  renderQueue();
  const delay = +lag.value;
  setTimeout(() => {
    readDb.push(user);
    queue = queue.filter(q => q !== evt);
    renderQueue();
    renderRead();
  }, delay);
}

document.getElementById('userForm').onsubmit = (e) => {
  e.preventDefault();
  const name = document.getElementById('uName').value.trim();
  const city = document.getElementById('uCity').value.trim();
  if (name && city) {
    createUser(name, city);
    e.target.reset();
  }
};

search.oninput = renderRead;

renderWrite();
renderRead();

setTimeout(() => createUser('Dave', 'Busan'), 1500);