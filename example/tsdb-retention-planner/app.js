const canvas=document.getElementById('barChart'),ctx=canvas.getContext('2d');
const els={ingest:document.getElementById('ingest'),rawDays:document.getElementById('rawDays'),dsDays:document.getElementById('dsDays'),
  ingestVal:document.getElementById('ingestVal'),rawVal:document.getElementById('rawVal'),dsVal:document.getElementById('dsVal')};

function resize(){canvas.width=canvas.clientWidth*devicePixelRatio;canvas.height=canvas.clientHeight*devicePixelRatio;ctx.scale(devicePixelRatio,devicePixelRatio)}
resize();window.onresize=()=>{resize();update()};

function fmt(gb){return gb>=1000?(gb/1000).toFixed(1)+' TB':gb.toFixed(1)+' GB'}
function cost(gb){return'$'+(gb*0.023).toFixed(2)+'/mo'}

function update(){
  const rate=+els.ingest.value,rawD=+els.rawDays.value,dsD=+els.dsDays.value;
  els.ingestVal.textContent=rate+'k pts/s';els.rawVal.textContent=rawD+'d';els.dsVal.textContent=dsD+'d';

  const bytesPerPt=16;
  const rawGB=rate*1000*86400*rawD*bytesPerPt/1e9;
  const dsGB=rate*1000*86400*dsD*bytesPerPt/1e9*0.05;
  const archGB=rate*1000*86400*365*bytesPerPt/1e9*0.01;
  const totalGB=rawGB+dsGB+archGB;

  const tiers=[
    {name:'Hot (Raw)',days:rawD+'d',gb:rawGB,color:'#6ee7b7',desc:'Full resolution, fastest queries'},
    {name:'Warm (5m avg)',days:dsD+'d',gb:dsGB,color:'#60a5fa',desc:'Downsampled to 5-min intervals'},
    {name:'Cold (1h avg)',days:'1y',gb:archGB,color:'#a78bfa',desc:'Hourly aggregates, long-term'}
  ];

  document.getElementById('tiers').innerHTML=tiers.map(t=>
    `<div class="tier" style="--c:${t.color}"><h4>${t.name}</h4><p>${t.desc}</p><p style="margin-top:4px">Retention: ${t.days}</p><div class="size">${fmt(t.gb)}</div><p>${cost(t.gb)}</p></div>`
  ).join('');

  document.getElementById('summary').innerHTML=
    [{l:'Total Storage',v:fmt(totalGB)},{l:'Monthly Cost',v:cost(totalGB)},{l:'Compression Ratio',v:'~8:1'},{l:'Points/day',v:(rate*1000*86400/1e9).toFixed(1)+'B'},{l:'Savings vs Raw-only',v:Math.round((1-totalGB/(rawGB/rawD*365+rawGB))*100)+'%'}]
    .map(r=>`<div class="row"><span>${r.l}</span><span class="v">${r.v}</span></div>`).join('');

  // bar chart
  const w=canvas.clientWidth,h=canvas.clientHeight,pad=40;
  ctx.clearRect(0,0,w,h);
  const maxV=Math.max(rawGB,dsGB,archGB)||1;
  tiers.forEach((t,i)=>{
    const bw=(w-pad*2)/tiers.length-20;
    const x=pad+i*(bw+20)+10;
    const bh=t.gb/maxV*(h-pad*2);
    const y=h-pad-bh;
    ctx.fillStyle=t.color+'33';ctx.fillRect(x,y,bw,bh);
    ctx.fillStyle=t.color;ctx.fillRect(x,y,bw,3);
    ctx.fillStyle='#94a3b8';ctx.font='11px sans-serif';ctx.textAlign='center';
    ctx.fillText(t.name.split('(')[0].trim(),x+bw/2,h-pad+14);
    ctx.fillStyle=t.color;ctx.fillText(fmt(t.gb),x+bw/2,y-6);
  });
}

[els.ingest,els.rawDays,els.dsDays].forEach(el=>el.oninput=update);
update();