let tiers=[
  {name:'Raw',resolution:'1s',days:7,color:'#6ee7b7'},
  {name:'5m Avg',resolution:'5m',days:30,color:'#34d399'},
  {name:'1h Avg',resolution:'1h',days:365,color:'#059669'}
];
const resMultiplier={'1s':1,'5s':0.2,'1m':1/60,'5m':1/300,'1h':1/3600,'1d':1/86400};
const basePointsPerDay=86400;
function render(){renderTiers();renderBars();renderTimeline()}
function renderTiers(){
  const el=document.getElementById('tiers');el.innerHTML='';
  tiers.forEach((t,i)=>{
    const d=document.createElement('div');d.className='tier-row';
    d.innerHTML=`<label style="color:${t.color}">● ${t.name}</label>
      <select onchange="tiers[${i}].resolution=this.value;render()">${['1s','5s','1m','5m','1h','1d'].map(r=>`<option ${r===t.resolution?'selected':''}>${r}</option>`).join('')}</select>
      <input type="number" value="${t.days}" min="1" onchange="tiers[${i}].days=+this.value;render()"> days
      <span style="cursor:pointer;color:#f87171" onclick="tiers.splice(${i},1);render()">✕</span>`;
    el.appendChild(d)});
}
function storageGB(t){return(basePointsPerDay*(resMultiplier[t.resolution]||1)*t.days*24)/1e6}
function renderBars(){
  const svg=document.getElementById('barChart');
  const maxGB=Math.max(...tiers.map(storageGB),1);
  let html='';
  tiers.forEach((t,i)=>{
    const gb=storageGB(t),w=gb/maxGB*400,y=i*50+10;
    html+=`<rect x="80" y="${y}" width="${w}" height="30" rx="4" fill="${t.color}" opacity="0.8"/>
      <text x="75" y="${y+20}" text-anchor="end" fill="#8b949e" font-size="12">${t.name}</text>
      <text x="${85+w}" y="${y+20}" fill="#c9d1d9" font-size="12">${gb.toFixed(2)} GB</text>`;
  });
  svg.innerHTML=html;
  const totalGB=tiers.reduce((s,t)=>s+storageGB(t),0);
  document.getElementById('summary').textContent=`Total estimated storage: ${totalGB.toFixed(2)} GB | Cost ~$${(totalGB*0.023).toFixed(2)}/mo (S3 pricing)`;
}
function renderTimeline(){
  const svg=document.getElementById('timeline');let html='';
  const maxDays=Math.max(...tiers.map(t=>t.days),1);
  tiers.forEach((t,i)=>{
    const w=t.days/maxDays*800,y=i*22+5;
    html+=`<rect x="60" y="${y}" width="${w}" height="16" rx="3" fill="${t.color}" opacity="0.7"/>
      <text x="55" y="${y+12}" text-anchor="end" fill="#8b949e" font-size="11">${t.name}</text>
      <text x="${65+w}" y="${y+12}" fill="#c9d1d9" font-size="10">${t.days}d</text>`;
  });
  svg.innerHTML=html;
}
function addTier(){tiers.push({name:'Tier '+(tiers.length+1),resolution:'1h',days:90,color:'#047857'});render()}
render();