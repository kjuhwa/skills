const BLOOM_SIZE=256,K=3;
let bloomBits=new Uint8Array(BLOOM_SIZE),hashSet=new Set(),added=[],counter=0;
const bc=document.getElementById('bloomCanvas'),hc=document.getElementById('hashCanvas');
const bx=bc.getContext('2d'),hx=hc.getContext('2d');
const log=document.getElementById('log');

function initCanvas(c){c.width=c.clientWidth*devicePixelRatio;c.height=120*devicePixelRatio;c.getContext('2d').scale(devicePixelRatio,devicePixelRatio)}
function resizeAll(){initCanvas(bc);initCanvas(hc);drawAll()}
resizeAll();window.addEventListener('resize',resizeAll);

function djb2(s,seed){let h=seed;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;return h%BLOOM_SIZE}
function bloomAdd(s){for(let i=0;i<K;i++)bloomBits[djb2(s,i*131)]=1}
function bloomCheck(s){for(let i=0;i<K;i++)if(!bloomBits[djb2(s,i*131)])return false;return true}

function drawBits(cx,w){
  cx.clearRect(0,0,w,120);
  const cols=32,rows=BLOOM_SIZE/cols,cw=(w-8)/cols,ch=10;
  for(let i=0;i<BLOOM_SIZE;i++){
    const c=i%cols,r=Math.floor(i/cols),x=4+c*cw,y=4+r*(ch+2);
    cx.fillStyle=bloomBits[i]?'#6ee7b7':'#1e2233';
    cx.fillRect(x,y,cw-1,ch);
  }
}
function drawHash(cx,w){
  cx.clearRect(0,0,w,120);
  const total=hashSet.size,maxBar=500;
  const bh=14,y1=20,y2=50,y3=80;
  cx.fillStyle='#1e2233';cx.fillRect(4,y1,w-8,bh);cx.fillRect(4,y2,w-8,bh);cx.fillRect(4,y3,w-8,bh);
  const frac=Math.min(total/maxBar,1);
  cx.fillStyle='#6ee7b7';cx.fillRect(4,y1,(w-8)*frac,bh);
  cx.fillStyle='#8892a8';cx.font='11px sans-serif';
  cx.fillText('Items: '+total,6,y1-4);
  const mem=total*40;
  cx.fillText('Memory: ~'+mem+'B',6,y2-4);
  cx.fillStyle='#3b8268';cx.fillRect(4,y2,(w-8)*Math.min(mem/10000,1),bh);
  ctx_label(cx,'100% accurate (always)',6,y3-4);
  cx.fillStyle='#6ee7b7';cx.fillRect(4,y3,w-8,bh);
}
function ctx_label(cx,t,x,y){cx.fillStyle='#8892a8';cx.font='11px sans-serif';cx.fillText(t,x,y)}

function drawAll(){drawBits(bx,bc.clientWidth);drawHash(hx,hc.clientWidth);updateStats()}
function updateStats(){
  const set=bloomBits.reduce((a,b)=>a+b,0);
  document.getElementById('bloomMem').textContent=Math.ceil(BLOOM_SIZE/8);
  document.getElementById('hashMem').textContent='~'+(hashSet.size*40);
  const fp=1-Math.pow(1-set/BLOOM_SIZE,K);
  document.getElementById('bloomAcc').textContent=(100-fp*100).toFixed(1);
  document.getElementById('hashAcc').textContent='100';
}

function addItems(n){
  for(let i=0;i<n;i++){const w='item_'+(counter++);bloomAdd(w);hashSet.add(w);added.push(w)}
  appendLog(`Added ${n} items (total: ${counter})`);drawAll();
}
function testLookups(){
  let fp=0,total=50;
  for(let i=0;i<total;i++){
    const w='test_query_'+Math.random().toString(36).slice(2,8);
    const inBloom=bloomCheck(w),inHash=hashSet.has(w);
    if(inBloom&&!inHash)fp++;
  }
  appendLog(`Tested ${total}: Bloom false positives = ${fp} (${(fp/total*100).toFixed(0)}%), HashSet = 0`);
}
function reset(){bloomBits.fill(0);hashSet.clear();added=[];counter=0;log.innerHTML='';appendLog('Reset');drawAll()}
function appendLog(msg){log.innerHTML+=`<div>${msg}</div>`;log.scrollTop=log.scrollHeight}

document.getElementById('add10').onclick=()=>addItems(10);
document.getElementById('add100').onclick=()=>addItems(100);
document.getElementById('test').onclick=testLookups;
document.getElementById('resetBtn').onclick=reset;

addItems(20);testLookups();