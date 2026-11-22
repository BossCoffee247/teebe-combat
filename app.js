import { DEFAULT_CHARACTER } from './character.js';
import * as R from './rules.js';

const APP_VERSION = '19.0';
const STORE_KEY = 'teebe.v1';
const $ = (id) => document.getElementById(id);
const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (x) => JSON.parse(JSON.stringify(x));

// ---------- State, saving, undo ----------
let char = clone(DEFAULT_CHARACTER);
let combat = null;
let undoStack = [];

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved?.character) char = mergeChar(saved.character);
    if (saved?.combat?.plan) combat = saved.combat;
  } catch { /* storage unavailable: start fresh */ }
  if (!combat) combat = R.newCombat(char);
}

// Saved characters keep their values but pick up any new default fields.
function mergeChar(saved) {
  const out = clone(DEFAULT_CHARACTER);
  for (const [k, v] of Object.entries(saved)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...out[k], ...v } : v;
  }
  return out;
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ character: char, combat })); }
  catch { toast('Could not save — storage unavailable'); }
}

// Every change to combat goes through here so it can be undone.
function change(fn, msg) {
  undoStack.push(clone(combat));
  if (undoStack.length > 300) undoStack.shift();
  fn(combat);
  save();
  render();
  if (msg) toast(msg);
}

function undo() {
  if (!undoStack.length) return toast('Nothing to undo');
  combat = undoStack.pop();
  save();
  render();
}

// ---------- Small helpers ----------
let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

const ICON = {
  hm: 'icons/hunters_mark.svg',
  ff: 'icons/favoured_foe.svg',
  ambush: 'icons/dread_ambusher.svg',
  attack: 'icons/attack.svg',
  crit: 'icons/critical_hit.svg',
  miss: 'icons/miss.svg',
};
const SS_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="13"/><circle cx="32" cy="32" r="4"/><path d="M32 32 54 10M48 10h6v6"/></g></svg>`;
const img = (src) => `<img src="${src}" alt="">`;

function breakdown(e) {
  if (e.result === 'miss') return 'Miss';
  const parts = [];
  for (const src of Object.keys(R.SOURCES)) {
    const ds = e.dice.filter((d) => d.src === src);
    if (!ds.length) continue;
    const vals = ds.map((d) => (d.value === null ? '_' : d.value)).join('+');
    parts.push(src === 'weapon' ? vals : `${R.SOURCES[src].short} ${vals}`);
  }
  const base = Number(char.weapon.bonus) || 0;
  if (base) parts.push('+' + base);
  if (e.ss) parts.push('SS +' + char.sharpshooterBonus);
  return parts.join(' · ');
}

// ---------- Combat screen ----------
function renderToggles() {
  const t = combat.toggles;
  const items = [
    { key: 'hm', label: "Hunter's<br>Mark", icon: img(ICON.hm), on: t.hm, cls: 'c-hm' },
    { key: 'ff', label: 'Favoured<br>Foe', icon: img(ICON.ff), on: t.ff, cls: 'c-ff' },
    { key: 'ss', label: 'Sharp-<br>shooter', icon: SS_SVG, on: t.ss, cls: 'c-ss' },
    { key: 'ambush', label: 'Dread<br>Ambush', icon: img(ICON.ambush), on: combat.ambushTurn, cls: 'c-da' },
  ];
  $('toggles').innerHTML = items.map((i) =>
    `<button class="toggle ${i.cls} ${i.on ? 'on' : ''}" data-toggle="${i.key}" aria-pressed="${i.on}">
       <span class="toggle-icon">${i.icon}</span><span class="toggle-label">${i.label}</span>
     </button>`).join('');
}

function renderTurnList() {
  const done = R.turnLog(combat);
  $('turnList').innerHTML = combat.plan.map((atk, i) => {
    let entry = null, state = 'todo';
    if (i < combat.index) { entry = done[i]; state = entry?.result || 'hit'; }
    else if (i === combat.index) { entry = combat.pending; state = 'current'; }
    const amount = entry && i < combat.index ? R.entryTotal(entry) : entry ? R.entryTotal(entry) : '';
    const tag = state === 'crit' ? '<span class="tag crit">CRIT</span>' : '';
    const detail = entry ? breakdown(entry) : i === combat.index ? 'Up next' : '';
    return `<li class="turn-row ${state} ${atk.kind}">
      <span class="turn-name">${esc(atk.label)}${tag}</span>
      <span class="turn-detail">${esc(detail)}</span>
      <span class="turn-amount">${state === 'miss' ? '✕' : amount}</span>
    </li>`;
  }).join('');
}

function keypad(sides) {
  return `<div class="keypad k${sides}">` +
    Array.from({ length: sides }, (_, i) => `<button class="key" data-die="${i + 1}">${i + 1}</button>`).join('') +
    `</div>`;
}

function renderStage() {
  const atk = R.currentAttack(combat);
  const stage = $('stage');

  if (!atk) {
    stage.innerHTML = `<div class="stage-done">
        <div class="done-label">Turn complete</div>
        <div class="done-total">${R.turnTotal(combat)}</div>
        <div class="done-sub">damage this turn</div>
      </div>`;
    return;
  }

  const p = combat.pending;
  if (!p) {
    stage.innerHTML = `<div class="stage-head">
        <span class="stage-icon">${img(atk.kind === 'ambush' ? ICON.ambush : ICON.attack)}</span>
        <div><div class="stage-title">${esc(atk.label)}</div><div class="stage-sub">Roll to hit, then choose</div></div>
      </div>
      <div class="hit-row">
        <button class="big hit" data-declare="hit">${img(ICON.attack)}Hit</button>
        <button class="big crit" data-declare="crit">${img(ICON.crit)}Crit</button>
        <button class="big miss" data-declare="miss">${img(ICON.miss)}Miss</button>
      </div>`;
    return;
  }

  const slot = R.nextSlot(combat);
  const chips = p.dice.map((d) =>
    `<span class="die-chip s-${d.src} ${d === slot ? 'active' : ''} ${d.value !== null ? 'filled' : ''}">
       <small>d${d.sides}</small>${d.value ?? ''}
     </span>`).join('');
  stage.innerHTML = `<div class="stage-head">
      <span class="stage-icon s-${slot.src}">${img(slot.src === 'hm' ? ICON.hm : slot.src === 'ff' ? ICON.ff : slot.src === 'ambush' ? ICON.ambush : ICON.attack)}</span>
      <div><div class="stage-title">Roll d${slot.sides} <span class="for">${R.SOURCES[slot.src].label}</span></div>
      <div class="stage-sub">${esc(atk.label)} · ${p.result === 'crit' ? 'Critical hit — dice doubled' : 'Hit'}</div></div>
    </div>
    <div class="dice-chips">${chips}</div>
    ${keypad(slot.sides)}`;
}

function renderCombat() {
  $('roundLabel').textContent = `Round ${combat.round}` + (combat.ambushTurn ? ' · Ambush turn' : '');
  $('turnTotal').textContent = R.turnTotal(combat);
  const target = combat.targets.find((t) => t.id === combat.targetId);
  $('targetName').textContent = target.name;
  $('targetTotal').textContent = R.targetTotal(combat, combat.targetId);
  renderToggles();
  renderTurnList();
  renderStage();
  document.querySelector('[data-action="nextTurn"]').classList.toggle('pulse', !R.currentAttack(combat));
}

// ---------- Log screen ----------
function renderLog() {
  const targets = [...combat.targets].reverse();
  const total = combat.log.reduce((a, e) => a + R.entryTotal(e), 0);
  $('logBody').innerHTML = `<div class="log-total">Combat total <b>${total}</b> · ${combat.round} round${combat.round === 1 ? '' : 's'}</div>` +
    targets.map((t) => {
      const entries = combat.log.filter((e) => e.targetId === t.id);
      const rounds = [...new Set(entries.map((e) => e.round))];
      return `<div class="log-target">
        <div class="log-target-head"><button class="link" data-rename="${t.id}">${esc(t.name)} ✎</button><b>${R.targetTotal(combat, t.id)}</b></div>
        ${entries.length ? rounds.map((r) => `<div class="log-round">Round ${r}</div>` +
          entries.filter((e) => e.round === r).map((e) =>
            `<div class="log-row ${e.result}"><span>${esc(e.label)}${e.result === 'crit' ? ' ★' : ''}</span><span class="log-detail">${esc(breakdown(e))}</span><b>${e.result === 'miss' ? '✕' : R.entryTotal(e)}</b></div>`).join('')).join('')
        : '<div class="hint">No attacks yet</div>'}
      </div>`;
    }).join('');
}

// ---------- Settings screen ----------
const FIELDS = [
  { group: 'Longbow', path: 'weapon', count: true, sides: true, bonus: true },
  { group: 'Dread Ambush (extra die)', path: 'ambush', count: true, sides: true },
  { group: "Hunter's Mark", path: 'huntersMark', count: true, sides: true },
  { group: 'Favoured Foe', path: 'favouredFoe', count: true, sides: true },
];
const DIE_OPTIONS = [4, 6, 8, 10, 12];

function renderSettings() {
  const f = $('charForm');
  f.innerHTML = FIELDS.map((g) => {
    const v = char[g.path];
    return `<fieldset><legend>${g.group}</legend>
      <label>Dice<input type="number" inputmode="numeric" min="0" max="10" data-path="${g.path}.count" value="${v.count}"></label>
      <label>Die<select data-path="${g.path}.sides">${DIE_OPTIONS.map((d) => `<option value="${d}" ${d === Number(v.sides) ? 'selected' : ''}>d${d}</option>`).join('')}</select></label>
      ${g.bonus ? `<label>Bonus<input type="number" inputmode="numeric" min="-10" max="30" data-path="${g.path}.bonus" value="${v.bonus}"></label>` : ''}
    </fieldset>`;
  }).join('') +
  `<fieldset><legend>Other</legend>
    <label>Attacks / turn<input type="number" inputmode="numeric" min="1" max="6" data-path="attacksPerTurn" value="${char.attacksPerTurn}"></label>
    <label>Sharpshooter +<input type="number" inputmode="numeric" min="0" max="20" data-path="sharpshooterBonus" value="${char.sharpshooterBonus}"></label>
  </fieldset>`;
  $('versionNote').textContent = `App version ${APP_VERSION}`;
}

function setCharField(path, raw) {
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n)) return;
  const [a, b] = path.split('.');
  if (b) char[a][b] = n; else char[a] = n;
  save();
  toast('Saved — applies to the next roll');
}

function exportBackup() {
  const data = { app: 'teebe', version: 1, exported: new Date().toISOString(), character: char, combat };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `teebe-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Backup saved to Downloads');
}

async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'teebe' || !data.character) throw new Error();
    if (!confirm(`Load backup from ${data.exported?.slice(0, 10) || 'unknown date'}? This replaces what's on this device.`)) return;
    char = mergeChar(data.character);
    if (data.combat?.plan) combat = data.combat;
    undoStack = [];
    save();
    render();
    toast('Backup loaded');
  } catch {
    toast("That file isn't a Teëbe backup");
  }
}

// ---------- Navigation & events ----------
let view = 'combat';
function render() {
  $('charName').textContent = char.name;
  for (const v of ['combat', 'log', 'settings']) {
    $('view-' + v).classList.toggle('current', v === view);
    document.querySelector(`[data-view="${v}"]`).classList.toggle('selected', v === view);
  }
  if (view === 'combat') renderCombat();
  if (view === 'log') renderLog();
  if (view === 'settings') renderSettings();
}

const ACTIONS = {
  undo,
  addAttack: () => change(R.addAttack, 'Extra attack added'),
  nextTurn: () => {
    if (combat.pending && !confirm('This attack still has dice to enter. Skip to the next turn anyway?')) return;
    change((s) => R.nextTurn(s, char), `Round ${combat.round + 1}`);
  },
  newTarget: () => change(R.newTarget, 'New target — damage counted separately'),
  newCombat: () => {
    if (!confirm('Start a new combat? The log will be cleared.')) return;
    change((s) => Object.assign(s, R.newCombat(char)), 'New combat — Dread Ambush ready');
    view = 'combat';
    render();
  },
  exportBackup,
  resetCharacter: () => {
    if (!confirm('Restore all dice and bonuses to the defaults from your character sheet?')) return;
    char = clone(DEFAULT_CHARACTER);
    save();
    render();
    toast('Defaults restored');
  },
};

document.addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b) return;
  const d = b.dataset;
  if (d.view) { view = d.view; render(); return; }
  if (d.action) return ACTIONS[d.action]?.();
  if (d.toggle === 'ambush') return change((s) => R.setAmbush(s, !s.ambushTurn));
  if (d.toggle) return change((s) => R.toggle(s, char, d.toggle));
  if (d.declare) return change((s) => R.declare(s, char, d.declare));
  if (d.die) {
    if (navigator.vibrate) navigator.vibrate(12);
    return change((s) => R.enterDie(s, Number(d.die)));
  }
  if (d.rename) {
    const t = combat.targets.find((x) => x.id === Number(d.rename));
    const name = prompt('Target name', t.name);
    if (name && name.trim()) change((s) => { s.targets.find((x) => x.id === t.id).name = name.trim(); });
  }
});

document.addEventListener('change', (ev) => {
  const p = ev.target.dataset?.path;
  if (p) setCharField(p, ev.target.value);
  if (ev.target.id === 'importFile' && ev.target.files[0]) {
    importBackup(ev.target.files[0]);
    ev.target.value = '';
  }
});

load();
render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
