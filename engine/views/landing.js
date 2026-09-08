// Landing page.
//
// Ported from 2026-08-11_rubrik_landing-page.dc.html. Visual language preserved;
// copy corrected. The mock was written for the previous brand ("SkillProof
// proves you understand", an SP heromark) and carried invented social proof,
// both of which are gone.

const { layout, esc, rubi, mockModeBanner } = require('./layout');
const { LEVELS, availableSkills } = require('../skills');

function render({ user }) {
  const live = availableSkills();

  const ladder = LEVELS.map(l => `
    <div style="display:grid;grid-template-columns:44px 120px 1fr auto;gap:20px;padding:18px 0;border-top:1px solid rgba(255,255,255,.12);align-items:center">
      <span class="serif" style="font-size:22px;opacity:${l.available ? '1' : '.4'};color:${l.available ? '#fa6519' : '#fff'}">${l.id}</span>
      <span style="font-size:15px;font-weight:600;letter-spacing:-.01em">${esc(l.name)}</span>
      <span class="small" style="opacity:.65">${esc(l.meaning)}</span>
      <span class="pill" style="${l.available
        ? 'background:#fa6519;color:#000'
        : 'border:1px solid rgba(255,255,255,.25);color:#fff;opacity:.6'}">${l.available ? 'Available' : 'Planned'}</span>
    </div>`).join('');

  const body = `
${mockModeBanner()}
<div class="shell">

  <header style="padding:104px 0 88px;display:grid;grid-template-columns:1fr auto;gap:64px;align-items:end">
    <div>
      <div class="pill pill-solid" style="margin-bottom:32px">
        <span class="dot" style="background:#000"></span>Performance-based verification
      </div>
      <h1 class="display display-xl" style="max-width:900px">
        A certificate proves<br>you attended.<br>
        <span class="em">rubrik. proves you<br>can actually do it.</span>
      </h1>
      <p class="lede mt-24" style="font-size:19px">
        You demonstrate the skill against a situation that shifts under you. Every judgement we
        publish is tied to a specific thing you did — quoted, timestamped, and checkable.
      </p>
      <div class="row gap-24 wrap mt-40">
        <a class="btn btn-accent" href="/skills">Pick a skill to verify</a>
        <a class="btn-link" href="/methodology">See how assessment works</a>
      </div>
    </div>
    <div class="stack end gap-10" style="flex-shrink:0">
      <div style="width:150px;height:150px;background:#fa6519;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Newsreader',serif;font-style:italic;font-size:76px;line-height:1">r<span style="font-size:44px">.</span></div>
      <div class="label">Verified · not certified</div>
    </div>
  </header>

  <!-- The actual claim, stated as a contrast. -->
  <section class="grid grid-2" style="gap:0;border:1px solid var(--line)">
    <div style="background:#fff;padding:44px 48px;border-right:1px solid var(--line)">
      <span class="label">A course certificate says</span>
      <ul class="stack gap-14 mt-24" style="list-style:none">
        <li class="row gap-14 start" style="font-size:16px;opacity:.55"><span style="color:var(--muted)">—</span>You watched the material</li>
        <li class="row gap-14 start" style="font-size:16px;opacity:.55"><span style="color:var(--muted)">—</span>You answered the questions it asked</li>
        <li class="row gap-14 start" style="font-size:16px;opacity:.55"><span style="color:var(--muted)">—</span>On one day, once, and never again</li>
      </ul>
    </div>
    <div style="background:#000;color:#fff;padding:44px 48px">
      <span class="label label-accent">A rubrik. verification says</span>
      <ul class="stack gap-14 mt-24" style="list-style:none">
        <li class="row gap-14 start" style="font-size:16px;font-weight:500"><span style="color:#fa6519">+</span>You handled a situation that changed on you</li>
        <li class="row gap-14 start" style="font-size:16px;font-weight:500"><span style="color:#fa6519">+</span>Here is the exact evidence, quoted from your session</li>
        <li class="row gap-14 start" style="font-size:16px;font-weight:500"><span style="color:#fa6519">+</span>And here is precisely what it does <em>not</em> cover</li>
      </ul>
    </div>
  </section>

  <!-- How it works -->
  <section id="how" style="padding:88px 0 24px">
    <div class="row between baseline wrap gap-18">
      <h2 class="display display-m">How a verification works</h2>
      <span class="label">Four steps · roughly 20 minutes</span>
    </div>
    <div class="grid grid-3 mt-24" style="gap:1px;background:var(--line);border:1px solid var(--line)">
      ${[
        ['01', 'You demonstrate', 'A live simulation or a real artefact — never multiple choice, and nothing that can be memorised in advance.'],
        ['02', 'The situation shifts', 'The client turns out to have misdiagnosed her problem. The brief changes after you commit. Adapting is the assessment.'],
        ['03', 'Evidence is scored', 'Fixed public anchors, scored 0/1/2. No score above zero exists without a quote or a measurement behind it.'],
        ['04', 'A verdict, with limits', 'A threshold fixed in advance, not a model\u2019s opinion. The credential names the competency, the level and its assurance tier.'],
        ['05', 'It becomes reusable', 'The result sits on a public profile you control, so you prove a competency once rather than in every application.'],
        ['06', 'Anyone can audit the method', 'Rubrics and level definitions are published. A hiring manager can judge the system without seeing a single candidate.'],
      ].map(([n, h, p]) => `
        <div style="background:#fff;padding:28px 26px">
          <span class="label label-accent">${n}</span>
          <h3 class="display display-s mt-14">${esc(h)}</h3>
          <p class="small mt-8" style="opacity:.68">${p}</p>
        </div>`).join('')}
    </div>
  </section>

  <!-- Live skills -->
  <section style="padding:64px 0 0">
    <div class="row between baseline wrap gap-18">
      <h2 class="display display-m">Verifiable today</h2>
      <a class="btn-link small" href="/skills" style="opacity:1">See the full catalogue →</a>
    </div>
    <div class="grid grid-2 mt-24">
      ${live.map(s => `
        <a class="panel card-lift" href="/skills/${esc(s.id)}" style="border-color:#000;text-decoration:none;display:flex;flex-direction:column;gap:16px;padding:26px">
          <div class="row between start gap-14">
            <span class="label">${esc(s.code)}</span>
            <span class="pill pill-accent">${esc(s.verification.level)} · ${esc(s.archetype.split(' / ')[0])}</span>
          </div>
          <div>
            <h3 class="display" style="font-size:30px">${esc(s.name)}</h3>
            <p class="small mt-8">${esc(s.blurb)}</p>
          </div>
          <div class="row between mt-14" style="padding-top:14px;border-top:1px dashed var(--line)">
            <span class="label" style="display:inline">Verifies · ${esc(s.verification.competency)}</span>
            <span style="font-size:13px;font-weight:600;color:var(--accent)">Start →</span>
          </div>
        </a>`).join('')}
    </div>
  </section>

  <!-- Level ladder = trust ladder -->
  <section id="levels" class="panel-dark" style="margin:80px 0 0;padding:48px">
    <div class="grid" style="grid-template-columns:1fr 1.5fr;gap:48px;align-items:start">
      <div>
        <span class="label label-accent">The level is the trust tier</span>
        <h2 class="display" style="font-size:34px;margin-top:14px;line-height:1.05">
          A low-assurance<br>result should<br><span class="em">say so.</span>
        </h2>
        <p class="small mt-18" style="opacity:.62">
          Levels differ by how much the situation misleads you, not by how hard the task is.
          Each level states the assurance it can honestly claim — so a verifier knows what
          weight to give it. V1 verifies at L2.
        </p>
      </div>
      <div class="stack">${ladder}
        <div style="border-top:1px solid rgba(255,255,255,.12)"></div>
      </div>
    </div>
  </section>

  <section style="padding:72px 0 0" class="row between wrap gap-24">
    <div>
      <h2 class="display display-l">Prove one thing<br>properly.</h2>
      <p class="lede mt-14" style="font-size:17px">Two competencies are verifiable end to end right now.</p>
    </div>
    <a class="btn btn-accent" href="/skills" style="padding:18px 32px">Start a verification</a>
  </section>

</div>`;

  return layout({
    title: 'Verified skills, not certificates',
    description: 'rubrik. verifies whether you can actually demonstrate a competency — through realistic work, adaptation and evidence-linked assessment.',
    here: '',
    body,
    rubi: rubi('watching', `"Everyone <span style="color:#fa6519">says</span> they can. Show me."`),
  });
}

module.exports = { render };
