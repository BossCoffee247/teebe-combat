// Level-up wizard screen. One scrolling page: class → choices → HP → preview → confirm.
import * as S from './sheet-data.js';
import * as L from './levelup.js';

const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (x) => JSON.parse(JSON.stringify(x));
const abilityOptions = (sel, sh) => '<option value="">Choose…</option>' + S.ABILITIES.map((a) =>
  `<option value="${a.key}" ${sel === a.key ? 'selected' : ''} ${sh.abilities[a.key] >= 20 ? 'disabled' : ''}>${a.name} (${sh.abilities[a.key]})</option>`).join('');

export function renderLevelUp(sh, char, lu) {
  const classCard = (cls, label) => {
    const lvl = L.nextLevelFor(sh, cls);
    const p = L.progression(cls, lvl);
    const gains = p ? [...(p.features || []).map((x) => x.title), p.asi && 'Ability increase or feat', p.style && 'Fighting style',
      p.subclass && 'Martial archetype', p.slots && 'More spell slots', p.spell && 'New spell'].filter(Boolean) : [];
    return `<button class="lu-class ${lu.cls === cls ? 'on' : ''}" data-lu-class="${cls}" ${p ? '' : 'disabled'}>
      <div class="lu-class-name">${label} ${lvl}</div>
      <div class="lu-class-gains">${p ? esc(gains.join(' · ') || 'Hit points') : 'Not available yet'}</div>
    </button>`;
  };

  let body = '';
  if (lu.cls) {
    const lvl = L.nextLevelFor(sh, lu.cls);
    const c = L.choicesNeeded(lu.cls, lvl);
    const parts = [];

    if (c.asi) {
      const m = lu.asi?.mode || '';
      parts.push(`<div class="lu-block"><div class="card-label">Ability score improvement</div>
        <div class="seg">${[['2', '+2 to one'], ['11', '+1 to two'], ['feat', 'Feat']].map(([v, t]) =>
          `<button class="${m === v ? 'on' : ''}" data-lu-asi="${v}">${t}</button>`).join('')}</div>
        ${m === '2' || m === '11' ? `<select data-lu="asi.a">${abilityOptions(lu.asi.a, sh)}</select>` : ''}
        ${m === '11' ? `<select data-lu="asi.b">${abilityOptions(lu.asi.b, sh)}</select>` : ''}
        ${m === 'feat' ? `<input type="text" data-lu="asi.feat" placeholder="Feat name, e.g. Elven Accuracy" value="${esc(lu.asi.feat)}">` : ''}
        ${m === '2' && !lu.asi.a ? '<p class="hint small">Tip: DEX 17 → 19 adds +1 to hit and damage; 18 → 20 later.</p>' : ''}
      </div>`);
    }
    if (c.style) {
      parts.push(`<div class="lu-block"><div class="card-label">Fighting style</div>
        <select data-lu="style"><option value="">Choose…</option>${L.FIGHTING_STYLES.filter(([n]) => !sh.fightingStyles.includes(n)).map(([n, t]) =>
          `<option value="${esc(n)}" ${lu.style === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
        ${lu.style ? `<p class="hint small">${esc(L.FIGHTING_STYLES.find(([n]) => n === lu.style)?.[1])}</p>` : ''}
      </div>`);
    }
    if (c.subclass) {
      parts.push(`<div class="lu-block"><div class="card-label">Martial archetype</div>
        <select data-lu="subclass"><option value="">Choose…</option>${L.SUBCLASSES.map((n) =>
          `<option ${lu.subclass === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`);
    }
    if (c.spell) {
      parts.push(`<div class="lu-block"><div class="card-label">New ranger spell (optional)</div>
        <div class="lu-spell"><input type="text" data-lu="spell.name" placeholder="Spell name" value="${esc(lu.spell?.name)}">
        <select data-lu="spell.level">${Array.from({ length: c.spell }, (_, i) =>
          `<option value="${i + 1}" ${Number(lu.spell?.level || c.spell) === i + 1 ? 'selected' : ''}>Level ${i + 1}</option>`).join('')}</select></div></div>`);
    }

    const con = S.abilityMod(sh, 'con');
    parts.push(`<div class="lu-block"><div class="card-label">Hit points — d10 ${S.fmt(con)} CON</div>
      <div class="seg"><button class="${lu.hpRoll == null ? 'on' : ''}" data-lu-hp="avg">Take average (6)</button>
      <button class="${lu.hpRoll != null ? 'on' : ''}" data-lu-hp="roll">Roll d10</button></div>
      ${lu.hpMode === 'roll' || lu.hpRoll != null ? `<div class="keypad k10 lu-keys">${Array.from({ length: 10 }, (_, i) =>
        `<button class="key ${lu.hpRoll === i + 1 ? 'picked' : ''}" data-lu-roll="${i + 1}">${i + 1}</button>`).join('')}</div>` : ''}
    </div>`);

    // Preview by applying to copies
    const missing = L.missingChoice(lu.cls, lvl, lu);
    const preview = L.applyLevelUp(clone(sh), clone(char), lu);
    parts.push(`<div class="lu-block lu-preview"><div class="card-label">What changes</div>
      <ul>${preview.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>`);

    body = parts.join('') + `<div class="btn-row lu-actions">
      <button class="btn" data-action="levelUpCancel">Cancel</button>
      <button class="btn primary" data-action="levelUpConfirm" ${missing ? 'disabled' : ''}>${missing ? esc(missing) : 'Level up!'}</button>
    </div>`;
  }

  return `<div class="lu-head"><div class="card-label">Level up</div>
      <div class="lu-title">${esc(sh.classLine)} → Level ${sh.level + 1}</div>
      <p class="hint small">Your plan: Fighter 1, then Fighter 2 for Action Surge.</p></div>
    <div class="lu-classes">${classCard('ranger', 'Ranger')}${classCard('fighter', 'Fighter')}</div>
    ${body || '<p class="hint">Choose which class gains the level.</p>'}`;
}
