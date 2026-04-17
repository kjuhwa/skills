(() => {
  const SPECS = {
    Chart: {
      label: 'Chart a course',
      fields: [
        { k: 'from', t: 'text', ph: 'Misty Harbor', full: true },
        { k: 'to', t: 'text', ph: 'Forgotten Isle', full: true },
        { k: 'bearing', t: 'number', ph: '134' },
        { k: 'distance_nm', t: 'number', ph: '42' }
      ]
    },
    Sail: {
      label: 'Sail at speed',
      fields: [
        { k: 'knots', t: 'number', ph: '6.5' },
        { k: 'heading', t: 'number', ph: '210' },
        { k: 'duration_h', t: 'number', ph: '4' }
      ]
    },
    Anchor: {
      label: 'Drop anchor',
      fields: [
        { k: 'at', t: 'text', ph: 'Sleeping Cove', full: true },
        { k: 'depth_m', t: 'number', ph: '18' }
      ]
    },
    Signal: {
      label: 'Send a lantern signal',
      fields: [
        { k: 'to', t: 'text', ph: 'The Harbormaster', full: true },
        { k: 'body', t: 'textarea', ph: 'All hands safe — fog lifts at dawn', full: true }
      ],
      note: 'Signal bodies are byte-truncated to 70 bytes (UTF-8) with ellipsis when needed.'
    },
    Lantern: {
      label: 'Release a paper lantern',
      fields: [
        { k: 'count', t: 'number', ph: '3' },
        { k: 'color', t: 'select', opts: ['amber','rust','pale-jade','moon-white'] },
        { k: 'for', t: 'text', ph: 'the sleeping fishers', full: true }
      ]
    }
  };

  const SIGNAL_BUDGET = 70; // bytes

  const state = { type: 'Chart', entries: [], view: 'json' };

  const form = document.getElementById('form');
  const log = document.getElementById('log');
  const preview = document.getElementById('preview');
  const beaconBadge = document.getElementById('c-beacon');
  const entriesBadge = document.getElementById('c-entries');
  const routeBadge = document.getElementById('c-route');

  function renderForm() {
    const spec = SPECS[state.type];
    form.innerHTML = '';
    for (const f of spec.fields) {
      const wrap = document.createElement('div');
      if (f.full) wrap.classList.add('full');
      const id = `fld-${f.k}`;
      const lab = document.createElement('label');
      lab.textContent = f.k.replace(/_/g, ' ');
      lab.setAttribute('for', id);
      wrap.appendChild(lab);
      let el;
      if (f.t === 'textarea') { el = document.createElement('textarea'); el.rows = 3; }
      else if (f.t === 'select') {
        el = document.createElement('select');
        f.opts.forEach(o => { const op = document.createElement('option'); op.value = o; op.textContent = o; el.appendChild(op); });
      } else {
        el = document.createElement('input'); el.type = f.t;
      }
      el.id = id; el.dataset.key = f.k;
      if (f.ph) el.placeholder = f.ph;
      wrap.appendChild(el);
      form.appendChild(wrap);
    }
    if (spec.note) {
      const n = document.createElement('div');
      n.className = 'note';
      n.textContent = spec.note;
      form.appendChild(n);
    }
    if (state.type === 'Signal') {
      const preview = document.createElement('div');
      preview.className = 'note warn';
      preview.id = 'signal-preview';
      form.appendChild(preview);
      const ta = form.querySelector('textarea[data-key=body]');
      ta.addEventListener('input', updateSignalPreview);
      updateSignalPreview();
    }
  }

  function byteLength(s) { return new TextEncoder().encode(s).length; }
  function truncateByByte(s, budget) {
    if (byteLength(s) <= budget) return s;
    const ell = '…';
    const ellBytes = byteLength(ell);
    const target = Math.max(0, budget - ellBytes);
    const enc = new TextEncoder(); const dec = new TextDecoder();
    let bytes = enc.encode(s);
    while (bytes.length > target) bytes = bytes.slice(0, bytes.length - 1);
    let txt = '';
    try { txt = dec.decode(bytes); } catch { txt = ''; }
    while (byteLength(txt) > target) txt = txt.slice(0, -1);
    return txt + ell;
  }
  function updateSignalPreview() {
    const node = document.getElementById('signal-preview'); if (!node) return;
    const ta = form.querySelector('textarea[data-key=body]');
    if (!ta) return;
    const raw = ta.value;
    const n = byteLength(raw);
    if (n <= SIGNAL_BUDGET) {
      node.textContent = `${n}/${SIGNAL_BUDGET} B — fits the beacon as-is`;
      node.classList.remove('warn');
    } else {
      const trimmed = truncateByByte(raw, SIGNAL_BUDGET);
      node.textContent = `${n}/${SIGNAL_BUDGET} B — beacon will ship as: “${trimmed}” (${byteLength(trimmed)} B)`;
      node.classList.add('warn');
    }
    beaconBadge.textContent = `${n}/${SIGNAL_BUDGET} B`;
  }

  function collectForm() {
    const spec = SPECS[state.type];
    const out = { '@type': state.type };
    for (const f of spec.fields) {
      const el = form.querySelector(`[data-key="${f.k}"]`);
      if (!el) continue;
      let v = el.value;
      if (f.t === 'number') v = v === '' ? null : Number(v);
      out[f.k] = v;
    }
    if (state.type === 'Signal' && typeof out.body === 'string' && byteLength(out.body) > SIGNAL_BUDGET) {
      out.body_original = out.body;
      out.body = truncateByByte(out.body, SIGNAL_BUDGET);
      out.truncated = true;
    }
    out.id = Math.random().toString(36).slice(2, 8);
    return out;
  }

  function summarize(c) {
    switch (c['@type']) {
      case 'Chart':   return `${c.from || '?'} → ${c.to || '?'} (${c.distance_nm ?? '?'} nm @ ${c.bearing ?? '?'}°)`;
      case 'Sail':    return `${c.knots ?? '?'} kts for ${c.duration_h ?? '?'} h at ${c.heading ?? '?'}°`;
      case 'Anchor':  return `anchor at ${c.at || '?'} (${c.depth_m ?? '?'} m)`;
      case 'Signal':  return `to ${c.to || '?'}: "${c.body || ''}"${c.truncated ? ' ⚠︎' : ''}`;
      case 'Lantern': return `${c.count ?? 1}× ${c.color || 'amber'} for ${c.for || '—'}`;
      default:        return '(unknown)';
    }
  }

  function renderLog() {
    log.innerHTML = '';
    for (const c of state.entries) {
      const li = document.createElement('li');
      li.innerHTML = `<span class="badge">${c['@type']}</span><span class="desc">${summarize(c).replace(/</g,'&lt;')}</span>`;
      const del = document.createElement('button');
      del.className = 'del'; del.textContent = '✕';
      del.addEventListener('click', () => { state.entries = state.entries.filter(x => x !== c); renderAll(); });
      li.appendChild(del);
      log.appendChild(li);
    }
    entriesBadge.textContent = state.entries.length;
    const nm = state.entries.filter(c => c['@type'] === 'Chart').reduce((s, c) => s + (Number(c.distance_nm) || 0), 0);
    routeBadge.textContent = `${nm.toFixed(1)} nm`;
  }

  function renderPreview() {
    if (state.view === 'json') {
      const payload = { '@vessel': 'Misty Harbor Ledger', generated_at: new Date().toISOString(), commands: state.entries };
      preview.textContent = JSON.stringify(payload, null, 2);
    } else {
      const byType = state.entries.reduce((m, c) => (m[c['@type']] = (m[c['@type']] || 0) + 1, m), {});
      const nm = state.entries.filter(c => c['@type'] === 'Chart').reduce((s, c) => s + (Number(c.distance_nm) || 0), 0);
      const hours = state.entries.filter(c => c['@type'] === 'Sail').reduce((s, c) => s + (Number(c.duration_h) || 0), 0);
      const lines = [
        `Entries: ${state.entries.length}`,
        `Route distance: ${nm.toFixed(1)} nm`,
        `Sail hours: ${hours.toFixed(1)} h`,
        '',
        'By type:',
        ...Object.entries(byType).map(([k, v]) => `  ${k.padEnd(10)} ${v}`),
        '',
        'Order:',
        ...state.entries.map((c, i) => `  ${String(i + 1).padStart(2, '0')}. ${c['@type']} — ${summarize(c)}`)
      ];
      preview.textContent = lines.join('\n');
    }
  }

  function renderAll() { renderForm(); renderLog(); renderPreview(); }

  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active'); state.type = t.dataset.type; renderAll();
  }));
  document.querySelectorAll('.mini').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.mini').forEach(x => x.classList.remove('active'));
    t.classList.add('active'); state.view = t.dataset.view; renderPreview();
  }));
  document.getElementById('add').addEventListener('click', () => {
    state.entries.push(collectForm()); renderAll();
  });
  addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) {
      e.preventDefault(); state.entries.push(collectForm()); renderAll();
    }
  });
  document.getElementById('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(preview.textContent); } catch {}
  });
  document.getElementById('download').addEventListener('click', () => {
    const blob = new Blob([preview.textContent], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'shipmaster-codex.json'; a.click();
  });
  document.getElementById('clear').addEventListener('click', () => { state.entries = []; renderAll(); });
  document.getElementById('seed').addEventListener('click', () => {
    state.entries = [
      { '@type': 'Chart', id: 'a1', from: 'Misty Harbor', to: 'Forgotten Isle', bearing: 134, distance_nm: 42 },
      { '@type': 'Sail',  id: 'a2', knots: 6.5, heading: 134, duration_h: 6.5 },
      { '@type': 'Lantern', id: 'a3', count: 5, color: 'amber', for: 'the sleeping fishers' },
      { '@type': 'Signal', id: 'a4', to: 'Harbormaster', body: 'All hands safe — fog lifts at dawn, constellations visible to the north', body_original: 'All hands safe — fog lifts at dawn, constellations visible to the north', truncated: true },
      { '@type': 'Anchor', id: 'a5', at: 'Sleeping Cove', depth_m: 18 }
    ];
    state.entries[3].body = truncateByByte(state.entries[3].body, SIGNAL_BUDGET);
    renderAll();
  });

  renderAll();
})();