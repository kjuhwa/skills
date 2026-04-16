const svg = document.getElementById('timeline');
const detail = document.getElementById('detail');
const NS = 'http://www.w3.org/2000/svg';

const LANES = [
  { key: 'db',       label: 'DB Commit',      y: 80 },
  { key: 'relay',    label: 'Relay Poll',     y: 160 },
  { key: 'broker',   label: 'Kafka Topic',    y: 240 },
  { key: 'consumer', label: 'Consumer Ack',   y: 320 },
];

const STATE_COLORS = {
  committed: '#6ee7b7', relayed: '#60a5fa',
  broker: '#fbbf24',    acked: '#a78bfa', retry: '#f87171',
};

function makeEvents() {
  const types = ['OrderPlaced', 'InventoryReserved', 'PaymentCaptured',
                 'UserInvited', 'ShipmentDispatched', 'RefundIssued'];
  return Array.from({ length: 8 }, (_, i) => {
    const retry = Math.random() < 0.3;
    const base = 60 + i * 95;
    return {
      id: 'evt_' + (1000 + i),
      type: types[i % types.length],
      payload: { orderId: 500 + i, amount: +(Math.random() * 200).toFixed(2) },
      steps: [
        { lane: 'db',       t: base,        state: 'committed', note: 'INSERT into outbox inside business tx' },
        { lane: 'relay',    t: base + 15,   state: 'relayed',   note: 'Polled by CDC debezium connector' },
        { lane: 'broker',   t: base + 28,   state: 'broker',    note: 'Published to topic orders.v1' },
        ...(retry ? [{ lane: 'broker', t: base + 42, state: 'retry',  note: 'Consumer NACK, retry scheduled' }] : []),
        { lane: 'consumer', t: base + (retry ? 58 : 45), state: 'acked', note: 'Handler idempotently applied' },
      ],
    };
  });
}

const events = makeEvents();
let activeId = null;

function render() {
  svg.innerHTML = '';
  LANES.forEach(lane => {
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', 110); line.setAttribute('x2', 880);
    line.setAttribute('y1', lane.y); line.setAttribute('y2', lane.y);
    line.setAttribute('class', 'lane-line');
    svg.appendChild(line);
    const lbl = document.createElementNS(NS, 'text');
    lbl.setAttribute('x', 15); lbl.setAttribute('y', lane.y + 4);
    lbl.setAttribute('class', 'lane-label');
    lbl.textContent = lane.label;
    svg.appendChild(lbl);
  });

  const title = document.createElementNS(NS, 'text');
  title.setAttribute('x', 15); title.setAttribute('y', 40);
  title.setAttribute('class', 'title');
  title.textContent = 'time →';
  svg.appendChild(title);

  events.forEach(ev => {
    for (let i = 0; i < ev.steps.length - 1; i++) {
      const a = ev.steps[i], b = ev.steps[i + 1];
      const ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', 120 + a.t);
      ln.setAttribute('y1', LANES.find(l => l.key === a.lane).y);
      ln.setAttribute('x2', 120 + b.t);
      ln.setAttribute('y2', LANES.find(l => l.key === b.lane).y);
      ln.setAttribute('class', 'link-line');
      svg.appendChild(ln);
    }
    ev.steps.forEach(step => {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', 120 + step.t);
      c.setAttribute('cy', LANES.find(l => l.key === step.lane).y);
      c.setAttribute('r', 7);
      c.setAttribute('fill', STATE_COLORS[step.state]);
      c.setAttribute('class', 'event-dot' + (ev.id === activeId ? ' active' : ''));
      c.addEventListener('click', () => { activeId = ev.id; show(ev); render(); });
      svg.appendChild(c);
    });
  });
}

function show(ev) {
  const steps = ev.steps.map(s =>
    `  <span class="k">${s.state.padEnd(10)}</span> @t+${s.t}ms · ${s.note}`
  ).join('\n');
  detail.innerHTML =
    `<span class="k">event:</span> <span class="v">${ev.id}</span>  ` +
    `<span class="k">type:</span> <span class="v">${ev.type}</span>\n` +
    `<span class="k">payload:</span> ${JSON.stringify(ev.payload)}\n\n` +
    `<span class="k">journey:</span>\n${steps}`;
}

render();
show(events[0]);
activeId = events[0].id;
render();