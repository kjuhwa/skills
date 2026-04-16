const terms = [
  { term: 'Aggregate', ctx: 'Tactical', def: 'A cluster of domain objects treated as a single unit for data changes, with a root entity guarding invariants.', related: ['Entity', 'Value Object'], layer: 'Domain' },
  { term: 'Entity', ctx: 'Tactical', def: 'An object defined by its identity rather than its attributes, persisting across time.', related: ['Aggregate'], layer: 'Domain' },
  { term: 'Value Object', ctx: 'Tactical', def: 'An immutable object with no identity, defined solely by its attributes.', related: ['Entity'], layer: 'Domain' },
  { term: 'Bounded Context', ctx: 'Strategic', def: 'A boundary within which a particular model is defined and applicable, isolating language and logic.', related: ['Context Map'], layer: 'Architecture' },
  { term: 'Context Map', ctx: 'Strategic', def: 'A visual overview of all bounded contexts and the relationships between them.', related: ['Bounded Context', 'ACL'], layer: 'Architecture' },
  { term: 'Domain Event', ctx: 'Tactical', def: 'A record of something meaningful that happened in the domain, used for decoupled communication.', related: ['Aggregate', 'Saga'], layer: 'Domain' },
  { term: 'Repository', ctx: 'Tactical', def: 'An abstraction for retrieving and persisting aggregates, hiding storage details.', related: ['Aggregate'], layer: 'Infrastructure' },
  { term: 'ACL', ctx: 'Strategic', def: 'Anti-Corruption Layer — translates between two bounded contexts to prevent model leakage.', related: ['Bounded Context'], layer: 'Architecture' },
  { term: 'Saga', ctx: 'Tactical', def: 'A long-running process that coordinates multiple aggregates via domain events and compensations.', related: ['Domain Event'], layer: 'Application' },
  { term: 'Specification', ctx: 'Tactical', def: 'A predicate object that encapsulates a business rule for selection or validation.', related: ['Entity', 'Value Object'], layer: 'Domain' },
  { term: 'Factory', ctx: 'Tactical', def: 'Encapsulates complex aggregate creation logic, ensuring invariants from birth.', related: ['Aggregate'], layer: 'Domain' },
  { term: 'Module', ctx: 'Strategic', def: 'A named container grouping related concepts, reducing cognitive load within a bounded context.', related: ['Bounded Context'], layer: 'Architecture' },
];

const grid = document.getElementById('grid');
const search = document.getElementById('search');
const detail = document.getElementById('detail');

function render(filter = '') {
  const f = filter.toLowerCase();
  grid.innerHTML = '';
  terms.filter(t => !f || t.term.toLowerCase().includes(f) || t.ctx.toLowerCase().includes(f) || t.layer.toLowerCase().includes(f)).forEach(t => {
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<h4>${t.term}</h4><span class="tag">${t.ctx}</span><span class="tag">${t.layer}</span><p>${t.def.slice(0, 60)}…</p>`;
    card.onclick = () => showDetail(t);
    grid.appendChild(card);
  });
}

function showDetail(t) {
  detail.className = 'detail open';
  detail.innerHTML = `<span class="close" onclick="this.parentElement.className='detail'">&times;</span>
    <h2>${t.term}</h2><span class="tag">${t.ctx}</span> <span class="tag">${t.layer}</span>
    <p style="margin:10px 0;font-size:0.9rem">${t.def}</p>
    <p style="font-size:0.8rem;color:#6ee7b7">Related: ${t.related.join(', ')}</p>`;
}

search.addEventListener('input', () => render(search.value));
render();