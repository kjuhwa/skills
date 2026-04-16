'use strict';

// ============================================================
// DATA — Characters, Banners
// ============================================================

const RARITY = { COMMON: 'Common', RARE: 'Rare', EPIC: 'Epic', LEGENDARY: 'Legendary' };

const RARITY_STARS = {
  Common:    '★',
  Rare:      '★★',
  Epic:      '★★★',
  Legendary: '★★★★',
};

const RARITY_CLASS = {
  Common: 'common', Rare: 'rare', Epic: 'epic', Legendary: 'legendary',
};

const CHAR_ICONS = {
  Warrior: '⚔️', Mage: '🔮', Archer: '🏹', Healer: '💚', Tank: '🛡️',
};

const TYPES = ['Warrior', 'Mage', 'Archer', 'Healer', 'Tank'];

// 24 characters across rarities
const ALL_CHARACTERS = [
  // Legendary (4)
  { id: 'c01', name: 'Aethon Rex',     rarity: 'Legendary', type: 'Warrior', atk: 320, def: 180, hp: 2800, spd: 95  },
  { id: 'c02', name: 'Seraphel',       rarity: 'Legendary', type: 'Mage',    atk: 380, def: 120, hp: 2200, spd: 105 },
  { id: 'c03', name: 'Ironveil',       rarity: 'Legendary', type: 'Tank',    atk: 200, def: 340, hp: 4200, spd: 65  },
  { id: 'c04', name: 'Luna Whisper',   rarity: 'Legendary', type: 'Healer',  atk: 180, def: 200, hp: 2600, spd: 110 },
  // Epic (6)
  { id: 'c05', name: 'Drakar',         rarity: 'Epic', type: 'Warrior', atk: 260, def: 150, hp: 2200, spd: 90  },
  { id: 'c06', name: 'Frostbind',      rarity: 'Epic', type: 'Mage',    atk: 300, def: 100, hp: 1800, spd: 100 },
  { id: 'c07', name: 'Stonehide',      rarity: 'Epic', type: 'Tank',    atk: 160, def: 280, hp: 3400, spd: 60  },
  { id: 'c08', name: 'Virel',          rarity: 'Epic', type: 'Archer',  atk: 280, def: 130, hp: 1900, spd: 115 },
  { id: 'c09', name: 'Meadowsong',     rarity: 'Epic', type: 'Healer',  atk: 140, def: 170, hp: 2100, spd: 100 },
  { id: 'c10', name: 'Cinder Pact',    rarity: 'Epic', type: 'Mage',    atk: 290, def: 110, hp: 1750, spd: 98  },
  // Rare (8)
  { id: 'c11', name: 'Kael',           rarity: 'Rare', type: 'Warrior', atk: 200, def: 130, hp: 1800, spd: 85  },
  { id: 'c12', name: 'Pyros',          rarity: 'Rare', type: 'Mage',    atk: 240, def: 90,  hp: 1400, spd: 95  },
  { id: 'c13', name: 'Bramblar',       rarity: 'Rare', type: 'Tank',    atk: 130, def: 220, hp: 2800, spd: 55  },
  { id: 'c14', name: 'Swift Arrow',    rarity: 'Rare', type: 'Archer',  atk: 220, def: 100, hp: 1500, spd: 110 },
  { id: 'c15', name: 'Sister Luce',    rarity: 'Rare', type: 'Healer',  atk: 110, def: 140, hp: 1700, spd: 95  },
  { id: 'c16', name: 'Hexbane',        rarity: 'Rare', type: 'Mage',    atk: 230, def: 95,  hp: 1450, spd: 92  },
  { id: 'c17', name: 'Galeforce',      rarity: 'Rare', type: 'Archer',  atk: 210, def: 105, hp: 1550, spd: 108 },
  { id: 'c18', name: 'Ironclad',       rarity: 'Rare', type: 'Tank',    atk: 140, def: 210, hp: 2600, spd: 58  },
  // Common (6)
  { id: 'c19', name: 'Grunt',          rarity: 'Common', type: 'Warrior', atk: 140, def: 100, hp: 1400, spd: 75 },
  { id: 'c20', name: 'Novice Mage',    rarity: 'Common', type: 'Mage',    atk: 160, def: 70,  hp: 1100, spd: 82 },
  { id: 'c21', name: 'Scout',          rarity: 'Common', type: 'Archer',  atk: 150, def: 80,  hp: 1200, spd: 100},
  { id: 'c22', name: 'Footguard',      rarity: 'Common', type: 'Tank',    atk: 90,  def: 160, hp: 2000, spd: 50 },
  { id: 'c23', name: 'Acolyte',        rarity: 'Common', type: 'Healer',  atk: 80,  def: 110, hp: 1300, spd: 88 },
  { id: 'c24', name: 'Ruffian',        rarity: 'Common', type: 'Warrior', atk: 130, def: 90,  hp: 1350, spd: 78 },
];

const BANNERS = {
  standard:  { name: 'Standard Banner',   desc: 'Always available. Equal rates across all characters.', icon: '🌟' },
  featured:  { name: 'Featured Banner',   desc: '50/50 guaranteed featured character on Legendary pull!', icon: '⚡' },
  legendary: { name: 'Legendary Banner',  desc: 'Boosted Epic & Legendary rates for hardcore collectors.', icon: '👑' },
};

// Banner rate configs (base legendary %)
const BANNER_RATES = {
  standard:  { baseLeg: 0.02, baseEpic: 0.08, baseRare: 0.30, baseCom: 0.60, softStart: 75, softStep: 0.02, hardPity: 90 },
  featured:  { baseLeg: 0.02, baseEpic: 0.08, baseRare: 0.30, baseCom: 0.60, softStart: 75, softStep: 0.02, hardPity: 90 },
  legendary: { baseLeg: 0.04, baseEpic: 0.12, baseRare: 0.28, baseCom: 0.56, softStart: 65, softStep: 0.03, hardPity: 80 },
};

// ============================================================
// STATE
// ============================================================

const state = {
  gems: 10000,
  currentBanner: 'standard',
  pity: { standard: 0, featured: 0, legendary: 0 },
  // pull history: [{char, pityAtPull, bannerKey}]
  pullHistory: [],
  // collection: { charId: { char, copies } }
  collection: {},
  // stats
  stats: {
    total: 0,
    byRarity: { Common: 0, Rare: 0, Epic: 0, Legendary: 0 },
    legendaryPities: [],    // pity count per legendary pull
  },

  // combat
  team: [null, null, null],   // selected character ids
  combatActive: false,
  combatState: null,

  // collection filters
  filterRarity: 'all',
  filterType: 'all',
  filterOwned: 'all',

  // tab
  activeTab: 'gacha',
};

// ============================================================
// GACHA ENGINE — soft/hard pity (skill: gacha-soft-hard-pity)
// ============================================================

function getLegendaryRate(bannerKey, pityCount) {
  const cfg = BANNER_RATES[bannerKey];
  if (pityCount + 1 >= cfg.hardPity) return 1.0;
  if (pityCount + 1 >= cfg.softStart) {
    const steps = (pityCount + 1) - cfg.softStart;
    return Math.min(1.0, cfg.baseLeg + cfg.softStep * steps);
  }
  return cfg.baseLeg;
}

function rollRarity(bannerKey, pityCount) {
  const cfg = BANNER_RATES[bannerKey];
  const legRate = getLegendaryRate(bannerKey, pityCount);
  const r = Math.random();
  if (r < legRate)                          return RARITY.LEGENDARY;
  if (r < legRate + cfg.baseEpic)           return RARITY.EPIC;
  if (r < legRate + cfg.baseEpic + cfg.baseRare) return RARITY.RARE;
  return RARITY.COMMON;
}

function pickCharacterForRarity(rarity) {
  const pool = ALL_CHARACTERS.filter(c => c.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

function doPull(count) {
  const bannerKey = state.currentBanner;
  const results = [];
  for (let i = 0; i < count; i++) {
    const pityBefore = state.pity[bannerKey];
    const rarity = rollRarity(bannerKey, pityBefore);
    const char = pickCharacterForRarity(rarity);

    // Update pity
    if (rarity === RARITY.LEGENDARY) {
      state.stats.legendaryPities.push(pityBefore + 1);
      state.pity[bannerKey] = 0;
    } else {
      state.pity[bannerKey]++;
    }

    // Update collection
    if (state.collection[char.id]) {
      state.collection[char.id].copies++;
    } else {
      state.collection[char.id] = { char, copies: 1 };
    }

    // Update stats
    state.stats.total++;
    state.stats.byRarity[rarity]++;

    // Pull history entry
    const entry = { char, rarity, pityAtPull: pityBefore + 1, bannerKey, ts: Date.now() };
    state.pullHistory.unshift(entry);
    results.push(entry);
  }
  // Trim history
  if (state.pullHistory.length > 100) state.pullHistory.length = 100;

  // Deduct gems
  state.gems -= count === 1 ? 160 : 1600;
  if (state.gems < 0) state.gems = 0;

  return results;
}

// ============================================================
// STATUS EFFECTS (skill: status-effect-enum-system)
// ============================================================

const EFFECT_TYPE = {
  BURN:     { id: 'burn',     label: '🔥 Burn',     cat: 'DOT',    stackable: true,  icon: '🔥', turns: 3 },
  FREEZE:   { id: 'freeze',   label: '❄️ Freeze',   cat: 'CC',     stackable: false, icon: '❄️', turns: 1 },
  POISON:   { id: 'poison',   label: '☠️ Poison',   cat: 'DOT',    stackable: true,  icon: '☠️', turns: 4 },
  SHIELD:   { id: 'shield',   label: '🛡 Shield',   cat: 'BUFF',   stackable: false, icon: '🛡', turns: 2 },
  ATK_UP:   { id: 'atk-up',   label: '⬆️ ATK Up',  cat: 'BUFF',   stackable: false, icon: '⬆️', turns: 3 },
  ATK_DOWN: { id: 'atk-down', label: '⬇️ ATK Dn',  cat: 'DEBUFF', stackable: false, icon: '⬇️', turns: 3 },
  DEF_UP:   { id: 'def-up',   label: '🔼 DEF Up',  cat: 'BUFF',   stackable: false, icon: '🔼', turns: 3 },
  DEF_DOWN: { id: 'def-down', label: '🔽 DEF Dn',  cat: 'DEBUFF', stackable: false, icon: '🔽', turns: 3 },
};

function applyEffect(effects, effectType, magnitude) {
  const newEffect = { type: effectType, magnitude, remainingTurns: effectType.turns, stackCount: 1 };
  if (!effectType.stackable) {
    const existing = effects.findIndex(e => e.type.id === effectType.id);
    if (existing !== -1) {
      // Refresh: take max magnitude and max duration
      const arr = [...effects];
      arr[existing] = {
        ...arr[existing],
        magnitude: Math.max(arr[existing].magnitude, magnitude),
        remainingTurns: Math.max(arr[existing].remainingTurns, effectType.turns),
      };
      return arr;
    }
  }
  return [...effects, newEffect];
}

function tickEffectsStart(unit) {
  // Apply DoT, decrement turns — pure function
  let hp = unit.hp;
  const events = [];
  const effects = unit.effects.map(e => {
    if (e.type.cat === 'DOT') {
      const dmg = e.magnitude * e.stackCount;
      hp = Math.max(0, hp - dmg);
      events.push({ type: 'dot', unit: unit.name, effect: e.type.label, dmg });
    }
    return { ...e, remainingTurns: e.remainingTurns - 1 };
  });
  return { unit: { ...unit, hp, effects }, events };
}

function cleanupEffects(unit) {
  const expired = unit.effects.filter(e => e.remainingTurns <= 0).map(e => e.type.label);
  const effects = unit.effects.filter(e => e.remainingTurns > 0);
  return { unit: { ...unit, effects }, expired };
}

// ============================================================
// COMBAT ENGINE — stateless pure function (skill: stateless-turn-combat-engine)
// ============================================================

const SKILL_BY_TYPE = {
  Warrior: { name: 'Battle Cry',  effect: EFFECT_TYPE.ATK_UP,   mag: 50,  desc: '+ATK 3 turns' },
  Mage:    { name: 'Blaze',       effect: EFFECT_TYPE.BURN,      mag: 40,  desc: 'Burn 3 turns' },
  Archer:  { name: 'Poison Shot', effect: EFFECT_TYPE.POISON,    mag: 25,  desc: 'Poison 4 turns' },
  Healer:  { name: 'Mend',        effect: EFFECT_TYPE.SHIELD,    mag: 200, desc: 'Shield 2 turns' },
  Tank:    { name: 'Iron Wall',   effect: EFFECT_TYPE.DEF_UP,    mag: 60,  desc: '+DEF 3 turns' },
};

function buildCombatUnit(char, team) {
  return {
    id: char.id,
    name: char.name,
    icon: CHAR_ICONS[char.type],
    type: char.type,
    team,
    atk: char.atk,
    def: char.def,
    maxHp: char.hp,
    hp: char.hp,
    spd: char.spd,
    effects: [],
    alive: true,
  };
}

function buildEnemyUnit(wave) {
  const types = TYPES;
  const type = types[Math.floor(Math.random() * types.length)];
  const scale = 1 + wave * 0.25;
  return {
    id: 'enemy_' + Math.random().toString(36).slice(2),
    name: `Wave${wave} ${type}`,
    icon: CHAR_ICONS[type],
    type,
    team: 'enemy',
    atk:  Math.round((120 + Math.random() * 80) * scale),
    def:  Math.round((80  + Math.random() * 60) * scale),
    maxHp: Math.round((1200 + Math.random() * 800) * scale),
    hp:   Math.round((1200 + Math.random() * 800) * scale),
    spd:  Math.round(60 + Math.random() * 50),
    effects: [],
    alive: true,
  };
}

function calcDamage(attacker, defender, multiplier = 1.0) {
  // base = atk * mult / (1 + def/500)
  let base = attacker.atk * multiplier / (1 + defender.def / 500);

  // ATK_UP buff
  const atkUp = attacker.effects.find(e => e.type.id === 'atk-up');
  if (atkUp) base *= (1 + atkUp.magnitude / 100);

  // DEF_UP on defender
  const defUp = defender.effects.find(e => e.type.id === 'def-up');
  if (defUp) base *= (1 - defUp.magnitude / 200);

  // ATK_DOWN debuff
  const atkDn = attacker.effects.find(e => e.type.id === 'atk-down');
  if (atkDn) base *= (1 - atkDn.magnitude / 100);

  // Variance
  const variance = 0.9 + Math.random() * 0.2;
  base *= variance;

  // Absorb shield
  let dmg = Math.max(1, Math.round(base));
  let shieldAbsorb = 0;
  const shield = defender.effects.find(e => e.type.id === 'shield');
  if (shield) {
    shieldAbsorb = Math.min(shield.magnitude, dmg);
    dmg -= shieldAbsorb;
  }

  return { dmg, shieldAbsorb };
}

// processAction: (combatState, action) -> { newState, events }
// Pure function — returns new state, no mutation
function processAction(cs, action) {
  let { units, turnIdx, wave } = cs;
  const events = [];

  // Deep clone units
  units = units.map(u => ({ ...u, effects: u.effects.map(e => ({ ...e })) }));

  const turnOrder = getTurnOrder(units);
  const actor = units.find(u => u.id === turnOrder[turnIdx % turnOrder.length]?.id);
  if (!actor || !actor.alive) {
    return { newState: { ...cs, units, turnIdx: turnIdx + 1 }, events };
  }

  // Start-of-turn tick (DoT, CC)
  const tickRes = tickEffectsStart(actor);
  Object.assign(actor, tickRes.unit);
  events.push(...tickRes.events.map(e => ({ ...e, kind: 'dot' })));

  if (actor.hp <= 0) {
    actor.alive = false;
    events.push({ kind: 'defeated', unit: actor.name });
    const cleanup = cleanupEffects(actor);
    Object.assign(actor, cleanup.unit);
    units = units.map(u => u.id === actor.id ? actor : u);
    return { newState: checkCombatEnd({ ...cs, units, turnIdx: turnIdx + 1, wave }), events };
  }

  // Frozen: skip turn
  const isFrozen = actor.effects.some(e => e.type.id === 'freeze');
  if (isFrozen) {
    events.push({ kind: 'cc', unit: actor.name, effect: 'Freeze' });
    actor.effects = actor.effects.map(e => e.type.id === 'freeze' ? { ...e, remainingTurns: e.remainingTurns - 1 } : e).filter(e => e.remainingTurns > 0);
    units = units.map(u => u.id === actor.id ? actor : u);
    return { newState: { ...cs, units, turnIdx: turnIdx + 1, wave }, events };
  }

  // Resolve action
  const enemies = units.filter(u => u.team !== actor.team && u.alive);
  const allies  = units.filter(u => u.team === actor.team  && u.alive && u.id !== actor.id);
  const target  = enemies[Math.floor(Math.random() * enemies.length)];
  const ally    = allies[Math.floor(Math.random() * allies.length)];

  if (action === 'attack' && target) {
    const { dmg, shieldAbsorb } = calcDamage(actor, target, 1.0);
    target.hp = Math.max(0, target.hp - dmg);
    if (target.hp <= 0) target.alive = false;
    events.push({ kind: 'damage', attacker: actor.name, defender: target.name, dmg, shieldAbsorb, crit: false });
    if (!target.alive) events.push({ kind: 'defeated', unit: target.name });

  } else if (action === 'skill' && target) {
    const sk = SKILL_BY_TYPE[actor.type];
    const { dmg, shieldAbsorb } = calcDamage(actor, target, 1.4);
    target.hp = Math.max(0, target.hp - dmg);
    if (target.hp <= 0) target.alive = false;
    events.push({ kind: 'damage', attacker: actor.name, defender: target.name, dmg, shieldAbsorb, crit: false });
    if (!target.alive) events.push({ kind: 'defeated', unit: target.name });

    // Apply skill effect
    if (sk) {
      const effectTarget = (sk.effect.cat === 'BUFF' || sk.effect.cat === 'BUFF') && actor.type !== 'Healer'
        ? actor
        : actor.type === 'Healer' ? (ally || actor) : target;
      const applyTo = units.find(u => u.id === effectTarget.id);
      if (applyTo) {
        applyTo.effects = applyEffect(applyTo.effects, sk.effect, sk.mag);
        events.push({ kind: 'effect', unit: applyTo.name, effect: sk.effect.label });
      }
    }

  } else if (action === 'defend') {
    actor.effects = applyEffect(actor.effects, EFFECT_TYPE.SHIELD, 150);
    events.push({ kind: 'effect', unit: actor.name, effect: '🛡 Shield applied' });

  } else if (action === 'item' && actor.team === 'player') {
    // Heal 20% max HP
    const heal = Math.round(actor.maxHp * 0.2);
    actor.hp = Math.min(actor.maxHp, actor.hp + heal);
    events.push({ kind: 'heal', unit: actor.name, amount: heal });
  }

  // Cleanup expired effects
  [actor, target].filter(Boolean).forEach(u => {
    const cl = cleanupEffects(u);
    Object.assign(u, cl.unit);
  });

  // Enemy AI: if actor is enemy
  if (actor.team === 'enemy') {
    // Enemy uses skill 30% of time
    if (Math.random() < 0.3 && enemies.length) {
      // Enemies debuff — ATK DOWN on random player
      const playerTarget = units.filter(u => u.team === 'player' && u.alive)[Math.floor(Math.random() * units.filter(u => u.team === 'player' && u.alive).length)];
      if (playerTarget) {
        playerTarget.effects = applyEffect(playerTarget.effects, EFFECT_TYPE.ATK_DOWN, 30);
        events.push({ kind: 'effect', unit: playerTarget.name, effect: '⬇️ ATK Down (enemy skill)' });
      }
    }
  }

  units = units.map(u => {
    if (u.id === actor.id) return actor;
    if (target && u.id === target.id) return target;
    return u;
  });

  const newState = checkCombatEnd({ ...cs, units, turnIdx: turnIdx + 1, wave });
  return { newState, events };
}

function getTurnOrder(units) {
  return [...units]
    .filter(u => u.alive)
    .sort((a, b) => b.spd - a.spd || a.id.localeCompare(b.id));
}

function checkCombatEnd(cs) {
  const players = cs.units.filter(u => u.team === 'player' && u.alive);
  const enemies  = cs.units.filter(u => u.team === 'enemy'  && u.alive);
  if (players.length === 0) return { ...cs, phase: 'defeat' };
  if (enemies.length  === 0) return { ...cs, phase: 'wave_clear' };
  return { ...cs, phase: 'active' };
}

// ============================================================
// UI HELPERS
// ============================================================

function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return document.querySelectorAll(sel); }

function rarityClass(r) { return RARITY_CLASS[r] || 'common'; }

function formatStars(rarity) {
  return RARITY_STARS[rarity] || '★';
}

function hpColor(pct) {
  if (pct > 0.5) return 'hp-high';
  if (pct > 0.25) return 'hp-med';
  return 'hp-low';
}

function addLog(msg, kind = 'info') {
  const log = qs('#combat-log');
  if (!log) return;
  const div = document.createElement('div');
  div.className = `log-entry ${kind}`;
  div.textContent = msg;
  log.prepend(div);
  while (log.children.length > 80) log.removeChild(log.lastChild);
}

// ============================================================
// RENDER — Gacha Tab
// ============================================================

function renderPityBar() {
  const bannerKey = state.currentBanner;
  const pity = state.pity[bannerKey];
  const cfg = BANNER_RATES[bannerKey];
  const pct = Math.min(100, (pity / cfg.hardPity) * 100);
  const rate = getLegendaryRate(bannerKey, pity) * 100;

  qs('#pity-count').textContent = pity;
  qs('#pity-bar').style.width = pct + '%';
  qs('#pity-rate').textContent = rate.toFixed(2) + '%';

  // Soft marker position relative to hard pity
  const softPct = (cfg.softStart / cfg.hardPity) * 100;
  qs('#soft-marker').style.left = softPct + '%';
}

function renderStats() {
  const s = state.stats;
  qs('#stat-total').textContent = s.total;
  qs('#stat-legendary').textContent = s.byRarity.Legendary;
  qs('#stat-epic').textContent = s.byRarity.Epic;
  qs('#stat-rare').textContent = s.byRarity.Rare;

  if (s.legendaryPities.length > 0) {
    const avg = s.legendaryPities.reduce((a,b) => a+b, 0) / s.legendaryPities.length;
    qs('#stat-avg-pity').textContent = avg.toFixed(1);
  }

  // Luck rating
  const legRate = s.total > 0 ? (s.byRarity.Legendary / s.total) : 0;
  const expectedRate = 0.02;
  if (s.total >= 10) {
    const luck = (legRate / expectedRate * 100).toFixed(0);
    qs('#stat-luck').textContent = luck + '%';
  }
}

function renderHistory() {
  const list = qs('#pull-history-list');
  qs('#history-count').textContent = `(${state.pullHistory.length})`;

  if (state.pullHistory.length === 0) {
    list.innerHTML = '<div class="history-empty">No pulls yet. Start pulling!</div>';
    return;
  }

  list.innerHTML = '';
  state.pullHistory.slice(0, 50).forEach(entry => {
    const div = document.createElement('div');
    div.className = 'history-entry';
    div.innerHTML = `
      <div class="history-rarity-dot ${rarityClass(entry.rarity)}"></div>
      <span class="history-name">${entry.char.name}</span>
      <span class="history-type">${entry.char.type}</span>
      <span class="history-pity">#${entry.pityAtPull}</span>
    `;
    list.appendChild(div);
  });
}

function renderLegendaryLog() {
  const log = qs('#legendary-log');
  const entries = state.pullHistory.filter(e => e.rarity === 'Legendary');
  if (entries.length === 0) {
    log.innerHTML = '<div class="history-empty">No legendaries yet</div>';
    return;
  }
  log.innerHTML = '';
  entries.slice(0, 10).forEach(e => {
    const div = document.createElement('div');
    div.className = 'legendary-entry';
    div.innerHTML = `<span>${CHAR_ICONS[e.char.type]}</span><span>${e.char.name}</span><span style="margin-left:auto;font-size:11px;color:var(--text-muted)">@${e.pityAtPull}</span>`;
    log.appendChild(div);
  });
}

function renderGachaTab() {
  renderPityBar();
  renderStats();
  renderHistory();
  renderLegendaryLog();
  qs('#gem-count').textContent = state.gems.toLocaleString();
}

// ============================================================
// CARD REVEAL ANIMATION
// ============================================================

function showReveal(results) {
  const hero = qs('#banner-hero');
  const revealArea = qs('#card-reveal-area');
  const cards = qs('#reveal-cards');

  hero.style.display = 'none';
  revealArea.style.display = 'block';
  cards.innerHTML = '';

  results.forEach((entry, i) => {
    const rc = rarityClass(entry.rarity);
    const card = document.createElement('div');
    card.className = 'reveal-card';
    card.style.animationDelay = `${i * 0.06}s`;
    card.innerHTML = `
      <div class="reveal-card-inner">
        <div class="reveal-card-front">✦</div>
        <div class="reveal-card-back ${rc}">
          <div class="card-char-icon">${CHAR_ICONS[entry.char.type]}</div>
          <div class="card-char-name">${entry.char.name}</div>
          <div class="card-char-type">${entry.char.type}</div>
          <div class="card-char-stars ${rc}">${formatStars(entry.rarity)}</div>
        </div>
      </div>
    `;
    cards.appendChild(card);

    // Flip with delay
    setTimeout(() => card.classList.add('flipped'), 300 + i * 120);
  });
}

function hideReveal() {
  qs('#banner-hero').style.display = '';
  qs('#card-reveal-area').style.display = 'none';
}

// ============================================================
// RENDER — Collection Tab
// ============================================================

function renderCollection() {
  const grid = qs('#collection-grid');
  const total = ALL_CHARACTERS.length;
  const owned = Object.keys(state.collection).length;
  qs('#coll-owned-count').textContent = owned;
  qs('#coll-total-count').textContent = total;

  // Stats
  const byr = { Legendary: 0, Epic: 0, Rare: 0, Common: 0 };
  ALL_CHARACTERS.forEach(c => { if (state.collection[c.id]) byr[c.rarity]++; });
  qs('#coll-stat-leg').textContent   = byr.Legendary;
  qs('#coll-stat-epic').textContent  = byr.Epic;
  qs('#coll-stat-rare').textContent  = byr.Rare;
  qs('#coll-stat-common').textContent = byr.Common;

  const fr = state.filterRarity;
  const ft = state.filterType;
  const fo = state.filterOwned;

  const filtered = ALL_CHARACTERS.filter(c => {
    if (fr !== 'all' && c.rarity !== fr) return false;
    if (ft !== 'all' && c.type  !== ft) return false;
    const isOwned = !!state.collection[c.id];
    if (fo === 'owned'  && !isOwned) return false;
    if (fo === 'locked' && isOwned)  return false;
    return true;
  });

  grid.innerHTML = '';
  filtered.forEach(c => {
    const owned = state.collection[c.id];
    const rc = rarityClass(c.rarity);
    const card = document.createElement('div');
    card.className = `coll-card ${rc} ${owned ? '' : 'locked'}`;
    card.dataset.charId = c.id;
    card.innerHTML = `
      ${owned && owned.copies > 1 ? `<div class="coll-card-copies">×${owned.copies}</div>` : ''}
      <span class="coll-card-icon">${CHAR_ICONS[c.type]}</span>
      <div class="coll-card-name">${c.name}</div>
      <div class="coll-card-type">${c.type}</div>
      <div class="coll-card-stars ${rc}">${formatStars(c.rarity)}</div>
    `;
    card.addEventListener('click', () => showCharDetail(c, 'coll'));
    grid.appendChild(card);
  });
}

function showCharDetail(char, context) {
  const isOwned = !!state.collection[char.id];
  const copies = isOwned ? state.collection[char.id].copies : 0;
  const rc = rarityClass(char.rarity);

  const constellations = Math.min(copies - 1, 6);
  const constStars = constellations > 0 ? '✦'.repeat(constellations) : '—';

  const html = `
    <div class="char-detail-portrait">${CHAR_ICONS[char.type]}</div>
    <div class="char-detail-name">${char.name}</div>
    <div class="char-detail-rarity ${rc}">${formatStars(char.rarity)}</div>
    <div class="char-detail-type">${char.type}</div>
    <div class="char-stats-grid">
      <div class="char-stat-item"><span class="char-stat-label">ATK</span><span class="char-stat-value">${char.atk}</span></div>
      <div class="char-stat-item"><span class="char-stat-label">DEF</span><span class="char-stat-value">${char.def}</span></div>
      <div class="char-stat-item"><span class="char-stat-label">HP</span><span class="char-stat-value">${char.hp}</span></div>
      <div class="char-stat-item"><span class="char-stat-label">SPD</span><span class="char-stat-value">${char.spd}</span></div>
    </div>
    <div class="char-copies">
      ${isOwned ? `Owned: ${copies}× copy` : 'Not yet obtained'}
      ${isOwned && copies > 1 ? `<div class="constellation-stars">${constStars}</div><div style="font-size:10px;color:var(--accent)">Constellation ${constellations}/6</div>` : ''}
    </div>
  `;

  if (context === 'coll') {
    const panel = qs('#coll-char-detail');
    qs('#coll-char-content').innerHTML = html;
    panel.style.display = 'block';
  } else {
    const panel = qs('#char-detail-panel');
    qs('#char-detail-content').innerHTML = html;
    panel.style.display = 'block';
  }
}

// ============================================================
// RENDER — Combat Tab
// ============================================================

function renderCombatHeroList() {
  const list = qs('#combat-hero-list');
  const owned = ALL_CHARACTERS.filter(c => state.collection[c.id]);
  list.innerHTML = '';

  if (owned.length === 0) {
    list.innerHTML = '<div class="history-empty">Pull characters first!</div>';
    return;
  }

  owned.sort((a, b) => {
    const rOrder = { Legendary: 0, Epic: 1, Rare: 2, Common: 3 };
    return rOrder[a.rarity] - rOrder[b.rarity];
  }).forEach(c => {
    const inTeam = state.team.includes(c.id);
    const div = document.createElement('div');
    div.className = `combat-hero-item ${inTeam ? 'selected' : ''}`;
    div.dataset.charId = c.id;
    div.innerHTML = `
      <span class="chi">${CHAR_ICONS[c.type]}</span>
      <span class="chn">${c.name}</span>
      <span class="chr ${rarityClass(c.rarity)}">${formatStars(c.rarity)}</span>
    `;
    div.addEventListener('click', () => {
      if (inTeam) return;
      addToTeam(c.id);
    });
    list.appendChild(div);
  });
}

function addToTeam(charId) {
  const slot = state.team.findIndex(s => s === null);
  if (slot === -1) return; // team full
  state.team[slot] = charId;
  renderTeamSlots();
  renderCombatHeroList();
  updateStartButton();
}

function removeFromTeam(slot) {
  state.team[slot] = null;
  renderTeamSlots();
  renderCombatHeroList();
  updateStartButton();
}

function renderTeamSlots() {
  const container = qs('#team-slots');
  container.innerHTML = '';
  [0, 1, 2].forEach(i => {
    const charId = state.team[i];
    const div = document.createElement('div');
    div.className = `team-slot ${charId ? 'filled' : 'empty'}`;
    div.dataset.slot = i;

    if (charId) {
      const char = ALL_CHARACTERS.find(c => c.id === charId);
      div.innerHTML = `
        <span class="slot-icon">${CHAR_ICONS[char.type]}</span>
        <div>
          <div class="slot-name">${char.name}</div>
          <div class="slot-sub ${rarityClass(char.rarity)}">${char.type} · ${formatStars(char.rarity)}</div>
        </div>
        <span class="slot-remove" data-slot="${i}">✕</span>
      `;
      div.querySelector('.slot-remove').addEventListener('click', e => {
        e.stopPropagation();
        removeFromTeam(i);
      });
    } else {
      div.innerHTML = `<span>+ Add Hero</span>`;
    }
    container.appendChild(div);
  });
}

function updateStartButton() {
  const btn = qs('#btn-start-combat');
  const full = state.team.every(s => s !== null);
  btn.disabled = !full;
}

// ============================================================
// RENDER — Arena
// ============================================================

function renderArenaUnit(unit) {
  const hpPct = unit.maxHp > 0 ? unit.hp / unit.maxHp : 0;
  const hpCls = hpColor(hpPct);
  const effectsHtml = unit.effects.map(e =>
    `<span class="effect-badge ${e.type.id}" title="${e.type.label} (${e.remainingTurns} turns)">${e.type.icon}${e.remainingTurns}</span>`
  ).join('');

  return `
    <div class="arena-unit ${unit.alive ? '' : 'defeated'}" id="unit-${unit.id}" data-team="${unit.team}">
      <div class="arena-unit-icon">${unit.icon}</div>
      <div class="arena-unit-name">${unit.name}</div>
      <div class="arena-hp-bar-bg">
        <div class="arena-hp-bar-fill ${hpCls}" style="width:${Math.max(0, hpPct * 100).toFixed(1)}%"></div>
      </div>
      <div class="arena-hp-label">${unit.hp}/${unit.maxHp}</div>
      <div class="effects-row">${effectsHtml}</div>
    </div>
  `;
}

function renderArena() {
  const cs = state.combatState;
  if (!cs) return;

  const enemies = cs.units.filter(u => u.team === 'enemy');
  const players = cs.units.filter(u => u.team === 'player');

  qs('#enemy-units').innerHTML = enemies.map(renderArenaUnit).join('');
  qs('#player-units').innerHTML = players.map(renderArenaUnit).join('');
  qs('#wave-num').textContent = cs.wave;

  // Highlight active unit
  const turnOrder = getTurnOrder(cs.units);
  const activeUnit = turnOrder[cs.turnIdx % turnOrder.length];
  if (activeUnit) {
    document.querySelectorAll('.arena-unit').forEach(el => el.classList.remove('active-turn'));
    const activeEl = qs(`#unit-${activeUnit.id}`);
    if (activeEl) activeEl.classList.add('active-turn');
    qs('#turn-indicator').textContent = `${activeUnit.icon} ${activeUnit.name}'s turn (${activeUnit.team === 'player' ? 'You' : 'Enemy'})`;
  }

  // Turn order sidebar
  renderTurnOrder(cs.units, cs.turnIdx);

  // Disable actions if not player turn
  const isPlayerTurn = activeUnit && activeUnit.team === 'player';
  qsa('.action-btn').forEach(b => b.disabled = !isPlayerTurn);
}

function renderTurnOrder(units, turnIdx) {
  const order = getTurnOrder(units);
  const list = qs('#turn-order-list');
  list.innerHTML = '';
  order.forEach((u, i) => {
    const div = document.createElement('div');
    div.className = `turn-order-item ${i === turnIdx % order.length ? 'current' : ''}`;
    div.innerHTML = `<span class="to-icon">${u.icon}</span><span class="to-name">${u.name}</span><span class="to-spd">SPD ${u.spd}</span>`;
    list.appendChild(div);
  });
}

// ============================================================
// COMBAT FLOW
// ============================================================

function startCombat() {
  const playerChars = state.team.map(id => ALL_CHARACTERS.find(c => c.id === id));
  const playerUnits = playerChars.map(c => buildCombatUnit(c, 'player'));
  const enemyUnits  = [0,1,2].map(() => buildEnemyUnit(1));

  state.combatState = {
    units: [...playerUnits, ...enemyUnits],
    turnIdx: 0,
    wave: 1,
    phase: 'active',
  };

  state.combatActive = true;

  qs('#combat-setup-view').style.display = 'none';
  qs('#combat-arena-view').style.display = 'block';
  qs('#combat-result-view').style.display = 'none';
  qs('#combat-log').innerHTML = '';

  addLog('⚔️ Battle started! Wave 1', 'system');
  renderArena();

  // If first unit is enemy, auto-resolve enemy turn
  autoAdvanceIfEnemy();
}

function handleAction(action) {
  if (!state.combatState || state.combatState.phase !== 'active') return;

  const cs = state.combatState;
  const turnOrder = getTurnOrder(cs.units);
  const actor = turnOrder[cs.turnIdx % turnOrder.length];
  if (!actor || actor.team !== 'player') return;

  const { newState, events } = processAction(cs, action);
  state.combatState = newState;

  // Log events
  events.forEach(e => {
    if (e.kind === 'damage')   addLog(`${e.attacker} → ${e.defender}: ${e.dmg} dmg${e.shieldAbsorb > 0 ? ` (${e.shieldAbsorb} blocked)` : ''}`, 'damage');
    if (e.kind === 'dot')      addLog(`${e.unit} suffers ${e.effect}: ${e.dmg} dmg`, 'damage');
    if (e.kind === 'heal')     addLog(`${e.unit} healed for ${e.amount}`, 'heal');
    if (e.kind === 'effect')   addLog(`${e.unit}: ${e.effect}`, 'effect');
    if (e.kind === 'defeated') addLog(`💀 ${e.unit} defeated!`, 'system');
    if (e.kind === 'cc')       addLog(`${e.unit} is frozen — skips turn`, 'effect');
  });

  renderArena();
  checkPhase();
}

function autoAdvanceIfEnemy() {
  if (!state.combatState || state.combatState.phase !== 'active') return;

  const cs = state.combatState;
  const turnOrder = getTurnOrder(cs.units);
  if (turnOrder.length === 0) return;

  const actor = turnOrder[cs.turnIdx % turnOrder.length];
  if (actor && actor.team === 'enemy') {
    setTimeout(() => {
      if (!state.combatState || state.combatState.phase !== 'active') return;
      const { newState, events } = processAction(state.combatState, 'attack');
      state.combatState = newState;

      events.forEach(e => {
        if (e.kind === 'damage')   addLog(`${e.attacker} → ${e.defender}: ${e.dmg} dmg`, 'damage');
        if (e.kind === 'dot')      addLog(`${e.unit} suffers ${e.effect}: ${e.dmg} dmg`, 'damage');
        if (e.kind === 'effect')   addLog(`${e.unit}: ${e.effect}`, 'effect');
        if (e.kind === 'defeated') addLog(`💀 ${e.unit} defeated!`, 'system');
        if (e.kind === 'cc')       addLog(`${e.unit} is frozen — skips turn`, 'effect');
        if (e.kind === 'heal')     addLog(`${e.unit} healed ${e.amount}`, 'heal');
      });

      renderArena();
      checkPhase();
    }, 700);
  }
}

function checkPhase() {
  const cs = state.combatState;
  if (!cs) return;

  if (cs.phase === 'defeat') {
    showCombatResult(false);
    return;
  }

  if (cs.phase === 'wave_clear') {
    addLog(`✨ Wave ${cs.wave} cleared!`, 'system');
    showCombatResult(true);
    return;
  }

  // Continue — auto-advance if enemy
  autoAdvanceIfEnemy();
}

function showCombatResult(victory) {
  qs('#combat-result-view').style.display = 'block';
  qs('#combat-arena-view').style.display = 'none';
  const box = qs('#combat-result-box');
  box.className = `combat-result-box ${victory ? 'victory' : 'defeat'}`;
  box.textContent = victory ? `⚔️ Wave ${state.combatState.wave} Cleared!` : '💀 Defeated...';

  qs('#btn-next-wave').style.display = victory ? 'block' : 'none';
}

function nextWave() {
  const cs = state.combatState;
  const nextWave = cs.wave + 1;
  const survivors = cs.units.filter(u => u.team === 'player' && u.alive);

  // Restore some HP to survivors
  const healedSurvivors = survivors.map(u => ({
    ...u,
    hp: Math.min(u.maxHp, Math.round(u.hp + u.maxHp * 0.3)),
    effects: [],
  }));

  const enemies = [0,1,2].map(() => buildEnemyUnit(nextWave));

  state.combatState = {
    units: [...healedSurvivors, ...enemies],
    turnIdx: 0,
    wave: nextWave,
    phase: 'active',
  };

  qs('#combat-result-view').style.display = 'none';
  qs('#combat-arena-view').style.display = 'block';

  addLog(`🌊 Wave ${nextWave} incoming!`, 'system');
  renderArena();
  autoAdvanceIfEnemy();
}

function endCombat() {
  state.combatActive = false;
  state.combatState = null;
  qs('#combat-result-view').style.display = 'none';
  qs('#combat-arena-view').style.display = 'none';
  qs('#combat-setup-view').style.display = 'block';
}

// ============================================================
// BANNER UI
// ============================================================

function updateBannerDisplay() {
  const key = state.currentBanner;
  const banner = BANNERS[key];
  qs('#banner-title-large').textContent = banner.name;
  qs('#banner-desc').textContent = banner.desc;
  renderPityBar();
}

// ============================================================
// TAB SYSTEM
// ============================================================

function switchTab(tab) {
  state.activeTab = tab;
  qsa('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  qsa('.tab-content').forEach(el => el.classList.toggle('active', el.id === `tab-${tab}`));

  if (tab === 'gacha') renderGachaTab();
  if (tab === 'collection') renderCollection();
  if (tab === 'combat') {
    renderCombatHeroList();
    renderTeamSlots();
    updateStartButton();
  }
}

// ============================================================
// INIT & EVENT WIRING
// ============================================================

function init() {
  // Tab buttons
  qsa('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Banner selection
  qsa('.banner-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.banner-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentBanner = btn.dataset.banner;
      updateBannerDisplay();
    });
  });

  // Pull buttons
  qs('#btn-pull1').addEventListener('click', () => {
    if (state.gems < 160) { alert('Not enough gems! Get free gems below.'); return; }
    const results = doPull(1);
    showReveal(results);
    renderGachaTab();
    if (state.activeTab === 'collection') renderCollection();
  });

  qs('#btn-pull10').addEventListener('click', () => {
    if (state.gems < 1600) { alert('Not enough gems! Get free gems below.'); return; }
    const results = doPull(10);
    showReveal(results);
    renderGachaTab();
    if (state.activeTab === 'collection') renderCollection();
  });

  qs('#btn-close-reveal').addEventListener('click', hideReveal);

  qs('#btn-free-gems').addEventListener('click', () => {
    state.gems += 10000;
    qs('#gem-count').textContent = state.gems.toLocaleString();
  });

  // Collection filters
  qs('#filter-rarity').addEventListener('click', e => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    qs('#filter-rarity .filter-pill.active')?.classList.remove('active');
    pill.classList.add('active');
    state.filterRarity = pill.dataset.filter;
    renderCollection();
  });

  qs('#filter-type').addEventListener('click', e => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    qs('#filter-type .filter-pill.active')?.classList.remove('active');
    pill.classList.add('active');
    state.filterType = pill.dataset.filter;
    renderCollection();
  });

  qs('#filter-owned').addEventListener('click', e => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    qs('#filter-owned .filter-pill.active')?.classList.remove('active');
    pill.classList.add('active');
    state.filterOwned = pill.dataset.filter;
    renderCollection();
  });

  // Combat
  qs('#btn-start-combat').addEventListener('click', startCombat);
  qs('#btn-clear-team').addEventListener('click', () => {
    state.team = [null, null, null];
    renderTeamSlots();
    renderCombatHeroList();
    updateStartButton();
  });

  qs('#act-attack').addEventListener('click', () => { handleAction('attack'); });
  qs('#act-skill').addEventListener('click',  () => { handleAction('skill');  });
  qs('#act-defend').addEventListener('click', () => { handleAction('defend'); });
  qs('#act-item').addEventListener('click',   () => { handleAction('item');   });

  qs('#btn-next-wave').addEventListener('click', nextWave);
  qs('#btn-end-combat').addEventListener('click', endCombat);

  // Initial render
  renderGachaTab();
  renderCollection();
  renderCombatHeroList();
  renderTeamSlots();
}

document.addEventListener('DOMContentLoaded', init);
