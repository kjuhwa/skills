const schemas = {
  "GET /users/:id":{
    v1:{id:123,name:"Ada",email:"ada@x.io",created:"2022-01-01"},
    v2:{id:123,name:"Ada",email:"ada@x.io",createdAt:"2022-01-01T00:00:00Z",role:"admin"},
    v3:{userId:"usr_123",displayName:"Ada",email:"ada@x.io",createdAt:"2022-01-01T00:00:00Z",role:"admin",tenantId:"t_44"}
  },
  "GET /orders":{
    v1:{orders:[{id:1,total:42.0}],count:1},
    v2:{orders:[{id:1,total:42.0,currency:"USD"}],count:1,page:1},
    v3:{data:[{id:"ord_1",total:4200,currency:"USD"}],cursor:{next:"abc"}}
  },
  "POST /login":{
    v1:{user:"ada",pass:"***"},
    v2:{username:"ada",password:"***",mfa:null},
    v3:{username:"ada",password:"***",mfaToken:null,deviceId:"d-1"}
  }
};

const vers = ["v1","v2","v3"];
const from = document.getElementById("fromV");
const to = document.getElementById("toV");
const ep = document.getElementById("ep");
vers.forEach(v=>{from.add(new Option(v,v));to.add(new Option(v,v))});
Object.keys(schemas).forEach(k=>ep.add(new Option(k,k)));
from.value="v1";to.value="v3";

document.getElementById("swap").onclick=()=>{const t=from.value;from.value=to.value;to.value=t;render()};
[from,to,ep].forEach(el=>el.addEventListener("change",render));

function diff(a,b){
  const keys = new Set([...Object.keys(a||{}),...Object.keys(b||{})]);
  const notes=[];
  keys.forEach(k=>{
    if(!(k in a)) notes.push({type:"add",text:`Added field: ${k}`});
    else if(!(k in b)) notes.push({type:"rem",text:`Removed field: ${k}`});
    else if(JSON.stringify(a[k])!==JSON.stringify(b[k])) notes.push({type:"mod",text:`Changed: ${k}`});
  });
  return notes;
}

function colorize(obj,other,side){
  const lines = JSON.stringify(obj,null,2).split("\n");
  return lines.map(line=>{
    const m = line.match(/^\s*"([^"]+)":/);
    if(!m) return line;
    const k = m[1];
    if(!(k in (other||{}))) return `<span class="${side==='l'?'line-rem':'line-add'}">${line}</span>`;
    if(JSON.stringify(obj[k])!==JSON.stringify(other[k])) return `<span class="line-mod">${line}</span>`;
    return line;
  }).join("\n");
}

function render(){
  const a = schemas[ep.value][from.value];
  const b = schemas[ep.value][to.value];
  document.getElementById("leftLabel").textContent = `${ep.value}  —  ${from.value}`;
  document.getElementById("rightLabel").textContent = `${ep.value}  —  ${to.value}`;
  document.getElementById("left").innerHTML = colorize(a,b,'l');
  document.getElementById("right").innerHTML = colorize(b,a,'r');
  const notes = diff(a,b);
  const ul = document.getElementById("notes");
  ul.innerHTML = "";
  notes.forEach(n=>{const li=document.createElement("li");li.className=n.type;li.textContent=n.text;ul.appendChild(li)});
  const removed = notes.filter(n=>n.type==="rem").length;
  const modified = notes.filter(n=>n.type==="mod").length;
  const score = removed*2 + modified;
  const r = document.getElementById("risk");
  if(score===0){r.textContent="NONE";r.className="low"}
  else if(score<=2){r.textContent="LOW";r.className="low"}
  else if(score<=5){r.textContent="MEDIUM";r.className="med"}
  else {r.textContent="HIGH";r.className="high"}
}
render();