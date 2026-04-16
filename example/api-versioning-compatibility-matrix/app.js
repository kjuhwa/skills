const versions=["v1.0","v1.1","v2.0","v2.1","v3.0","v3.1","v4.0"];
const endpoints=["GET /users","POST /users","GET /orders","PUT /orders/{id}","DELETE /orders/{id}","GET /products","POST /search","GET /analytics","PATCH /settings","POST /webhooks"];
const notes={
  breaking:["Response schema changed, fields renamed","Auth mechanism switched from API key to OAuth2","Pagination switched from offset to cursor","Removed field 'legacy_id' from response","Request body format changed to JSON:API"],
  partial:["New required header X-Api-Version added","Optional field became recommended","Response includes additional nested object","Rate limit headers changed format"]
};
function genMatrix(){
  const m=[];
  for(let e=0;e<endpoints.length;e++){
    const row=[];
    for(let v=0;v<versions.length;v++){
      if(v===0){row.push("compat");continue}
      const r=Math.random();
      const prev=row[v-1];
      if(prev==="na"){row.push("na");continue}
      if(r<0.55)row.push("compat");
      else if(r<0.8)row.push("partial");
      else if(r<0.93)row.push("breaking");
      else row.push("na");
    }
    m.push(row);
  }
  return m;
}
const matrix=genMatrix();
function render(){
  let html="<table><tr><th></th>";
  versions.forEach(v=>{html+=`<th class="ver-header">${v}</th>`});
  html+="</tr>";
  endpoints.forEach((ep,ei)=>{
    html+=`<tr><th>${ep}</th>`;
    versions.forEach((v,vi)=>{
      const s=matrix[ei][vi];
      const label=s==="compat"?"✓":s==="partial"?"~":s==="breaking"?"✗":"—";
      html+=`<td class="${s}" data-ep="${ei}" data-ver="${vi}">${label}</td>`;
    });
    html+="</tr>";
  });
  html+="</table>";
  document.getElementById("matrix").innerHTML=html;
  document.querySelectorAll("td:not(.na)").forEach(td=>{
    td.addEventListener("mouseenter",showTip);
    td.addEventListener("mouseleave",hideTip);
  });
}
function showTip(e){
  const el=e.target,s=matrix[el.dataset.ep][el.dataset.ver];
  if(s==="na")return;
  const ep=endpoints[el.dataset.ep],ver=versions[el.dataset.ver];
  let detail="Fully backward compatible. No changes needed.";
  if(s==="partial")detail=notes.partial[Math.floor(Math.random()*notes.partial.length)];
  if(s==="breaking")detail=notes.breaking[Math.floor(Math.random()*notes.breaking.length)];
  const tip=document.getElementById("tooltip");
  tip.innerHTML=`<strong>${ep} → ${ver}</strong>${detail}`;
  tip.classList.remove("hidden");
  const r=el.getBoundingClientRect();
  tip.style.left=Math.min(r.left,window.innerWidth-300)+"px";
  tip.style.top=(r.bottom+8)+"px";
}
function hideTip(){document.getElementById("tooltip").classList.add("hidden")}
render();