const db = {
  users: [
    { id: 1, name: 'Ada', age: 30 },
    { id: 2, name: 'Lin', age: 22 },
    { id: 3, name: 'Rao', age: 45 },
    { id: 4, name: 'Kim', age: 18 },
    { id: 5, name: 'Ben', age: 28 }
  ],
  orders: [
    { id: 1, user: 'Ada', total: 120 },
    { id: 2, user: 'Lin', total: 45 },
    { id: 3, user: 'Rao', total: 250 },
    { id: 4, user: 'Ben', total: 80 }
  ]
};

function renderTables() {
  const ul = document.getElementById('tables');
  ul.innerHTML = '';
  Object.keys(db).forEach(t => {
    const li = document.createElement('li');
    li.textContent = `${t} (${db[t].length})`;
    ul.appendChild(li);
  });
}

function parseWhere(where) {
  const m = where.match(/(\w+)\s*(>|<|=|>=|<=)\s*(\S+)/);
  if (!m) return () => true;
  const [, k, op, v] = m;
  const val = isNaN(v) ? v.replace(/['"]/g, '') : Number(v);
  return row => {
    const rv = row[k];
    if (op === '>') return rv > val;
    if (op === '<') return rv < val;
    if (op === '=') return rv == val;
    if (op === '>=') return rv >= val;
    if (op === '<=') return rv <= val;
  };
}

function run(sql) {
  sql = sql.trim();
  const isCmd = /^COMMAND\s/i.test(sql);
  setStatus(isCmd ? 'command' : 'query');
  try {
    if (isCmd) return runCommand(sql);
    return runQuery(sql);
  } catch (e) {
    setStatus('error');
    document.getElementById('result').innerHTML = `<div class="msg">Error: ${e.message}</div>`;
  }
}

function runQuery(sql) {
  const m = sql.match(/SELECT\s+\*\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
  if (!m) throw new Error('invalid SELECT');
  const rows = (db[m[1]] || []).filter(parseWhere(m[2] || ''));
  renderRows(rows);
}

function runCommand(sql) {
  const ins = sql.match(/COMMAND\s+INSERT\s+(\w+)\s+(.+)/i);
  const del = sql.match(/COMMAND\s+DELETE\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
  if (ins) {
    const table = ins[1];
    const row = { id: (db[table].at(-1)?.id || 0) + 1 };
    ins[2].split(/\s+/).forEach(kv => {
      const [k, v] = kv.split('=');
      row[k] = isNaN(v) ? v : Number(v);
    });
    db[table].push(row);
    renderTables();
    document.getElementById('result').innerHTML =
      `<div class="msg">Inserted into ${table}: ${JSON.stringify(row)}</div>`;
  } else if (del) {
    const table = del[1];
    const pred = parseWhere(del[2] || '');
    const before = db[table].length;
    db[table] = db[table].filter(r => !pred(r));
    renderTables();
    document.getElementById('result').innerHTML =
      `<div class="msg">Deleted ${before - db[table].length} from ${table}</div>`;
  } else throw new Error('unknown COMMAND');
}

function renderRows(rows) {
  const el = document.getElementById('result');
  if (!rows.length) return el.innerHTML = '<div class="msg">(no rows)</div>';
  const keys = Object.keys(rows[0]);
  el.innerHTML = `<table><thead><tr>${keys.map(k => `<th>${k}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${keys.map(k => `<td>${r[k]}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function setStatus(s) {
  const el = document.getElementById('status');
  el.className = 'status ' + s;
  el.textContent = s;
}

document.getElementById('run').addEventListener('click', () => {
  run(document.getElementById('editor').value);
});
document.querySelectorAll('#samples li').forEach(li => {
  li.addEventListener('click', () => {
    document.getElementById('editor').value = li.dataset.q;
    run(li.dataset.q);
  });
});

renderTables();
run(document.getElementById('editor').value);