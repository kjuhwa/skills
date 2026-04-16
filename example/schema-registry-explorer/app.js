const schemas = [
  {id:1,subject:"user-events",version:3,type:"AVRO",compat:"BACKWARD",
   schema:{type:"record",name:"UserEvent",fields:[{name:"userId",type:"string"},{name:"action",type:"string"},{name:"timestamp",type:"long"},{name:"metadata",type:["null",{type:"map",values:"string"}]}]}},
  {id:2,subject:"order-created",version:5,type:"AVRO",compat:"FULL",
   schema:{type:"record",name:"OrderCreated",fields:[{name:"orderId",type:"string"},{name:"amount",type:"double"},{name:"currency",type:"string"},{name:"items",type:{type:"array",items:"string"}}]}},
  {id:3,subject:"payment-processed",version:2,type:"JSON",compat:"FORWARD",
   schema:{type:"object",properties:{paymentId:{type:"string"},status:{type:"string",enum:["pending","completed","failed"]},amount:{type:"number"}},required:["paymentId","status"]}},
  {id:4,subject:"inventory-update",version:1,type:"PROTOBUF",compat:"NONE",
   schema:{syntax:"proto3",message:"InventoryUpdate",fields:["string sku = 1","int32 quantity = 2","string warehouse = 3"]}},
  {id:5,subject:"notification-sent",version:4,type:"AVRO",compat:"BACKWARD_TRANSITIVE",
   schema:{type:"record",name:"NotificationSent",fields:[{name:"channel",type:{type:"enum",symbols:["EMAIL","SMS","PUSH"]}},{name:"recipient",type:"string"},{name:"sentAt",type:"long"}]}}
];

const list = document.getElementById("list");
const detail = document.getElementById("detail");
document.getElementById("count").textContent = schemas.length + " schemas";

schemas.forEach(s => {
  const d = document.createElement("div");
  d.className = "item";
  d.innerHTML = `<h3>${s.subject}</h3><span>v${s.version} · ${s.type}</span>`;
  d.onclick = () => {
    document.querySelectorAll(".item").forEach(i => i.classList.remove("active"));
    d.classList.add("active");
    detail.innerHTML = `
      <div class="meta">
        <div><strong>Subject:</strong> ${s.subject}</div>
        <div><strong>Version:</strong> ${s.version}</div>
        <div><strong>Type:</strong> ${s.type}</div>
        <div><strong>Compatibility:</strong> ${s.compat}</div>
      </div>
      <pre>${JSON.stringify(s.schema, null, 2)}</pre>`;
  };
  list.appendChild(d);
});