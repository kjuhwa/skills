const db=document.getElementById('dbLane'),outbox=document.getElementById('outboxLane'),broker=document.getElementById('brokerLane');
const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
let orderId=0,autoMode=false,autoTimer=null,particles=[];
const types=['OrderCreated','PaymentProcessed','ItemShipped','UserRegistered'];
function resize(){canvas.width=innerWidth;canvas.height=innerHeight}
resize();window.addEventListener('resize',resize);

function addOrder(){
  const id=++orderId,type=types[Math.floor(Math.random()*types.length)];
  const ts=new Date().toLocaleTimeString();
  appendItem(db,`Order #${id}`,`${type} @ ${ts}`);
  setTimeout(()=>{
    const el=appendItem(outbox,`MSG-${id}`,`${type} | pending`);
    el.dataset.id=id;el.dataset.type=type;el.dataset.ts=ts;
    spawnParticle(innerWidth/3,60);
  },300);
}

function appendItem(lane,title,meta){
  const d=document.createElement('div');d.className='item';
  d.innerHTML=`<div class="id">${title}</div><div class="meta">${meta}</div>`;
  lane.prepend(d);return d;
}

function pollOutbox(){
  const items=outbox.querySelectorAll('.item');
  if(!items.length)return;
  const el=items[items.length-1];
  el.classList.add('processing');
  setTimeout(()=>{
    appendItem(broker,`EVT-${el.dataset.id}`,`${el.dataset.type} | delivered`);
    el.remove();
    spawnParticle(2*innerWidth/3,60);
  },500);
}

function spawnParticle(x,y){
  for(let i=0;i<6;i++) particles.push({x,y,vx:(Math.random()-.5)*3,vy:Math.random()*2+1,life:1});
}

function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  particles=particles.filter(p=>{
    p.x+=p.vx;p.y+=p.vy;p.life-=0.02;
    if(p.life<=0)return false;
    ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);
    ctx.fillStyle=`rgba(110,231,183,${p.life})`;ctx.fill();
    return true;
  });
  requestAnimationFrame(animate);
}
animate();

document.getElementById('addOrder').onclick=addOrder;
document.getElementById('pollOutbox').onclick=pollOutbox;
document.getElementById('toggleAuto').onclick=function(){
  autoMode=!autoMode;this.textContent=`Auto-Poll: ${autoMode?'ON':'OFF'}`;
  this.classList.toggle('active',autoMode);
  if(autoMode)autoTimer=setInterval(pollOutbox,1200);
  else clearInterval(autoTimer);
};

for(let i=0;i<5;i++) setTimeout(addOrder,i*200);