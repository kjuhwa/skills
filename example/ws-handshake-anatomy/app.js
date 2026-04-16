const phases = [
  { num: 1, label: 'HTTP Upgrade', title: 'Client → Server: Upgrade Request', req:
`GET /chat HTTP/1.1
Host: server.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: http://example.com`, res: null },
  { num: 2, label: '101 Switching', title: 'Server → Client: 101 Response', req: null, res:
`HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=` },
  { num: 3, label: 'Frame: Text', title: 'Data Frame — Text (opcode 0x1)', req:
`  0                   1                   2
  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3
 +-+-+-+-+-------+-+-------------+----------------+
 |F|R|R|R| opc=1 |M| Payload len |  Payload data  |
 |I|S|S|S|       |A|    = 13     | "Hello, World!"|
 |N|V|V|V|       |S|             |                |
 | |1|2|3|       |K|             |                |
 +-+-+-+-+-------+-+-------------+----------------+`, res: null },
  { num: 4, label: 'Ping / Pong', title: 'Control Frames — Keep-Alive', req:
`PING frame (opcode 0x9):
  FIN=1  opcode=0x9  payload="heartbeat"

PONG frame (opcode 0xA):
  FIN=1  opcode=0xA  payload="heartbeat"`, res: null },
  { num: 5, label: 'Close', title: 'Connection Close Handshake', req:
`Client sends CLOSE frame:
  opcode=0x8  status=1000  reason="Normal Closure"

Server echoes CLOSE frame:
  opcode=0x8  status=1000  reason="Normal Closure"

TCP FIN →  ← TCP FIN+ACK  → TCP ACK`, res: null }
];

const tl = document.getElementById('timeline');
const det = document.getElementById('detail');

phases.forEach((p, i) => {
  const el = document.createElement('div');
  el.className = 'phase'; el.innerHTML = `<div class="num">${p.num}</div><div class="label">${p.label}</div>`;
  el.onclick = () => {
    document.querySelectorAll('.phase').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
    let html = `<h2>${p.title}</h2>`;
    if (p.req) { html += `<div class="arrow">→ Request / Frame</div><pre>${p.req}</pre>`; }
    if (p.res) { html += `<div class="arrow">← Response</div><pre>${p.res}</pre>`; }
    det.innerHTML = html;
  };
  tl.appendChild(el);
});