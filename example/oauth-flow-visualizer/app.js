const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const info = document.getElementById('step-info');

const actors = [
  { label: 'User', x: 100, y: 80 },
  { label: 'Client App', x: 350, y: 80 },
  { label: 'Auth Server', x: 600, y: 80 },
  { label: 'Resource', x: 800, y: 80 }
];

const flows = {
  authorization_code: [
    { from: 0, to: 1, msg: '1. Click Login', desc: 'User initiates login on the client application.' },
    { from: 1, to: 2, msg: '2. Auth Request', desc: 'Client redirects to Auth Server with client_id & redirect_uri.' },
    { from: 2, to: 0, msg: '3. Login Prompt', desc: 'Auth Server presents login/consent screen to user.' },
    { from: 0, to: 2, msg: '4. Credentials', desc: 'User submits credentials directly to Auth Server.' },
    { from: 2, to: 1, msg: '5. Auth Code', desc: 'Auth Server redirects back with an authorization code.' },
    { from: 1, to: 2, msg: '6. Exchange Code', desc: 'Client exchanges auth code + secret for tokens.' },
    { from: 2, to: 1, msg: '7. Access Token', desc: 'Auth Server returns access & refresh tokens.' },
    { from: 1, to: 3, msg: '8. API Call', desc: 'Client calls Resource Server with Bearer token.' }
  ],
  client_credentials: [
    { from: 1, to: 2, msg: '1. Token Request', desc: 'Client sends client_id & client_secret directly.' },
    { from: 2, to: 1, msg: '2. Access Token', desc: 'Auth Server validates and returns access token.' },
    { from: 1, to: 3, msg: '3. API Call', desc: 'Client uses token to access protected resources.' }
  ],
  pkce: [
    { from: 0, to: 1, msg: '1. Click Login', desc: 'User initiates login; client generates code_verifier & code_challenge.' },
    { from: 1, to: 2, msg: '2. Auth + Challenge', desc: 'Client sends auth request with code_challenge (S256).' },
    { from: 2, to: 0, msg: '3. Login Prompt', desc: 'Auth Server presents login screen.' },
    { from: 0, to: 2, msg: '4. Credentials', desc: 'User authenticates with Auth Server.' },
    { from: 2, to: 1, msg: '5. Auth Code', desc: 'Auth Server returns authorization code.' },
    { from: 1, to: 2, msg: '6. Code + Verifier', desc: 'Client exchanges code with original code_verifier.' },
    { from: 2, to: 1, msg: '7. Access Token', desc: 'Server verifies challenge, returns tokens.' },
    { from: 1, to: 3, msg: '8. API Call', desc: 'Client accesses resources with token.' }
  ]
};

let animSteps = [], currentStep = -1, animProgress = 0, animId = null;

function drawActors() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  actors.forEach(a => {
    ctx.fillStyle = '#1a1d27'; ctx.strokeStyle = '#6ee7b7'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(a.x - 45, a.y - 20, 90, 40, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6ee7b7'; ctx.font = '13px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText(a.label, a.x, a.y + 5);
    ctx.strokeStyle = '#333'; ctx.beginPath(); ctx.moveTo(a.x, a.y + 20); ctx.lineTo(a.x, 480); ctx.stroke();
  });
}

function drawArrow(fromX, toX, y, msg, highlight) {
  const dir = toX > fromX ? 1 : -1;
  ctx.strokeStyle = highlight ? '#6ee7b7' : '#444'; ctx.lineWidth = highlight ? 2 : 1;
  ctx.beginPath(); ctx.moveTo(fromX, y); ctx.lineTo(toX, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(toX, y); ctx.lineTo(toX - dir * 8, y - 5); ctx.lineTo(toX - dir * 8, y + 5); ctx.closePath();
  ctx.fillStyle = highlight ? '#6ee7b7' : '#444'; ctx.fill();
  ctx.fillStyle = highlight ? '#fff' : '#888'; ctx.font = '11px Segoe UI'; ctx.textAlign = 'center';
  ctx.fillText(msg, (fromX + toX) / 2, y - 8);
}

function render() {
  drawActors();
  animSteps.forEach((s, i) => {
    const y = 140 + i * 42;
    const fromX = actors[s.from].x, toX = actors[s.to].x;
    if (i < currentStep) drawArrow(fromX, toX, y, s.msg, false);
    else if (i === currentStep) {
      const cx = fromX + (toX - fromX) * animProgress;
      drawArrow(fromX, cx, y, s.msg, true);
    }
  });
}

function animate() {
  animProgress += 0.025;
  if (animProgress >= 1) {
    animProgress = 0; currentStep++;
    if (currentStep < animSteps.length) info.textContent = animSteps[currentStep].desc;
    else { render(); return; }
  }
  render(); animId = requestAnimationFrame(animate);
}

function startFlow(name) {
  cancelAnimationFrame(animId); animSteps = flows[name]; currentStep = 0; animProgress = 0;
  info.textContent = animSteps[0].desc; animate();
}

drawActors();