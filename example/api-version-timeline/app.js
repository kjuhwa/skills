const versions = [
  { ver: "v4.0", date: "2025-11-01", status: "active", desc: "GraphQL federation, streaming responses",
    changes: ["ADD: GraphQL subscriptions", "ADD: Server-sent events", "REMOVE: Legacy XML format", "CHANGE: Auth moved to mTLS"] },
  { ver: "v3.2", date: "2025-06-15", status: "active", desc: "Rate limiting v2, cursor pagination",
    changes: ["ADD: Cursor-based pagination", "CHANGE: Rate limits per-endpoint", "FIX: Timezone handling in filters"] },
  { ver: "v3.0", date: "2024-09-01", status: "active", desc: "Breaking: new resource naming, JSON:API spec",
    changes: ["CHANGE: snake_case → camelCase", "ADD: JSON:API envelope", "REMOVE: /list endpoints", "ADD: Bulk operations"] },
  { ver: "v2.1", date: "2023-12-10", status: "deprecated", desc: "Maintenance patch, sunset announced",
    changes: ["FIX: OAuth token refresh race", "CHANGE: Sunset header added", "DEPRECATE: API key auth"] },
  { ver: "v2.0", date: "2023-01-20", status: "deprecated", desc: "OAuth2, webhook events, expanded resources",
    changes: ["ADD: OAuth2 PKCE flow", "ADD: Webhook subscriptions", "CHANGE: Pagination defaults"] },
  { ver: "v1.0", date: "2022-03-05", status: "deprecated", desc: "Initial public release, REST/JSON",
    changes: ["ADD: CRUD for all core resources", "ADD: API key authentication", "ADD: Basic filtering"] }
];
const tl = document.getElementById("timeline");
versions.forEach((v, i) => {
  const node = document.createElement("div");
  node.className = "tl-node";
  node.innerHTML = `<div class="tl-dot ${v.status}"></div>
    <span class="tl-ver">${v.ver}</span><span class="tl-date">${v.date}</span>
    <span class="tl-status ${v.status}">${v.status}</span>
    <div class="tl-desc">${v.desc}</div>`;
  node.onclick = () => {
    document.querySelectorAll(".tl-node").forEach(n => n.classList.remove("active"));
    node.classList.add("active");
    document.getElementById("detail-title").textContent = `${v.ver} — Changelog`;
    document.getElementById("detail-body").innerHTML = v.changes.map(c => {
      const tag = c.split(":")[0];
      return `<div class="change-item"><span>${tag}</span>${c.slice(tag.length + 2)}</div>`;
    }).join("");
  };
  tl.appendChild(node);
});
versions[0] && tl.querySelector(".tl-node").click();