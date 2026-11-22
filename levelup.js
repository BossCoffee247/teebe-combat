// Level-up rules for Teëbe: Gloom Stalker Ranger (Tasha's options) and a Fighter multiclass.
// applyLevelUp() changes the sheet and combat settings and returns a list of what changed,
// so the wizard can preview it by running it on a copy first.
import * as S from './sheet-data.js';

const f = (title, text) => ({ title, text });

export const RANGER = {
  6: { features: [f('Roving', '+5 ft walking speed. Climbing and swimming speed equal to your walking speed.')], ffDie: 6, speedNote: '35 ft walk · 35 ft climb/swim · 30 ft fly' },
  7: { features: [f('Iron Mind', 'Proficiency in Wisdom saving throws (Int or Cha if you already have it).')], slots: [4, 3], spell: 2, saveProf: 'wis' },
  8: { asi: true, features: [f("Land's Stride", 'Nonmagical difficult terrain costs no extra movement. Advantage on saves against magical plants.')] },
  9: { slots: [4, 3, 2], spell: 3, features: [f('3rd-level spells', 'You can cast 3rd-level ranger spells.')], autoSpell: { level: 3, name: 'Fear', tags: 'Action · Concentration · Gloom Stalker', note: 'Always prepared.' } },
  10: { features: [f("Nature's Veil", 'Bonus action: become invisible until the start of your next turn. Uses = proficiency bonus per long rest.')], resource: { id: 'veil', name: "Nature's Veil", max: 'pb', reset: 'long' } },
  11: { slots: [4, 3, 3], spell: 3, features: [f("Stalker's Flurry", 'Once on each of your turns when you miss with a weapon attack, make another weapon attack.')] },
  12: { asi: true },
};

export const FIGHTER = {
  1: { style: true, features: [f('Second Wind', 'Bonus action: regain 1d10 + fighter level HP. Once per short rest.')], resource: { id: 'second-wind', name: 'Second Wind', max: 1, reset: 'short' } },
  2: { features: [f('Action Surge', 'One extra action on your turn — with the Attack action that is 2 more attacks. Once per short rest. Tap Action Surge on the combat screen.')], resource: { id: 'surge', name: 'Action Surge', max: 1, reset: 'short' } },
  3: { subclass: true },
  4: { asi: true },
  5: { features: [f('Extra Attack (Fighter)', "Doesn't stack with the Ranger's Extra Attack — still 2 attacks per Attack action.")] },
};

export const FIGHTING_STYLES = [
  ['Defense', '+1 AC while wearing armour (applied automatically).'],
  ['Blind Fighting', 'Blindsight 10 ft.'],
  ['Dueling', '+2 damage with a one-handed melee weapon and no other weapon.'],
  ['Two-Weapon Fighting', 'Add your ability modifier to the off-hand attack damage.'],
  ['Interception', 'Reaction: reduce damage to a nearby ally by 1d10 + proficiency bonus.'],
  ['Superior Technique', 'One Battle Master manoeuvre and one d6 superiority die.'],
  ['Thrown Weapon Fighting', 'Draw thrown weapons as part of the attack; +2 damage with them.'],
  ['Protection', 'Reaction: impose disadvantage on an attack against an adjacent ally (needs a shield).'],
];

export const SUBCLASSES = ['Samurai', 'Battle Master', 'Champion', 'Echo Knight', 'Arcane Archer', 'Rune Knight', 'Psi Warrior', 'Eldritch Knight', 'Cavalier'];

export const nextLevelFor = (sh, cls) => (sh.classes?.[cls] || 0) + 1;
export const progression = (cls, lvl) => (cls === 'ranger' ? RANGER : FIGHTER)[lvl] || null;
export const profForLevel = (lvl) => Math.ceil(lvl / 4) + 1;

// What the player still has to decide for this level.
export function choicesNeeded(cls, lvl) {
  const p = progression(cls, lvl) || {};
  return { asi: !!p.asi, style: !!p.style, subclass: !!p.subclass, spell: p.spell || 0 };
}

export function classLine(sh) {
  const parts = [`Ranger ${sh.classes.ranger} · Gloom Stalker`];
  if (sh.classes.fighter) parts.push(`Fighter ${sh.classes.fighter}${sh.fighterSubclass ? ' · ' + sh.fighterSubclass : ''}`);
  return parts.join(' / ');
}

// lu = { cls, hpRoll (null = average), asi: {mode:'2'|'11'|'feat', a, b, feat}, style, subclass, spell: {name, level} }
export function applyLevelUp(sh, char, lu) {
  const lines = [];
  const lvl = nextLevelFor(sh, lu.cls);
  const p = progression(lu.cls, lvl);
  if (!p) return { ok: false, lines: [`No level-up data for ${lu.cls} ${lvl} yet`] };

  const oldMods = { con: S.abilityMod(sh, 'con'), dex: S.abilityMod(sh, 'dex') };
  sh.classes[lu.cls] = lvl;
  sh.level = sh.classes.ranger + sh.classes.fighter;
  lines.push(`Level ${sh.level}: ${lu.cls === 'ranger' ? 'Ranger' : 'Fighter'} ${lvl}`);

  // Ability score improvement first, so HP uses the new CON.
  if (p.asi && lu.asi) {
    const bump = (ab, n) => {
      const before = sh.abilities[ab];
      sh.abilities[ab] = Math.min(20, before + n);
      if (sh.abilities[ab] !== before) lines.push(`${ab.toUpperCase()} ${before} → ${sh.abilities[ab]}`);
    };
    if (lu.asi.mode === '2' && lu.asi.a) bump(lu.asi.a, 2);
    if (lu.asi.mode === '11') { if (lu.asi.a) bump(lu.asi.a, 1); if (lu.asi.b) bump(lu.asi.b, 1); }
    if (lu.asi.mode === 'feat' && lu.asi.feat?.trim()) {
      sh.features.push(f(lu.asi.feat.trim(), 'Feat taken at level ' + sh.level + '. Add details here if needed.'));
      lines.push(`Feat: ${lu.asi.feat.trim()}`);
    }
  }
  const conMod = S.abilityMod(sh, 'con');

  // Hit points: d10 for both classes. Average is 6.
  const roll = lu.hpRoll ?? 6;
  const gain = Math.max(1, roll + conMod) + (conMod - oldMods.con) * (sh.level - 1);
  sh.hp.max += gain;
  sh.hp.current += gain;
  lines.push(`Max HP +${gain} → ${sh.hp.max} (${lu.hpRoll ? 'rolled ' + roll : 'average 6'} ${S.fmt(conMod)} CON${conMod !== oldMods.con ? ', CON boost applied to earlier levels' : ''})`);
  sh.hitDice.max = sh.level;
  sh.hitDice.remaining = Math.min(sh.hitDice.max, sh.hitDice.remaining + 1);

  // Proficiency bonus
  const pb = profForLevel(sh.level);
  if (pb !== sh.profBonus) { lines.push(`Proficiency bonus ${S.fmt(sh.profBonus)} → ${S.fmt(pb)}`); sh.profBonus = pb; }

  // Damage bonus follows DEX
  const dexDelta = S.abilityMod(sh, 'dex') - oldMods.dex;
  if (dexDelta) { char.weapon.bonus += dexDelta; lines.push(`Longbow damage bonus → ${S.fmt(char.weapon.bonus)}`); }

  for (const feat of p.features || []) { sh.features.push(feat); lines.push(`New feature: ${feat.title}`); }

  if (p.slots) {
    p.slots.forEach((n, i) => {
      const id = 'slot' + (i + 1);
      let r = S.resource(sh, id);
      if (!r) { r = { id, name: `${['1st', '2nd', '3rd', '4th', '5th'][i]}-level slots`, max: 0, used: 0, reset: 'long' }; sh.resources.splice(i, 0, r); }
      if (r.max !== n) { lines.push(`${r.name}: ${r.max} → ${n}`); r.max = n; }
    });
  }
  if (p.ffDie) { char.favouredFoe.sides = p.ffDie; lines.push(`Favoured Foe damage → d${p.ffDie}`); }
  if (p.speedNote) sh.speed = p.speedNote;
  if (p.saveProf) {
    const ab = sh.saveProf[p.saveProf] ? 'cha' : p.saveProf;
    sh.saveProf[ab] = 1;
    lines.push(`Proficient in ${ab.toUpperCase()} saves`);
  }
  if (p.resource && !S.resource(sh, p.resource.id)) {
    sh.resources.push({ ...p.resource, max: p.resource.max === 'pb' ? pb : p.resource.max, used: 0 });
    lines.push(`New use: ${p.resource.name}`);
  }
  if (p.autoSpell) { sh.spells.push({ ...p.autoSpell }); lines.push(`Spell added: ${p.autoSpell.name}`); }
  if (p.spell && lu.spell?.name?.trim()) {
    sh.spells.push({ level: Math.min(p.spell, Number(lu.spell.level) || 1), name: lu.spell.name.trim(), tags: '', note: '' });
    lines.push(`New spell: ${lu.spell.name.trim()}`);
  }
  if (p.style && lu.style) {
    const st = FIGHTING_STYLES.find(([n]) => n === lu.style);
    sh.fightingStyles.push(lu.style);
    sh.features.push(f('Fighting Style: ' + lu.style, st ? st[1] : ''));
    if (lu.style === 'Defense') { sh.ac += 1; lines.push(`AC ${sh.ac - 1} → ${sh.ac}`); }
    lines.push(`Fighting style: ${lu.style}`);
  }
  if (p.subclass && lu.subclass?.trim()) {
    sh.fighterSubclass = lu.subclass.trim();
    sh.features.push(f('Martial Archetype: ' + sh.fighterSubclass, 'Level 3 archetype features — ask Claude to add the details and any combat effects.'));
    lines.push(`Archetype: ${sh.fighterSubclass}`);
  }

  // Uses that scale with proficiency bonus
  for (const r of sh.resources) {
    if (['ff', 'veil'].includes(r.id) && r.max !== pb) { lines.push(`${r.name} uses ${r.max} → ${pb}`); r.max = pb; }
  }

  sh.classLine = classLine(sh);
  return { ok: true, lines };
}

// Returns a message if a required choice is missing.
export function missingChoice(cls, lvl, lu) {
  const c = choicesNeeded(cls, lvl);
  if (c.asi) {
    if (lu.asi?.mode === '2' && !lu.asi.a) return 'Pick which ability gets +2';
    if (lu.asi?.mode === '11' && (!lu.asi.a || !lu.asi.b || lu.asi.a === lu.asi.b)) return 'Pick two different abilities for +1';
    if (lu.asi?.mode === 'feat' && !lu.asi.feat?.trim()) return 'Type the feat name';
    if (!lu.asi?.mode) return 'Choose an ability increase or a feat';
  }
  if (c.style && !lu.style) return 'Pick a fighting style';
  if (c.subclass && !lu.subclass?.trim()) return 'Pick a martial archetype';
  return '';
}
