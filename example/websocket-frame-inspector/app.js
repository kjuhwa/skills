const frames = [];
const opcodes = { 0x1: 'TEXT', 0x2: 'BINARY', 0x8: 'CLOSE', 0x9: 'PING', 0xA: 'PONG' };
const samplePayloads = [
  { op: 0x1, text: '{"type":"subscribe","channel":"btc/usd"}' },
  { op: 0x1, text: '{"type":"trade","price":67842.11,"volume":0.5}' },
  { op: 0x1, text: '{"event":"heartbeat","ts":1712000000}' },
  { op: 0x9, text: '' },
  { op: 0xA, text: '' },
  { op: 0x1, text: '{"type":"ack","id":"msg-9931"}' },
  { op: 0x2, text: '[binary audio frame]' },
  { op: 0x1, text: '{"type":"auth","token":"eyJhbGci..."}' },
  { op: 0x8, text: 'Normal Closure' },
];

function generateFrames() {
  for (let i = 0; i < 18; i++) {
    const s = samplePayloads[Math.floor(Math.random() * samplePayloads.length)];
    const isIn = Math.random() > 0.4;
    const payload = s.text;
    frames.push({
      id: i + 1,
      time: new Date(Date.now() - (18 - i) * 1500).toLocaleTimeString(),
      opcode: s.op,
      opName: opcodes[s.op],
      direction: isIn ? 'in' : 'out',
      masked: !isIn,
      fin: true,
      payload: payload,
      size: payload.length,
    });
  }
}

function renderList() {
  const q = document.getElementById('search').value.toLowerCase();
  const list = document.getElementById('frameList');
  list.innerHTML = '';
  frames.filter(f => !q || f.opName.toLowerCase().includes(q) || f.payload.toLowerCase().includes(q))
    .forEach(f => {
      const li = document.createElement('li');
      li.dataset.id = f.id;
      li.innerHTML = `
        <span><span class="arrow ${f.direction}">${f.direction === 'in' ? '▼' : '▲'}</span>
        <span class="op">${f.opName}</span> <span style="color:#6b7280">#${f.id}</span></span>
        <span style="color:#6b7280">${f.size}B</span>`;
      li.onclick = () => select(f.id);
      list.appendChild(li);
    });
}

function select(id) {
  const frame = frames.find(f => f.id === id);
  if (!frame) return;
  document.querySelectorAll('#frameList li').forEach(el =>
    el.classList.toggle('active', +el.dataset.id === id));
  document.getElementById('opcode').textContent = frame.opName;
  document.getElementById('direction').textContent = frame.direction === 'in' ? '← Inbound' : '→ Outbound';
  document.getElementById('size').textContent = `${frame.size} bytes`;

  let decoded = frame.payload;
  try { decoded = JSON.stringify(JSON.parse(frame.payload), null, 2); } catch(e){}
  document.getElementById('decoded').textContent = decoded || '(empty payload)';

  document.getElementById('raw').innerHTML = toHexDump(frame.payload);

  document.getElementById('headers').innerHTML = `
    <div class="bit-row"><span class="label">FIN</span><span class="value">${frame.fin ? '1 (final)' : '0 (continuation)'}</span></div>
    <div class="bit-row"><span class="label">RSV 1/2/3</span><span class="value">0 / 0 / 0</span></div>
    <div class="bit-row"><span class="label">Opcode</span><span class="value">0x${frame.opcode.toString(16)} (${frame.opName})</span></div>
    <div class="bit-row"><span class="label">Mask</span><span class="value">${frame.masked ? '1 (client→server)' : '0'}</span></div>
    <div class="bit-row"><span class="label">Payload Length</span><span class="value">${frame.size}</span></div>
    <div class="bit-row"><span class="label">Masking Key</span><span class="value">${frame.masked ? randomKey() : '—'}</span></div>
    <div class="bit-row"><span class="label">Timestamp</span><span class="value">${frame.time}</span></div>`;
}

function toHexDump(str) {
  let out = '';
  for (let i = 0; i < str.length; i += 16) {
    const chunk = str.slice(i, i + 16);
    const hex = [...chunk].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ').padEnd(48, ' ');
    const ascii = [...chunk].map(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 127 ? c : '.').join('');
    out += `<div><span class="offset">${i.toString(16).padStart(4, '0')}</span>  ${hex}<span class="ascii">${ascii}</span></div>`;
  }
  return out || '<div style="color:#6b7280">(no payload)</div>';
}

function randomKey() {
  return '0x' + [...Array(4)].map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  };
});
document.getElementById('search').oninput = renderList;

generateFrames();
renderList();
select(frames[0].id);