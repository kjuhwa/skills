const machines={
  'ab+c':{states:['S0','S1','S2','S3'],accept:['S3'],trans:{S0:{a:'S1'},S1:{b:'S2'},S2:{b:'S2',c:'S3'}},
    pos:{S0:{x:80,y:130},S1:{x:220,y:130},S2:{x:370,y:130},S3:{x:520,y:130}}},
  'a(b|c)d':{states:['S0','S1','S2','S3'],accept:['S3'],trans:{S0:{a:'S1'},S1:{b:'S2',c:'S2'},S2:{d:'S3'}},
    pos:{S0:{x:80,y:130},S1:{x:220,y:130},S2:{x:370,y:130},S3:{x:520,y:130}}},
  'ab?c':{states:['S0','S1','S2'],accept:['S2'],trans:{S0:{a:'S1'},S1:{b:'S1',c:'S2'}},
    pos:{S0:{x:120,y:130},S1:{x:320,y:130},S2:{x:500,y:130}}}
};
let cur,pos,m,inputStr;
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
function init(){
  m=machines[document.getElementById('pattern').value];
  inputStr=document.getElementById('input').value;cur=m.states[0];pos=-1;
  document.getElementById('result').textContent='';drawTape();draw();
}
function drawTape(){
  const t=document.getElementById('tape');t.innerHTML='';
  [...inputStr].forEach((ch,i)=>{
    const s=document.createElement('span');s.textContent=ch;
    if(i<pos)s.className='done';if(i===pos)s.className='active';t.appendChild(s);
  });
}
function draw(){
  ctx.clearRect(0,0,600,260);
  Object.entries(m.trans).forEach(([from,edges])=>{
    Object.entries(edges).forEach(([ch,to])=>{
      const a=m.pos[from],b=m.pos[to];
      if(from===to){
        ctx.beginPath();ctx.arc(a.x,a.y-34,16,0.3*Math.PI,2.7*Math.PI);
        ctx.strokeStyle=cur===from?'#6ee7b7':'#333';ctx.lineWidth=1.5;ctx.stroke();
        ctx.fillStyle='#6ee7b7';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText(ch,a.x,a.y-58);
        return;
      }
      const dx=b.x-a.x,dy=b.y-a.y,ln=Math.sqrt(dx*dx+dy*dy),ux=dx/ln,uy=dy/ln;
      const sx=a.x+ux*26,sy=a.y+uy*26,ex=b.x-ux*26,ey=b.y-uy*26;
      const active=cur===from;
      ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(ex,ey);
      ctx.strokeStyle=active?'#6ee7b7':'#333';ctx.lineWidth=active?2:1;ctx.stroke();
      const ang=Math.atan2(ey-sy,ex-sx);
      ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex-9*Math.cos(ang-.4),ey-9*Math.sin(ang-.4));
      ctx.lineTo(ex-9*Math.cos(ang+.4),ey-9*Math.sin(ang+.4));ctx.closePath();
      ctx.fillStyle=active?'#6ee7b7':'#333';ctx.fill();
      ctx.fillStyle='#c9d1d9';ctx.font='12px sans-serif';ctx.textAlign='center';
      ctx.fillText(ch,(sx+ex)/2+uy*14,(sy+ey)/2-ux*14);
    });
  });
  m.states.forEach(s=>{
    const p=m.pos[s],active=s===cur,acc=m.accept.includes(s);
    ctx.beginPath();ctx.arc(p.x,p.y,24,0,Math.PI*2);
    ctx.fillStyle=active?'#6ee7b722':'#1a1d27';ctx.fill();
    ctx.strokeStyle=active?'#6ee7b7':'#444';ctx.lineWidth=active?2.5:1;ctx.stroke();
    if(acc){ctx.beginPath();ctx.arc(p.x,p.y,20,0,Math.PI*2);ctx.strokeStyle=active?'#6ee7b7':'#444';ctx.lineWidth=1;ctx.stroke();}
    ctx.fillStyle=active?'#6ee7b7':'#c9d1d9';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s,p.x,p.y);
  });
}
document.getElementById('step').onclick=()=>{
  pos++;
  if(pos>=inputStr.length){
    document.getElementById('result').textContent=m.accept.includes(cur)?'✓ Match':'✗ No match';
    document.getElementById('result').style.color=m.accept.includes(cur)?'#6ee7b7':'#ff6b6b';
    drawTape();draw();return;
  }
  const ch=inputStr[pos],next=m.trans[cur]?.[ch];
  if(!next){
    document.getElementById('result').textContent='✗ Stuck';
    document.getElementById('result').style.color='#ff6b6b';drawTape();draw();return;
  }
  cur=next;drawTape();draw();
};
document.getElementById('reset').onclick=init;
document.getElementById('pattern').onchange=init;
document.getElementById('input').oninput=init;
init();