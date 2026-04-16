const ids = ['gb', 'cls', 'get', 'put', 'tx'];
const ctx = document.getElementById('chart').getContext('2d');
function calc() {
  const gb = +document.getElementById('gb').value;
  const cls = +document.getElementById('cls').value;
  const get = +document.getElementById('get').value;
  const put = +document.getElementById('put').value;
  const tx = +document.getElementById('tx').value;
  document.getElementById('vGb').textContent = gb;
  document.getElementById('vGet').textContent = get.toLocaleString();
  document.getElementById('vPut').textContent = put.toLocaleString();
  document.getElementById('vTx').textContent = tx;
  const storage = gb * cls;
  const getCost = (get / 1000) * 0.0004;
  const putCost = (put / 1000) * 0.005;
  const txCost = tx * 0.09;
  const items = [
    ['Storage', storage, '#6ee7b7'],
    ['GET requests', getCost, '#fbbf24'],
    ['PUT requests', putCost, '#f87171'],
    ['Egress', txCost, '#60a5fa'],
  ];
  const total = items.reduce((s, x) => s + x[1], 0);
  document.getElementById('total').textContent = total.toFixed(2);
  document.getElementById('breakdown').innerHTML = items.map(i =>
    `<li><span>${i[0]}</span><span>$${i[1].toFixed(2)}</span></li>`).join('');
  drawPie(items, total);
}
function drawPie(items, total) {
  const W = 400, H = 260, cx = 200, cy = 130, r = 100;
  ctx.clearRect(0, 0, W, H);
  let start = -Math.PI / 2;
  items.forEach(i => {
    if (i[1] <= 0) return;
    const slice = (i[1] / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = i[2];
    ctx.fill();
    start += slice;
  });
  ctx.fillStyle = '#1a1d27';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('$' + total.toFixed(0), cx, cy + 6);
}
ids.forEach(id => document.getElementById(id).oninput = calc);
calc();