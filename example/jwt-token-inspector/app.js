function b64urlEncode(obj) {
  return btoa(JSON.stringify(obj)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function b64urlDecode(s) {
  s = s.replace(/-/g,'+').replace(/_/g,'/');
  while (s.length % 4) s += '=';
  return atob(s);
}
const now = Math.floor(Date.now() / 1000);
const samples = {
  valid: [
    { alg: "RS256", typ: "JWT", kid: "key-2024-10" },
    { iss: "https://auth.example.com", sub: "user_42891", aud: "client_webapp",
      exp: now + 3600, iat: now - 60, nbf: now - 60,
      scope: "openid profile email", email: "ada@example.com", jti: "a9f-7bc-221" }
  ],
  expired: [
    { alg: "HS256", typ: "JWT" },
    { iss: "https://auth.example.com", sub: "user_9912", aud: "client_mobile",
      exp: now - 7200, iat: now - 10800, scope: "read:data" }
  ],
  refresh: [
    { alg: "RS512", typ: "JWT", kid: "refresh-key-1" },
    { iss: "https://auth.example.com", sub: "user_42891", aud: "token_endpoint",
      exp: now + 2592000, iat: now, scope: "offline_access",
      token_use: "refresh", client_id: "client_webapp" }
  ]
};

const claimDescriptions = {
  iss: "Issuer — who created the token",
  sub: "Subject — user/entity identifier",
  aud: "Audience — intended recipient",
  exp: "Expiration time (unix)",
  iat: "Issued at (unix)",
  nbf: "Not valid before (unix)",
  jti: "Unique token ID",
  scope: "Granted OAuth scopes",
  client_id: "OAuth client identifier",
  token_use: "Type (access/id/refresh)",
};

function buildJWT(header, payload) {
  const h = b64urlEncode(header);
  const p = b64urlEncode(payload);
  const sig = Array.from({length: 43}, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[Math.floor(Math.random()*64)]
  ).join('');
  return `${h}.${p}.${sig}`;
}

function formatTime(ts) {
  if (!ts) return "-";
  return new Date(ts * 1000).toISOString().replace('T',' ').slice(0,19) + " UTC";
}

function decode() {
  const raw = document.getElementById("jwtInput").value.trim();
  const status = document.getElementById("status");
  const parts = raw.split(".");
  if (parts.length !== 3) {
    status.className = "status err";
    status.textContent = "✗ Invalid JWT — expected 3 parts separated by '.'";
    return;
  }
  try {
    const header = JSON.parse(b64urlDecode(parts[0]));
    const payload = JSON.parse(b64urlDecode(parts[1]));
    document.getElementById("headerOut").textContent = JSON.stringify(header, null, 2);
    document.getElementById("payloadOut").textContent = JSON.stringify(payload, null, 2);
    document.getElementById("sigOut").textContent = parts[2];
    const expired = payload.exp && payload.exp < now;
    status.className = "status " + (expired ? "err" : "ok");
    status.textContent = expired
      ? `✗ Token EXPIRED ${Math.round((now - payload.exp)/60)} min ago`
      : `✓ Token structure valid — alg=${header.alg}`;
    renderClaims(payload);
  } catch (e) {
    status.className = "status err";
    status.textContent = "✗ Decode error: " + e.message;
  }
}

function renderClaims(p) {
  const list = document.getElementById("claimList");
  list.innerHTML = "";
  for (const [k, v] of Object.entries(p)) {
    let cls = "good", display = v;
    if (k === "exp") {
      cls = v < now ? "bad" : (v - now < 300 ? "warn" : "good");
      display = formatTime(v) + (v < now ? " (EXPIRED)" : ` (in ${Math.round((v-now)/60)}m)`);
    } else if (k === "iat" || k === "nbf") {
      display = formatTime(v);
    }
    const li = document.createElement("li");
    li.className = cls;
    li.innerHTML = `<div class="claim-name">${k}</div>
      <div class="claim-val">${display}</div>
      <div class="claim-desc">${claimDescriptions[k] || 'Custom claim'}</div>`;
    list.appendChild(li);
  }
}

document.querySelectorAll("[data-sample]").forEach(btn => {
  btn.onclick = () => {
    const [h, p] = samples[btn.dataset.sample];
    document.getElementById("jwtInput").value = buildJWT(h, p);
    decode();
  };
});
document.getElementById("jwtInput").addEventListener("input", decode);
document.querySelector('[data-sample="valid"]').click();