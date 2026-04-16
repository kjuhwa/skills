const users = [
  { name: 'Alice', color: '#6ee7b7' }, { name: 'Bob', color: '#7dd3fc' },
  { name: 'Carol', color: '#fbbf24' }, { name: 'Dave', color: '#f472b6' }
];
const botMessages = {
  general: ['Hey everyone!', 'Anyone seen the new release?', 'LGTM 👍', 'Deploying now...', 'Looks good to me', 'brb lunch'],
  random: ['Check this out', '😂😂😂', 'TIL websockets use HTTP upgrade', 'Nice', 'Has anyone tried Bun?', 'lol'],
  dev: ['PR merged', 'CI is green', 'Fixed the flaky test', 'Rebasing now', 'Can someone review #42?', 'Types look off']
};
let channel = 'general';
const history = { general: [], random: [], dev: [] };
const msgs = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('msg');

function timeStr() { const d = new Date(); return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0'); }

function render() {
  msgs.innerHTML = '';
  history[channel].forEach(m => {
    const div = document.createElement('div'); div.className = 'msg';
    div.innerHTML = `<div class="meta"><span class="name" style="color:${m.color}">${m.name}</span><span class="time">${m.time}</span></div><div class="body">${m.text}</div>`;
    msgs.appendChild(div);
  });
  msgs.scrollTop = msgs.scrollHeight;
}

function addMsg(ch, name, color, text) {
  history[ch].push({ name, color, text, time: timeStr() });
  if (history[ch].length > 80) history[ch].shift();
  if (ch === channel) render();
}

document.querySelectorAll('.ch').forEach(el => {
  el.onclick = () => {
    document.querySelectorAll('.ch').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
    channel = el.dataset.ch;
    document.getElementById('header').textContent = '# ' + channel;
    render();
  };
});

form.onsubmit = e => {
  e.preventDefault();
  const text = input.value.trim(); if (!text) return;
  addMsg(channel, 'You', '#6ee7b7', text); input.value = '';
  setTimeout(() => {
    const u = users[Math.floor(Math.random() * users.length)];
    const pool = botMessages[channel];
    addMsg(channel, u.name, u.color, pool[Math.floor(Math.random() * pool.length)]);
  }, 600 + Math.random() * 1400);
};

function botTick() {
  const chs = ['general', 'random', 'dev'];
  const ch = chs[Math.floor(Math.random() * chs.length)];
  const u = users[Math.floor(Math.random() * users.length)];
  const pool = botMessages[ch];
  addMsg(ch, u.name, u.color, pool[Math.floor(Math.random() * pool.length)]);
}
setInterval(botTick, 3000 + Math.random() * 4000);
for (let i = 0; i < 5; i++) botTick();
render();