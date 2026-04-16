const versions=["v1","v2","v3","v4","v5","v6"];
const compat=[
  [2,2,1,0,0,0],
  [2,2,2,1,0,0],
  [1,2,2,2,1,0],
  [0,1,2,2,2,1],
  [0,0,1,2,2,2],
  [0,0,0,1,2,2]
];
const notes={
  "0":"Incompatible — field removals and type changes prevent deserialization.",
  "1":"Partial — readable with defaults; some fields will be null or use fallback values.",
  "2":"Fully compatible — all fields map correctly between versions."
};
const colors=["#f0506060","#f0c040","#6ee7b7"];
const n=versions.length,cell=56,pad=60;
const svg=document.getElementById("matrix"),info=document.getElementById("info");
const w=pad+n*cell,h=pad+n*cell;
svg.setAttribute("width",w);svg.setAttribute("height",h);svg.setAttribute("viewBox",`0 0 ${w} ${h}`);
let els="";
versions.forEach((v,i)=>{
  els+=`<text x="${pad+i*cell+cell/2}" y="${pad-10}" text-anchor="middle" fill="#6ee7b7" font-size="12">${v}</text>`;
  els+=`<text x="${pad-10}" y="${pad+i*cell+cell/2+4}" text-anchor="end" fill="#6ee7b7" font-size="12">${v}</text>`;
});
versions.forEach((_,r)=>{versions.forEach((_,c)=>{
  const v=compat[r][c],x=pad+c*cell,y=pad+r*cell;
  els+=`<rect x="${x}" y="${y}" width="${cell-2}" height="${cell-2}" rx="4" fill="${colors[v]}" opacity="0.85" data-r="${r}" data-c="${c}" style="cursor:pointer"/>`;
  const label=v===2?"✓":v===1?"~":"✗";
  els+=`<text x="${x+cell/2-1}" y="${y+cell/2+4}" text-anchor="middle" fill="#0f1117" font-size="14" font-weight="bold" pointer-events="none">${label}</text>`;
})});
els+=`<text x="${w/2}" y="${h+18}" text-anchor="middle" fill="#555" font-size="11">Writer version →</text>`;
svg.innerHTML=els;
info.innerHTML="Hover a cell to see compatibility details.";
svg.addEventListener("mouseover",e=>{
  const t=e.target;if(t.tagName==="rect"&&t.dataset.r!==undefined){
    const r=+t.dataset.r,c=+t.dataset.c,v=compat[r][c];
    info.innerHTML=`<b>Reader ${versions[r]}</b> ← <b>Writer ${versions[c]}</b>: ${notes[v]}`}
});