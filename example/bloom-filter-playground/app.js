const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');
const sizeRange = document.getElementById('sizeRange');
const hashRange = document.getElementById('hashRange');
const sizeVal = document.getElementById('sizeVal');
const hashVal = document.getElementById('hashVal');

function resize(){canvas.width=canvas.clientWidth*devicePixelRatio;canvas.height=300*devicePixelRatio;canvas.style.height='300px';ctx.scale(devicePixelRatio,devicePixelRatio)}
resize(); window.addEventListener('resize',()=>{resize();if(lastData)drawChart(lastData)});

sizeRange.oninput=()=>sizeVal.textContent=sizeRange.value;
hashRange.oninput=()=>hashVal.textContent=hashRange.value;

function fnvHash(s,seed){let h=seed^0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=(h*0x01000193)>>>0}return h}
function getIdx(s,k,m){const res=[];for(let i=0;i<k;i++)res.push(fnvHash(s,i*997)%m);return res}

let lastData=null;
function simulate(){
  const m=+sizeRange.value, k=+hashRange.value;
  const bits=new Uint8Array(m), added=new Set(), data=[];
  const total=200, checkPer=400;
  for(let n=1;n<=total;n++){
    const w='item_'+n;
    getIdx(w,k,m).forEach(i=>bits[i]=1);
    added.add(w);
    let fp=0;
    for(let c=0;c<checkPer;c++){
      const t='test_'+n+'_'+c;
      if(!added.has(t)&&getIdx(t,k,m).every(i=>bits[i]))fp++;
    }
    const measured=fp/checkPer;
    const theory=Math.pow(1-Math.exp(-k*n/m),k);
    data.push({n,measured,theory});
  }
  lastData=data;
  animateChart(data);
}

let animFrame=0;
function animateChart(data){
  animFrame=0;
  const step=()=>{animFrame=Math.min(animFrame+4,data.length);drawChart(data.slice(0,animFrame));if(animFrame<data.length)requestAnimationFrame(step)};
  step();
}

function drawChart(data){
  const w=canvas.clientWidth,h=300,pad={t:20,r:20,b:40,l:50};
  const pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
  ctx.clearRect(0,0,w,h);
  ctx.strokeStyle='#2d3348';ctx.lineWidth=1;
  for(let i=0;i<=4;i++){
    const y=pad.t+ph*(1-i/4);
    ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();
    ctx.fillStyle='#6b7280';ctx.font='11px sans-serif';ctx.textAlign='right';
    ctx.fillText((i*25)+'%',pad.l-6,y+4);
  }
  ctx.textAlign='center';
  ctx.fillText('Items inserted →',w/2,h-6);
  const maxN=200;
  function line(arr,key,color){
    ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=2;
    arr.forEach((d,i)=>{const x=pad.l+(d.n/maxN)*pw,y=pad.t+ph*(1-Math.min(d[key],1));i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
    ctx.stroke();
  }
  line(data,'measured','#6ee7b7');
  line(data,'theory','#f59e0b');
}

document.getElementById('runBtn').onclick=simulate;
simulate();