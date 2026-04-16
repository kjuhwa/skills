const oldSample = {
  type: 'record', name: 'Event',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'timestamp', type: 'long' },
    { name: 'payload', type: 'string' },
    { name: 'region', type: 'string', default: 'us-east' }
  ]
};

const newSample = {
  type: 'record', name: 'Event',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'timestamp', type: 'long' },
    { name: 'payload', type: 'bytes' },
    { name: 'region', type: 'string', default: 'us-east' },
    { name: 'tenant', type: 'string', default: 'public' }
  ]
};

document.getElementById('oldSchema').value = JSON.stringify(oldSample, null, 2);
document.getElementById('newSchema').value = JSON.stringify(newSample, null, 2);

function parseSchema(text) {
  try { return { ok: true, schema: JSON.parse(text) }; }
  catch (e) { return { ok: false, error: e.message }; }
}

function checkCompat(oldS, newS, mode) {
  const issues = [];
  const oldFields = new Map(oldS.fields.map(f => [f.name, f]));
  const newFields = new Map(newS.fields.map(f => [f.name, f]));

  const checkBackward = () => {
    for (const [name, nf] of newFields) {
      if (!oldFields.has(name) && nf.default === undefined) {
        issues.push({ level: 'err', msg: `New required field "${name}" has no default — old producers cannot populate it.` });
      }
    }
    for (const [name, of_] of oldFields) {
      if (!newFields.has(name) && of_.default === undefined) {
        issues.push({ level: 'err', msg: `Required field "${name}" removed — old data cannot be read.` });
      }
    }
    for (const [name, nf] of newFields) {
      const of_ = oldFields.get(name);
      if (of_ && JSON.stringify(of_.type) !== JSON.stringify(nf.type)) {
        issues.push({ level: 'err', msg: `Field "${name}" type changed: ${JSON.stringify(of_.type)} → ${JSON.stringify(nf.type)}` });
      }
    }
  };

  const checkForward = () => {
    for (const [name, of_] of oldFields) {
      if (!newFields.has(name) && of_.default === undefined) {
        issues.push({ level: 'err', msg: `Field "${name}" removed without default — new readers cannot interpret old data.` });
      }
    }
  };

  if (mode === 'BACKWARD' || mode === 'FULL') checkBackward();
  if (mode === 'FORWARD' || mode === 'FULL') checkForward();

  // Additive warnings
  for (const [name] of newFields) {
    if (!oldFields.has(name)) issues.push({ level: 'warn', msg: `Added field "${name}".` });
  }
  for (const [name] of oldFields) {
    if (!newFields.has(name)) issues.push({ level: 'warn', msg: `Removed field "${name}".` });
  }

  return issues;
}

document.getElementById('checkBtn').addEventListener('click', () => {
  const oldP = parseSchema(document.getElementById('oldSchema').value);
  const newP = parseSchema(document.getElementById('newSchema').value);
  const verdict = document.getElementById('verdict');
  const list = document.getElementById('issueList');
  list.innerHTML = '';

  if (!oldP.ok || !newP.ok) {
    verdict.className = 'verdict fail';
    verdict.textContent = 'Invalid JSON';
    const err = oldP.ok ? newP.error : oldP.error;
    const li = document.createElement('li');
    li.innerHTML = `<strong>Parse error</strong>${err}`;
    list.appendChild(li);
    return;
  }

  const mode = document.querySelector('input[name=mode]:checked').value;
  const issues = checkCompat(oldP.schema, newP.schema, mode);
  const errors = issues.filter(i => i.level === 'err');

  verdict.className = 'verdict ' + (errors.length ? 'fail' : 'pass');
  verdict.textContent = errors.length ? `INCOMPATIBLE (${mode})` : `COMPATIBLE (${mode})`;

  if (!issues.length) {
    const li = document.createElement('li');
    li.className = 'ok';
    li.innerHTML = '<strong>No differences</strong>Schemas are identical.';
    list.appendChild(li);
    return;
  }

  issues.forEach(i => {
    const li = document.createElement('li');
    li.className = i.level === 'warn' ? 'warn' : i.level === 'err' ? '' : 'ok';
    li.innerHTML = `<strong>${i.level.toUpperCase()}</strong>${i.msg}`;
    list.appendChild(li);
  });
});

document.getElementById('checkBtn').click();