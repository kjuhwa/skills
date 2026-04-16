const queries=[
  {base:"SELECT date_trunc('day', created_at) AS day,\n       SUM(amount) AS revenue,\n       COUNT(*) AS orders\nFROM   orders\nJOIN   line_items USING (order_id)\nWHERE  created_at >= now() - interval '30 days'\nGROUP  BY 1\nORDER  BY 1;",
   mv:"SELECT day, revenue, orders\nFROM   mv_daily_revenue\nWHERE  day >= now() - interval '30 days'\nORDER  BY 1;",
   cols:['day','revenue','orders'],
   gen:()=>Array.from({length:12},(_,i)=>{const d=new Date();d.setDate(d.getDate()-11+i);return[d.toISOString().slice(0,10),'$'+(8000+Math.random()*4000|0).toLocaleString(),(120+Math.random()*80|0)+'']})},
  {base:"SELECT p.category,\n       p.name,\n       SUM(li.qty) AS sold\nFROM   products p\nJOIN   line_items li ON li.product_id = p.id\nGROUP  BY 1,2\nORDER  BY sold DESC\nLIMIT  10;",
   mv:"SELECT category, name, sold\nFROM   mv_top_products\nLIMIT  10;",
   cols:['category','name','sold'],
   gen:()=>{const cats=['Electronics','Apparel','Home','Books','Sports'];const names=['Widget','Gadget','Pro Kit','Bundle','Starter'];return Array.from({length:10},(_,i)=>[cats[i%5],names[i%5]+' '+(i+1),(900-i*70+Math.random()*30|0)+''])}},
];
let qi=0,baseTime=0,mvTime=0;
const baseSql=document.getElementById('baseSql'),mvSql=document.getElementById('mvSql'),baseResult=document.getElementById('baseResult'),mvResult=document.getElementById('mvResult'),compare=document.getElementById('compare'),runBase=document.getElementById('runBase'),runMv=document.getElementById('runMv');
function load(){const q=queries[qi];baseSql.textContent=q.base;mvSql.textContent=q.mv;baseResult.innerHTML='';mvResult.innerHTML='';compare.innerHTML='Click both Run buttons, then compare.';baseTime=0;mvTime=0}
function renderTable(cols,rows,ms,isFast){
  let h=`<table><tr>${cols.map(c=>'<th>'+c+'</th>').join('')}</tr>${rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')}</table>`;
  h+=`<div class="timing ${isFast?'fast':'slow'}">⏱ ${ms}ms &middot; ${rows.length} rows &middot; ${isFast?'✓ fast':'⚠ slow'}</div>`;return h;
}
function showCompare(){
  if(!baseTime||!mvTime)return;
  const speedup=(baseTime/mvTime).toFixed(1);
  const maxH=90,bH=90,mH=mvTime/baseTime*90;
  compare.innerHTML=`<b style="color:#6ee7b7">${speedup}× faster</b> with materialized view
<div class="bar-chart"><div class="bar-col"><div class="bar" style="height:${bH}px;background:#ef4444"></div><span>Base ${baseTime}ms</span></div>
<div class="bar-col"><div class="bar" style="height:${mH}px;background:#6ee7b7"></div><span>MV ${mvTime}ms</span></div></div>`;
}
runBase.onclick=()=>{runBase.disabled=true;baseResult.innerHTML='<span style="color:#888">Scanning 80K rows…</span>';
  baseTime=800+Math.random()*1200|0;const q=queries[qi];
  setTimeout(()=>{baseResult.innerHTML=renderTable(q.cols,q.gen(),baseTime,false);runBase.disabled=false;showCompare()},1200)};
runMv.onclick=()=>{runMv.disabled=true;mvResult.innerHTML='<span style="color:#888">Index lookup…</span>';
  mvTime=2+Math.random()*15|0;const q=queries[qi];
  setTimeout(()=>{mvResult.innerHTML=renderTable(q.cols,q.gen(),mvTime,true);runMv.disabled=false;showCompare()},150)};
load();setInterval(()=>{qi=(qi+1)%queries.length;load()},25000);