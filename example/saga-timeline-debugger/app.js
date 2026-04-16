const services = ['order', 'payment', 'inventory', 'shipping', 'notify'];

const presets = {
  happy: [
    { svc: 'order', start: 0, dur: 120, label: 'createOrder', type: 'forward' },
    { svc: 'payment', start: 130, dur: 200, label: 'charge', type: 'forward' },
    { svc: 'inventory', start: 340, dur: 150, label: 'reserve', type: 'forward' },
    { svc: 'shipping', start: 500, dur: 180, label: 'schedule', type: 'forward' },
    { svc: 'notify', start: 690, dur: 80, label: 'emailUser', type: 'forward' }
  ],
  payfail: [
    { svc: 'order', start: 0, dur: 120, label: 'createOrder', type: 'forward' },
    { svc: 'payment', start: 130, dur: 400, label: 'charge (timeout)', type: 'failed' },
    { svc: 'order', start: 540, dur: 100, label: 'cancelOrder', type: 'compensate' }
  ],
  shipfail: [
    { svc: 'order', start: 0, dur: 120, label: 'createOrder', type: 'forward' },
    { svc: 'payment', start: 130, dur: 180, label: 'charge', type: 'forward' },
    { svc: 'inventory', start: 320, dur: 140, label: 'reserve', type: 'forward' },
    { svc: 'shipping', start: 470, dur: 210, label: 'schedule (fail)', type: 'failed' },
    { svc: 'inventory', start: 690, dur: 120, label: 'releaseStock', type: 'compensate' },
    { svc: 'payment', start: 820, dur: 140, label: 'refund', type: 'compensate' },
    { svc: 'order', start: 970, dur: 100, label: 'markCancelled', type: 'compensate' }
  ]
};

const tracksEl = document.getElementById('tracks');
const scrub = document.getElementById('scrub');
const timeEl = document.getElementById('time');
const statusEl = document.getElementById('status');
const detailsEl = document.getElementById('details');

let currentSpans = [];
let totalDuration = 1000;

function buildTracks() {
  tracksEl.innerHTML = '';
  services.forEach(s => {
    const row = document.createElement('div');
    row.className = 'track';
    row.innerHTML = `<div class="track-label">${s}</div><div class="track-bar" data-svc="${s}"></div>`;
    tracksEl.appendChild(row);
  });
  const ph = document.createElement('div');
  ph.className = 'playhead';
  ph.id = 'playhead';
  tracksEl.appendChild(ph);
}

function loadPreset(name) {
  currentSpans = presets[name].map((s, i) => ({ ...s, id: i }));
  totalDuration = Math.max(...currentSpans.map(s => s.start + s.dur)) + 50;
  renderSpans();
  scrub.value = 0;
  updatePlayhead(0);
  statusEl.textContent = `Preset: ${name}`;
}

function renderSpans() {
  document.querySelectorAll('.track-bar').forEach(b => b.innerHTML = '');
  currentSpans.forEach(span => {
    const bar = document.querySelector(`.track-bar[data-svc="${span.svc}"]`);
    if (!bar) return;
    const el = document.createElement('div');
    el.className = `span ${span.type}`;
    el.dataset.id = span.id;
    el.style.left = (span.start / totalDuration * 100) + '%';
    el.style.width = (span.dur / totalDuration * 100) + '%';
    el.textContent = span.label;
    el.onclick = () => showDetails(span);
    bar.appendChild(el);
  });
}

function showDetails(span) {
  detailsEl.innerHTML = `
    <strong style="color:#6ee7b7">${span.label}</strong> on <em>${span.svc}</em><br>
    t = ${span.start}ms → ${span.start + span.dur}ms (${span.dur}ms)<br>
    type: <span style="color:${span.type==='compensate'?'#ffd36e':span.type==='failed'?'#ff7a90':'#6ee7b7'}">${span.type}</span>
  `;
}

function updatePlayhead(pct) {
  const t = Math.round(pct / 100 * totalDuration);
  timeEl.textContent = `t = ${t}ms`;
  const bars = document.querySelector('.track-bar');
  if (bars) {
    const rect = bars.getBoundingClientRect();
    const parentRect = tracksEl.getBoundingClientRect();
    const offsetLeft = rect.left - parentRect.left;
    document.getElementById('playhead').style.left = (offsetLeft + pct / 100 * rect.width) + 'px';
  }
  document.querySelectorAll('.span').forEach(el => {
    const id = +el.dataset.id;
    const span = currentSpans.find(s => s.id === id);
    if (t >= span.start && t <= span.start + span.dur + 20) el.classList.add('active');
    else if (t > span.start + span.dur) el.classList.add('active');
    else el.classList.remove('active');
  });
}

scrub.oninput = e => updatePlayhead(+e.target.value);

document.querySelectorAll('.presets button').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('.presets button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    loadPreset(b.dataset.preset);
  };
});

buildTracks();
loadPreset('happy');
document.querySelector('.presets button').classList.add('active');