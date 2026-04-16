const sourceData = [
  { id: 1, name: 'alice', country: 'us', amount: 45.5, status: 'paid' },
  { id: 2, name: 'bob', country: 'uk', amount: 12.0, status: 'pending' },
  { id: 3, name: 'carol', country: 'us', amount: 89.9, status: 'paid' },
  { id: 4, name: 'dan', country: 'de', amount: 3.5, status: 'failed' },
  { id: 5, name: 'eve', country: 'us', amount: 120.0, status: 'paid' },
  { id: 6, name: 'frank', country: 'fr', amount: 8.75, status: 'pending' }
];

let rules = [
  { type: 'uppercase', a: 'name', b: '' },
  { type: 'filter', a: 'status', b: 'paid' }
];

const sourceEl = document.getElementById('source');
const outputEl = document.getElementById('output');
const ruleListEl = document.getElementById('ruleList');

function applyRules(rows, rules) {
  let out = rows.map(r => ({ ...r }));
  for (const rule of rules) {
    if (rule.type === 'uppercase') {
      out = out.map(r => ({ ...r, [rule.a]: String(r[rule.a] ?? '').toUpperCase() }));
    } else if (rule.type === 'rename') {
      out = out.map(r => {
        const c = { ...r }; c[rule.b] = c[rule.a]; delete c[rule.a]; return c;
      });
    } else if (rule.type === 'filter') {
      out = out.filter(r => String(r[rule.a]) === rule.b);
    } else if (rule.type === 'derive') {
      out = out.map(r => {
        let val;
        try { val = Function('row', `with(row){return ${rule.b}}`)(r); } catch { val = '#ERR'; }
        return { ...r, [rule.a]: val };
      });
    } else if (rule.type === 'drop') {
      out = out.map(r => { const c = { ...r }; delete c[rule.a]; return c; });
    }
  }
  return out;
}

function render() {
  sourceEl.textContent = JSON.stringify(sourceData, null, 2);
  outputEl.textContent = JSON.stringify(applyRules(sourceData, rules), null, 2);

  ruleListEl.innerHTML = '';
  rules.forEach((r, i) => {
    const div = document.createElement('div');
    div.className = 'rule-item';
    const descMap = {
      uppercase: `<code>${r.a}</code> → UPPERCASE`,
      rename: `<code>${r.a}</code> → <code>${r.b}</code>`,
      filter: `keep where <code>${r.a}</code> == "${r.b}"`,
      derive: `new <code>${r.a}</code> = ${r.b}`,
      drop: `drop <code>${r.a}</code>`
    };
    div.innerHTML = `<span>${descMap[r.type]}</span><button data-i="${i}">✕</button>`;
    ruleListEl.appendChild(div);
  });
  ruleListEl.querySelectorAll('button').forEach(b => {
    b.onclick = () => { rules.splice(+b.dataset.i, 1); render(); };
  });
}

document.getElementById('addRule').onclick = () => {
  const type = document.getElementById('ruleType').value;
  const a = document.getElementById('ruleArg1').value.trim();
  const b = document.getElementById('ruleArg2').value.trim();
  if (!a) return;
  rules.push({ type, a, b });
  document.getElementById('ruleArg1').value = '';
  document.getElementById('ruleArg2').value = '';
  render();
};

render();