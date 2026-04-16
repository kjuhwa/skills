function b64url(s){return btoa(JSON.stringify(s)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function makeMockJWT(payload){
  const header={alg:'RS256',typ:'JWT',kid:'mock-key-1'};
  return b64url(header)+'.'+b64url(payload)+'.mock_signature_abc123';
}
const samples=[
  {sub:'user-8274',name:'Alice Chen',email:'alice@example.com',iss:'https://auth.example.com',aud:'my-app-client',scope:'openid profile email read:data',iat:Math.floor(Date.now()/1000)-3600,exp:Math.floor(Date.now()/1000)+3600,nonce:'n-0S6_WzA2Mj'},
  {sub:'service-42',name:'Batch Worker',iss:'https://auth.example.com',aud:'api-service',scope:'admin write:all',iat:Math.floor(Date.now()/1000)-7200,exp:Math.floor(Date.now()/1000)-60,client_id:'batch-svc'},
  {sub:'user-1001',name:'Bob Park',email:'bob@corp.io',iss:'https://sso.corp.io',aud:'dashboard',scope:'openid profile',iat:Math.floor(Date.now()/1000)-600,exp:Math.floor(Date.now()/1000)+120,groups:['engineering','admin']}
];
let sampleIdx=0;
function loadSample(){
  document.getElementById('tokenInput').value=makeMockJWT(samples[sampleIdx%samples.length]);
  sampleIdx++;decodeToken();
}
function syntaxHighlight(j){
  return JSON.stringify(j,null,2).replace(/("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")\s*:/g,'<span class="key">$1</span>:')
    .replace(/:\s*("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")/g,': <span class="str">$1</span>')
    .replace(/:\s*(\d+)/g,': <span class="num">$1</span>')
    .replace(/:\s*(true|false)/g,': <span class="bool">$1</span>');
}
function decodeToken(){
  const raw=document.getElementById('tokenInput').value.trim();
  const parts=raw.split('.');
  if(parts.length!==3){document.getElementById('header').textContent='Invalid token format';document.getElementById('payload').textContent='';document.getElementById('status').textContent='';return;}
  try{
    const fix=s=>s.replace(/-/g,'+').replace(/_/g,'/');
    const header=JSON.parse(atob(fix(parts[0])));
    const payload=JSON.parse(atob(fix(parts[1])));
    document.getElementById('header').innerHTML=syntaxHighlight(header);
    document.getElementById('payload').innerHTML=syntaxHighlight(payload);
    const st=document.getElementById('status'),now=Math.floor(Date.now()/1000);
    if(payload.exp&&payload.exp<now){st.className='expired';st.textContent='EXPIRED — token expired '+Math.round((now-payload.exp)/60)+' min ago';}
    else if(payload.exp&&payload.exp-now<300){st.className='soon';st.textContent='EXPIRING SOON — '+Math.round((payload.exp-now)/60)+' min remaining';}
    else{st.className='valid';st.textContent='VALID — expires in '+Math.round(((payload.exp||0)-now)/60)+' min';}
  }catch(e){document.getElementById('header').textContent='Decode error: '+e.message;}
}
loadSample();