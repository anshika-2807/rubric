// Skill picker.
//
// Ported from 2026-08-11_rubrik_skill-picker.dc.html. Two changes of substance:
//
//   * The mock's "SHOWING 12 OF 84" and per-skill "4.2k verified" counts were
//     invented. A trust product cannot ship invented numbers, so the count is
//     now the real catalogue size and the fake tallies are gone.
//   * The mock made all nine cards link to the same session page. Only skills
//     that actually run are clickable; the rest are visibly planned.

const { layout, esc, rubi, mockModeBanner } = require('./layout');
const { SKILLS, CATEGORIES, availableSkills } = require('../skills');

function card(s) {
  const inner = `
    <div class="row between start gap-14">
      <span class="label">${esc(s.code)}</span>
      <span class="pill ${s.available ? 'pill-accent' : 'pill-line'}">${esc(s.archetype.split(' / ')[0])}</span>
    </div>
    <div>
      <h3 class="display" style="font-size:28px">${esc(s.name)}</h3>
      <p class="small mt-8">${esc(s.blurb)}</p>
    </div>`;

  if (s.available) {
    const v = s.verification;
    return `<a class="panel card-lift" href="/skills/${esc(s.id)}"
      style="border-color:#000;text-decoration:none;display:flex;flex-direction:column;gap:16px;min-height:250px;padding:24px">
      ${inner}
      <div class="row between mt-14" style="margin-top:auto;padding-top:14px;border-top:1px dashed var(--line)">
        <span class="label" style="display:inline">${esc(v.level)} · ~${v.durationMin} min</span>
        <span style="font-size:13px;font-weight:600;color:var(--accent)">Start →</span>
      </div>
    </a>`;
  }

  return `<div class="panel" aria-disabled="true"
    style="display:flex;flex-direction:column;gap:16px;min-height:250px;padding:24px;opacity:.58">
    ${inner}
    <div class="row between" style="margin-top:auto;padding-top:14px;border-top:1px dashed var(--line)">
      <span class="label" style="display:inline">Not yet available</span>
      <span class="label" style="display:inline;opacity:.4">—</span>
    </div>
  </div>`;
}

function render({ user }) {
  const liveCount = availableSkills().length;

  const body = `
${mockModeBanner()}
<div class="shell">

  <header style="padding:72px 0 48px;display:grid;grid-template-columns:1.4fr 1fr;gap:64px;align-items:end">
    <div>
      <div class="pill pill-dark" style="margin-bottom:26px"><span class="dot"></span>Step 01 — Pick a skill</div>
      <h1 class="display display-xl">What can you<br><span class="em">actually do</span>?</h1>
      <p class="lede mt-24">
        Each skill declares its own assessment format — a live simulation, an artefact you have to
        defend, a task with a checkable output. Nothing here is multiple choice.
      </p>
    </div>
    <div class="row end gap-14" style="justify-content:flex-end">
      <div style="background:#fa6519;color:#000;padding:14px 16px;transform:rotate(-3deg)">
        <div class="serif italic" style="font-size:22px;line-height:1">${liveCount} live</div>
        <div class="label" style="margin-top:6px;opacity:1">END TO END →</div>
      </div>
      <div style="background:#000;color:#fff;padding:14px 16px;transform:rotate(2deg)">
        <div class="serif italic" style="font-size:22px;line-height:1">~20 min</div>
        <div class="label" style="margin-top:6px;opacity:.8">PER COMPETENCY</div>
      </div>
    </div>
  </header>

  <div class="panel row between wrap gap-14" style="padding:16px 20px;margin-bottom:28px">
    <div class="row gap-8 wrap">
      ${CATEGORIES.map((c, i) => `<span class="pill ${i === 0 ? 'pill-dark' : 'pill-line'}"
        style="text-transform:none;font-size:12px;letter-spacing:0;font-family:var(--sans);font-weight:500;padding:8px 13px">${esc(c)}</span>`).join('')}
    </div>
    <span class="label" style="display:inline">${SKILLS.length} in catalogue · ${liveCount} verifiable now</span>
  </div>

  <div class="grid grid-3">${SKILLS.map(card).join('')}</div>

  <div class="notice mt-24">
    <span class="notice-mark">◆</span>
    <span>Greyed-out skills are planned, not hidden behind a paywall. We would rather show you an
    empty shelf than a card that pretends to lead somewhere. Building an assessment means writing
    the competency spec, the level definitions and the scoring anchors first —
    <a href="/methodology" style="color:var(--accent)">that method is published</a>.</span>
  </div>

</div>`;

  return layout({
    title: 'Skills',
    description: 'Pick a competency to verify. Each skill declares its own assessment archetype.',
    here: 'skills',
    body,
    rubi: rubi('watching', `"Pick <span style="color:#fa6519">one</span>. Properly."`),
  });
}

module.exports = { render };
