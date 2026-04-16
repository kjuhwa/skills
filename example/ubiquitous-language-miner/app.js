const STOP = new Set('the a an and or but if then when while is are was were be been being have has had do does did will would should could may might must can shall of in on at to for from with by as it this that these those i you he she we they them his her our their its not no yes so very just more most some any all each every into about out up down over under again'.split(' '));
const SAMPLE = `In our fulfillment workflow, the dispatcher assigns a courier to each parcel as soon as the consignment is palletized at the depot.
The consignment carries a waybill and a manifest. When the waybill is validated, the parcel enters the sorting lane.
A courier cannot accept a consignment if the waybill is missing or the manifest is unsigned.
The dispatcher reconciles the manifest against the depot ledger nightly. Any orphan parcel without a waybill is flagged as an exception.
When the parcel arrives at the hub, the hub manager scans the waybill and the consignment transitions to "in transit".
A consignment can only be palletized once. Courier assignments are immutable after dispatch, unless the dispatcher issues a recall.`;

const text = document.getElementById('text');
const termsEl = document.getElementById('terms');
const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');
text.value = SAMPLE;

function mine() {
  const words = text.value.toLowerCase().replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w));
  const freq = {};
  words.forEach(w => freq[w] = (freq[w] || 0) + 1);
  const bigrams = {};
  const toks = text.value.toLowerCase().replace(/[^\w\s-]/g, ' ').split(/\s+/);
  for (let i = 0; i < toks.length - 1; i++) {
    const a = toks[i], b = toks[i+1];
    if (a.length < 3 || b.length < 3 || STOP.has(a) || STOP.has(b)) continue;
    const key = `${a} ${b}`;
    bigrams[key] = (bigrams[key] || 0) + 1;
  }
  const scored = [
    ...Object.entries(freq).map(([t, c]) => ({ term: t, count: c, kind: 'unigram' })),
    ...Object.entries(bigrams).filter(([, c]) => c >= 2).map(([t, c]) => ({ term: t, count: c * 2, kind: 'bigram' }))
  ].sort((a, b) => b.count - a.count).slice(0, 12);
  renderTerms(scored);
  renderChart(scored.slice(0, 8));
}

function renderTerms(items) {
  const max = Math.max(...items.map(i => i.count), 1);
  termsEl.innerHTML = items.map(i => {
    const pct = (i.count / max * 100).toFixed(0);
    return `<li><div style="flex:1"><div class="term">${i.term}</div><div class="bar" style="width:${pct}%"></div></div><span class="meta">×${i.count} · ${i.kind}</span></li>`;
  }).join('');
}

function renderChart(items) {
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (!items.length) return;
  const max = Math.max(...items.map(i => i.count));
  const bw = (w - 40) / items.length;
  items.forEach((it, i) => {
    const bh = (it.count / max) * (h - 60);
    const x = 20 + i * bw + 4, y = h - 30 - bh;
    const grad = ctx.createLinearGradient(0, y, 0, y + bh);
    grad.addColorStop(0, '#6ee7b7'); grad.addColorStop(1, '#1d3a2f');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, bw - 8, bh);
    ctx.fillStyle = '#8b93a7'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(it.term.length > 10 ? it.term.slice(0, 9) + '…' : it.term, x + bw/2 - 4, h - 14);
    ctx.fillStyle = '#e8ecf4'; ctx.font = 'bold 11px system-ui';
    ctx.fillText(it.count, x + bw/2 - 4, y - 6);
  });
}

document.getElementById('mine').addEventListener('click', mine);
document.getElementById('sample').addEventListener('click', () => { text.value = SAMPLE; mine(); });
document.getElementById('clear').addEventListener('click', () => { text.value = ''; termsEl.innerHTML = ''; ctx.clearRect(0,0,canvas.width,canvas.height); });
mine();