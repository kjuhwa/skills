const sampleBase=`{
  "name": "UserEvent",
  "fields": [
    {"name": "userId", "type": "string"},
    {"name": "action", "type": "string"},
    {"name": "timestamp", "type": "long"}
  ]
}`;
const sampleEvolved=`{
  "name": "UserEvent",
  "fields": [
    {"name": "userId", "type": "string"},
    {"name": "action", "type": "string"},
    {"name": "timestamp", "type": "long"},
    {"name": "metadata", "type": "map", "default": null},
    {"name": "version", "type": "int", "default": 1}
  ]
}`;
const baseEl=document.getElementById("base"),evolvedEl=document.getElementById("evolved"),results=document.getElementById("results");
baseEl.value=sampleBase;evolvedEl.value=sampleEvolved;

document.getElementById("check").onclick=()=>{
  let b,e;
  try{b=JSON.parse(baseEl.value)}catch{results.innerHTML='<span style="color:#f87171">Invalid JSON in base schema</span>';return}
  try{e=JSON.parse(evolvedEl.value)}catch{results.innerHTML='<span style="color:#f87171">Invalid JSON in evolved schema</span>';return}
  const bf=new Map((b.fields||[]).map(f=>[f.name,f]));
  const ef=new Map((e.fields||[]).map(f=>[f.name,f]));
  const changes=[];
  ef.forEach((f,name)=>{
    if(!bf.has(name))changes.push({type:"add",name,detail:`Added field "${name}" (${f.type})${f.default!==undefined?" with default":""}`,hasDefault:f.default!==undefined});
    else if(bf.get(name).type!==f.type)changes.push({type:"modify",name,detail:`Changed "${name}" type: ${bf.get(name).type} → ${f.type}`});
  });
  bf.forEach((_,name)=>{if(!ef.has(name))changes.push({type:"remove",name,detail:`Removed field "${name}"`})});
  const removed=changes.filter(c=>c.type==="remove").length;
  const addedNoDefault=changes.filter(c=>c.type==="add"&&!c.hasDefault).length;
  const modified=changes.filter(c=>c.type==="modify").length;
  let compat="FULL",cls="full";
  if(modified>0||removed>0&&addedNoDefault>0){compat="NONE";cls="none"}
  else if(removed>0){compat="FORWARD";cls="forward"}
  else if(addedNoDefault>0){compat="BACKWARD";cls="backward"}
  const icons={add:"+ ",remove:"− ",modify:"~ "};
  const iconCls={add:"icon-add",remove:"icon-remove",modify:"icon-modify"};
  let html=`<div class="badge badge-${cls}">${compat} compatible</div>`;
  if(!changes.length)html+=`<div class="change">No changes detected — schemas are identical.</div>`;
  else changes.forEach(c=>{html+=`<div class="change"><span class="${iconCls[c.type]}">${icons[c.type]}</span>${c.detail}</div>`});
  results.innerHTML=html;
};