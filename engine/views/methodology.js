// Methodology — public, always.
//
// Blueprint §10: a verifier should be able to trust the system without seeing any
// candidate's evidence. That requires the rubrics, the level definitions and the
// scoring policy to be public. This page is the cheapest possible honest version
// of that: it publishes the real anchors from the real assessments, read out of
// the same modules the evaluator uses, so it cannot drift from what is scored.

const { layout, esc, rubi } = require('./layout');
const { LEVELS, availableSkills, V1_ASSURANCE } = require('../skills');
const { PROBLEM_FRAMING_L2, SECONDARY } = require('../anchors');
const { COMPOSITION_L2 } = require('../composition/anchors');

function anchorTable(set) {
  return `
  <div class="panel" style="padding:0 24px 18px">
    <div style="padding:18px 0 4px" class="row between baseline wrap gap-10">
      <span class="label">${esc(set.competency)} · ${esc(set.level)}</span>
      <span class="label" style="display:inline">Pass at ${set.passThreshold} of ${set.anchors.length * 2} points, and no universal fail</span>
    </div>
    ${set.anchors.map(a => `
      <div style="display:grid;grid-template-columns:64px 1fr;gap:16px;padding:13px 0;border-top:1px solid var(--line)">
        <span class="mono" style="font-size:11px;color:var(--accent)">${esc(a.id)}</span>
        <span class="small" style="opacity:.85">${esc(a.text)}</span>
      </div>`).join('')}
    <div style="padding:18px 0 4px;border-top:1px solid var(--line)">
      <span class="label">Universal fails — any one of these fails the level regardless of points</span>
    </div>
    ${set.universalFails.map(f => `
      <div style="display:grid;grid-template-columns:64px 1fr;gap:16px;padding:11px 0;border-top:1px solid var(--line)">
        <span class="mono" style="font-size:11px;opacity:.5">${esc(f.id)}</span>
        <span class="small" style="opacity:.72">${esc(f.text)}</span>
      </div>`).join('')}
  </div>`;
}

function render({ user }) {
  const body = `
<div class="shell">

  <header style="padding:64px 0 40px;max-width:78ch">
    <span class="label label-accent">Methodology · public</span>
    <h1 class="display display-xl mt-14">How we decide<br>you <span class="em">can</span>.</h1>
    <p class="lede mt-24">
      Everything on this page is public on purpose. A verifier should be able to judge whether our
      signal means anything without ever seeing a candidate's transcript — and a candidate should
      know the criteria in advance. If knowing the anchors let you fake them, the anchors would be
      the problem.
    </p>
  </header>

  <section class="grid grid-3" style="gap:1px;background:var(--line);border:1px solid var(--line)">
    ${[
      ['Evidence-linked', 'Every anchor score above zero cites the exact thing you said, or a measurement taken from what you submitted. No quote, no points.'],
      ['Conclusion-blind', 'For judgement tasks there is no answer key. The evaluator scores your process, whether your reasoning is consistent with what you actually discovered, and how you defend it — never whether we agree with your conclusion.'],
      ['Policy, not opinion', 'The model proposes anchor scores. The pass threshold and the universal-fail rules are fixed in code and applied afterwards. A model cannot decide to pass you.'],
      ['Two streams', 'Alongside the scored anchors runs something computed rather than judged — a client trust curve, or geometric measurements of what you built. You can talk your way past a rubric; you cannot talk your way past arithmetic.'],
      ['Open-book', 'Assume you will look things up. The assessments are built so that shortcuts still require understanding — the situation changes underneath you, and you have to explain what you did.'],
      ['Nothing memorisable', 'No item bank, no fixed questions. The scenario instance is private and the shift is the point, so last year\u2019s answers are worth nothing.'],
    ].map(([h, p]) => `
      <div style="background:#fff;padding:26px">
        <h3 class="display display-s">${esc(h)}</h3>
        <p class="small mt-8" style="opacity:.7">${p}</p>
      </div>`).join('')}
  </section>

  <section style="padding:64px 0 0">
    <h2 class="display display-m">Levels</h2>
    <p class="small mt-8" style="max-width:70ch">
      Levels differ by how much the situation misleads or moves, not by how hard the task is. The
      ladder doubles as a trust ladder: each level states the assurance it can honestly claim, so a
      low-assurance result is legible as one.
    </p>
    <div class="panel mt-18" style="padding:0 24px 20px">
      ${LEVELS.map(l => `
        <div style="display:grid;grid-template-columns:48px 130px 1fr 220px;gap:18px;padding:16px 0;border-top:1px solid var(--line);align-items:baseline">
          <span class="mono" style="font-size:13px;color:${l.available ? 'var(--accent)' : 'inherit'};opacity:${l.available ? 1 : .45}">${l.id}</span>
          <span style="font-size:14px;font-weight:600;opacity:${l.available ? 1 : .55}">${esc(l.name)}</span>
          <span class="small" style="opacity:.7">${esc(l.meaning)}</span>
          <span class="small mono" style="font-size:11px;opacity:.6">${esc(l.assurance)}</span>
        </div>`).join('')}
    </div>
    <div class="notice mt-14">
      <span class="notice-mark">◆</span>
      <span>Only <strong>L2</strong> is available today, at one assurance tier: <strong>${esc(V1_ASSURANCE.tier)}</strong>.
      ${esc(V1_ASSURANCE.note)}</span>
    </div>
  </section>

  <section style="padding:64px 0 0">
    <h2 class="display display-m">The anchors we score against</h2>
    <p class="small mt-8" style="max-width:70ch">
      These are the live rubrics, printed from the same modules the evaluator loads. Scores are
      0 (absent), 1 (present), 2 (present with distinction).
    </p>
    <div class="stack gap-18 mt-18">
      ${anchorTable(PROBLEM_FRAMING_L2)}
      ${anchorTable(COMPOSITION_L2)}
    </div>
    <div class="panel mt-18" style="padding:0 24px 18px">
      <div style="padding:18px 0 4px"><span class="label">Secondary evidence — recorded, and can accrue even when the primary competency does not pass</span></div>
      ${SECONDARY.flatMap(s => s.anchors.map(a => `
        <div style="display:grid;grid-template-columns:64px 1fr;gap:16px;padding:11px 0;border-top:1px solid var(--line)">
          <span class="mono" style="font-size:11px;opacity:.5">${esc(a.id)}</span>
          <span class="small" style="opacity:.72">${esc(a.text)}</span>
        </div>`)).join('')}
    </div>
  </section>

  <section style="padding:64px 0 0">
    <h2 class="display display-m">What this version does not do</h2>
    <p class="small mt-8" style="max-width:70ch">
      Listing the gaps is part of the method. A verification product that overstates itself is worse
      than none.
    </p>
    <div class="grid grid-2 mt-18">
      ${[
        ['No identity verification', 'We know a session happened and what was said in it. We do not know who was sitting there. Proctoring and photo checks belong to L3 and above, which do not exist yet.'],
        ['No human review', 'No appeals process, no expert audit, no random sampling for evaluator drift. All of that is designed and none of it is built.'],
        ['No evidence ledger yet', 'Results accumulate on a profile, but there is no transfer between skills, no gap analysis, and no decay. A verification here does not yet expire, which means recency is not being priced in.'],
        ['One scenario per competency', 'The instance should be generated fresh per candidate from a private template. Today there is one hand-authored instance, so it is repeatable in a way production would not be.'],
        ['No baseline-relative scoring', 'The bar should be set as a delta above what current frontier models produce unaided. We have not run those baselines, so we do not claim it.'],
        ['No capstone', 'Skill-level claims need an integrative assessment. We verify individual competencies, and the credential says so explicitly.'],
      ].map(([h, p]) => `
        <div class="panel">
          <span class="label">✕</span>
          <h3 style="font-size:15px;font-weight:600;margin-top:6px">${esc(h)}</h3>
          <p class="small mt-8" style="opacity:.7">${esc(p)}</p>
        </div>`).join('')}
    </div>
  </section>

  <section class="panel-dark mt-64" style="padding:40px">
    <div class="row between wrap gap-24 end">
      <div style="max-width:56ch">
        <span class="label label-accent">Try it yourself</span>
        <h2 class="display" style="font-size:30px;margin-top:12px">The fastest way to judge<br>an assessment is to take it.</h2>
        <p class="small mt-14" style="opacity:.68">Hiring managers included. Both live assessments are open, and take about twenty minutes.</p>
      </div>
      <a class="btn btn-accent" href="/skills">See the ${availableSkills().length} live assessments</a>
    </div>
  </section>

</div>`;

  return layout({
    title: 'Methodology',
    description: 'The rubrics, level definitions, scoring policy and known limitations behind a rubrik. verification.',
    here: 'methodology',
    body,
    rubi: rubi('watching', `"Read the last section. That's the <span style="color:#fa6519">honest</span> one."`),
  });
}

module.exports = { render };
