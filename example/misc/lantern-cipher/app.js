const row=document.getElementById('row');
const msgInput=document.getElementById('message');
const signalEl=document.getElementById('signal');
const decodedEl=document.getElementById('decoded');
let lanterns=[];

function letterToBits(ch){
  if(ch===' ')return 'SPACE';
  const i=ch.toUpperCase().charCodeAt(0)-65;
  if(i<0||i>25)return null;
  return (i+1).toString(2).padStart(5,'0');
}
function bitsToLetter(bits){
  const n=parseInt(bits,2);
  if(n<1||n>26)return '?';
  return String.fromCharCode(64+n);
}

function render(pattern){
  row.innerHTML='';
  lanterns=[];
  pattern.forEach((bit,idx)=>{
    const l=document.createElement('div');
    l.className='lantern '+(bit==='gap'?'gap':bit==='1'?'on':'');
    l.innerHTML='<div class="rope"></div><div class="body"></div><div class="base"></div>';
    if(bit!=='gap')l.addEventListener('click',()=>{
      l.classList.toggle('on');
      pattern[idx]=l.classList.contains('on')?'1':'0';
      refreshOutputs(pattern);
    });
    row.appendChild(l);
    lanterns.push(l);
  });
  refreshOutputs(pattern);
}

function refreshOutputs(pattern){
  signalEl.textContent=pattern.map(b=>b==='gap'?' ':b).join('');
  const parts=pattern.map(b=>b==='gap'?' ':b).join('').split(' ');
  decodedEl.textContent=parts.map(p=>{
    if(!p)return '';
    const bits=p.padStart(5,'0').slice(0,5);
    return bitsToLetter(bits);
  }).join('') || '—';
}

function encode(text){
  const pattern=[];
  text.toUpperCase().split('').forEach((ch,i)=>{
    const bits=letterToBits(ch);
    if(bits==='SPACE'){pattern.push('gap')}
    else if(bits){if(i>0&&pattern[pattern.length-1]!=='gap')pattern.push('gap');bits.split('').forEach(b=>pattern.push(b))}
  });
  return pattern;
}

document.getElementById('encode').onclick=()=>{
  const text=msgInput.value.trim()||'LIGHT';
  render(encode(text));
};

render(encode('LANTERN'));