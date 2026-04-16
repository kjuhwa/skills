const cmdPrefixes=['create','update','delete','remove','set','add','insert','post','put','patch','save','send','execute','run','process','approve','reject'];
const qryPrefixes=['get','fetch','find','list','search','count','check','is','has','read','load','query','select','show','lookup'];
let cmds=[],qrys=[];

function isCommand(name){const l=name.toLowerCase();return cmdPrefixes.some(p=>l.startsWith(p));}

function classify(val){
  const inp=document.getElementById('inp');
  const name=(val||inp.value||'').trim();if(!name)return;inp.value='';
  const isCmd=isCommand(name);
  if(isCmd){cmds.push(name);addItem('cmdCol',name,'item-cmd');}
  else{qrys.push(name);addItem('qryCol',name,'item-qry');}
  document.getElementById('cmdN').textContent=cmds.length;
  document.getElementById('qryN').textContent=qrys.length;
  drawBar();
}

function addItem(colId,name,cls){
  const d=document.createElement('div');d.className='item '+cls;d.textContent=name;
  document.getElementById(colId).appendChild(d);
}

function drawBar(){
  const svg=document.getElementById('svg');const t=cmds.length+qrys.length;if(!t)return;
  const cp=(cmds.length/t*100).toFixed(1),qp=(qrys.length/t*100).toFixed(1);
  svg.innerHTML=`<rect x="0" y="10" width="${cp}%" height="24" rx="4" fill="#f97583" opacity="0.7"/>
  <rect x="${cp}%" y="10" width="${qp}%" height="24" rx="4" fill="#79c0ff" opacity="0.7"/>
  <text x="10" y="56" fill="#8b949e" font-size="11" font-family="monospace">Commands ${cp}% | Queries ${qp}%</text>`;
}

document.getElementById('inp').addEventListener('keydown',e=>{if(e.key==='Enter')classify();});

const mock=['getUser','createOrder','deleteItem','fetchProducts','updateProfile','listCategories','processPayment','searchLogs','removeSession','countViews','setConfig','isActive','sendEmail','loadDashboard','approveRequest'];
mock.forEach((m,i)=>setTimeout(()=>classify(m),i*300));