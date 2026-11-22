// Teëbe Aáe — Ranger 5 (Gloom Stalker). Default values from the Level 5 v3 sheet.
// Everything here can be changed in Settings; saved copies override these defaults.
export const DEFAULT_CHARACTER = {
  name: 'Teëbe Aáe',
  title: 'Ranger 5 · Gloom Stalker',

  // Main weapon: +1 Longbow, 1d8 + 3 DEX + 1 magic
  weapon: { name: '+1 Longbow', count: 1, sides: 8, bonus: 4 },

  // Attacks per Attack action (Extra Attack at Ranger 5)
  attacksPerTurn: 2,

  // Dread Ambusher: first turn of combat, one extra attack that deals +1d8 on a hit
  ambush: { count: 1, sides: 8 },

  // Hunter's Mark: +1d6 on every weapon hit against the marked target
  huntersMark: { count: 1, sides: 6 },

  // Favoured Foe: +1d4 once per turn on a hit (d6 from Ranger 6)
  favouredFoe: { count: 1, sides: 4 },

  // Sharpshooter: -5 to hit, +10 damage
  sharpshooterBonus: 10,

  // Links to the character sheet (undo reverses them)
  autoSpend: true,     // Hunter's Mark on -> use a spell slot; Favoured Foe on -> use a charge
  countArrows: true,   // every attack (hit or miss) uses one arrow
};
