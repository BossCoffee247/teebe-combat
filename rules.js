// Combat rules for a Gloom Stalker ranger. Pure functions: they change the state
// object they are given and never touch the page. app.js handles undo, saving and UI.

export const SOURCES = {
  weapon: { label: 'Longbow', short: 'Bow' },
  ambush: { label: 'Dread Ambush', short: 'DA' },
  hm: { label: "Hunter's Mark", short: 'HM' },
  ff: { label: 'Favoured Foe', short: 'FF' },
};

export function newCombat(char) {
  const state = {
    round: 1,
    ambushTurn: true,
    toggles: { hm: false, ff: false, ss: false },
    targets: [{ id: 1, name: 'Target 1' }],
    targetId: 1,
    log: [],
    plan: [],
    index: 0,
    pending: null,
    nextId: 1,
  };
  state.plan = buildPlan(char, true);
  return state;
}

// Attack order for a turn: Attack 1, (Dread Ambush), Attack 2, ...
export function buildPlan(char, ambush) {
  const plan = [];
  const n = Math.max(1, Number(char.attacksPerTurn) || 1);
  for (let i = 1; i <= n; i++) {
    plan.push({ label: 'Attack ' + i, kind: 'normal' });
    if (i === 1 && ambush) plan.push({ label: 'Dread Ambush', kind: 'ambush' });
  }
  return plan;
}

export const currentAttack = (s) => s.plan[s.index] || null;
export const turnLog = (s) => s.log.filter((e) => e.round === s.round);
export const ffUsedThisTurn = (s) =>
  turnLog(s).some((e) => e.dice.some((d) => d.src === 'ff'));

export const entryTotal = (e) =>
  e.result === 'miss' ? 0 : e.dice.reduce((a, d) => a + (d.value || 0), 0) + e.bonus;

export const pendingTotal = (s) => (s.pending ? entryTotal(s.pending) : 0);
export const turnTotal = (s) =>
  turnLog(s).reduce((a, e) => a + entryTotal(e), 0) + pendingTotal(s);
export const targetTotal = (s, id) =>
  s.log.filter((e) => e.targetId === id).reduce((a, e) => a + entryTotal(e), 0) +
  (id === s.targetId ? pendingTotal(s) : 0);

// Which dice a hit needs, given what is switched on right now.
function diceForHit(char, s, kind, crit) {
  const mult = crit ? 2 : 1;
  const slots = [];
  const add = (src, cfg) => {
    for (let i = 0; i < (Number(cfg.count) || 0) * mult; i++)
      slots.push({ src, sides: Number(cfg.sides), value: null });
  };
  add('weapon', char.weapon);
  if (kind === 'ambush') add('ambush', char.ambush);
  if (s.toggles.hm) add('hm', char.huntersMark);
  if (s.toggles.ff && !ffUsedThisTurn(s)) add('ff', char.favouredFoe);
  return slots;
}

const hitBonus = (char, s) =>
  (Number(char.weapon.bonus) || 0) + (s.toggles.ss ? Number(char.sharpshooterBonus) || 0 : 0);

// Player says how the current attack went.
export function declare(s, char, result) {
  const atk = currentAttack(s);
  if (!atk || s.pending) return;
  const entry = {
    id: s.nextId++,
    round: s.round,
    targetId: s.targetId,
    label: atk.label,
    kind: atk.kind,
    result,
    ss: s.toggles.ss,
    dice: [],
    bonus: 0,
  };
  if (result === 'miss') {
    s.log.push(entry);
    s.index++;
    return;
  }
  entry.dice = diceForHit(char, s, atk.kind, result === 'crit');
  entry.bonus = hitBonus(char, s);
  s.pending = entry;
  finishIfComplete(s);
}

// Player taps the number shown on a real die.
export function enterDie(s, value) {
  const slot = s.pending && s.pending.dice.find((d) => d.value === null);
  if (!slot || value < 1 || value > slot.sides) return;
  slot.value = value;
  finishIfComplete(s);
}

export const nextSlot = (s) => (s.pending ? s.pending.dice.find((d) => d.value === null) : null);

function finishIfComplete(s) {
  if (!s.pending || nextSlot(s)) return;
  s.pending.targetId = s.targetId;
  s.log.push(s.pending);
  s.pending = null;
  s.index++;
}

// Toggles changed mid-attack: rebuild the dice list, keeping numbers already entered.
function refreshPending(s, char) {
  const p = s.pending;
  if (!p) return;
  const fresh = diceForHit(char, s, p.kind, p.result === 'crit');
  for (const src of Object.keys(SOURCES)) {
    const old = p.dice.filter((d) => d.src === src && d.value !== null);
    fresh.filter((d) => d.src === src).forEach((d, i) => { if (old[i]) d.value = old[i].value; });
  }
  p.dice = fresh;
  p.ss = s.toggles.ss;
  p.bonus = hitBonus(char, s);
  finishIfComplete(s);
}

export function toggle(s, char, key) {
  s.toggles[key] = !s.toggles[key];
  // Hunter's Mark and Favoured Foe both need concentration.
  if (key === 'hm' && s.toggles.hm) s.toggles.ff = false;
  if (key === 'ff' && s.toggles.ff) s.toggles.hm = false;
  refreshPending(s, char);
}

export function setAmbush(s, on) {
  s.ambushTurn = on;
  const at = s.plan.findIndex((a, i) => a.kind === 'ambush' && i >= s.index);
  if (on && !s.plan.some((a) => a.kind === 'ambush')) {
    const pos = Math.max(s.index + (s.pending ? 1 : 0), Math.min(1, s.plan.length));
    s.plan.splice(pos, 0, { label: 'Dread Ambush', kind: 'ambush' });
  } else if (!on && at >= 0) {
    if (at === s.index) s.pending = null;
    s.plan.splice(at, 1);
  }
}

export function addAttack(s) {
  s.plan.push({ label: 'Extra attack', kind: 'normal' });
}

export function nextTurn(s, char) {
  s.round++;
  s.ambushTurn = false;
  s.plan = buildPlan(char, false);
  s.index = 0;
  s.pending = null;
}

export function newTarget(s) {
  const id = Math.max(...s.targets.map((t) => t.id)) + 1;
  s.targets.push({ id, name: 'Target ' + id });
  s.targetId = id;
  if (s.pending) s.pending.targetId = id;
}
