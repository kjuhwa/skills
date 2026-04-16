const schema = {
  users: { type: 'User', fields: { id: 'ID', name: 'String', email: 'String', role: 'String' } },
  posts: { type: 'Post', fields: { id: 'ID', title: 'String', body: 'String', likes: 'Int' } },
  comments: { type: 'Comment', fields: { id: 'ID', text: 'String', author: 'String' } }
};
const mockData = {
  users: [{ id: '1', name: 'Alice', email: 'alice@dev.io', role: 'Admin' }, { id: '2', name: 'Bob', email: 'bob@dev.io', role: 'Editor' }],
  posts: [{ id: '10', title: 'Intro to GraphQL', body: 'GraphQL is a query language...', likes: 42 }],
  comments: [{ id: '100', text: 'Great article!', author: 'Charlie' }]
};
const selected = {};
const tree = document.getElementById('tree');
const queryEl = document.getElementById('query');
const resultEl = document.getElementById('result');

Object.entries(schema).forEach(([root, { type, fields }]) => {
  const lbl = document.createElement('div');
  lbl.className = 'type-label'; lbl.textContent = root + ' → ' + type;
  tree.appendChild(lbl);
  selected[root] = new Set();
  Object.keys(fields).forEach(f => {
    const div = document.createElement('div');
    div.className = 'field';
    div.innerHTML = `<span class="dot"></span>${f} <span style="color:#64748b;font-size:0.7rem">${fields[f]}</span>`;
    div.addEventListener('click', () => {
      selected[root].has(f) ? selected[root].delete(f) : selected[root].add(f);
      div.classList.toggle('active');
      render();
    });
    tree.appendChild(div);
  });
});

function render() {
  let q = '{\n';
  const res = {};
  Object.entries(selected).forEach(([root, fields]) => {
    if (fields.size === 0) return;
    q += `  ${root} {\n`;
    fields.forEach(f => q += `    ${f}\n`);
    q += '  }\n';
    res[root] = mockData[root].map(item => {
      const o = {};
      fields.forEach(f => { if (f in item) o[f] = item[f]; });
      return o;
    });
  });
  q += '}';
  queryEl.textContent = Object.values(selected).some(s => s.size) ? q : '# Click fields to build a query';
  resultEl.textContent = Object.keys(res).length ? JSON.stringify({ data: res }, null, 2) : '';
}
render();