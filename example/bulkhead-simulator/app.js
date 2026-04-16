const canvas=document.getElementById('ship'),ctx=canvas.getContext('2d');
const W=canvas.width,H=canvas.height;
const COMPS=6,compW=W/COMPS,wallY=100,floorY=340,waterMax=floorY-wallY;
let compartments=[];
function init(){compartments=Array.from({length:COMPS},(_,i)=>({x:i*compW,breached:false,level:0}));document.getElementById('status').textContent='All compartments sealed'}
init();
document.getElementById('resetBtn').onclick=init;
canvas.onclick=e=>{const r=canvas.getBoundingClientRect();const mx=(e.clientX-r.left)*(W/r.width);const my=(e.clientY-r.top)*(H/r.height);if(my>wallY&&my<floorY){const i=Math.floor(mx/compW);if(i>=0&&i<COMPS)compartments[i].breached=true}};
function update(){let breached=0;compartments.forEach(c=>{if(c.breached&&c.level<waterMax)c.level=Math.min(c.level+1.2,waterMax);if(c.breached)breached++});
document.getElementById('status').textContent=breached===0?'All compartments sealed':breached+' breached — '+(COMPS-breached)+' still sealed'}
function draw(){ctx.clearRect(0,0,W,H);
ctx.strokeStyle='#2d333b';ctx.lineWidth=2;ctx.strokeRect(10,wallY,W-20,floorY-wallY);
compartments.forEach((c,i)=>{if(c.level>0){ctx.fillStyle='rgba(30,100,200,0.45)';ctx.fillRect(c.x+2,floorY-c.level,compW-4,c.level)}
if(c.breached){ctx.fillStyle='rgba(255,80,80,0.15)';ctx.fillRect(c.x+2,wallY+1,compW-4,floorY-wallY-2)}});
for(let i=1;i<COMPS;i++){ctx.strokeStyle='#6ee7b7';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(i*compW,wallY);ctx.lineTo(i*compW,floorY);ctx.stroke()}
ctx.fillStyle='#8b949e';ctx.font='12px system-ui';compartments.forEach((c,i)=>{ctx.fillText('C'+(i+1),c.x+compW/2-8,floorY+20);if(c.breached){ctx.fillStyle='#ff6b6b';ctx.fillText('BREACH',c.x+compW/2-22,wallY-10);ctx.fillStyle='#8b949e'}})}
function loop(){update();draw();requestAnimationFrame(loop)}loop();