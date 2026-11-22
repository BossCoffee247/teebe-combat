// Teëbe's character sheet: default data from the Level 5 sheet, plus the maths that
// turns scores and proficiencies into the numbers you read at the table.
// Pure functions only: they change the sheet object they are given.

export const ABILITIES = [
  { key: 'str', name: 'Strength', short: 'STR' },
  { key: 'dex', name: 'Dexterity', short: 'DEX' },
  { key: 'con', name: 'Constitution', short: 'CON' },
  { key: 'int', name: 'Intelligence', short: 'INT' },
  { key: 'wis', name: 'Wisdom', short: 'WIS' },
  { key: 'cha', name: 'Charisma', short: 'CHA' },
];

export const SKILLS = [
  ['acrobatics', 'Acrobatics', 'dex'], ['animal', 'Animal Handling', 'wis'], ['arcana', 'Arcana', 'int'],
  ['athletics', 'Athletics', 'str'], ['deception', 'Deception', 'cha'], ['history', 'History', 'int'],
  ['insight', 'Insight', 'wis'], ['intimidation', 'Intimidation', 'cha'], ['investigation', 'Investigation', 'int'],
  ['medicine', 'Medicine', 'wis'], ['nature', 'Nature', 'int'], ['perception', 'Perception', 'wis'],
  ['performance', 'Performance', 'cha'], ['persuasion', 'Persuasion', 'cha'], ['religion', 'Religion', 'int'],
  ['sleight', 'Sleight of Hand', 'dex'], ['stealth', 'Stealth', 'dex'], ['survival', 'Survival', 'wis'],
].map(([key, name, ab]) => ({ key, name, ab }));

const item = (name, qty, weight, note = '') => ({ id: name.toLowerCase().replace(/[^a-z]+/g, '-'), name, qty, weight, note });

export const DEFAULT_SHEET = {
  level: 5,
  classLine: 'Ranger 5 · Gloom Stalker',
  race: 'Winged Feral Tiefling',
  background: 'Custom Spy',

  abilities: { str: 8, dex: 17, con: 14, int: 9, wis: 15, cha: 10 },
  profBonus: 3,
  saveProf: { str: 1, dex: 1 },          // Ranger saving throws
  saveBonus: 1,                          // Cloak of Protection
  skillProf: { insight: 1, investigation: 1, perception: 1, stealth: 2, survival: 1 }, // 2 = expertise (Canny)
  initiativeExtra: 'wis',                // Dread Ambusher adds WIS to initiative

  ac: 16,
  speed: '30 ft walk · 30 ft fly',
  senses: 'Darkvision 90 ft · Umbral Sight',
  spellAbility: 'wis',

  hp: { max: 44, current: 44, temp: 0 },
  hitDice: { die: 10, max: 5, remaining: 5 },
  deathSaves: { success: 0, fail: 0 },

  resources: [
    { id: 'slot1', name: '1st-level slots', max: 4, used: 0, reset: 'long' },
    { id: 'slot2', name: '2nd-level slots', max: 2, used: 0, reset: 'long' },
    { id: 'ff', name: 'Favoured Foe', max: 3, used: 0, reset: 'long' },
    { id: 'pa-animals', name: 'Speak with Animals (free)', max: 1, used: 0, reset: 'long' },
    { id: 'pa-beast', name: 'Beast Sense (free)', max: 1, used: 0, reset: 'long' },
  ],

  spells: [
    { level: 1, name: "Hunter's Mark", tags: 'Bonus action · Concentration', note: '+1d6 per weapon hit; move it when the target drops.' },
    { level: 1, name: 'Absorb Elements', tags: 'Reaction', note: 'Resist the triggering damage; +1d6 on your next melee hit.' },
    { level: 1, name: 'Goodberry', tags: 'Action', note: '10 berries, 1 HP each, last 24 h.' },
    { level: 1, name: 'Disguise Self', tags: 'Action · Gloom Stalker', note: 'Always prepared.' },
    { level: 2, name: 'Pass Without Trace', tags: 'Action · Concentration', note: '+10 Stealth for allies within 30 ft.' },
    { level: 2, name: 'Rope Trick', tags: 'Action · Gloom Stalker', note: 'Always prepared.' },
  ],

  weapons: [
    { name: '+1 Longbow', hit: '+9', dmg: '1d8+4 piercing', note: '150/600 ft · magical' },
    { name: 'Longbow (Sharpshooter)', hit: '+4', dmg: '1d8+14 piercing', note: '−5 / +10' },
    { name: 'Shortsword', hit: '+6', dmg: '1d6+3 piercing', note: 'Finesse, light' },
  ],

  coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
  inventory: [
    item('+1 Longbow', 1, 2), item('Arrows', 40, 0.05), item('Quiver', 1, 1),
    item('Studded leather (worn)', 1, 13), item('Cloak of Protection (attuned)', 1, 1, '+1 AC and saves'),
    item('Shortswords', 2, 2), item("Thieves' tools", 1, 1), item('Playing cards', 1, 0),
    item('Backpack', 1, 5), item('Bedroll', 1, 7), item('Mess kit', 1, 1), item('Tinderbox', 1, 1),
    item('Torches', 10, 1), item('Rations (days)', 10, 2), item('Waterskin', 1, 5),
    item('Hempen rope (50 ft)', 1, 10), item("Traveler's clothes", 1, 4),
  ],

  features: [
    { title: 'Favoured Foe', text: 'On a hit, mark the target (concentration, 1 min). Once per turn +1d4 damage to it. Uses = proficiency bonus per long rest.' },
    { title: 'Dread Ambusher', text: 'Add WIS to initiative. First turn of combat: +10 ft speed, and one extra weapon attack with the Attack action that deals +1d8 on a hit.' },
    { title: 'Umbral Sight', text: 'Darkvision 90 ft. Invisible to creatures relying on darkvision to see you in darkness.' },
    { title: 'Extra Attack', text: 'Two attacks when you take the Attack action.' },
    { title: 'Sharpshooter', text: '−5 to hit for +10 damage. Ignore half and three-quarters cover. No disadvantage at long range.' },
    { title: 'Archery Fighting Style', text: '+2 to ranged weapon attack rolls.' },
    { title: 'Deft Explorer: Canny', text: 'Expertise in Stealth. Two extra languages.' },
    { title: 'Primal Awareness', text: 'Speak with Animals and Beast Sense, each once per long rest without a slot.' },
    { title: 'Winged Feral Tiefling', text: 'Fly 30 ft (no heavy armour). Resistance to fire.' },
    { title: 'Proficiencies', text: 'Armour: light, medium, shields. Weapons: simple, martial. Tools: thieves\' tools, playing cards. Languages: Common, Infernal + two.' },
  ],

  notes: '',
};

// ---------- Derived numbers ----------
export const mod = (score) => Math.floor((Number(score) - 10) / 2);
export const fmt = (n) => (n >= 0 ? '+' : '−') + Math.abs(n);
export const abilityMod = (sh, ab) => mod(sh.abilities[ab]);
export const saveMod = (sh, ab) => abilityMod(sh, ab) + (sh.saveProf[ab] ? sh.profBonus : 0) + (Number(sh.saveBonus) || 0);
export const skillMod = (sh, key) => {
  const sk = SKILLS.find((s) => s.key === key);
  return abilityMod(sh, sk.ab) + (sh.skillProf[key] || 0) * sh.profBonus;
};
export const initiative = (sh) => abilityMod(sh, 'dex') + (sh.initiativeExtra ? abilityMod(sh, sh.initiativeExtra) : 0);
export const passive = (sh, key) => 10 + skillMod(sh, key);
export const spellDC = (sh) => 8 + sh.profBonus + abilityMod(sh, sh.spellAbility);
export const spellAttack = (sh) => sh.profBonus + abilityMod(sh, sh.spellAbility);
export const carried = (sh) => sh.inventory.reduce((a, i) => a + (Number(i.qty) || 0) * (Number(i.weight) || 0), 0);
export const capacity = (sh) => 15 * sh.abilities.str;
export const resource = (sh, id) => sh.resources.find((r) => r.id === id);
export const left = (r) => (r ? r.max - r.used : 0);

// ---------- Changes ----------
export function damage(sh, n) {
  n = Math.max(0, Math.trunc(n) || 0);
  const fromTemp = Math.min(sh.hp.temp, n);
  sh.hp.temp -= fromTemp;
  sh.hp.current = Math.max(0, sh.hp.current - (n - fromTemp));
  return fromTemp ? `${n} damage (${fromTemp} from temp HP)` : `${n} damage`;
}

export function heal(sh, n) {
  n = Math.max(0, Math.trunc(n) || 0);
  const before = sh.hp.current;
  sh.hp.current = Math.min(sh.hp.max, sh.hp.current + n);
  if (sh.hp.current > 0) sh.deathSaves = { success: 0, fail: 0 };
  return `Healed ${sh.hp.current - before}`;
}

export function setTemp(sh, n) {
  sh.hp.temp = Math.max(0, Math.trunc(n) || 0);
  return `Temp HP ${sh.hp.temp}`;
}

// Short rest: spend one hit die. `roll` is the number on your real die.
export function spendHitDie(sh, roll) {
  if (sh.hitDice.remaining < 1) return 'No hit dice left';
  roll = Math.trunc(roll);
  if (!(roll >= 1 && roll <= sh.hitDice.die)) return `Enter your d${sh.hitDice.die} roll first`;
  sh.hitDice.remaining--;
  const gain = Math.max(0, roll + abilityMod(sh, 'con'));
  heal(sh, gain);
  return `Hit die: ${roll} ${fmt(abilityMod(sh, 'con'))} = ${gain} HP`;
}

export function longRest(sh) {
  sh.hp.current = sh.hp.max;
  sh.hp.temp = 0;
  sh.deathSaves = { success: 0, fail: 0 };
  sh.hitDice.remaining = Math.min(sh.hitDice.max, sh.hitDice.remaining + Math.max(1, Math.floor(sh.hitDice.max / 2)));
  for (const r of sh.resources) r.used = 0;
  return 'Long rest — HP, slots and uses restored';
}

// Tap pip number i (0-based): tapping an unused pip uses up to it; tapping a used one frees it.
export function tapPip(sh, id, i) {
  const r = resource(sh, id);
  if (!r) return;
  r.used = i < r.used ? i : i + 1;
  r.used = Math.max(0, Math.min(r.max, r.used));
}

// Use the lowest free slot of at least `level`. Returns a message.
export function castSpell(sh, level, name) {
  for (let l = level; l <= 9; l++) {
    const r = resource(sh, 'slot' + l);
    if (r && left(r) > 0) {
      r.used++;
      return `${name}: used a level ${l} slot (${left(r)}/${r.max} left)`;
    }
  }
  return `${name}: no slots left of level ${level}+`;
}

export function useResource(sh, id, label) {
  const r = resource(sh, id);
  if (!r) return '';
  if (left(r) < 1) return `${label}: none left`;
  r.used++;
  return `${label}: ${left(r)}/${r.max} left`;
}

export const findItem = (sh, name) => sh.inventory.find((i) => i.name.toLowerCase() === name.toLowerCase());

export function useArrow(sh) {
  const a = findItem(sh, 'Arrows');
  if (!a || a.qty < 1) return a ? 'Out of arrows!' : '';
  a.qty--;
  return a.qty <= 5 ? `${a.qty} arrows left` : '';
}

export function addItem(sh, name, qty, weight) {
  name = String(name || '').trim();
  if (!name) return;
  const existing = findItem(sh, name);
  if (existing) { existing.qty += Math.max(1, Math.trunc(qty) || 1); return; }
  sh.inventory.push({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36),
    name, qty: Math.max(1, Math.trunc(qty) || 1), weight: Math.max(0, Number(weight) || 0), note: '',
  });
}
