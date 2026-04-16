const cv=document.getElementById('c'),cx=cv.getContext('2d');
let leakRate=5,queueMax=20,trafficRate=8,queue=[],processed=0,dropped=0,drips=[];
const bind=(id,cb)=>{const el=document.getElementById(id);el.oninput=e=>{cb(+e.target.value);document.getElementById(id+'V').textContent=e.target.value}};
bind('leak',v=>leakRate=v);bind('qsize',v=>queueMax=v);bind('traffic',v=>trafficRate=v);
document.getElementById('dropBtn').onclick=()=>enqueue();
function enqueue(){if(queue.length<queueMax){queue.push({t:Date.now()});return true}dropped++;return false}
setInterval(()=>{const n=Math.random()*trafficRate/10;for(let i=0;i<n;i++)enqueue()},100);
setInterval(()=>{const n=Math.min(queue.length,Math.ceil(leakRate/10));for(let i=0;i<n;i++){const req=queue.shift();processed++;const lat=Date.now()-req.t;drips.push({x:580,y:220,vy:2+Math.random(),life:1,lat})}},100);
function draw(){cx.clearRect(0,0,800,340);
const bx=300,by=40,bw=120,bh=200;
cx.strokeStyle='#6ee7b7';cx.lineWidth=2;
cx.beginPath();cx.moveTo(bx,by);cx.lineTo(bx,by+bh);cx.lineTo(bx+bw,by+bh);cx.lineTo(bx+bw,by);cx.stroke();
const fill=queue.length/queueMax;const fh=bh*fill;
const fc=fill>.9?'rgba(248,113,113,0.35)':fill>.6?'rgba(251,191,36,0.3)':'rgba(110,231,183,0.25)';
cx.fillStyle=fc;cx.fillRect(bx+2,by+bh-fh,bw-4,fh);
for(let i=0;i<queue.length&&i<queueMax;i++){const row=Math.floor(i/6),col=i%6;cx.fillStyle='#6ee7b7';cx.beginPath();cx.arc(bx+15+col*18,by+bh-12-row*18,6,0,Math.PI*2);cx.fill()}
cx.fillStyle='#94a3b8';cx.font='12px system-ui';cx.textAlign='center';cx.fillText(`${queue.length}/${queueMax}`,bx+bw/2,by+bh+18);
cx.fillText('▼ leak',bx+bw/2,by+bh+36);
// incoming arrows
cx.strokeStyle='#6ee7b7';cx.setLineDash([4,4]);cx.beginPath();cx.moveTo(160,by+bh/2);cx.lineTo(bx-10,by+bh/2);cx.stroke();cx.setLineDash([]);
cx.fillStyle='#6ee7b7';cx.fillText('incoming traffic',180,by+bh/2-12);
// drips
drips=drips.filter(d=>{d.y+=d.vy;d.life-=.015;cx.beginPath();cx.arc(d.x,d.y,3,0,Math.PI*2);cx.fillStyle=`rgba(110,231,183,${d.life})`;cx.fill();return d.life>0&&d.y<340});
// outgoing
cx.strokeStyle='#6ee7b7';cx.setLineDash([4,4]);cx.beginPath();cx.moveTo(bx+bw+10,by+bh+30);cx.lineTo(bx+bw+120,by+bh+30);cx.stroke();cx.setLineDash([]);
cx.fillText('processed →',bx+bw+70,by+bh+24);
// stats
document.getElementById('queued').textContent=queue.length;
document.getElementById('processed').textContent=processed;
document.getElementById('dropped').textContent=dropped;
const avgLat=drips.length?Math.round(drips.reduce((s,d)=>s+d.lat,0)/drips.length):0;
document.getElementById('latency').textContent=avgLat;
requestAnimationFrame(draw)}
draw();