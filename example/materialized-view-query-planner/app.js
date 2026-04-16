const queries = [
  {
    title:'Monthly Sales Total',
    sql:'SELECT SUM(amount) FROM orders\nWHERE created_at > NOW() - \'30 days\'',
    noMv:[
      {op:'Aggregate',cost:1200},
      {op:'Filter: created_at>...',cost:1150},
      {op:'Seq Scan: orders (8.2M)',cost:1100}
    ],
    mv:[{op:'Index Scan: mv_monthly_sales',cost:4}],
    mvSize:'1 row', fresh:'1h old'
  },
  {
    title:'Top 10 Customers',
    sql:'SELECT customer_id, SUM(amount) total\nFROM orders GROUP BY customer_id\nORDER BY total DESC LIMIT 10',
    noMv:[
      {op:'Limit 10',cost:2400},
      {op:'Sort total DESC',cost:2380},
      {op:'HashAggregate',cost:2200},
      {op:'Seq Scan: orders (8.2M)',cost:1100}
    ],
    mv:[
      {op:'Limit 10',cost:12},
      {op:'Index Scan: mv_cust_totals',cost:10}
    ],
    mvSize:'40K rows', fresh:'15m old'
  },
  {
    title:'Join Orders × Customers',
    sql:'SELECT c.name, COUNT(*)\nFROM orders o JOIN customers c\nON o.cid=c.id GROUP BY c.name',
    noMv:[
      {op:'HashAggregate',cost:3600},
      {op:'Hash Join',cost:3400},
      {op:'Seq Scan: orders',cost:1100},
      {op:'Seq Scan: customers',cost:300}
    ],
    mv:[{op:'Seq Scan: mv_orders_by_cust',cost:40}],
    mvSize:'12K rows', fresh:'5m old'
  },
  {
    title:'Daily Active Users',
    sql:'SELECT day, COUNT(DISTINCT user_id)\nFROM events GROUP BY day',
    noMv:[
      {op:'GroupAggregate',cost:5200},
      {op:'Sort day',cost:4800},
      {op:'Seq Scan: events (120M)',cost:4200}
    ],
    mv:[{op:'Index Scan: mv_dau',cost:8}],
    mvSize:'365 rows', fresh:'1h old'
  }
];

let active = 0;

function renderList(){
  const list = document.getElementById('queryList');
  list.innerHTML = queries.map((q,i)=>`
    <div class="q ${i===active?'active':''}" data-i="${i}">
      <div class="title">${q.title}</div>
      <div>${q.sql.replace(/\n/g,'<br>')}</div>
    </div>`).join('');
  list.querySelectorAll('.q').forEach(el=>{
    el.onclick = ()=>{ active = +el.dataset.i; renderList(); renderPlans(); };
  });
}

function renderPlan(svgId, nodes){
  const svg = document.getElementById(svgId);
  const h = 50, gap = 60, startY = 20;
  let body = '';
  nodes.forEach((n,i)=>{
    const y = startY + i*gap;
    const color = n.cost > 1000 ? '#3b2a2a' : n.cost > 100 ? '#3b342a' : '#1f3b2a';
    const stroke = n.cost > 1000 ? '#fca5a5' : n.cost > 100 ? '#fbbf24' : '#6ee7b7';
    body += `<g class="node">
      <rect x="50" y="${y}" width="300" height="${h}" rx="6" fill="${color}" stroke="${stroke}"/>
      <text x="60" y="${y+20}">${n.op}</text>
      <text x="60" y="${y+38}" class="cost-lbl">cost=${n.cost.toLocaleString()}</text>
    </g>`;
    if(i<nodes.length-1){
      body += `<path class="edge" d="M200 ${y+h} L200 ${y+gap}" marker-end="url(#arr)"/>`;
    }
  });
  svg.innerHTML = `<defs><marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#6b7280"/></marker></defs>${body}`;
}

function renderPlans(){
  const q = queries[active];
  renderPlan('svgNoMv', q.noMv);
  renderPlan('svgMv', q.mv);
  const c1 = q.noMv[0].cost, c2 = q.mv[0].cost;
  document.getElementById('costNoMv').textContent = `cost=${c1.toLocaleString()}`;
  document.getElementById('costMv').textContent = `cost=${c2.toLocaleString()}`;
  document.getElementById('speedup').textContent = (c1/c2).toFixed(0)+'×';
  document.getElementById('mvSize').textContent = q.mvSize;
  document.getElementById('fresh').textContent = q.fresh;
}

renderList(); renderPlans();