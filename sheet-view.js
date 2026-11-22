// Renders the Sheet screen as HTML. Buttons carry data-* attributes that app.js handles.
import * as S from './sheet-data.js';

const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PROF_MARK = ['', '●', '◆'];

function pips(r) {
  return `<div class="res-row">
    <div class="res-name">${esc(r.name)}</div>
    <div class="pips">${Array.from({ length: r.max }, (_, i) =>
      `<button class="pip ${i < r.used ? 'used' : ''}" data-pip="${r.id}:${i}" aria-label="${esc(r.name)} ${i + 1}"></button>`).join('')}</div>
    <div class="res-left">${r.max - r.used}/${r.max}</div>
  </div>`;
}

function vitals(sh) {
  const hp = sh.hp;
  const pct = Math.max(0, Math.min(100, (hp.current / hp.max) * 100));
  const down = hp.current === 0;
  const saves = (kind, label) => `<div class="ds-row"><span>${label}</span>${[0, 1, 2].map((i) =>
    `<button class="ds ${kind} ${i < sh.deathSaves[kind] ? 'on' : ''}" data-death="${kind}:${i}"></button>`).join('')}</div>`;
  return `<section class="card" id="sec-hp">
    <div class="hp-top">
      <div>
        <div class="card-label">Hit points</div>
        <div class="hp-big ${down ? 'down' : ''}">${hp.current}<span>/ ${hp.max}</span>${hp.temp ? `<em>+${hp.temp} temp</em>` : ''}</div>
      </div>
      <div class="quick">
        <div><b>${sh.ac}</b><small>AC</small></div>
        <div><b>${S.fmt(S.initiative(sh))}</b><small>Init</small></div>
      </div>
    </div>
    <div class="hp-bar"><span style="width:${pct}%"></span></div>
    <div class="hp-entry">
      <input id="hpAmount" type="number" inputmode="numeric" min="0" placeholder="#">
      <button class="hp-btn dmg" data-hp="damage">Damage</button>
      <button class="hp-btn heal" data-hp="heal">Heal</button>
      <button class="hp-btn" data-hp="temp">Temp</button>
    </div>
    ${down ? `<div class="death">${saves('success', 'Successes')}${saves('fail', 'Failures')}</div>` : ''}
  </section>`;
}

function resources(sh) {
  return `<section class="card" id="sec-res">
    <div class="card-head"><span class="card-label">Slots &amp; uses</span>
      <button class="chip-btn" data-rest="long">Long rest</button></div>
    ${sh.resources.map(pips).join('')}
    <div class="res-row">
      <div class="res-name">Hit dice <small>d${sh.hitDice.die}</small></div>
      <div class="res-left big">${sh.hitDice.remaining}/${sh.hitDice.max}</div>
      <button class="chip-btn" data-hp="hitdie" title="Enter your d${sh.hitDice.die} roll in the HP amount box first">Spend</button>
    </div>
    <p class="hint small">Short rest: type your d${sh.hitDice.die} roll in the HP box above, then tap Spend.</p>
  </section>`;
}

function stats(sh, edit) {
  const abil = S.ABILITIES.map((a) => {
    const m = S.abilityMod(sh, a.key), sv = S.saveMod(sh, a.key);
    return `<div class="abil">
      <div class="abil-name">${a.short}</div>
      <div class="abil-mod">${S.fmt(m)}</div>
      ${edit ? `<input type="number" inputmode="numeric" min="1" max="30" data-sheet-path="abilities.${a.key}" value="${sh.abilities[a.key]}">`
             : `<div class="abil-score">${sh.abilities[a.key]}</div>`}
      <button class="abil-save ${sh.saveProf[a.key] ? 'prof' : ''}" ${edit ? `data-cycle-save="${a.key}"` : 'tabindex="-1"'}>Save ${S.fmt(sv)}</button>
    </div>`;
  }).join('');
  const field = (label, path, val, type = 'number') => edit
    ? `<label class="mini-field">${label}<input type="${type}" ${type === 'number' ? 'inputmode="numeric"' : ''} data-sheet-path="${path}" value="${esc(val)}"></label>` : '';
  return `<section class="card" id="sec-stats">
    <div class="card-head"><span class="card-label">Abilities</span>
      <button class="chip-btn ${edit ? 'on' : ''}" data-sheet-edit>${edit ? 'Done' : 'Edit'}</button></div>
    <div class="abil-grid">${abil}</div>
    <div class="stat-strip">
      <div><b>${S.fmt(sh.profBonus)}</b><small>Prof</small></div>
      <div><b>${S.spellDC(sh)}</b><small>Spell DC</small></div>
      <div><b>${S.fmt(S.spellAttack(sh))}</b><small>Spell atk</small></div>
      <div><b>${S.passive(sh, 'perception')}</b><small>Passive Perc</small></div>
    </div>
    <div class="line-info">${esc(sh.speed)} · ${esc(sh.senses)}</div>
    ${edit ? `<div class="edit-grid">
      ${field('Max HP', 'hp.max', sh.hp.max)}${field('AC', 'ac', sh.ac)}${field('Prof bonus', 'profBonus', sh.profBonus)}
      ${field('Hit dice', 'hitDice.max', sh.hitDice.max)}${field('Save bonus', 'saveBonus', sh.saveBonus)}${field('Level', 'level', sh.level)}
      ${field('Speed', 'speed', sh.speed, 'text')}${field('Senses', 'senses', sh.senses, 'text')}
    </div><p class="hint small">Tap a save or skill to change proficiency (● proficient, ◆ expertise).</p>` : ''}
  </section>`;
}

function skills(sh, edit) {
  return `<section class="card" id="sec-skills">
    <div class="card-label">Skills</div>
    <div class="skills">${S.SKILLS.map((s) => {
      const p = sh.skillProf[s.key] || 0;
      return `<button class="skill ${p ? 'prof' : ''}" ${edit ? `data-cycle-skill="${s.key}"` : 'tabindex="-1"'}>
        <span class="skill-mark">${PROF_MARK[p]}</span><span class="skill-name">${s.name}</span>
        <span class="skill-ab">${s.ab.toUpperCase()}</span><b>${S.fmt(S.skillMod(sh, s.key))}</b></button>`;
    }).join('')}</div>
  </section>`;
}

function attacks(sh) {
  return `<section class="card" id="sec-attacks">
    <div class="card-label">Attacks</div>
    ${sh.weapons.map((w) => `<div class="atk-row"><span class="atk-name">${esc(w.name)}<small>${esc(w.note)}</small></span><b>${esc(w.hit)}</b><span class="atk-dmg">${esc(w.dmg)}</span></div>`).join('')}
  </section>`;
}

function spells(sh) {
  const byLevel = [...new Set(sh.spells.map((s) => s.level))].sort();
  return `<section class="card" id="sec-spells">
    <div class="card-head"><span class="card-label">Spells</span><span class="hint small">Tap Cast to spend a slot</span></div>
    ${byLevel.map((l) => {
      const r = S.resource(sh, 'slot' + l);
      return `<div class="spell-level">Level ${l}${r ? ` · ${S.left(r)}/${r.max} slots` : ''}</div>` +
        sh.spells.filter((s) => s.level === l).map((s) =>
          `<div class="spell">
             <div><div class="spell-name">${esc(s.name)}</div><div class="spell-tags">${esc(s.tags)}</div><div class="spell-note">${esc(s.note)}</div></div>
             <button class="chip-btn" data-cast="${l}|${esc(s.name)}">Cast</button>
           </div>`).join('');
    }).join('')}
  </section>`;
}

function inventory(sh, edit) {
  const wt = S.carried(sh), cap = S.capacity(sh);
  const coins = ['pp', 'gp', 'ep', 'sp', 'cp'].map((c) =>
    `<label class="coin">${c.toUpperCase()}<input type="number" inputmode="numeric" min="0" data-sheet-path="coins.${c}" value="${sh.coins[c]}"></label>`).join('');
  const rows = sh.inventory.map((i) => `<div class="inv-row">
      <div class="inv-name">${esc(i.name)}${i.note ? `<small>${esc(i.note)}</small>` : ''}</div>
      <div class="qty">
        ${edit ? `<button class="qty-btn del" data-del-item="${esc(i.id)}" aria-label="Remove">✕</button>` : `<button class="qty-btn" data-qty="${esc(i.id)}:-1" aria-label="One less">−</button>`}
        <b>${i.qty}</b>
        ${edit ? '' : `<button class="qty-btn" data-qty="${esc(i.id)}:1" aria-label="One more">+</button>`}
      </div>
      <div class="inv-wt">${+(i.qty * i.weight).toFixed(1)} lb</div>
    </div>`).join('');
  return `<section class="card" id="sec-gear">
    <div class="card-head"><span class="card-label">Inventory</span>
      <button class="chip-btn ${edit ? 'on' : ''}" data-sheet-edit>${edit ? 'Done' : 'Edit'}</button></div>
    <div class="coins">${coins}</div>
    ${rows}
    <div class="inv-total ${wt > cap ? 'over' : ''}">Carrying ${+wt.toFixed(1)} / ${cap} lb</div>
    <div class="add-item">
      <input id="newItemName" type="text" placeholder="Add item">
      <input id="newItemQty" type="number" inputmode="numeric" min="1" placeholder="Qty">
      <input id="newItemWt" type="number" inputmode="decimal" min="0" step="0.1" placeholder="lb each">
      <button class="chip-btn" data-add-item>Add</button>
    </div>
  </section>`;
}

function features(sh) {
  return `<section class="card" id="sec-features">
    <div class="card-label">Features &amp; traits</div>
    ${sh.features.map((f) => `<details class="feature"><summary>${esc(f.title)}</summary><p>${esc(f.text)}</p></details>`).join('')}
  </section>`;
}

function notes(sh) {
  return `<section class="card" id="sec-notes">
    <div class="card-label">Notes</div>
    <textarea data-sheet-path="notes" rows="6" placeholder="Quest notes, NPC names, loot to sell…">${esc(sh.notes)}</textarea>
  </section>`;
}

export function renderSheet(sh, edit) {
  return `<div class="jump">
      <a href="#sec-hp">HP</a><a href="#sec-stats">Stats</a><a href="#sec-skills">Skills</a>
      <a href="#sec-spells">Spells</a><a href="#sec-gear">Gear</a>
      <button class="jump-undo" data-action="undo" aria-label="Undo">↶ Undo</button>
    </div>` +
    vitals(sh) + resources(sh) + stats(sh, edit) + skills(sh, edit) + attacks(sh) + spells(sh) + inventory(sh, edit) + features(sh) + notes(sh);
}
