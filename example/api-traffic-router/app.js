const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const W = 860, H = 400;
const endpoints = [
  { name: "v3 /users", x: 680, y: 60, color: "#6ee7b7", count: 0 },
  { name: "v3 /orders", x: 680, y: 150, color: "#6ee7b7", count: 0 },
  { name: "v2 /users", x: 680, y: 240, color: "#facc15", count: 0 },
  { name: "v1 /data", x: 680, y: 330, color: "#f87171", count: 0 }
];
const gateway = { x: 340, y: 200, r: 36 };
let particles = [], running = true, totalReqs = 0;

function spawnParticle() {
  const ep = endpoints[Math.random() < 0.45 ? 0 : Math.random() < 0.5 ? 1 : Math.random() < 0.7 ? 2 : 3];
  particles.push({ x: 40, y: 80 + Math.random() * 240, phase: 0, ep, t: 0, speed: 1.5 + Math.random() });
}
function draw() {
  ctx.clearRect(0, 0, W, H);
  // gateway
  ctx.beginPath(); ctx.arc(gateway.x, gateway.y, gateway.r, 0, Math.PI * 2);
  ctx.fillStyle = "#232736"; ctx.fill();
  ctx.strokeStyle = "#6ee7b7"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#6ee7b7"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("GATEWAY", gateway.x, gateway.y + 4);
  // endpoints
  endpoints.forEach(ep => {
    ctx.fillStyle = "#1e2130"; ctx.beginPath();
    ctx.roundRect(ep.x, ep.y - 18, 150, 36, 6); ctx.fill();
    ctx.strokeStyle = ep.color; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = ep.color; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "left";
    ctx.fillText(ep.name, ep.x + 10, ep.y + 4);
    ctx.fillStyle = "#888"; ctx.font = "10px sans-serif";
    ctx.fillText(ep.count + " reqs", ep.x + 105, ep.y + 4);
  });
  // client
  ctx.fillStyle = "#232736"; ctx.beginPath(); ctx.roundRect(10, 170, 60, 60, 8); ctx.fill();
  ctx.fillStyle = "#aaa"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("Clients", 40, 204);
  // particles
  particles.forEach(p => {
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = p.ep.color; ctx.globalAlpha = 0.8; ctx.fill(); ctx.globalAlpha = 1;
  });
}
function update() {
  const spd = +document.getElementById("speed").value;
  particles.forEach(p => {
    const s = p.speed * spd * 0.6;
    if (p.phase === 0) {
      p.x += s; if (p.x >= gateway.x) { p.phase = 1; p.x = gateway.x; p.y = gateway.y; }
    } else {
      const dx = p.ep.x - p.x, dy = p.ep.y - p.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 4) { p.phase = 2; p.ep.count++; totalReqs++; }
      else { p.x += (dx / d) * s * 1.2; p.y += (dy / d) * s * 1.2; }
    }
  });
  particles = particles.filter(p => p.phase < 2);
  if (running && Math.random() < 0.15 * spd) spawnParticle();
  updateStats();
}
function updateStats() {
  const s = document.getElementById("stats");
  s.innerHTML = `<div class="stat-card"><h3>${totalReqs}</h3><p>Total Requests</p></div>
    <div class="stat-card"><h3>${endpoints[0].count + endpoints[1].count}</h3><p>v3 (current)</p></div>
    <div class="stat-card"><h3>${endpoints[2].count + endpoints[3].count}</h3><p>Legacy (v1+v2)</p></div>`;
}
function toggleSim() { running = !running; }
(function loop() { update(); draw(); requestAnimationFrame(loop); })();