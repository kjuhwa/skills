const cvs = document.getElementById("radar");
const ctx = cvs.getContext("2d");
const W = 500, H = 500, CX = 250, CY = 250;

const names = ["web-01","web-02","api-gw","auth-svc","db-main","db-replica","cache-01","cache-02","queue-01","worker-a","worker-b","storage","mailer","cdn-edge","search","metrics"];
const nodes = names.map((n, i) => {
  const angle = (i / names.length) * Math.PI * 2;
  return { name: n, angle, dist: 80 + Math.random() * 140, latency: 30 + Math.random() * 180, packetLoss: Math.random() * 5, uptime: 95 + Math.random() * 5 };
});

let selected = null;
let sweepAngle = 0;
let threshold = 150;

document.getElementById("threshold").addEventListener("input", e => {
  threshold = +e.target.value;
  document.getElementById("tVal").textContent = threshold;
  renderList();
});

document.getElementById("scanBtn").addEventListener("click", () => {
  nodes.forEach(n => {
    n.latency = 30 + Math.random() * 200;
    n.packetLoss = Math.random() * 8;
    n.uptime = 95 + Math.random() * 5;
  });
  renderList();
  if (selected) showDetails(selected);
});

cvs.addEventListener("click", e => {
  const r = cvs.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width);
  const y = (e.clientY - r.top) * (H / r.height);
  let best = null, bd = 20;
  nodes.forEach(n => {
    const nx = CX + Math.cos(n.angle) * n.dist;
    const ny = CY + Math.sin(n.angle) * n.dist;
    const d = Math.hypot(x - nx, y - ny);
    if (d < bd) { bd = d; best = n; }
  });
  if (best) { selected = best; showDetails(best); }
});

function colorFor(n) {
  if (n.latency > threshold * 1.5 || n.packetLoss > 5) return "#f87171";
  if (n.latency > threshold) return "#fbbf24";
  return "#6ee7b7";
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = "#23273480";
  for (let r = 50; r <= 220; r += 50) {
    ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2); ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.lineTo(CX + Math.cos(i * Math.PI / 4) * 220, CY + Math.sin(i * Math.PI / 4) * 220);
    ctx.stroke();
  }
  const grad = ctx.createLinearGradient(CX, CY, CX + Math.cos(sweepAngle) * 220, CY + Math.sin(sweepAngle) * 220);
  grad.addColorStop(0, "#6ee7b750"); grad.addColorStop(1, "#6ee7b700");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(CX, CY);
  ctx.arc(CX, CY, 220, sweepAngle - 0.4, sweepAngle);
  ctx.closePath();
  ctx.fill();

  nodes.forEach(n => {
    const nx = CX + Math.cos(n.angle) * n.dist;
    const ny = CY + Math.sin(n.angle) * n.dist;
    const diff = ((n.angle - sweepAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const pulse = diff < 0.3 ? 1 - diff / 0.3 : 0;
    ctx.fillStyle = colorFor(n);
    ctx.beginPath();
    ctx.arc(nx, ny, 5 + pulse * 6, 0, Math.PI * 2);
    ctx.globalAlpha = 0.3 + 0.7 * (1 - pulse * 0);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (selected === n) {
      ctx.strokeStyle = "#e6e8ef"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(nx, ny, 10, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = "#9aa0b4"; ctx.font = "10px sans-serif";
    ctx.fillText(n.name, nx + 8, ny + 3);
  });
  sweepAngle = (sweepAngle + 0.02) % (Math.PI * 2);
  requestAnimationFrame(draw);
}

function showDetails(n) {
  document.getElementById("selName").textContent = n.name;
  const status = n.latency > threshold * 1.5 ? "CRITICAL" : n.latency > threshold ? "WARNING" : "HEALTHY";
  document.getElementById("selInfo").innerHTML = `
    <div class="kv"><span>Status</span><span>${status}</span></div>
    <div class="kv"><span>Latency</span><span>${n.latency.toFixed(1)} ms</span></div>
    <div class="kv"><span>Packet Loss</span><span>${n.packetLoss.toFixed(2)}%</span></div>
    <div class="kv"><span>Uptime</span><span>${n.uptime.toFixed(2)}%</span></div>`;
}

function renderList() {
  document.getElementById("nodeList").innerHTML = nodes.map(n =>
    `<div class="node-row" data-n="${n.name}"><span><span class="dot" style="background:${colorFor(n)}"></span>${n.name}</span><span>${n.latency.toFixed(0)}ms</span></div>`
  ).join("");
  document.querySelectorAll(".node-row").forEach(r => r.addEventListener("click", () => {
    const n = nodes.find(x => x.name === r.dataset.n);
    selected = n; showDetails(n);
  }));
}

renderList();
draw();