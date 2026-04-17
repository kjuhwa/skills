// Lantern Glossary Forge — applies `ubiquitous-language` skill: as the user
// forges inscriptions, the tool auto-distills recurring domain terms into a
// glossary with canonical forms and ambiguity flags.

const TONES = ['whispered','solemn','bright','triumphant'];
const LENGTHS = ['short','medium','long'];

const MOTIFS = {
  fire:   ['ember','hearth','kindle','ash'],
  water:  ['tide','current','rainfall','still pool'],
  wood:   ['rootstock','sapling','bough','grain'],
  metal:  ['hammered gold','bell','forge','lodestar'],
  earth:  ['furrow','stone','wheatfield','clay'],
  wind:   ['draft','gale','thermal','reed']
};
const VERBS = {
  whispered: ['remember','keep','fold','hold'],
  solemn:    ['honor','bear witness to','receive','steady'],
  bright:    ['celebrate','welcome','raise','adorn'],
  triumphant:['proclaim','crown','illumine','summon']
};
const TEMPLATES = {
  short: [
    'For {subject}: let {motif} {verb} this year.',
    '{Verb} {subject} — a {motif} in the {element}.'
  ],
  medium: [
    'May the {motif} of this lantern {verb} {subject} through every {element}.',
    'Released on {occasion}, this flame is the {motif} by which we {verb} {subject}.'
  ],
  long: [
    'On {occasion}, we send this lantern into the {element}: may its {motif} {verb} {subject}, and may the dark be gentler for its passing.',
    'Let the {motif} carry word of {subject} across the {element}; {verb} them in the long hours, and set them down softly at dawn.'
  ]
};

// Canonical mapping — ubiquitous-language skill: flag synonyms, offer canonical form
const CANONICAL = {
  'grandma':'grandmother','nana':'grandmother','granny':'grandmother',
  'mum':'mother','mom':'mother','mama':'mother',
  'dad':'father','papa':'father',
  'the river':'river','rivers':'river',
  'roads':'road','pathway':'road','paths':'road','path':'road',
  'homeland':'home','homes':'home',
  'venture':'new-venture','journey':'new-venture','voyage':'new-venture'
};
const STOP = new Set(['the','a','an','and','or','of','to','in','on','for','with','this','that','be','is','it','at']);

const $ = id => document.getElementById(id);
const previewEl = $('preview');
const ledgerEl = $('ledger');
const glossaryEl = $('glossary').querySelector('tbody');
const forgedNEl = $('forgedN');
const termNEl = $('termN');
const toneValEl = $('toneVal');
const lenValEl = $('lenVal');

let forged = [];
let termCounts = new Map();

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function cap(s){ return s[0].toUpperCase()+s.slice(1); }

function compose(){
  const subject = $('subject').value.trim() || 'those we carry';
  const occasion = $('occasion').value;
  const element = $('element').value;
  const tone = TONES[+$('tone').value];
  const length = LENGTHS[+$('length').value];
  const motif = pick(MOTIFS[element]);
  const verb = pick(VERBS[tone]);
  const tmpl = pick(TEMPLATES[length]);
  return tmpl
    .replace(/{subject}/g, subject)
    .replace(/{Verb}/g, cap(verb))
    .replace(/{verb}/g, verb)
    .replace(/{motif}/g, motif)
    .replace(/{element}/g, element)
    .replace(/{occasion}/g, occasion);
}

function livePreview(){
  previewEl.textContent = compose();
  previewEl.classList.remove('pulse');
  void previewEl.offsetWidth;
  previewEl.classList.add('pulse');
}

function extractTerms(text){
  return text.toLowerCase()
    .replace(/[^\p{L}\s-]/gu,' ')
    .split(/\s+/)
    .filter(w=>w && w.length>2 && !STOP.has(w));
}

function updateGlossary(text){
  // also capture bigrams like "the river"
  const words = extractTerms(text);
  const bigrams = [];
  for(let i=0;i<words.length-1;i++) bigrams.push(words[i]+' '+words[i+1]);
  [...words, ...bigrams].forEach(t=>{
    const canonical = CANONICAL[t] || t;
    const entry = termCounts.get(canonical) || { uses:0, surfaces:new Set() };
    entry.uses++;
    entry.surfaces.add(t);
    termCounts.set(canonical, entry);
  });
}

function renderGlossary(){
  const rows = [...termCounts.entries()]
    .filter(([,v])=>v.uses>=2)
    .sort((a,b)=>b[1].uses-a[1].uses)
    .slice(0,20);
  glossaryEl.innerHTML = rows.map(([term,v])=>{
    const surfaces = [...v.surfaces].filter(s=>s!==term);
    const canon = surfaces.length ? `${term} <small style="color:#6b7280">← ${surfaces.join(', ')}</small>` : term;
    return `<tr><td>${term}</td><td>${canon}</td><td>${v.uses}</td></tr>`;
  }).join('');
  termNEl.textContent = rows.length;
}

function renderLedger(){
  ledgerEl.innerHTML = forged.slice(-8).reverse().map(f=>`<li><b>${f.occasion}·${f.element}</b> — ${f.text}</li>`).join('');
  forgedNEl.textContent = forged.length;
}

function forgeOne(){
  const text = compose();
  const record = {
    text,
    occasion: $('occasion').value,
    element: $('element').value,
    tone: TONES[+$('tone').value],
    subject: $('subject').value.trim() || 'those we carry',
    ts: Date.now()
  };
  forged.push(record);
  updateGlossary(text + ' ' + record.subject);
  previewEl.textContent = text;
  previewEl.classList.remove('pulse');
  void previewEl.offsetWidth;
  previewEl.classList.add('pulse');
  renderLedger();
  renderGlossary();
}

$('forge').addEventListener('click', forgeOne);
$('copy').addEventListener('click', ()=>{
  navigator.clipboard?.writeText(previewEl.textContent);
});
$('export').addEventListener('click', ()=>{
  const data = {
    forged,
    glossary: [...termCounts.entries()].map(([term,v])=>({term,uses:v.uses,surfaces:[...v.surfaces]}))
  };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lantern-forge.json';
  a.click();
});
$('clear').addEventListener('click', ()=>{
  forged = []; termCounts = new Map();
  renderLedger(); renderGlossary();
});
document.addEventListener('keydown', e=>{
  if(e.key==='Enter' && document.activeElement?.tagName!=='INPUT') forgeOne();
  if(e.key==='Enter' && document.activeElement?.id==='subject') forgeOne();
});
['occasion','element','tone','length','subject'].forEach(id=>{
  $(id).addEventListener('input', ()=>{
    toneValEl.textContent = TONES[+$('tone').value];
    lenValEl.textContent = LENGTHS[+$('length').value];
    livePreview();
  });
});

livePreview();