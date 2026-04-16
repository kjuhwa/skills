/* ============================================================
   Binary Protocol Inspector — app.js
   Zero-dependency vanilla JS
   ============================================================ */

'use strict';

// ============================================================
// Constants
// ============================================================
const FIELD_COLORS = [
  '#6ee7b7','#818cf8','#38bdf8','#fbbf24',
  '#f87171','#a78bfa','#fb923c','#f472b6',
  '#34d399','#94a3b8'
];

const FIELD_TYPES = [
  'uint8','uint16','uint32','uint64',
  'int8','int16','int32','int64',
  'float32','float64',
  'varint','bool',
  'string','bytes',
  'bits4_high','bits4_low','bits7','bits1'
];

const DISPLAY_FORMATS = ['hex','decimal','binary','ascii','utf-8'];
const LENGTH_MODES    = ['fixed','varint-prefixed','delimiter-terminated'];
const ENDIANNESS      = ['big','little'];

// ============================================================
// Preset Schemas
// ============================================================
const PRESET_SCHEMAS = {
  'simple-header': {
    name: 'Simple Header',
    fields: [
      { name:'magic',     type:'bytes',  lengthMode:'fixed', fixedLen:4,  endian:'big',   display:'hex' },
      { name:'version',   type:'uint8',  lengthMode:'fixed', fixedLen:1,  endian:'big',   display:'decimal' },
      { name:'length',    type:'uint16', lengthMode:'fixed', fixedLen:2,  endian:'big',   display:'decimal' },
      { name:'payload',   type:'bytes',  lengthMode:'fixed', fixedLen:0,  endian:'big',   display:'hex' },
    ]
  },
  'mqtt-like': {
    name: 'MQTT-like',
    fields: [
      { name:'packetType', type:'bits4_high', lengthMode:'fixed', fixedLen:1, endian:'big', display:'hex' },
      { name:'flags',      type:'bits4_low',  lengthMode:'fixed', fixedLen:1, endian:'big', display:'binary' },
      { name:'remainLen',  type:'varint',     lengthMode:'fixed', fixedLen:0, endian:'big', display:'decimal' },
      { name:'payload',    type:'bytes',      lengthMode:'fixed', fixedLen:0, endian:'big', display:'hex' },
    ]
  },
  'websocket-frame': {
    name: 'WebSocket Frame',
    fields: [
      { name:'fin+opcode', type:'bits4_high', lengthMode:'fixed', fixedLen:1, endian:'big', display:'binary' },
      { name:'mask+payLen',type:'uint8',      lengthMode:'fixed', fixedLen:1, endian:'big', display:'binary' },
      { name:'maskKey',    type:'bytes',      lengthMode:'fixed', fixedLen:4, endian:'big', display:'hex' },
      { name:'data',       type:'bytes',      lengthMode:'fixed', fixedLen:0, endian:'big', display:'ascii' },
    ]
  },
  'protobuf-like': {
    name: 'Protobuf-like',
    fields: [
      { name:'tag(fieldNum+wireType)', type:'varint', lengthMode:'fixed', fixedLen:0, endian:'big', display:'hex' },
      { name:'value',                  type:'varint', lengthMode:'fixed', fixedLen:0, endian:'big', display:'decimal' },
    ]
  },
  'custom-tlv': {
    name: 'Custom TLV',
    fields: [
      { name:'type',   type:'uint16', lengthMode:'fixed', fixedLen:2, endian:'big', display:'hex' },
      { name:'length', type:'uint32', lengthMode:'fixed', fixedLen:4, endian:'big', display:'decimal' },
      { name:'value',  type:'bytes',  lengthMode:'fixed', fixedLen:0, endian:'big', display:'hex' },
    ]
  },
  'custom': { name: 'Custom Schema', fields: [] }
};

// ============================================================
// Preset sample data (hex strings)
// ============================================================
const PRESET_DATA = {
  'simple-header': 'CA FE BA BE 01 00 0D 48 65 6C 6C 6F 2C 20 57 6F 72 6C 64 21',
  'mqtt':          '10 27 00 04 4D 51 54 54 04 02 00 3C 00 1B 6D 71 74 74 5F 63 6C 69 65 6E 74 5F 69 64 5F 31 32 33',
  'websocket':     '81 8D 37 FA 21 3D 7F 9F 4D 51 58 B7 43 51 08 D1 6C 6A 1E 87 4D',
  'protobuf':      '08 96 01 12 07 74 65 73 74 69 6E 67 18 01',
  'tlv':           '00 01 00 00 00 05 48 65 6C 6C 6F'
};

// ============================================================
// State
// ============================================================
const state = {
  bytes:       new Uint8Array(0),
  cursor:      0,
  selStart:    -1,
  selEnd:      -1,
  editingIdx:  -1,
  editNibble:  0,
  schema:      null,
  decoded:     [],
  fieldMap:    [],   // fieldMap[byteIdx] = fieldIndex | -1
  mode:        'decode',
  activeField: -1,
};

// ============================================================
// DOM helpers
// ============================================================
const $ = id => document.getElementById(id);
const hexByte = n => n.toString(16).padStart(2,'0').toUpperCase();
const hexWord = (n,w) => n.toString(16).padStart(w,'0').toUpperCase();

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// ============================================================
// Byte reading utilities
// ============================================================
function readUint(buf, offset, size, littleEndian) {
  if (offset + size > buf.length) return null;
  let v = 0;
  if (littleEndian) {
    for (let i = size-1; i >= 0; i--) v = (v * 256) + buf[offset+i];
  } else {
    for (let i = 0; i < size; i++) v = (v * 256) + buf[offset+i];
  }
  return v;
}

function readInt(buf, offset, size, littleEndian) {
  const u = readUint(buf, offset, size, littleEndian);
  if (u === null) return null;
  const bits = size * 8;
  return u >= (1 << (bits-1)) ? u - (1 << bits) : u;
}

function readFloat32(buf, offset, littleEndian) {
  if (offset + 4 > buf.length) return null;
  const ab = new ArrayBuffer(4);
  const u8 = new Uint8Array(ab);
  for (let i = 0; i < 4; i++) u8[littleEndian ? i : 3-i] = buf[offset+i];
  return new Float32Array(ab)[0];
}

function readFloat64(buf, offset, littleEndian) {
  if (offset + 8 > buf.length) return null;
  const ab = new ArrayBuffer(8);
  const u8 = new Uint8Array(ab);
  for (let i = 0; i < 8; i++) u8[littleEndian ? i : 7-i] = buf[offset+i];
  return new Float64Array(ab)[0];
}

function readVarint(buf, offset) {
  let result = 0, shift = 0, bytesRead = 0;
  while (offset + bytesRead < buf.length) {
    const b = buf[offset + bytesRead];
    bytesRead++;
    result += (b & 0x7F) * Math.pow(2, shift);
    shift += 7;
    if ((b & 0x80) === 0) break;
    if (shift >= 63) break;
  }
  return { value: result, bytesRead };
}

function zigzagDecode(n) {
  return (n >>> 1) ^ -(n & 1);
}

function encodeVarint(value) {
  const bytes = [];
  value = Math.max(0, Math.floor(value));
  do {
    let b = value & 0x7F;
    value = Math.floor(value / 128);
    if (value > 0) b |= 0x80;
    bytes.push(b);
  } while (value > 0);
  return bytes;
}

function formatValue(val, fmt, raw) {
  if (val === null || val === undefined) return '<error>';
  switch (fmt) {
    case 'hex':
      if (typeof val === 'number') return '0x' + val.toString(16).toUpperCase();
      if (raw) return Array.from(raw).map(hexByte).join(' ');
      return String(val);
    case 'decimal': return String(typeof val === 'number' ? val : val);
    case 'binary':
      if (typeof val === 'number') return '0b' + val.toString(2).padStart(8,'0');
      return String(val);
    case 'ascii':
    case 'utf-8':
      if (raw) {
        try { return new TextDecoder('utf-8').decode(raw); } catch { return '??'; }
      }
      if (typeof val === 'number') return String.fromCharCode(val);
      return String(val);
    default: return String(val);
  }
}

// ============================================================
// Schema decode engine
// ============================================================
function decodeSchema(buf, schema) {
  const results = [];
  const fieldMap = new Array(buf.length).fill(-1);
  let offset = 0;

  for (let fi = 0; fi < schema.fields.length; fi++) {
    const field = schema.fields[fi];
    const le = field.endian === 'little';
    let decoded = { name: field.name, type: field.type, offset, byteLen: 0, value: null, raw: null, display: field.display, error: false };

    if (offset >= buf.length && field.type !== 'bytes') {
      decoded.error = true;
      decoded.value = '<truncated>';
      results.push(decoded);
      continue;
    }

    try {
      switch (field.type) {
        case 'uint8':  { decoded.value = buf[offset]; decoded.byteLen = 1; break; }
        case 'uint16': { decoded.value = readUint(buf, offset, 2, le); decoded.byteLen = 2; break; }
        case 'uint32': { decoded.value = readUint(buf, offset, 4, le); decoded.byteLen = 4; break; }
        case 'uint64': { decoded.value = readUint(buf, offset, 8, le); decoded.byteLen = 8; break; }
        case 'int8':   { decoded.value = readInt(buf, offset, 1, le); decoded.byteLen = 1; break; }
        case 'int16':  { decoded.value = readInt(buf, offset, 2, le); decoded.byteLen = 2; break; }
        case 'int32':  { decoded.value = readInt(buf, offset, 4, le); decoded.byteLen = 4; break; }
        case 'int64':  { decoded.value = readInt(buf, offset, 8, le); decoded.byteLen = 8; break; }
        case 'float32':{ decoded.value = readFloat32(buf, offset, le); decoded.byteLen = 4; break; }
        case 'float64':{ decoded.value = readFloat64(buf, offset, le); decoded.byteLen = 8; break; }
        case 'bool':   { decoded.value = buf[offset] !== 0; decoded.byteLen = 1; break; }
        case 'bits4_high': {
          decoded.value = (buf[offset] >> 4) & 0x0F;
          decoded.byteLen = 0; // shares byte
          decoded.bitRange = `[7:4]`;
          break;
        }
        case 'bits4_low': {
          decoded.value = buf[offset] & 0x0F;
          decoded.byteLen = 1; // consumes the byte
          decoded.bitRange = `[3:0]`;
          break;
        }
        case 'bits7': {
          decoded.value = buf[offset] & 0x7F;
          decoded.byteLen = 1;
          decoded.bitRange = `[6:0]`;
          break;
        }
        case 'bits1': {
          decoded.value = (buf[offset] >> 7) & 0x01;
          decoded.byteLen = 0;
          decoded.bitRange = `[7]`;
          break;
        }
        case 'varint': {
          const vi = readVarint(buf, offset);
          decoded.value = vi.value;
          decoded.byteLen = vi.bytesRead;
          break;
        }
        case 'string':
        case 'bytes': {
          let len = field.fixedLen || 0;
          if (len === 0) {
            // consume remaining
            len = buf.length - offset;
          }
          if (field.lengthMode === 'varint-prefixed') {
            const vi = readVarint(buf, offset);
            len = vi.value;
            offset += vi.bytesRead;
          } else if (field.lengthMode === 'delimiter-terminated') {
            let i = offset;
            while (i < buf.length && buf[i] !== 0x00) i++;
            len = i - offset + 1;
          }
          const slice = buf.slice(offset, offset + len);
          decoded.raw = slice;
          if (field.type === 'string') {
            try { decoded.value = new TextDecoder('utf-8').decode(slice); }
            catch { decoded.value = Array.from(slice).map(hexByte).join(' '); }
          } else {
            decoded.value = Array.from(slice).map(hexByte).join(' ');
          }
          decoded.byteLen = len;
          break;
        }
      }

      if (decoded.value === null && field.type !== 'bytes' && field.type !== 'string') {
        decoded.error = true;
        decoded.value = '<truncated>';
      }
    } catch(e) {
      decoded.error = true;
      decoded.value = `<error: ${e.message}>`;
    }

    // Mark fieldMap
    const start = offset;
    const end = offset + Math.max(1, decoded.byteLen);
    for (let i = start; i < end && i < buf.length; i++) {
      fieldMap[i] = fi;
    }
    decoded.raw = decoded.raw || buf.slice(start, end);

    // Format display value
    decoded.displayValue = formatValue(decoded.value, decoded.display, decoded.raw);

    offset += decoded.byteLen;
    results.push(decoded);
  }

  return { results, fieldMap };
}

// ============================================================
// Encode engine
// ============================================================
function encodeSchema(schema, values) {
  const out = [];
  for (let fi = 0; fi < schema.fields.length; fi++) {
    const field = schema.fields[fi];
    const val = values[fi] !== undefined ? values[fi] : '0';
    const le = field.endian === 'little';

    const pushInt = (v, bytes) => {
      const arr = [];
      for (let i = 0; i < bytes; i++) arr.push((v >> (le ? i*8 : (bytes-1-i)*8)) & 0xFF);
      out.push(...arr);
    };

    switch (field.type) {
      case 'uint8':  case 'int8':   pushInt(parseInt(val)||0, 1); break;
      case 'uint16': case 'int16':  pushInt(parseInt(val)||0, 2); break;
      case 'uint32': case 'int32':  pushInt(parseInt(val)||0, 4); break;
      case 'bool':   out.push(val === 'true' || val === '1' ? 1 : 0); break;
      case 'varint': out.push(...encodeVarint(parseInt(val)||0)); break;
      case 'bits4_high': {
        const n = parseInt(val) & 0x0F;
        // peek at last byte if exists, or push new
        if (out.length > 0) out[out.length-1] = (out[out.length-1] & 0x0F) | (n << 4);
        else out.push(n << 4);
        break;
      }
      case 'bits4_low': {
        const n = parseInt(val) & 0x0F;
        if (out.length > 0) out[out.length-1] = (out[out.length-1] & 0xF0) | n;
        else out.push(n);
        break;
      }
      case 'string': {
        const enc = new TextEncoder().encode(val);
        if (field.lengthMode === 'varint-prefixed') out.push(...encodeVarint(enc.length));
        out.push(...enc);
        break;
      }
      case 'bytes': {
        const hexParts = val.replace(/\s/g,'').match(/.{1,2}/g) || [];
        if (field.lengthMode === 'varint-prefixed') out.push(...encodeVarint(hexParts.length));
        hexParts.forEach(h => out.push(parseInt(h,16) || 0));
        break;
      }
      case 'float32': {
        const f = parseFloat(val)||0;
        const ab = new ArrayBuffer(4);
        new Float32Array(ab)[0] = f;
        const u8 = new Uint8Array(ab);
        if (le) out.push(...u8);
        else out.push(u8[3], u8[2], u8[1], u8[0]);
        break;
      }
      case 'float64': {
        const f = parseFloat(val)||0;
        const ab = new ArrayBuffer(8);
        new Float64Array(ab)[0] = f;
        const u8 = new Uint8Array(ab);
        if (le) out.push(...u8);
        else { for(let i=7;i>=0;i--) out.push(u8[i]); }
        break;
      }
    }
  }
  return new Uint8Array(out);
}

// ============================================================
// Hex Grid Renderer
// ============================================================
function renderHexGrid() {
  const grid = $('hexGrid');
  grid.innerHTML = '';
  const buf = state.bytes;

  if (buf.length === 0) {
    const empty = el('div', 'decode-empty');
    empty.textContent = 'No data — load a preset, paste hex, or type raw text above.';
    grid.appendChild(empty);
    return;
  }

  const rows = Math.ceil(buf.length / 16);
  for (let r = 0; r < rows; r++) {
    const row = el('div', 'hex-row');

    // Offset
    const off = el('span', 'hex-offset');
    off.textContent = hexWord(r * 16, 8);
    row.appendChild(off);

    // Hex bytes
    const bytesDiv = el('div', 'hex-bytes');
    for (let c = 0; c < 16; c++) {
      const idx = r * 16 + c;
      const span = el('span', 'hex-byte');

      if (idx < buf.length) {
        span.textContent = hexByte(buf[idx]);
        span.dataset.idx = idx;

        const fi = state.fieldMap[idx];
        if (fi !== undefined && fi >= 0) {
          span.dataset.field = fi % 10;
        }

        if (state.selStart >= 0 && idx >= Math.min(state.selStart, state.selEnd) && idx <= Math.max(state.selStart, state.selEnd)) {
          span.classList.add('selected');
        }
        if (idx === state.cursor) span.classList.add('cursor');

        span.addEventListener('click', onByteClick);
        span.addEventListener('mouseenter', onByteHover);
      } else {
        span.textContent = '  ';
        span.style.cursor = 'default';
      }

      bytesDiv.appendChild(span);
    }
    row.appendChild(bytesDiv);

    // ASCII
    const ascii = el('div', 'ascii-col');
    for (let c = 0; c < 16; c++) {
      const idx = r * 16 + c;
      const ch = el('span', 'ascii-char');
      if (idx < buf.length) {
        const b = buf[idx];
        ch.textContent = (b >= 0x20 && b < 0x7F) ? String.fromCharCode(b) : '.';
        ch.dataset.idx = idx;
        const fi = state.fieldMap[idx];
        if (fi !== undefined && fi >= 0) ch.dataset.field = fi % 10;
        if (state.selStart >= 0 && idx >= Math.min(state.selStart, state.selEnd) && idx <= Math.max(state.selStart, state.selEnd)) {
          ch.classList.add('selected');
        }
        ch.addEventListener('click', onByteClick);
      } else {
        ch.textContent = ' ';
      }
      ascii.appendChild(ch);
    }
    row.appendChild(ascii);
    grid.appendChild(row);
  }

  updateStatus();
}

// ============================================================
// Byte click / hover
// ============================================================
function onByteClick(e) {
  const idx = parseInt(e.currentTarget.dataset.idx);
  if (isNaN(idx)) return;

  if (e.shiftKey && state.selStart >= 0) {
    state.selEnd = idx;
  } else {
    state.selStart = idx;
    state.selEnd = idx;
    state.cursor = idx;
    startByteEdit(idx);
  }
  renderHexGrid();
  if (state.mode === 'decode') renderDecodeHighlight(idx);
}

function onByteHover(e) {
  const idx = parseInt(e.currentTarget.dataset.idx);
  if (isNaN(idx)) return;
  const fi = state.fieldMap[idx];
  if (fi >= 0) highlightFieldBytes(fi);
  else clearFieldHighlight();
}

function highlightFieldBytes(fi) {
  document.querySelectorAll('.hex-byte, .ascii-char').forEach(el => {
    const eidx = parseInt(el.dataset.idx);
    if (!isNaN(eidx) && state.fieldMap[eidx] === fi) {
      el.classList.add('field-highlight');
    } else {
      el.classList.remove('field-highlight');
    }
  });
  // Highlight in tree
  document.querySelectorAll('.decode-field').forEach((el, i) => {
    el.classList.toggle('active', i === fi);
  });
}

function clearFieldHighlight() {
  document.querySelectorAll('.hex-byte, .ascii-char').forEach(el => el.classList.remove('field-highlight'));
  document.querySelectorAll('.decode-field').forEach(el => el.classList.remove('active'));
}

function renderDecodeHighlight(byteIdx) {
  const fi = state.fieldMap[byteIdx];
  if (fi >= 0) highlightFieldBytes(fi);
}

// ============================================================
// Byte editing (keyboard)
// ============================================================
function startByteEdit(idx) {
  state.editingIdx = idx;
  state.editNibble = 0;
}

document.addEventListener('keydown', e => {
  // Keyboard shortcuts
  if (e.ctrlKey && e.key === 'g') { e.preventDefault(); toggleDialog('gotoDialog'); return; }
  if (e.ctrlKey && e.key === 'f') { e.preventDefault(); toggleDialog('findDialog'); return; }

  // Byte editing
  if (state.editingIdx >= 0 && !e.ctrlKey && !e.altKey) {
    const h = e.key.toLowerCase();
    if ('0123456789abcdef'.includes(h) && h.length === 1) {
      const nibVal = parseInt(h, 16);
      let cur = state.bytes[state.editingIdx];
      if (state.editNibble === 0) {
        state.bytes[state.editingIdx] = (nibVal << 4) | (cur & 0x0F);
        state.editNibble = 1;
      } else {
        state.bytes[state.editingIdx] = (cur & 0xF0) | nibVal;
        state.editNibble = 0;
        state.cursor = Math.min(state.editingIdx + 1, state.bytes.length - 1);
        state.editingIdx = state.cursor;
        state.selStart = state.cursor;
        state.selEnd = state.cursor;
      }
      redecodeAndRender();
      return;
    }
    if (e.key === 'ArrowRight') { moveCursor(1); return; }
    if (e.key === 'ArrowLeft')  { moveCursor(-1); return; }
    if (e.key === 'ArrowDown')  { moveCursor(16); return; }
    if (e.key === 'ArrowUp')    { moveCursor(-16); return; }
  }
});

function moveCursor(delta) {
  const newIdx = Math.max(0, Math.min(state.bytes.length - 1, state.cursor + delta));
  state.cursor = newIdx;
  state.selStart = newIdx;
  state.selEnd = newIdx;
  state.editingIdx = newIdx;
  state.editNibble = 0;
  renderHexGrid();
  scrollByteIntoView(newIdx);
}

function scrollByteIntoView(idx) {
  const row = Math.floor(idx / 16);
  const allRows = document.querySelectorAll('.hex-row');
  if (allRows[row]) allRows[row].scrollIntoView({ block: 'nearest' });
}

// ============================================================
// Status Bar
// ============================================================
function updateStatus() {
  const buf = state.bytes;
  const cur = state.cursor;
  $('statusCursor').textContent = `Offset: 0x${hexWord(cur, 8)}`;

  if (state.selStart >= 0 && state.selStart !== state.selEnd) {
    const lo = Math.min(state.selStart, state.selEnd);
    const hi = Math.max(state.selStart, state.selEnd);
    $('statusSelection').textContent = `Selection: 0x${hexWord(lo,4)}–0x${hexWord(hi,4)} (${hi-lo+1} bytes)`;
  } else {
    $('statusSelection').textContent = 'Selection: none';
  }

  $('statusTotal').textContent = `Total: ${buf.length} bytes`;

  if (cur < buf.length) {
    const b = buf[cur];
    $('statusValue').textContent = `Value: 0x${hexByte(b)} = ${b}u = ${b >= 128 ? b-256 : b}i`;
  } else {
    $('statusValue').textContent = 'Value: --';
  }
  $('statusEncoding').textContent = 'Encoding: UTF-8';
}

// ============================================================
// Schema Designer
// ============================================================
let schemaFields = [];

function loadSchemaPreset(key) {
  const preset = PRESET_SCHEMAS[key];
  if (!preset) return;
  schemaFields = preset.fields.map((f,i) => ({ ...f, id: i }));
  renderSchemaFields();
}

function renderSchemaFields() {
  const container = $('schemaFields');
  container.innerHTML = '';

  schemaFields.forEach((field, idx) => {
    const row = el('div', 'schema-field-row');
    row.dataset.idx = idx;
    row.draggable = true;

    // Drag handle
    const handle = el('span', 'drag-handle');
    handle.textContent = '⠿';
    handle.title = 'Drag to reorder';
    row.appendChild(handle);

    // Color dot
    const dot = el('span', 'field-color-dot');
    dot.style.background = FIELD_COLORS[idx % FIELD_COLORS.length];
    row.appendChild(dot);

    // Field name
    const nameInput = el('input');
    nameInput.className = 'field-name';
    nameInput.value = field.name;
    nameInput.placeholder = 'field name';
    nameInput.addEventListener('change', () => { schemaFields[idx].name = nameInput.value; });
    row.appendChild(nameInput);

    // Type
    const typeLabel = el('span','field-label','type:');
    row.appendChild(typeLabel);
    const typeSelect = el('select');
    FIELD_TYPES.forEach(t => {
      const o = el('option'); o.value = t; o.textContent = t;
      if (t === field.type) o.selected = true;
      typeSelect.appendChild(o);
    });
    typeSelect.addEventListener('change', () => { schemaFields[idx].type = typeSelect.value; });
    row.appendChild(typeSelect);

    // Length mode
    const lmLabel = el('span','field-label','len:');
    row.appendChild(lmLabel);
    const lmSelect = el('select');
    LENGTH_MODES.forEach(m => {
      const o = el('option'); o.value = m; o.textContent = m.replace('-',' ');
      if (m === field.lengthMode) o.selected = true;
      lmSelect.appendChild(o);
    });
    lmSelect.addEventListener('change', () => { schemaFields[idx].lengthMode = lmSelect.value; });
    row.appendChild(lmSelect);

    // Fixed length
    const flLabel = el('span','field-label','fixedLen:');
    row.appendChild(flLabel);
    const flInput = el('input');
    flInput.type = 'number'; flInput.min = '0'; flInput.max = '65535';
    flInput.value = field.fixedLen || 0;
    flInput.style.width = '52px'; flInput.style.textAlign = 'right';
    flInput.style.background = 'var(--bg)';
    flInput.style.border = '1px solid var(--border)';
    flInput.style.color = 'var(--text)';
    flInput.style.fontFamily = 'var(--mono)';
    flInput.style.fontSize = '11px';
    flInput.style.padding = '2px 4px';
    flInput.style.borderRadius = '3px';
    flInput.addEventListener('change', () => { schemaFields[idx].fixedLen = parseInt(flInput.value)||0; });
    row.appendChild(flInput);

    // Endianness
    const enLabel = el('span','field-label','endian:');
    row.appendChild(enLabel);
    const enSelect = el('select');
    ENDIANNESS.forEach(e2 => {
      const o = el('option'); o.value = e2; o.textContent = e2;
      if (e2 === field.endian) o.selected = true;
      enSelect.appendChild(o);
    });
    enSelect.addEventListener('change', () => { schemaFields[idx].endian = enSelect.value; });
    row.appendChild(enSelect);

    // Display format
    const dfLabel = el('span','field-label','fmt:');
    row.appendChild(dfLabel);
    const dfSelect = el('select');
    DISPLAY_FORMATS.forEach(f2 => {
      const o = el('option'); o.value = f2; o.textContent = f2;
      if (f2 === field.display) o.selected = true;
      dfSelect.appendChild(o);
    });
    dfSelect.addEventListener('change', () => { schemaFields[idx].display = dfSelect.value; });
    row.appendChild(dfSelect);

    // Remove
    const rmBtn = el('button', 'btn-remove-field', '×');
    rmBtn.title = 'Remove field';
    rmBtn.addEventListener('click', () => {
      schemaFields.splice(idx, 1);
      renderSchemaFields();
    });
    row.appendChild(rmBtn);

    // Drag events
    row.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', idx); row.classList.add('dragging'); });
    row.addEventListener('dragend',   () => row.classList.remove('dragging'));
    row.addEventListener('dragover',  e => { e.preventDefault(); row.classList.add('drag-over'); });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', e => {
      e.preventDefault();
      row.classList.remove('drag-over');
      const from = parseInt(e.dataTransfer.getData('text/plain'));
      const to = idx;
      if (from !== to) {
        const [moved] = schemaFields.splice(from, 1);
        schemaFields.splice(to, 0, moved);
        renderSchemaFields();
      }
    });

    container.appendChild(row);
  });
}

// ============================================================
// Decode Tree Renderer
// ============================================================
function renderDecodeTree() {
  const tree = $('decodeTree');
  const encForm = $('encodeForm');
  tree.innerHTML = '';

  if (state.mode === 'encode') {
    tree.classList.add('hidden');
    encForm.classList.remove('hidden');
    renderEncodeForm();
    return;
  }

  tree.classList.remove('hidden');
  encForm.classList.add('hidden');

  if (state.decoded.length === 0) {
    tree.appendChild(el('div','decode-empty','No fields decoded. Apply a schema and click Decode.'));
    return;
  }

  // Summary bar
  const summary = el('div', 'decode-summary');
  const totalBytes = state.decoded.reduce((s,d) => s + (d.byteLen||0), 0);
  const errors = state.decoded.filter(d => d.error).length;
  summary.textContent = `${state.decoded.length} fields | ${totalBytes} bytes parsed | ${errors} error(s)`;
  if (errors > 0) summary.style.color = 'var(--danger)';
  tree.appendChild(summary);

  state.decoded.forEach((dec, fi) => {
    const color = FIELD_COLORS[fi % FIELD_COLORS.length];
    const fieldDiv = el('div', 'decode-field');
    fieldDiv.style.borderLeftColor = color;

    const hdr = el('div', 'decode-field-header');

    const name = el('span', 'decode-field-name');
    name.textContent = dec.name;
    name.style.color = color;
    hdr.appendChild(name);

    const value = el('span', 'decode-field-value');
    value.textContent = dec.displayValue || String(dec.value);
    hdr.appendChild(value);

    const hexBytes = el('span', 'decode-field-hex');
    if (dec.raw) {
      hexBytes.textContent = Array.from(dec.raw.slice(0,8)).map(hexByte).join(' ') + (dec.raw.length > 8 ? '…' : '');
    }
    hdr.appendChild(hexBytes);

    const offset = el('span', 'decode-field-offset');
    offset.textContent = `@0x${hexWord(dec.offset, 4)} ${dec.bitRange||''}`;
    hdr.appendChild(offset);

    if (dec.error) {
      fieldDiv.classList.add('error');
      const badge = el('span', 'decode-error-badge', 'ERR');
      hdr.appendChild(badge);
    }

    fieldDiv.appendChild(hdr);

    fieldDiv.addEventListener('mouseenter', () => highlightFieldBytes(fi));
    fieldDiv.addEventListener('mouseleave', clearFieldHighlight);
    fieldDiv.addEventListener('click', () => {
      state.cursor = dec.offset;
      state.selStart = dec.offset;
      state.selEnd = dec.offset + Math.max(0, dec.byteLen - 1);
      state.editingIdx = dec.offset;
      state.editNibble = 0;
      renderHexGrid();
      scrollByteIntoView(dec.offset);
    });

    tree.appendChild(fieldDiv);
  });
}

// ============================================================
// Encode Form
// ============================================================
function renderEncodeForm() {
  const form = $('encodeFields');
  form.innerHTML = '';
  $('encodeOutput').textContent = '--';

  if (!state.schema || state.schema.fields.length === 0) {
    form.innerHTML = '<div class="decode-empty">No schema fields defined.</div>';
    return;
  }

  const vals = [];
  state.schema.fields.forEach((field, fi) => {
    const color = FIELD_COLORS[fi % FIELD_COLORS.length];
    const row = el('div', 'encode-field-row');

    const lbl = el('label');
    lbl.textContent = field.name;
    lbl.style.color = color;
    row.appendChild(lbl);

    const inp = el('input');
    inp.type = 'text';
    inp.placeholder = getTypePlaceholder(field.type);
    inp.dataset.fi = fi;
    vals.push('');
    inp.addEventListener('input', () => {
      vals[fi] = inp.value;
      updateEncodeOutput(vals);
    });
    row.appendChild(inp);

    const hint = el('span', 'field-type-hint', field.type + ' / ' + field.endian);
    row.appendChild(hint);

    form.appendChild(row);
  });

  function updateEncodeOutput(vs) {
    try {
      const encoded = encodeSchema(state.schema, vs);
      $('encodeOutput').textContent = Array.from(encoded).map(hexByte).join(' ');
    } catch(e) {
      $('encodeOutput').textContent = '<error: ' + e.message + '>';
    }
  }
}

function getTypePlaceholder(type) {
  switch(type) {
    case 'uint8':  return '0–255';
    case 'uint16': return '0–65535';
    case 'uint32': return '0–4294967295';
    case 'int8':   return '-128–127';
    case 'float32':case 'float64': return '3.14';
    case 'bool':   return '0 or 1';
    case 'varint': return '300';
    case 'string': return 'hello';
    case 'bytes':  return 'DE AD BE EF';
    case 'bits4_high': case 'bits4_low': return '0–15';
    default: return '';
  }
}

// ============================================================
// VarInt Visualizer
// ============================================================
function updateVarintDisplay(bytes, value, signed) {
  const display = $('varintDisplay');
  const anim = $('varintAnimation');
  display.innerHTML = '';
  anim.innerHTML = '';

  if (!bytes || bytes.length === 0) return;

  const dataBits = [];

  bytes.forEach((b, i) => {
    const box = el('div', 'varint-byte-box');
    const lbl = el('div', 'varint-byte-label', `Byte ${i}: 0x${hexByte(b)}`);
    box.appendChild(lbl);

    const bitRow = el('div', 'varint-bit-row');
    for (let bit = 7; bit >= 0; bit--) {
      const bv = el('span', 'varint-bit');
      const bitVal = (b >> bit) & 1;
      bv.textContent = bitVal;
      if (bit === 7) {
        bv.classList.add('msb');
        bv.title = i < bytes.length - 1 ? 'MSB=1: more bytes follow' : 'MSB=0: last byte';
      } else {
        bv.classList.add('data');
        if (bit === 3) bv.classList.add('sep');
        bv.title = `bit ${bit} of data`;
        dataBits.unshift(bitVal); // collect in reverse (LSB first)
      }
      bitRow.appendChild(bv);
    }
    box.appendChild(bitRow);
    display.appendChild(box);
  });

  // Animation steps
  let stepHtml = '';
  let acc = 0;
  bytes.forEach((b, i) => {
    const chunk = b & 0x7F;
    const shifted = chunk * Math.pow(2, i * 7);
    acc += shifted;
    const arrow = i < bytes.length - 1 ? `<span class="varint-arrow">+</span>` : `<span class="varint-arrow">=</span>`;
    stepHtml += `<span class="varint-step">0x${hexByte(chunk)}<<${i*7} (${shifted})</span>${arrow}`;
  });

  const finalVal = signed ? zigzagDecode(value) : value;
  stepHtml += `<span class="varint-result">${finalVal}</span>`;
  if (signed) stepHtml += ` <span style="color:var(--text-muted);font-size:10px">(ZigZag decoded)</span>`;

  anim.innerHTML = stepHtml;
}

function doEncodeVarint() {
  const raw = parseInt($('varintValue').value) || 0;
  const signed = $('varintEncoding').value === 'zigzag';
  let v = raw;
  if (signed) {
    // ZigZag encode
    v = (raw >= 0) ? raw * 2 : (-raw * 2) - 1;
  }
  const bytes = encodeVarint(v);
  updateVarintDisplay(bytes, v, signed);
  $('varintHexInput').value = bytes.map(hexByte).join(' ');
}

function doDecodeVarint() {
  const hexStr = $('varintHexInput').value;
  const bytes = hexStr.trim().split(/\s+/).map(h => parseInt(h, 16)).filter(n => !isNaN(n));
  if (bytes.length === 0) return;
  const signed = $('varintEncoding').value === 'zigzag';
  const { value } = readVarint(new Uint8Array(bytes), 0);
  $('varintValue').value = signed ? zigzagDecode(value) : value;
  updateVarintDisplay(bytes, value, signed);
}

// ============================================================
// Schema selector changed
// ============================================================
function onSchemaChange(key) {
  loadSchemaPreset(key);
  state.schema = { ...PRESET_SCHEMAS[key], fields: schemaFields };
  if (state.bytes.length > 0) redecodeAndRender();
}

function redecodeAndRender() {
  state.schema = { fields: schemaFields };
  const { results, fieldMap } = decodeSchema(state.bytes, state.schema);
  state.decoded = results;
  state.fieldMap = fieldMap;
  renderHexGrid();
  renderDecodeTree();
}

// ============================================================
// Load bytes into state
// ============================================================
function loadBytes(arr) {
  state.bytes = arr instanceof Uint8Array ? arr : new Uint8Array(arr);
  state.cursor = 0;
  state.selStart = -1;
  state.selEnd = -1;
  state.editingIdx = 0;
  state.editNibble = 0;
  redecodeAndRender();
}

function loadHexString(hexStr) {
  const cleaned = hexStr.replace(/[^0-9a-fA-F]/g, '');
  const bytes = [];
  for (let i = 0; i < cleaned.length - 1; i += 2) {
    bytes.push(parseInt(cleaned.slice(i, i+2), 16));
  }
  loadBytes(new Uint8Array(bytes));
}

// ============================================================
// Dialogs
// ============================================================
function toggleDialog(id) {
  const d = $(id);
  d.classList.toggle('hidden');
  if (!d.classList.contains('hidden')) {
    const inp = d.querySelector('input');
    if (inp) inp.focus();
  }
}

function hideDialog(id) { $(id).classList.add('hidden'); }

// ============================================================
// Find / Go-to
// ============================================================
function goToOffset() {
  const val = $('gotoInput').value.trim();
  const offset = parseInt(val, 16);
  if (isNaN(offset) || offset < 0 || offset >= state.bytes.length) {
    $('gotoInput').style.borderColor = 'var(--danger)';
    return;
  }
  hideDialog('gotoDialog');
  moveCursor(offset - state.cursor);
}

function findPattern() {
  const hexStr = $('findInput').value;
  const pattern = hexStr.replace(/\s/g,'').match(/.{1,2}/g);
  if (!pattern) return;
  const needle = pattern.map(h => parseInt(h,16));
  const buf = state.bytes;
  const result = $('findResult');

  for (let i = 0; i <= buf.length - needle.length; i++) {
    let match = true;
    for (let j = 0; j < needle.length; j++) {
      if (buf[i+j] !== needle[j]) { match = false; break; }
    }
    if (match) {
      state.cursor = i;
      state.selStart = i;
      state.selEnd = i + needle.length - 1;
      state.editingIdx = i;
      renderHexGrid();
      scrollByteIntoView(i);
      result.textContent = `Found at 0x${hexWord(i,4)}`;
      result.style.color = 'var(--accent)';
      return;
    }
  }
  result.textContent = 'Pattern not found';
  result.style.color = 'var(--danger)';
}

// ============================================================
// Import / Export
// ============================================================
function exportHex() {
  const hex = Array.from(state.bytes).map(hexByte).join(' ');
  const blob = new Blob([hex], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'data.hex'; a.click();
  URL.revokeObjectURL(url);
}

function importFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    // Try as hex text first, then as binary
    const cleaned = text.replace(/[^0-9a-fA-F]/g,'');
    if (cleaned.length >= 2 && cleaned.length === text.replace(/\s/g,'').length) {
      loadHexString(text);
    } else {
      // Treat as binary
      const ab = e.target.result;
      if (ab instanceof ArrayBuffer) {
        loadBytes(new Uint8Array(ab));
      }
    }
  };
  if (file.name.endsWith('.bin')) {
    reader.readAsArrayBuffer(file);
  } else {
    reader.readAsText(file);
  }
}

// ============================================================
// Copy decoded as JSON
// ============================================================
function copyDecoded() {
  const obj = state.decoded.map(d => ({
    name: d.name,
    type: d.type,
    offset: d.offset,
    value: d.value,
    raw: d.raw ? Array.from(d.raw).map(hexByte).join(' ') : null
  }));
  const text = JSON.stringify(obj, null, 2);
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

// ============================================================
// Schema JSON save/load
// ============================================================
function saveSchemaJSON() {
  const schema = { name: 'Custom', fields: schemaFields };
  const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'schema.json'; a.click();
  URL.revokeObjectURL(url);
}

function loadSchemaJSON() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json';
  inp.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const schema = JSON.parse(ev.target.result);
        if (schema.fields) {
          schemaFields = schema.fields;
          renderSchemaFields();
          redecodeAndRender();
        }
      } catch { alert('Invalid schema JSON'); }
    };
    reader.readAsText(file);
  };
  inp.click();
}

// ============================================================
// Mode switch
// ============================================================
function setMode(mode) {
  state.mode = mode;
  $('btnDecode').classList.toggle('active', mode === 'decode');
  $('btnEncode').classList.toggle('active', mode === 'encode');
  $('decodeTitle').textContent = mode === 'decode' ? 'Decoded Fields' : 'Encode Fields';
  renderDecodeTree();
}

// ============================================================
// Event wiring
// ============================================================
function wireEvents() {
  // Schema selector
  $('schemaSelector').addEventListener('change', e => onSchemaChange(e.target.value));

  // Mode toggle
  $('btnDecode').addEventListener('click', () => setMode('decode'));
  $('btnEncode').addEventListener('click', () => setMode('encode'));

  // Toolbar buttons
  $('btnImport').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', e => { if (e.target.files[0]) importFile(e.target.files[0]); });
  $('btnExport').addEventListener('click', exportHex);
  $('btnClear').addEventListener('click', () => loadBytes(new Uint8Array(0)));
  $('btnPasteHex').addEventListener('click', () => $('pasteModal').classList.remove('hidden'));

  // Paste modal
  $('pasteConfirm').addEventListener('click', () => {
    loadHexString($('pasteHexInput').value);
    $('pasteModal').classList.add('hidden');
    $('pasteHexInput').value = '';
  });
  $('pasteCancel').addEventListener('click', () => $('pasteModal').classList.add('hidden'));
  $('pasteModal').addEventListener('click', e => { if (e.target === $('pasteModal')) $('pasteModal').classList.add('hidden'); });

  // Preset data
  $('presetData').addEventListener('change', e => {
    const key = e.target.value;
    if (key && PRESET_DATA[key]) {
      loadHexString(PRESET_DATA[key]);
      e.target.value = '';
    }
  });

  // Raw text
  $('btnLoadRaw').addEventListener('click', () => {
    const txt = $('rawTextInput').value;
    const enc = new TextEncoder().encode(txt);
    loadBytes(enc);
  });

  // Go-to
  $('btnGoTo').addEventListener('click', () => toggleDialog('gotoDialog'));
  $('gotoConfirm').addEventListener('click', goToOffset);
  $('gotoCancel').addEventListener('click', () => hideDialog('gotoDialog'));
  $('gotoInput').addEventListener('keydown', e => { if (e.key === 'Enter') goToOffset(); });

  // Find
  $('btnFind').addEventListener('click', () => toggleDialog('findDialog'));
  $('findConfirm').addEventListener('click', findPattern);
  $('findCancel').addEventListener('click', () => hideDialog('findDialog'));
  $('findInput').addEventListener('keydown', e => { if (e.key === 'Enter') findPattern(); });

  // Decode button (in decode panel)
  $('btnDecode2').addEventListener('click', redecodeAndRender);
  $('btnCopyDecoded').addEventListener('click', copyDecoded);

  // Encode output → load into editor
  $('btnLoadEncoded').addEventListener('click', () => {
    const hexText = $('encodeOutput').textContent;
    if (hexText && hexText !== '--') loadHexString(hexText);
  });

  // Schema buttons
  $('btnAddField').addEventListener('click', () => {
    schemaFields.push({ name: 'field' + schemaFields.length, type: 'uint8', lengthMode: 'fixed', fixedLen: 1, endian: 'big', display: 'hex' });
    renderSchemaFields();
  });
  $('btnSaveSchema').addEventListener('click', saveSchemaJSON);
  $('btnLoadSchema').addEventListener('click', loadSchemaJSON);

  // VarInt
  $('btnEncodeVarint').addEventListener('click', doEncodeVarint);
  $('btnDecodeVarint').addEventListener('click', doDecodeVarint);
  $('varintValue').addEventListener('keydown', e => { if (e.key === 'Enter') doEncodeVarint(); });
  $('varintHexInput').addEventListener('keydown', e => { if (e.key === 'Enter') doDecodeVarint(); });

  // VarInt section collapse
  $('varintToggle').addEventListener('click', () => {
    $('varintToggle').closest('.varint-section').classList.toggle('collapsed');
  });
}

// ============================================================
// Init
// ============================================================
function init() {
  wireEvents();

  // Load default schema
  const defaultKey = 'simple-header';
  $('schemaSelector').value = defaultKey;
  loadSchemaPreset(defaultKey);
  state.schema = { fields: schemaFields };

  // Load sample data
  loadHexString(PRESET_DATA['simple-header']);

  // Initial VarInt display
  doEncodeVarint();
}

document.addEventListener('DOMContentLoaded', init);
