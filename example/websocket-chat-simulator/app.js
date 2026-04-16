const bots=[
  {name:'ada',color:'#6ee7b7',phrases:['anyone up for pair programming?','check this: ws.readyState === 1','frame masking still trips me up','backpressure handling is tricky']},
  {name:'linus',color:'#fbbf24',phrases:['binary frames are more efficient','you should use heartbeats','pong timeout = 30s minimum','close code 1006 again 😤']},
  {name:'grace',color:'#60a5fa',phrases:['STOMP over WS works beautifully','try socket.io fallback','reconnect with exponential backoff','subprotocols are underused']},
  {name:'alan',color:'#f472b6',phrases:['permessage-deflate is nice','watch out for proxy buffering','nginx upgrade headers?','compression ratio ~60% on JSON']}
];
const rooms={general:[],dev:[],random:[]};
let current='general';
const chat=document.getElementById('chat'),typing=document.getElementById('typing');
const roomTitle=document.getElementById('roomTitle'),usersEl=document.getElementById('users');

function render(){
  chat.innerHTML='';
  rooms[current].forEach(m=>{
    const d=document.createElement('div');d.className='msg '+m.cls;
    if(m.cls==='sys')d.innerHTML=`<div class="body">— ${m.text} —</div>`;
    else d.innerHTML=`<div class="meta"><b style="color:${m.color||'#6ee7b7'}">${m.name}</b>${m.time}</div><div class="body">${m.text}</div>`;
    chat.appendChild(d);
  });
  chat.scrollTop=chat.scrollHeight;
  roomTitle.textContent='# '+current;
  const b=document.getElementById('b-'+current);if(b){b.textContent='';b.classList.remove('show');}
}

function push(room,msg){
  rooms[room].push({time:new Date().toLocaleTimeString().slice(0,5),...msg});
  if(room===current)render();
  else{const b=document.getElementById('b-'+room);const c=rooms[room].filter(m=>m.cls!=='sys').length;b.textContent=c;b.classList.add('show');}
}

bots.forEach(b=>{
  const li=document.createElement('li');li.textContent=b.name;li.style.color=b.color;usersEl.appendChild(li);
});
push('general',{cls:'sys',text:'connection upgraded to WebSocket'});
push('general',{cls:'sys',text:'ada, linus, grace, alan joined'});

function botTalk(){
  const bot=bots[Math.floor(Math.random()*bots.length)];
  const room=Object.keys(rooms)[Math.floor(Math.random()*3)];
  typing.textContent=`${bot.name} is typing...`;
  setTimeout(()=>{
    typing.textContent='';
    push(room,{cls:'other',name:bot.name,color:bot.color,text:bot.phrases[Math.floor(Math.random()*bot.phrases.length)]});
  },800+Math.random()*1500);
  setTimeout(botTalk,3500+Math.random()*4000);
}
setTimeout(botTalk,2000);

document.getElementById('rooms').onclick=e=>{
  const li=e.target.closest('li');if(!li)return;
  document.querySelectorAll('#rooms li').forEach(x=>x.classList.remove('active'));
  li.classList.add('active');current=li.dataset.room;render();
};

document.getElementById('form').onsubmit=e=>{
  e.preventDefault();
  const inp=document.getElementById('input');const v=inp.value.trim();if(!v)return;
  push(current,{cls:'self',name:'you',color:'#fbbf24',text:v});
  inp.value='';
  setTimeout(()=>{
    const bot=bots[Math.floor(Math.random()*bots.length)];
    push(current,{cls:'other',name:bot.name,color:bot.color,text:bot.phrases[Math.floor(Math.random()*bot.phrases.length)]});
  },900+Math.random()*800);
};
render();