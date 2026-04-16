let events=[], version=0;
const names={deposit:'Deposit',withdraw:'Withdrawal',interest:'Interest'};
const colors={deposit:'#6ee7b7',withdraw:'#f87171',interest:'#fbbf24'};

function applyEvents(evts){
  let bal=0,txCount=0;
  evts.forEach(e=>{
    if(e.type==='deposit') bal+=e.amount;
    else if(e.type==='withdraw') bal=Math.max(0,bal-e.amount);
    else if(e.type==='interest') bal+= +(bal*0.02).toFixed(2);
    txCount++;
  });
  return{bal,txCount};
}

function push(type,amount){events.push({type,amount,ts:new Date().toISOString().slice(11,19),v:++version});render();}

function doTx(type){
  const amt=parseFloat(document.getElementById('amt').value)||0;
  if(type==='interest') push('interest',0);
  else if(amt>0) push(type,amt);
}

function timeTravel(){if(events.length){events.pop();version++;render();}}

function render(){
  const{bal,txCount}=applyEvents(events);
  document.getElementById('balance').textContent='$'+bal.toFixed(2);
  document.getElementById('acctInfo').textContent=`${txCount} transactions · Event Store v${version}`;
  // ledger
  document.getElementById('ledger').innerHTML=events.slice().reverse().map(e=>{
    const cls=e.type==='deposit'?'dep':e.type==='withdraw'?'wit':'int';
    const sign=e.type==='withdraw'?'-':'+'
    const display=e.type==='interest'?'2% interest':`$${e.amount}`;
    return`<div class="row ${cls}"><span>${names[e.type]}</span><span class="amt">${sign}${display}</span><span class="ts">${e.ts}</span></div>`;
  }).join('');
  drawChart();
}

function drawChart(){
  const svg=document.getElementById('chart');
  const balances=[0];
  let b=0;
  events.forEach(e=>{
    if(e.type==='deposit')b+=e.amount;else if(e.type==='withdraw')b=Math.max(0,b-e.amount);else b+=+(b*0.02).toFixed(2);
    balances.push(b);
  });
  const max=Math.max(...balances,1), len=balances.length;
  const pts=balances.map((v,i)=>`${(i/(len-1||1))*780+10},${150-v/max*130}`).join(' ');
  const fill=pts+` 790,150 10,150`;
  svg.innerHTML=`<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6ee7b7" stop-opacity=".3"/><stop offset="100%" stop-color="#6ee7b7" stop-opacity="0"/></linearGradient></defs><polygon points="${fill}" fill="url(#g)"/><polyline points="${pts}" fill="none" stroke="#6ee7b7" stroke-width="2"/>`+
    balances.map((v,i)=>{const x=(i/(len-1||1))*780+10,y=150-v/max*130;return i===len-1?`<circle cx="${x}" cy="${y}" r="4" fill="#6ee7b7"/>`:''}).join('');
}

// seed data
[{t:'deposit',a:500},{t:'deposit',a:200},{t:'withdraw',a:80},{t:'interest',a:0},{t:'deposit',a:350},{t:'withdraw',a:120}]
  .forEach(d=>push(d.t,d.a));