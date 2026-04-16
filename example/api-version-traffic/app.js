const versions = [
  { v: "v1", color: "#f87171", base: 50, deprecated: true, sunset: "2026-06-30" },
  { v: "v2", color: "#fbbf24", base: 200, deprecated: true, sunset: "2027-01-15" },
  { v: "v3", color: "#6ee7b7", base: 800, deprecated: false },
  { v: "v4", color: "#60a5fa", base: 400, deprecated: false }
];
const clients = [
  { name: "legacy-mobile-ios", version: "v1", rps: 35 },
  { name: "partner-acme-corp", version: "v2", rps: 120 },
  { name: "old-dashboard", version: "v1", rps: 12 },
  { name: "billing-cron", version: "v2", rps: 65 }
];
const HIST = 60;
const history = versions.map(() => Array(HIST).fill(0));

const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

function tick() {
  versions.forEach((v, i) => {
    const noise = (Math.random() - 0.5) * v.base * 0.4;
    history[i].shift();
    history[i].push(Math.max(0, v.base + noise));
  });
  draw();
  updateShares();
  updateClients();
}

function draw() {
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = "#0f1117";
  ctx.fillRect(0, 0, W, H);

  const max = Math.max(...history.flat(), 1) * 1.1;
  ctx.strokeStyle = "#1e293b";
  for (let y = 0; y <= 4; y++) {
    const py = (H - 20) * y / 4 + 10;
    ctx.beginPath(); ctx.moveTo(40, py); ctx.lineTo(W - 10, py); ctx.stroke();
    ctx.fillStyle = "#64748b"; ctx.font = "10px monospace";
    ctx.fillText(Math.round(max * (1 - y / 4)), 5, py + 3);
  }

  versions.forEach((v, i) => {
    ctx.strokeStyle = v.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    history[i].forEach((val, x) => {
      const px = 40 + (W - 50) * x / (HIST - 1);
      const py = H - 10 - (H - 20) * (val / max);
      x === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.stroke();
  });

  let ly = 20;
  versions.forEach(v => {
    ctx.fillStyle = v.color;
    ctx.fillRect(W - 90, ly, 10, 10);
    ctx.fillStyle = "#e2e8f0"; ctx.font = "11px sans-serif";
    ctx.fillText(v.v + (v.deprecated ? " (dep)" : ""), W - 75, ly + 9);
    ly += 16;
  });
}

function updateShares() {
  const totals = versions.map((_, i) => history[i].reduce((a, b) => a + b, 0));
  const sum = totals.reduce((a, b) => a + b, 0) || 1;
  document.getElementById("shares").innerHTML = versions.map((v, i) => {
    const pct = (totals[i] / sum * 100).toFixed(1);
    return `<div class="share-row">
      <span class="share-label">${v.v}</span>
      <div class="share-bar"><div class="share-fill" style="width:${pct}%;background:${v.color}"></div></div>
      <span class="share-pct">${pct}%</span>
    </div>`;
  }).join("");
}

function updateClients() {
  const tbody = document.querySelector("#clients tbody");
  tbody.innerHTML = clients.map(c => {
    const jitter = (c.rps * (0.9 + Math.random() * 0.2)).toFixed(0);
    return `<tr><td>${c.name}</td><td class="dep">${c.version}</td><td>${jitter}</td></tr>`;
  }).join("");
}

document.getElementById("alerts").innerHTML = versions
  .filter(v => v.deprecated)
  .map(v => {
    const days = Math.ceil((new Date(v.sunset) - new Date("2026-04-17")) / 86400000);
    const cls = days < 120 ? "" : "warn";
    return `<li class="${cls}"><strong>${v.v}</strong> sunsets ${v.sunset} (${days} days)</li>`;
  }).join("");

tick();
setInterval(tick, 1000);