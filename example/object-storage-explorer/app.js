const buckets = {
  'prod-assets': generate(40, 'images'),
  'user-uploads': generate(60, 'docs'),
  'backups-2026': generate(25, 'archives'),
  'logs-archive': generate(80, 'logs'),
};
function generate(n, kind) {
  const folders = ['2024/', '2025/', '2026/', 'temp/', 'cache/'];
  const exts = { images: ['png','jpg','webp','svg'], docs: ['pdf','docx','xlsx','txt'], archives: ['tar.gz','zip','bak'], logs: ['log','json','gz'] };
  const classes = ['STANDARD', 'IA', 'GLACIER', 'DEEP_ARCHIVE'];
  const arr = [];
  for (let i = 0; i < 5; i++) arr.push({ name: folders[i % folders.length], type: 'folder' });
  for (let i = 0; i < n; i++) {
    const ext = exts[kind][i % exts[kind].length];
    arr.push({
      name: `${kind}-${i.toString(16)}.${ext}`,
      type: 'file',
      size: Math.floor(Math.random() * 50_000_000),
      modified: new Date(Date.now() - Math.random() * 9e9).toISOString().slice(0, 10),
      class: classes[Math.floor(Math.random() * classes.length)],
    });
  }
  return arr;
}
let current = 'prod-assets';
function fmtSize(b) {
  if (!b) return '—';
  const u = ['B','KB','MB','GB']; let i = 0;
  while (b > 1024 && i < 3) { b /= 1024; i++; }
  return b.toFixed(1) + ' ' + u[i];
}
function renderBuckets() {
  document.getElementById('buckets').innerHTML = Object.keys(buckets).map(b =>
    `<li class="${b === current ? 'active' : ''}" data-b="${b}">${b}</li>`).join('');
  document.querySelectorAll('#buckets li').forEach(li =>
    li.onclick = () => { current = li.dataset.b; render(); });
}
function render() {
  const filter = document.getElementById('search').value.toLowerCase();
  const items = buckets[current].filter(i => i.name.toLowerCase().includes(filter));
  document.getElementById('path').textContent = `s3://${current}/`;
  document.getElementById('stats').textContent = `${items.length} objects`;
  document.getElementById('rows').innerHTML = items.map(i => i.type === 'folder'
    ? `<tr><td class="folder">📁 ${i.name}</td><td>—</td><td>—</td><td>—</td></tr>`
    : `<tr><td>📄 ${i.name}</td><td>${fmtSize(i.size)}</td><td>${i.modified}</td><td><span class="tag">${i.class}</span></td></tr>`
  ).join('');
  renderBuckets();
}
document.getElementById('search').oninput = render;
document.getElementById('back').onclick = render;
render();