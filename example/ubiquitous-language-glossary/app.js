const glossary = [
  { term: 'Aggregate', context: 'Tactical', kind: 'core',
    def: 'A cluster of domain objects treated as a single unit for data changes, with one root entity controlling access.',
    synonyms: ['Consistency Boundary', 'Transaction Boundary'],
    related: ['Aggregate Root', 'Entity', 'Invariant'],
    example: 'An Order aggregate contains LineItems; you cannot modify a LineItem except through its Order.' },
  { term: 'Aggregate Root', context: 'Tactical', kind: 'core',
    def: 'The single entity within an aggregate that external objects are allowed to hold references to.',
    synonyms: ['Root Entity'], related: ['Aggregate', 'Repository'],
    example: 'Order is the root; you fetch Orders from a repository, never LineItems directly.' },
  { term: 'Bounded Context', context: 'Strategic', kind: 'core',
    def: 'An explicit boundary within which a particular domain model is defined and applicable.',
    synonyms: ['Model Boundary'], related: ['Context Map', 'Ubiquitous Language'],
    example: 'In the Sales context, "Customer" means a buyer; in Support, it means a ticket reporter.' },
  { term: 'Context Map', context: 'Strategic', kind: 'core',
    def: 'A visual representation of bounded contexts and the relationships between them.',
    synonyms: [], related: ['Bounded Context', 'Anti-Corruption Layer'],
    example: 'A diagram showing Sales (upstream) → Inventory (downstream) with a translation layer.' },
  { term: 'Domain Event', context: 'Tactical', kind: 'core',
    def: 'Something significant that happened in the domain, expressed in past tense.',
    synonyms: ['Event'], related: ['Event Sourcing', 'Aggregate'],
    example: 'OrderPlaced, PaymentReceived, ShipmentDispatched.' },
  { term: 'Entity', context: 'Tactical', kind: 'core',
    def: 'An object defined by its identity rather than its attributes; identity persists through changes.',
    synonyms: [], related: ['Value Object', 'Aggregate Root'],
    example: 'A Customer with id 42 remains the same entity even if their name changes.' },
  { term: 'Value Object', context: 'Tactical', kind: 'core',
    def: 'An immutable object defined by its attributes, with no conceptual identity.',
    synonyms: ['VO'], related: ['Entity'],
    example: 'Money(100, USD) — two instances with same value are interchangeable.' },
  { term: 'Repository', context: 'Tactical', kind: 'supporting',
    def: 'A mechanism for encapsulating storage, retrieval, and search of aggregates.',
    synonyms: ['Collection-like interface'], related: ['Aggregate Root'],
    example: 'OrderRepository.findById(id), customerRepo.save(customer).' },
  { term: 'Anti-Corruption Layer', context: 'Strategic', kind: 'supporting',
    def: 'A translation layer that prevents an external model from corrupting the internal domain model.',
    synonyms: ['ACL', 'Translation Layer'], related: ['Context Map', 'Bounded Context'],
    example: 'Adapter wrapping a legacy CRM API so its concepts never leak into our model.' },
  { term: 'Ubiquitous Language', context: 'Strategic', kind: 'core',
    def: 'A common, rigorous language shared between developers and domain experts within a bounded context.',
    synonyms: [], related: ['Bounded Context', 'Domain Expert'],
    example: '"Cancel" means refund-and-reverse in Sales, but means archive in Support.' },
  { term: 'Domain Service', context: 'Tactical', kind: 'supporting',
    def: 'Stateless operation expressing domain logic that does not naturally belong to any single entity or value object.',
    synonyms: [], related: ['Entity', 'Application Service'],
    example: 'TransferService.transfer(fromAccount, toAccount, amount).' },
  { term: 'CQRS', context: 'Tactical', kind: 'generic',
    def: 'Command Query Responsibility Segregation: separating read models from write models.',
    synonyms: [], related: ['Domain Event', 'Read Model'],
    example: 'Commands mutate via Aggregate; queries hit a denormalized projection.' },
];

const search = document.getElementById('search');
const ctxSel = document.getElementById('ctx');
const list = document.getElementById('terms');
const detail = document.getElementById('detail');
const stats = document.getElementById('stats');

[...new Set(glossary.map(g => g.context))].forEach(c => {
  const o = document.createElement('option'); o.value = c; o.textContent = c; ctxSel.appendChild(o);
});

let active = null;

function show(term) {
  active = term.term;
  detail.innerHTML = `
    <h2>${term.term}</h2>
    <div class="meta"><span class="badge ${term.kind}"></span> ${term.context} · ${term.kind}</div>
    <div class="def">${term.def}</div>
    <h3>Example</h3>
    <div class="example">${term.example}</div>
    ${term.synonyms.length ? `<h3>Synonyms</h3><div class="syn">${term.synonyms.map(s => `<span>${s}</span>`).join('')}</div>` : ''}
    <h3>Related</h3>
    <div class="related">${term.related.map(r => `<span data-rel="${r}">${r}</span>`).join('')}</div>
  `;
  detail.querySelectorAll('[data-rel]').forEach(s => {
    s.addEventListener('click', () => {
      const t = glossary.find(g => g.term === s.dataset.rel);
      if (t) { search.value = ''; ctxSel.value = ''; render(); show(t); }
    });
  });
  render();
}

function render() {
  const q = search.value.toLowerCase();
  const c = ctxSel.value;
  const filtered = glossary.filter(g =>
    (!c || g.context === c) &&
    (!q || g.term.toLowerCase().includes(q) ||
     g.def.toLowerCase().includes(q) ||
     g.synonyms.some(s => s.toLowerCase().includes(q)))
  );
  list.innerHTML = filtered.map(g =>
    `<li data-term="${g.term}" class="${active === g.term ? 'active' : ''}">
      <div class="name"><span class="badge ${g.kind}"></span>${g.term}</div>
      <div class="ctx">${g.context}</div>
    </li>`).join('') || '<li style="color:#94a3b8">No matches</li>';
  list.querySelectorAll('[data-term]').forEach(li => {
    li.addEventListener('click', () => show(glossary.find(g => g.term === li.dataset.term)));
  });
  stats.textContent = `${filtered.length} of ${glossary.length} terms`;
}

render();
show(glossary[2]);