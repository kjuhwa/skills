const rowSlider = document.getElementById("rowCount");
const staleSlider = document.getElementById("staleness");
const rowLabel = document.getElementById("rowLabel");
const staleLabel = document.getElementById("staleLabel");
const runBtn = document.getElementById("runBtn");
const liveRunner = document.getElementById("liveRunner");
const mvRunner = document.getElementById("mvRunner");
const history = [];

function fmt(n) { return n.toLocaleString(); }

rowSlider.oninput = () => rowLabel.textContent = fmt(+rowSlider.value);
staleSlider.oninput = () => staleLabel.textContent = staleSlider.value + "%";

function animateRunner(el, duration, onDone) {
  el.style.width = "0%";
  const start = performance.now();
  function tick(t) {
    const p = Math.min(1, (t - start) / duration);
    el.style.width = (p * 100) + "%";
    if (p < 1) requestAnimationFrame(tick);
    else onDone();
  }
  requestAnimationFrame(tick);
}

function drawChart() {
  const c = document.getElementById("chart");
  const ctx = c.getContext("2d");
  const w = c.width, h = c.height;
  ctx.clearRect(0, 0, w, h);
  if (!history.length) {
    ctx.fillStyle = "#8a8f9b"; ctx.font = "13px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("History chart — run queries to populate", w/2, h/2);
    return;
  }
  const max = Math.max(...history.flatMap(r => [r.live, r.mv])) * 1.15;
  const barW = Math.min(30, (w - 60) / history.length / 2.5);
  const gap = barW * 0.4;
  ctx.strokeStyle = "#252834"; ctx.beginPath();
  for (let i = 0; i < 5; i++) { const y = h - 30 - (h - 60) * i / 4; ctx.moveTo(40, y); ctx.lineTo(w - 10, y); }
  ctx.stroke();
  ctx.fillStyle = "#8a8f9b"; ctx.font = "10px monospace"; ctx.textAlign = "right";
  for (let i = 0; i < 5; i++) { const y = h - 30 - (h - 60) * i / 4; ctx.fillText((max * i / 4).toFixed(0) + "ms", 36, y + 3); }
  history.forEach((r, i) => {
    const x = 50 + i * (barW * 2 + gap);
    const lh = (r.live / max) * (h - 60);
    const mh = (r.mv / max) * (h - 60);
    ctx.fillStyle = "#f59e0b"; ctx.fillRect(x, h - 30 - lh, barW, lh);
    ctx.fillStyle = "#6ee7b7"; ctx.fillRect(x + barW + 2, h - 30 - mh, barW, mh);
    ctx.fillStyle = "#8a8f9b"; ctx.textAlign = "center"; ctx.font = "10px monospace";
    ctx.fillText("#" + (i + 1), x + barW, h - 15);
  });
  ctx.fillStyle = "#f59e0b"; ctx.fillRect(w - 110, 12, 10, 10);
  ctx.fillStyle = "#e4e6eb"; ctx.font = "11px monospace"; ctx.textAlign = "left"; ctx.fillText("live", w - 95, 21);
  ctx.fillStyle = "#6ee7b7"; ctx.fillRect(w - 60, 12, 10, 10);
  ctx.fillStyle = "#e4e6eb"; ctx.fillText("mv", w - 45, 21);
}

function run() {
  runBtn.disabled = true;
  const rows = +rowSlider.value;
  const stale = +staleSlider.value;
  const liveMs = Math.round(rows * 0.008 + Math.random() * 30 + 50);
  const mvMs = Math.round(20 + Math.random() * 10);
  const liveScan = rows;
  const mvScan = Math.max(100, Math.floor(rows / 3000));
  const accuracy = Math.max(0, 100 - stale * (0.7 + Math.random() * 0.3));

  document.getElementById("liveTime").textContent = "running…";
  document.getElementById("mvTime").textContent = "running…";
  document.getElementById("liveScan").textContent = "—";
  document.getElementById("mvScan").textContent = "—";
  document.getElementById("mvAcc").textContent = "—";

  animateRunner(liveRunner, liveMs, () => {
    document.getElementById("liveTime").textContent = liveMs + " ms";
    document.getElementById("liveScan").textContent = fmt(liveScan);
  });
  animateRunner(mvRunner, mvMs, () => {
    document.getElementById("mvTime").textContent = mvMs + " ms";
    document.getElementById("mvScan").textContent = fmt(mvScan);
    const acc = document.getElementById("mvAcc");
    acc.textContent = accuracy.toFixed(1) + "%";
    acc.className = accuracy > 95 ? "ok" : "warn";
    history.push({ live: liveMs, mv: mvMs });
    if (history.length > 12) history.shift();
    drawChart();
    const speedup = (liveMs / mvMs).toFixed(1);
    document.getElementById("summary").textContent =
      `MV was ${speedup}× faster (${mvMs}ms vs ${liveMs}ms). Scanned ${fmt(mvScan)} vs ${fmt(liveScan)} rows. ` +
      (accuracy < 95 ? `⚠ Staleness cost: ${(100-accuracy).toFixed(1)}% drift — consider refreshing MV.` : `Accuracy within tolerance.`);
    runBtn.disabled = false;
  });
}

runBtn.onclick = run;
drawChart();