const products = [
  {
    id: 'sku-101', name: 'Acoustic Guitar', brand: 'Lumen', price: 389.99, currency: 'USD',
    description: 'A handcrafted mahogany acoustic guitar with a warm resonant tone.',
    thumbnail: 'https://img.example.com/101_thumb.jpg',
    images: ['https://img.example.com/101_a.jpg','https://img.example.com/101_b.jpg','https://img.example.com/101_c.jpg'],
    images4k: ['https://img.example.com/101_a_4k.jpg'],
    stock: { warehouse: 12, retail: 3, eta: '2d' },
    reviews: { count: 218, avg: 4.7, recent: [{user:'ada',text:'sounds amazing',rating:5},{user:'lee',text:'great bass',rating:4}] },
    shippingOptions: [{kind:'standard',cost:0},{kind:'express',cost:12.5}],
    seoKeywords: ['guitar','acoustic','mahogany'],
    analytics: { views30d: 4821, purchase30d: 112, cartAdds30d: 340 },
    supplierNotes: 'Preferred vendor contract expires 2026-09.',
    accessibility: { altText: 'Front view of a mahogany acoustic guitar' }
  },
  {
    id: 'sku-202', name: 'Trail Backpack 32L', brand: 'Fjord', price: 129, currency: 'USD',
    description: 'Waterproof hiking pack with adjustable torso and integrated rain cover.',
    thumbnail: 'https://img.example.com/202_thumb.jpg',
    images: ['https://img.example.com/202_a.jpg','https://img.example.com/202_b.jpg'],
    images4k: ['https://img.example.com/202_a_4k.jpg'],
    stock: { warehouse: 88, retail: 15, eta: '1d' },
    reviews: { count: 544, avg: 4.4, recent: [{user:'mira',text:'survived Nepal',rating:5}] },
    shippingOptions: [{kind:'standard',cost:0},{kind:'express',cost:9.99}],
    seoKeywords: ['backpack','hiking','waterproof'],
    analytics: { views30d: 12040, purchase30d: 410, cartAdds30d: 920 },
    supplierNotes: 'Seasonal color swap in Q3.',
    accessibility: { altText: 'Green trail backpack with rain cover' }
  },
  {
    id: 'sku-303', name: 'Espresso Machine', brand: 'Crema', price: 599, currency: 'USD',
    description: 'Dual-boiler espresso machine with PID temperature control.',
    thumbnail: 'https://img.example.com/303_thumb.jpg',
    images: ['https://img.example.com/303_a.jpg','https://img.example.com/303_b.jpg','https://img.example.com/303_c.jpg','https://img.example.com/303_d.jpg'],
    images4k: ['https://img.example.com/303_a_4k.jpg','https://img.example.com/303_b_4k.jpg'],
    stock: { warehouse: 7, retail: 1, eta: '4d' },
    reviews: { count: 87, avg: 4.8, recent: [{user:'dex',text:'cafe quality',rating:5},{user:'sia',text:'steep learning curve',rating:4}] },
    shippingOptions: [{kind:'standard',cost:0},{kind:'express',cost:24.99},{kind:'white-glove',cost:79}],
    seoKeywords: ['espresso','coffee','pid'],
    analytics: { views30d: 2103, purchase30d: 38, cartAdds30d: 122 },
    supplierNotes: 'Batch defect Q1, resolved.',
    accessibility: { altText: 'Stainless steel dual boiler espresso machine' }
  }
];

const shapers = {
  web: p => ({
    id: p.id, name: p.name, brand: p.brand, price: p.price, currency: p.currency,
    description: p.description,
    images: p.images,
    stock: { available: p.stock.warehouse + p.stock.retail, eta: p.stock.eta },
    reviews: { count: p.reviews.count, avg: p.reviews.avg, recent: p.reviews.recent },
    shipping: p.shippingOptions,
    accessibility: p.accessibility
  }),
  mobile: p => ({
    id: p.id, name: p.name, price: p.price,
    thumb: p.thumbnail,
    summary: p.description.slice(0, 80) + (p.description.length > 80 ? '…' : ''),
    rating: p.reviews.avg,
    reviewCount: p.reviews.count,
    inStock: (p.stock.warehouse + p.stock.retail) > 0,
    eta: p.stock.eta
  }),
  tv: p => ({
    id: p.id,
    title: p.name,
    price: `$${p.price}`,
    hero: p.images4k[0] || p.images[0],
    tagline: p.description.split('.')[0],
    stars: Math.round(p.reviews.avg)
  })
};

let current = 0;
const upstreamEl = document.getElementById('upstream');
const upstreamSizeEl = document.getElementById('upstreamSize');

function render() {
  const p = products[current];
  const raw = JSON.stringify(p, null, 2);
  upstreamEl.textContent = raw;
  const rawSize = raw.length;
  upstreamSizeEl.textContent = rawSize + ' B';

  document.querySelectorAll('.client').forEach(el => {
    const key = el.dataset.key;
    const shaped = shapers[key](p);
    const text = JSON.stringify(shaped, null, 2);
    el.querySelector('.out').textContent = text;
    const sz = text.length;
    el.querySelector('.sz').textContent = sz + ' B';
    const pct = ((1 - sz / rawSize) * 100).toFixed(1);
    const delta = el.querySelector('.delta');
    delta.textContent = pct > 0 ? `−${pct}% vs upstream` : `+${-pct}% vs upstream`;
    delta.className = 'delta' + (pct > 0 ? ' pos' : '');
  });
}

document.getElementById('next').onclick = () => {
  current = (current + 1) % products.length;
  render();
};
document.getElementById('reshape').onclick = render;

render();