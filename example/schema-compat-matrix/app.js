const schemas={
  "UserCreated":{versions:5,matrix:[
    [2,2,1,0,0],[2,2,2,1,0],[1,2,2,2,1],[0,1,2,2,2],[0,0,1,2,2]
  ],notes:{
    "1→3":"email nullable added v2; role missing","3→1":"role,created_at dropped",
    "2→4":"role enum not in v2 reader","4→2":"new fields ignored",
    "4→5":"metadata field optional","1→5":"too many generations apart"
  }},
  "OrderPlaced":{versions:4,matrix:[
    [2,2,1,0],[2,2,2,1],[1,2,2,2],[0,1,2,2]
  ],notes:{
    "1→3":"items schema changed","3→1":"nested items unreadable",
    "2→4":"coupon_code missing","4→2":"shipping_method dropped"
  }},
  "PaymentProcessed":{versions:3,matrix:[
    [2,2,0],[2,2,2],[0,2,2]
  ],notes:{
    "1→3":"currency required in v3","3→1":"enum status unreadable"
  }}
};
const labels=["✓","~","✗"],cls=["ok","partial","fail"];
const sel=document.getElementById("schema"),grid=document.getElementById("matrix"),info=document.getElementById("info");
Object.keys(schemas).forEach(k=>{const o=document.createElement("option");o.value=k;o.textContent=k;sel.appendChild(o)});
function build(){
  const s=schemas[sel.value],n=s.versions;
  grid.style.gridTemplateColumns=`repeat(${n+1},52px)`;grid.innerHTML="";
  const corner=document.createElement("div");corner.className="cell header";corner.textContent="R\\W";grid.appendChild(corner);
  for(let c=0;c<n;c++){const h=document.createElement("div");h.className="cell header";h.textContent="v"+(c+1);grid.appendChild(h)}
  for(let r=0;r<n;r++){
    const rh=document.createElement("div");rh.className="cell header";rh.textContent="v"+(r+1);grid.appendChild(rh);
    for(let c=0;c<n;c++){
      const v=s.matrix[r][c],d=document.createElement("div");
      d.className="cell "+cls[v];d.textContent=labels[v];
      const key=(r+1)+"→"+(c+1);
      d.addEventListener("mouseenter",()=>{
        const note=s.notes[key]||((r===c)?"Same version — fully compatible":"Compatible within "+(Math.abs(r-c))+" version gap");
        info.innerHTML=`<b>Reader v${r+1} ← Writer v${c+1}</b><br>${note}`;
      });
      grid.appendChild(d);
    }
  }
  info.innerHTML="Hover a cell for details";
}
sel.addEventListener("change",build);
build();