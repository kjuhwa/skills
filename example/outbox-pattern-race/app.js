const svgDual = document.getElementById('svg-dual');
const svgOutbox = document.getElementById('svg-outbox');
const failSlider = document.getElementById('fail');
const failVal = document.getElementById('fail-val');

let running = false;

failSlider.oninput = () => failVal.textContent = failSlider.value + '%';

function mkDot(cx, cy, fill, r = 5) {
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  c.setAttribute('cx', cx); c.setAttribute('cy', cy);
  c.setAttribute('r', r); c.setAttribute('fill', fill);
  return c;
}

function clearSvgs() {
  [svgDual, svgOutbox].forEach(s => s.innerHTML = '');
  ['dual-sent', 'dual-lost', 'outbox-sent', 'outbox-lost'].forEach(id => {
    document.getElementById(id).textContent = '0';
  });
  document.getElementById('dual-pct').textContent = '100%';
  document.getElementById('outbox-pct').textContent = '100%';
}

function drawTrackBase(svg) {
  svg.innerHTML = '';
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', 40); line.setAttribute('y1', 70);
  line.setAttribute('x2', 560); line.setAttribute('y2', 70);
  line.setAttribute('stroke', '#262a37'); line.setAttribute('stroke-width', 2);
  svg.appendChild(line);
  ['DB', 'Relay/Call', 'Broker'].forEach((txt, i) => {
    const x = 40 + i * 260;
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    node.setAttribute('cx', x); node.setAttribute('cy', 70);
    node.setAttribute('r', 16); node.setAttribute('fill', '#1a1d27');
    node.setAttribute('stroke', '#6ee7b7'); node.setAttribute('stroke-width', 1.5);
    svg.appendChild(node);
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', x); t.setAttribute('y', 105);
    t.setAttribute('fill', '#8a8f9c'); t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-size', 11); t.setAttribute('font-family', 'sans-serif');
    t.textContent = txt;
    svg.appendChild(t);
  });
}

function animateDot(svg, fromX, toX, y, color, onArrive) {
  const dot = mkDot(fromX, y, color);
  svg.appendChild(dot);
  const start = performance.now();
  const dur = 600 + Math.random() * 400;
  function step(now) {
    const t = Math.min((now - start) / dur, 1);
    const x = fromX + (toX - fromX) * t;
    dot.setAttribute('cx', x);
    if (t < 1) requestAnimationFrame(step);
    else { setTimeout(() => dot.remove(), 300); onArrive && onArrive(); }
  }
  requestAnimationFrame(step);
}

async function runDualWrite(failRate) {
  let sent = 0, lost = 0;
  for (let i = 0; i < 100; i++) {
    const yOff = 50 + Math.random() * 40;
    animateDot(svgDual, 40, 300, yOff, '#60a5fa', () => {
      // After DB commit, try broker directly
      if (Math.random() * 100 < failRate) {
        // broker call fails — event is LOST (no retry in naive dual-write)
        lost++;
        animateDot(svgDual, 300, 430, yOff, '#f87171');
      } else {
        animateDot(svgDual, 300, 560, yOff, '#6ee7b7', () => sent++);
      }
    });
    await new Promise(r => setTimeout(r, 40));
  }
  await new Promise(r => setTimeout(r, 1500));
  document.getElementById('dual-sent').textContent = sent;
  document.getElementById('dual-lost').textContent = lost;
  document.getElementById('dual-pct').textContent = Math.round(sent / 100 * 100) + '%';
}

async function runOutbox(failRate) {
  let sent = 0;
  for (let i = 0; i < 100; i++) {
    const yOff = 50 + Math.random() * 40;
    animateDot(svgOutbox, 40, 300, yOff, '#60a5fa', () => {
      // Message safely in outbox; relay retries until success
      const tryDeliver = () => {
        if (Math.random() * 100 < failRate) {
          // Failed attempt — retry
          setTimeout(tryDeliver, 200);
        } else {
          animateDot(svgOutbox, 300, 560, yOff, '#6ee7b7', () => {
            sent++;
            document.getElementById('outbox-sent').textContent = sent;
            document.getElementById('outbox-pct').textContent = Math.round(sent / 100 * 100) + '%';
          });
        }
      };
      tryDeliver();
    });
    await new Promise(r => setTimeout(r, 40));
  }
}

document.getElementById('run').onclick = async () => {
  if (running) return;
  running = true;
  clearSvgs();
  drawTrackBase(svgDual);
  drawTrackBase(svgOutbox);
  const failRate = +failSlider.value;
  await Promise.all([runDualWrite(failRate), runOutbox(failRate)]);
  running = false;
};

document.getElementById('reset').onclick = () => {
  clearSvgs();
  drawTrackBase(svgDual);
  drawTrackBase(svgOutbox);
};

drawTrackBase(svgDual);
drawTrackBase(svgOutbox);