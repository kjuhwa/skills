const allScopes = {
  "openid": { desc: "Confirm your identity", risk: "low", required: true },
  "profile": { desc: "Read your name and profile picture", risk: "low" },
  "email": { desc: "Read your primary email address", risk: "low" },
  "calendar.read": { desc: "View your calendar events", risk: "med" },
  "calendar.write": { desc: "Create and modify calendar events", risk: "med" },
  "contacts.read": { desc: "Read your address book", risk: "med" },
  "files.read": { desc: "Read files in your cloud storage", risk: "high" },
  "files.write": { desc: "Upload and modify files", risk: "high" },
  "analytics.read": { desc: "View aggregated usage data", risk: "low" },
  "admin.users": { desc: "Manage all users in your org", risk: "high" },
  "social.post": { desc: "Publish posts on your behalf", risk: "high" },
  "offline_access": { desc: "Stay signed in (refresh tokens)", risk: "med" },
};
const apps = {
  planner: { name: "Planner Pro", scopes: ["openid","profile","email","calendar.read","calendar.write","contacts.read","offline_access"] },
  analytics: { name: "Data Analytics", scopes: ["openid","profile","analytics.read","admin.users"] },
  social: { name: "SocialShare", scopes: ["openid","profile","email","files.read","social.post","offline_access"] },
};
let current = "planner";
let selected = new Set();
const log = [];

function render() {
  const app = apps[current];
  document.getElementById("appName").textContent = app.name;
  const list = document.getElementById("scopeList");
  list.innerHTML = "";
  selected.clear();
  app.scopes.forEach(sc => {
    const info = allScopes[sc];
    if (info.required) selected.add(sc);
    const el = document.createElement("label");
    el.className = "scope-item" + (info.required ? " required" : "");
    el.innerHTML = `<input type="checkbox" ${info.required || info.risk !== 'high' ? 'checked' : ''} ${info.required ? 'disabled' : ''} data-sc="${sc}"/>
      <div class="info">
        <div class="sc-name">${sc}<span class="risk ${info.risk}">${info.risk}</span></div>
        <div class="sc-desc">${info.desc}</div>
      </div>`;
    const cb = el.querySelector("input");
    if (cb.checked) selected.add(sc);
    cb.onchange = () => {
      if (cb.checked) selected.add(sc); else selected.delete(sc);
      updateViz();
    };
    list.appendChild(el);
  });
  updateViz();
}

function updateViz() {
  const canvas = document.getElementById("permViz");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width, canvas.height);
  const cx = 160, cy = 130, baseR = 28;
  ctx.fillStyle = "#6ee7b7";
  ctx.beginPath(); ctx.arc(cx, cy, baseR, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0f1117"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("USER", cx, cy + 4);
  const scopes = [...selected];
  const riskColor = { low: "#6ee7b7", med: "#fbbf24", high: "#ef4444" };
  let riskScore = 0;
  scopes.forEach((sc, i) => {
    const info = allScopes[sc];
    const angle = (i / scopes.length) * Math.PI * 2 - Math.PI/2;
    const dist = 85; const x = cx + Math.cos(angle)*dist; const y = cy + Math.sin(angle)*dist;
    ctx.strokeStyle = riskColor[info.risk]; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(angle)*baseR, cy + Math.sin(angle)*baseR);
    ctx.lineTo(x - Math.cos(angle)*14, y - Math.sin(angle)*14); ctx.stroke();
    ctx.fillStyle = riskColor[info.risk];
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#e6e8ee"; ctx.font = "10px monospace";
    const label = sc.length > 14 ? sc.slice(0,12)+"…" : sc;
    ctx.fillText(label, x, y + 24);
    riskScore += info.risk === "high" ? 3 : info.risk === "med" ? 1 : 0;
  });
  document.getElementById("scopeCount").textContent = scopes.length;
  const level = riskScore >= 5 ? "HIGH" : riskScore >= 2 ? "MEDIUM" : "LOW";
  const rl = document.getElementById("riskLevel");
  rl.textContent = level;
  rl.style.color = level === "HIGH" ? "#fca5a5" : level === "MEDIUM" ? "#fbbf24" : "#6ee7b7";
  document.getElementById("ttl").textContent = selected.has("offline_access") ? "3600s + refresh" : "3600s";
}

function addLog(type, msg) {
  const time = new Date().toLocaleTimeString();
  log.unshift({ time, type, msg });
  document.getElementById("consentLog").innerHTML = log.slice(0, 20).map(l =>
    `<div class="log-entry"><span class="time">${l.time}</span><span class="log-${l.type}">${l.msg}</span></div>`
  ).join("");
}

document.getElementById("allowBtn").onclick = () => {
  addLog("allow", `✓ ${apps[current].name} granted: ${[...selected].join(", ")}`);
};
document.getElementById("denyBtn").onclick = () => {
  addLog("deny", `✗ ${apps[current].name} denied`);
};
document.querySelectorAll(".apps button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".apps button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    current = btn.dataset.app;
    render();
  };
});
document.querySelector('[data-app="planner"]').classList.add("active");
render();
addLog("allow", "Session started — demo ready");