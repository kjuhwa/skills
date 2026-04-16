const canvas=document.getElementById('timeline'),ctx=canvas.getContext('2d');
const statusEl=document.getElementById('status'),counterEl=document.getElementById('counter');
const W=canvas.width=canvas.offsetWidth,H=260;
const MAX=120,THRESHOLD=4,TIMEOUT=15;
let data=[],state='closed',failures=0,cooldown=0,running=true,total=0;

document.getElementById('toggleAuto').onclick=function(){running=!running;this.textContent=running?'Pause':'Resume';};

function tick(){
  if(!running)return;
  total++;
  if(state==='open'){cooldown--;
    if(cooldown<=0){state='half-open';failures=0;}
    data.push({v:0,s:'open'});
  }else{
    const failRate=state==='half-open'?0.35:0.18;
    const ok=Math.random()>failRate;
    if(ok){
      data.push({v:30+Math.random()*60,s:state});
      if(state==='half-open'){state='closed';failures=0;}
    }else{
      failures++;data.push({v:-(20+Math.random()*30),s:state});
      if(failures>=THRESHOLD){state='open';cooldown=TIMEOUT;failures=0;}
    }
  }
  if(data.length>MAX)data.shift();
  updateUI();
}

function updateUI(){
  const cls=state==='half-open'?'half-open':state;
  statusEl.className='tag '+cls;statusEl.textContent=state==='half-open'?'HALF-OPEN':state.toUpperCase();
  counterEl.textContent=total+' requests';
}

function draw(){
  ctx.clearRect(0,0,W,H);
  const mid=H/2,bw=W/MAX;
  ctx.strokeStyle='#2a2d37';ctx.beginPath();ctx.moveTo(0,mid);ctx.lineTo(W,mid);ctx.stroke();
  data.forEach((d,i)=>{
    const x=i*bw,h=d.v*(mid-10)/100;
    let color='#6ee7b7';
    if(d.v<0)color='#f87171';
    if(d.s==='open')color='#fbbf24';
    ctx.fillStyle=color;
    if(d.v===0){ctx.fillRect(x,mid-1,bw-1,2);}
    else if(d.v>0){ctx.fillRect(x,mid-h,bw-1,h);}
    else{ctx.fillRect(x,mid,bw-1,-h);}
  });
  // threshold line
  ctx.strokeStyle='#f8717166';ctx.setLineDash([4,4]);
  ctx.beginPath();ctx.moveTo(0,mid+30);ctx.lineTo(W,mid+30);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#f8717188';ctx.font='10px Segoe UI';ctx.fillText('failure threshold',8,mid+26);
  requestAnimationFrame(draw);
}

setInterval(tick,400);
draw();