const db = {
  users: [
    { id: '1', name: 'Ada Lovelace', email: 'ada@graph.io', age: 36, posts: ['p1', 'p2'] },
    { id: '2', name: 'Grace Hopper', email: 'grace@graph.io', age: 42, posts: ['p3'] },
    { id: '3', name: 'Linus Torvalds', email: 'linus@graph.io', age: 54, posts: [] }
  ],
  posts: [
    { id: 'p1', title: 'On Analytical Engines', likes: 142, authorId: '1' },
    { id: 'p2', title: 'Loops Considered Useful', likes: 98, authorId: '1' },
    { id: 'p3', title: 'COBOL at Scale', likes: 211, authorId: '2' }
  ]
};

const queries = {
  users: `query {\n  users {\n    id\n    name\n    email\n  }\n}`,
  posts: `query {\n  posts {\n    id\n    title\n    likes\n  }\n}`,
  nested: `query {\n  users {\n    name\n    posts {\n      title\n      likes\n    }\n  }\n}`
};

const editor = document.getElementById('query');
const output = document.getElementById('output');
const time = document.getElementById('time');

function parseQuery(q) {
  const m = q.match(/(\w+)\s*\{([\s\S]+)\}/);
  if (!m) return null;
  const root = m[1];
  const fieldsBlock = m[2];
  function parseFields(text) {
    const fields = []; let i = 0;
    while (i < text.length) {
      while (i < text.length && /\s/.test(text[i])) i++;
      if (i >= text.length) break;
      let name = '';
      while (i < text.length && /[\w]/.test(text[i])) { name += text[i++]; }
      if (!name) { i++; continue; }
      while (i < text.length && /\s/.test(text[i])) i++;
      if (text[i] === '{') {
        let depth = 1, sub = ''; i++;
        while (i < text.length && depth > 0) {
          if (text[i] === '{') depth++;
          else if (text[i] === '}') { depth--; if (depth === 0) break; }
          sub += text[i++];
        }
        i++;
        fields.push({ name, sub: parseFields(sub) });
      } else {
        fields.push({ name, sub: null });
      }
    }
    return fields;
  }
  return { root, fields: parseFields(fieldsBlock) };
}

function resolve(item, fields) {
  const obj = {};
  for (const f of fields) {
    let v = item[f.name];
    if (f.name === 'posts' && Array.isArray(item.posts) && item.posts[0] && typeof item.posts[0] === 'string') {
      v = item.posts.map(pid => db.posts.find(p => p.id === pid)).filter(Boolean);
    }
    if (f.sub && Array.isArray(v)) obj[f.name] = v.map(x => resolve(x, f.sub));
    else if (f.sub && v) obj[f.name] = resolve(v, f.sub);
    else obj[f.name] = v;
  }
  return obj;
}

function highlight(json) {
  return json.replace(/"([^"]+)":/g, '<span class="k">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="s">"$1"</span>')
    .replace(/: (\d+)/g, ': <span class="n">$1</span>')
    .replace(/: (true|false|null)/g, ': <span class="b">$1</span>');
}

function run() {
  const start = performance.now();
  const parsed = parseQuery(editor.value);
  if (!parsed) { output.textContent = '✗ Parse error'; return; }
  const root = db[parsed.root] || [];
  const data = root.map(item => resolve(item, parsed.fields));
  const elapsed = (performance.now() - start).toFixed(2);
  output.innerHTML = highlight(JSON.stringify({ data: { [parsed.root]: data } }, null, 2));
  time.textContent = `${elapsed}ms`;
}

document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  editor.value = queries[t.dataset.q];
  run();
}));
document.getElementById('run').addEventListener('click', run);
editor.value = queries.users;
run();