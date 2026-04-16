const stage = document.getElementById("stage");
const SVG_NS = "http://www.w3.org/2000/svg";
const stream = [];
const typeSet = ["UserSignedUp", "PostCreated", "PostLiked", "CommentAdded", "UserDeleted"];
const users = ["ada", "grace", "linus", "edsger", "alan"];

let posA = 0, posB = 0;
let tickCount = 0;

const projA = { users: 0, posts: 0, likes: 0, comments: 0 };
const projB = { users: 0, posts: 0, likes: 0, comments: 0 };

function emit(type) {
  const t = type || typeSet[Math.floor(Math.random() * typeSet.length)];
  stream.push({
    seq: stream.length,
    type: t,
    user: users[Math.floor(Math.random() * users.length)]
  });
  updateStreamPos();
}

function apply(proj, ev) {
  switch (ev.type) {
    case "UserSignedUp": proj.users++; break;
    case "UserDeleted":  proj.users = Math.max(0, proj.users - 1); break;
    case "PostCreated":  proj.posts++; break;
    case "PostLiked":    proj.likes++; break;
    case "CommentAdded": proj.comments++; break;
  }
}

function step() {
  if (posA < stream.length) { apply(projA, stream[posA]); posA++; }
  if (tickCount % 3 === 0 && posB < stream.length) { apply(projB, stream[posB]); posB++; }
  tickCount++;
  render();
}

function render() {
  while (stage.firstChild) stage.removeChild(stage.firstChild);

  const line = document.createElementNS(SVG_NS, "line");
  line.setAttribute("x1", 60); line.setAttribute("y1", 180);
  line.setAttribute("x2", 860); line.setAttribute("y2", 180);
  line.setAttribute("stroke", "#252a36"); line.setAttribute("stroke-width", 2);
  stage.appendChild(line);

  const recentWindow = 22;
  const windowStart = Math.max(0, stream.length - recentWindow);
  const visible = stream.slice(windowStart);
  visible.forEach((e, idx) => {
    const x = 70 + idx * 36;
    const consumedA = e.seq < posA;
    const consumedB = e.seq < posB;
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", x); c.setAttribute("cy", 180); c.setAttribute("r", 12);
    c.setAttribute("fill", consumedA ? "#6ee7b7" : "#374151");
    c.setAttribute("stroke", consumedB ? "#fbbf24" : "none");
    c.setAttribute("stroke-width", 2);
    stage.appendChild(c);

    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", x); label.setAttribute("y", 205);
    label.setAttribute("fill", "#64748b");
    label.setAttribute("font-size", "9");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-family", "monospace");
    label.textContent = "#" + e.seq;
    stage.appendChild(label);

    const tlabel = document.createElementNS(SVG_NS, "text");
    tlabel.setAttribute("x", x); tlabel.setAttribute("y", 160);
    tlabel.setAttribute("fill", "#94a3b8");
    tlabel.setAttribute("font-size", "8");
    tlabel.setAttribute("text-anchor", "middle");
    tlabel.setAttribute("transform", "rotate(-40 " + x + " 160)");
    tlabel.textContent = e.type;
    stage.appendChild(tlabel);
  });

  drawCursor("A", posA - windowStart, "#6ee7b7", 100);
  drawCursor("B", posB - windowStart, "#fbbf24", 260);

  renderPanel("projA", projA);
  renderPanel("projB", projB);
  document.getElementById("lagA").textContent = "lag " + (stream.length - posA);
  document.getElementById("lagB").textContent = "lag " + (stream.length - posB);
}

function drawCursor(label, idx, color, y) {
  if (idx < 0) idx = 0;
  const x = 70 + idx * 36;
  const line = document.createElementNS(SVG_NS, "line");
  line.setAttribute("x1", x); line.setAttribute("x2", x);
  line.setAttribute("y1", y); line.setAttribute("y2", 180);
  line.setAttribute("stroke", color); line.setAttribute("stroke-width", 1.5);
  line.setAttribute("stroke-dasharray", "4 3");
  stage.appendChild(line);

  const tag = document.createElementNS(SVG_NS, "text");
  tag.setAttribute("x", x); tag.setAttribute("y", y - 6);
  tag.setAttribute("fill", color);
  tag.setAttribute("font-size", "11");
  tag.setAttribute("text-anchor", "middle");
  tag.setAttribute("font-family", "monospace");
  tag.textContent = label + " → #" + (idx + Math.max(0, stream.length - 22));
  stage.appendChild(tag);
}

function renderPanel(id, proj) {
  const host = document.getElementById(id);
  host.innerHTML = "";
  for (const key of Object.keys(proj)) {
    const li = document.createElement("li");
    li.innerHTML = '<span class="k">' + key + '</span><span class="v">' + proj[key] + '</span>';
    host.appendChild(li);
  }
}

function updateStreamPos() {
  document.getElementById("streamPos").textContent = stream.length;
}

document.getElementById("emit").addEventListener("click", () => emit());
document.getElementById("burst").addEventListener("click", () => {
  for (let i = 0; i < 20; i++) emit();
});
document.getElementById("reset").addEventListener("click", () => {
  stream.length = 0;
  posA = posB = 0;
  Object.keys(projA).forEach(k => projA[k] = 0);
  Object.keys(projB).forEach(k => projB[k] = 0);
  updateStreamPos();
  render();
});

for (let i = 0; i < 8; i++) emit();
setInterval(step, 350);
render();