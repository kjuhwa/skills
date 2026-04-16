const jobData=[
  {name:'User Events → Warehouse',src:'Kafka',dest:'BigQuery',rows:84200,status:'running',pct:67,dur:'4m 12s'},
  {name:'Product Catalog Sync',src:'PostgreSQL',dest:'Elasticsearch',rows:12450,status:'running',pct:89,dur:'1m 48s'},
  {name:'Clickstream Aggregation',src:'S3 Parquet',dest:'Redshift',rows:241000,status:'done',pct:100,dur:'12m 03s'},
  {name:'CRM Contact Import',src:'REST API',dest:'MongoDB',rows:5600,status:'failed',pct:34,dur:'0m 52s'},
  {name:'Financial Reconciliation',src:'SFTP CSV',dest:'Snowflake',rows:0,status:'queued',pct:0,dur:'—'},
  {name:'IoT Sensor Rollup',src:'MQTT',dest:'TimescaleDB',rows:389000,status:'done',pct:100,dur:'8m 37s'}
];

const colors={running:'#6ee7b7',done:'#3b82f6',failed:'#ef4444',queued:'#f59e0b'};

function renderStats(){
  const s=document.getElementById('stats');
  const total=jobData.length,run=jobData.filter(j=>j.status==='running').length;
  const done=jobData.filter(j=>j.status==='done').length,fail=jobData.filter(j=>j.status==='failed').length;
  const totalRows=jobData.reduce((a,j)=>a+j.rows,0);
  s.innerHTML=[
    {v:total,l:'Total Jobs'},{v:run,l:'Running'},{v:done,l:'Completed'},{v:totalRows.toLocaleString(),l:'Rows Processed'}
  ].map(d=>`<div class="stat"><div class="val">${d.v}</div><div class="lbl">${d.l}</div></div>`).join('');
}

function renderJobs(){
  const c=document.getElementById('jobs');
  c.innerHTML=jobData.map(j=>`<div class="job">
    <div><div class="job-name">${j.name}</div><div class="job-meta">${j.src} → ${j.dest} · ${j.rows.toLocaleString()} rows · ${j.dur}</div></div>
    <div class="badge ${j.status}">${j.status}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${j.pct}%;background:${colors[j.status]}"></div></div>
  </div>`).join('');
}

function tick(){
  jobData.forEach(j=>{
    if(j.status==='running'&&j.pct<100){j.pct=Math.min(100,j.pct+Math.random()*3);j.rows+=Math.floor(Math.random()*800);if(j.pct>=100)j.status='done'}
    if(j.status==='queued'&&Math.random()>.92){j.status='running'}
  });
  renderStats();renderJobs();
}

renderStats();renderJobs();setInterval(tick,800);