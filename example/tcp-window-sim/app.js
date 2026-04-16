const sCanvas = document.getElementById('senderCanvas').getContext('2d');
const rCanvas = document.getElementById('recvCanvas').getContext('2d');
const MAX = 16; // KB
const state = { buf: 0, sent: 0, cwnd: 1, zw: 0, waiting:false, tick:0, inflight:[] };

function logEv(msg, cls=''){
  const el = document.getElementById('events');
  const d = document.createElement('div');
  if (cls) d.className = cls;
  d.textContent = `t=${state.tick} ${msg}`;
  el.prepend(d);
  while (el.children.length > 30) el.lastChild.remove();
}

function tick(){
  state.tick++;
  const appSpd = parseInt(document.getElementById('appSpeed').value,10);
  state.buf = Math.max(0, state.buf - appSpd);
  const rwnd = MAX - state.buf;

  if (rwnd === 0){
    if (!state.waiting){ state.zw++; logEv('ZeroWindow — sender blocked','warn'); }
    state.waiting = true;
  } else if (state.waiting && rwnd > 4){
    state.waiting = false;
    logEv('Window reopened → resume','ok');
  }

  if (!state.waiting){
    const send = Math.min(state.cwnd, rwnd);
    if (send > 0){
      state.buf += send;
      state.sent += send;
      state.inflight.push({size:send, age:0});
      state.cwnd = Math.min(MAX, state.cwnd + 1);
      logEv(`SEND ${send}KB  cwnd=${state.cwnd} rwnd=${rwnd}`);
    }
  } else {
    state.cwnd = Math.max(1, Math.floor(state.cwnd/2));
  }
  state.inflight = state.inflight.filter(p => ++p.age < 4);

  document.getElementById('cwnd').textContent = state.cwnd;
  document.getElementById('sent').textContent = state.sent;
  document.getElementById('rwnd').textContent = MAX - state.buf;
  document.getElementById('zw').textContent = state.zw;
  document.getElementById('waiting').textContent = state.waiting ? 'YES' : 'no';
  draw();
}

function draw(){
  sCanvas.fillStyle='#0f1117'; sCanvas.fillRect(0,0,380,160);
  sCanvas.fillStyle='#6ee7b7'; sCanvas.fillRect(12,30,state.cwnd*20,14);
  sCanvas.strokeStyle='#2a2f3d'; sCanvas.strokeRect(12,30,MAX*20,14);
  sCanvas.fillStyle='#8892a6'; sCanvas.font='11px sans-serif';
  sCanvas.fillText('Congestion window',12,22);
  state.inflight.forEach((p,i)=>{
    sCanvas.fillStyle='#60a5fa';
    sCanvas.fillRect(12 + p.age*80, 80 + i*6, p.size*8, 4);
  });
  sCanvas.fillStyle='#8892a6'; sCanvas.fillText('In-flight packets →',12,72);

  rCanvas.fillStyle='#0f1117'; rCanvas.fillRect(0,0,380,160);
  rCanvas.fillStyle='#8892a6'; rCanvas.font='11px sans-serif';
  rCanvas.fillText('Receive buffer (16 KB)',12,22);
  rCanvas.strokeStyle='#2a2f3d'; rCanvas.strokeRect(12,30,360,30);
  const fillW = (state.buf/MAX)*360;
  rCanvas.fillStyle = state.buf >= MAX ? '#f87171' : state.buf/MAX > .7 ? '#fbbf24' : '#6ee7b7';
  rCanvas.fillRect(12,30,fillW,30);
  rCanvas.fillStyle='#0f1117'; rCanvas.font='bold 12px sans-serif';
  rCanvas.fillText(`${state.buf} / ${MAX} KB`, 150, 49);
  rCanvas.fillStyle='#8892a6'; rCanvas.font='11px sans-serif';
  rCanvas.fillText('Advertised window (free):',12,90);
  rCanvas.fillStyle='#6ee7b7';
  rCanvas.fillRect(12,98,((MAX-state.buf)/MAX)*360,10);
}

setInterval(tick, 700);
logEv('handshake complete, streaming…','ok');
draw();