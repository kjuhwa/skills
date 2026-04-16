const logEl=document.getElementById('log'),resEl=document.getElementById('response');
const chart=document.getElementById('chart'),cctx=chart.getContext('2d');
const microservices=['User','Product','Cart','Recommend'];
const latencies={web:[],mobile:[]};
const mockData={User:{name:'Alex',tier:'premium'},Product:{items:12,featured:'Widget X'},Cart:{count:3,total:'$87'},Recommend:{picks:['A','B','C']}};

function rand(a,b){return Math.floor(Math.random()*(b-a)+a)}

function sendRequest(type){
  const start=performance.now();
  const called=type==='web'?microservices:microservices.slice(0,2);
  const tag=`<span class="tag ${type}">${type}</span>`;
  logEl.innerHTML=tag+`BFF aggregating ${called.length} services...`+'<br>'+logEl.innerHTML;
  let done=0;const results={};
  called.forEach((svc,i)=>{
    const delay=rand(40,180);
    setTimeout(()=>{
      results[svc]=mockData[svc];done++;
      logEl.innerHTML=tag+`${svc} → ${delay}ms`+'<br>'+logEl.innerHTML;
      if(done===called.length){
        const total=Math.round(performance.now()-start);
        latencies[type].push(total);if(latencies[type].length>20)latencies[type].shift();
        resEl.innerHTML=`<div class="entry">${tag}<strong>${total}ms total</strong><pre style="font-size:.7rem;color:#94a3b8;margin-top:4px">${JSON.stringify(results,null,1)}</pre></div>`+resEl.innerHTML;
        drawChart();
      }
    },delay);
  });
}

function drawChart(){
  cctx.clearRect(0,0,220,200);
  const avg=t=>t.length?Math.round(t.reduce((a,b)=>a+b,0)/t.length):0;
  const wA=avg(latencies.web),mA=avg(latencies.mobile),max=Math.max(wA,mA,1);
  [{v:wA,c:'#60a5fa',x:55,l:'Web'},{v:mA,c:'#f472b6',x:135,l:'Mobile'}].forEach(b=>{
    const h=(b.v/max)*130;
    cctx.fillStyle=b.c+'66';cctx.fillRect(b.x-20,170-h,40,h);
    cctx.fillStyle=b.c;cctx.font='bold 13px system-ui';cctx.textAlign='center';
    cctx.fillText(b.v+'ms',b.x,165-h);cctx.fillStyle='#94a3b8';cctx.font='11px system-ui';
    cctx.fillText(b.l,b.x,188);
  });
}
function clearLog(){logEl.innerHTML='';resEl.innerHTML='';latencies.web=[];latencies.mobile=[];drawChart()}
drawChart();