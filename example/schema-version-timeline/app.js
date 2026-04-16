const subjects = {
  "user-events": [
    {v:1,date:"2024-01",fields:3,change:"Initial schema"},
    {v:2,date:"2024-04",fields:4,change:"Added metadata field"},
    {v:3,date:"2024-09",fields:4,change:"Made metadata nullable"}
  ],
  "order-created": [
    {v:1,date:"2023-06",fields:2,change:"Initial schema"},
    {v:2,date:"2023-09",fields:3,change:"Added currency"},
    {v:3,date:"2024-01",fields:4,change:"Added items array"},
    {v:4,date:"2024-05",fields:5,change:"Added discount field"},
    {v:5,date:"2024-11",fields:5,change:"Renamed discount to discountPct"}
  ],
  "payment-processed": [
    {v:1,date:"2024-03",fields:2,change:"Initial schema"},
    {v:2,date:"2024-08",fields:3,change:"Added amount"}
  ]
};

const select = document.getElementById("subjectSelect");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const tip = document.getElementById("tooltip");
let nodes = [];

Object.keys(subjects).forEach(s => {
  const o = document.createElement("option");
  o.value = s; o.textContent = s;
  select.appendChild(o);
});

function resize() {
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  draw();
}

function draw() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  const vers = subjects[select.value];
  if (!vers) return;
  nodes = [];
  const pad = 80, gap = (w - pad * 2) / Math.max(vers.length - 1, 1);
  const cy = h / 2;

  ctx.strokeStyle = "#2a2d37"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(pad, cy); ctx.lineTo(w - pad, cy); ctx.stroke();

  vers.forEach((v, i) => {
    const x = pad + i * gap;
    const r = 14 + v.fields * 3;
    ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1d27"; ctx.fill();
    ctx.strokeStyle = "#6ee7b7"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#6ee7b7"; ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("v" + v.v, x, cy);
    ctx.fillStyle = "#555"; ctx.font = "11px sans-serif";
    ctx.fillText(v.date, x, cy + r + 18);
    nodes.push({x, y: cy, r, data: v});
  });
}

canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const hit = nodes.find(n => Math.hypot(mx - n.x, my - n.y) < n.r);
  if (hit) {
    tip.style.display = "block";
    tip.style.left = e.clientX + 12 + "px";
    tip.style.top = e.clientY + 12 + "px";
    tip.innerHTML = `<strong>v${hit.data.v}</strong> — ${hit.data.date}<br>Fields: ${hit.data.fields}<br>${hit.data.change}`;
  } else { tip.style.display = "none"; }
});

select.addEventListener("change", draw);
window.addEventListener("resize", resize);
resize();