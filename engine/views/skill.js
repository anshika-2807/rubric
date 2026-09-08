// Skill / verification overview — the step between picking a skill and starting.
//
// This page carries the load for one of V1's honesty requirements: Consultancy is
// the skill, Problem Framing L2 is the competency being verified. The competency
// map is rendered in full with exactly one node marked as in scope, so the
// candidate can see the size of the claim before they start rather than
// discovering it on the credential afterwards.

const { layout, esc, rubi, mockModeBanner } = require('./layout');
const { credentialDescriptor, LEVELS } = require('../skills');

function unavailable(skill) {
  return `
<div class="shell" style="padding:80px 0">
  <span class="label">${esc(skill.code)}</span>
  <h1 class="display display-l mt-14">${esc(skill.name)}</h1>
  <p class="lede mt-18">${esc(skill.blurb)}</p>
  <div class="notice mt-24" style="max-width:64ch">
    <span class="notice-mark">◆</span>
    <span>This assessment is not built yet, and we are not going to pretend otherwise. It needs a
    competency spec, level definitions and calibrated scoring anchors before it can produce a result
    anyone should trust.</span>
  </div>
  <div class="row gap-18 mt-24"><a class="btn" href="/skills">← Back to skills</a></div>
</div>`;
}

function render({ skill, user }) {
  if (!skill.available) {
    return layout({ title: skill.name, here: 'skills', body: unavailable(skill) });
  }

  const v = skill.verification;
  const d = credentialDescriptor(skill.id);

  // The competency map, with the single in-scope node marked.
  const map = (skill.clusters || []).map(c => `
    <div style="padding:16px 0;border-top:1px solid var(--line)">
      <span class="label">${esc(c.name)}</span>
      <div class="row gap-8 wrap mt-8">
        ${c.competencies.map(name => {
          const inScope = name === v.competency;
          return `<span class="pill" style="${inScope
            ? 'background:#fa6519;color:#000;font-weight:600'
            : 'border:1px solid var(--line);background:#fff;opacity:.5'};text-transform:none;font-size:12px;letter-spacing:0;font-family:var(--sans);padding:7px 12px">
            ${inScope ? '◆ ' : ''}${esc(name)}</span>`;
        }).join('')}
      </div>
    </div>`).join('');

  const levelRow = LEVELS.map(l => `
    <div class="row between gap-14" style="padding:11px 0;border-top:1px solid var(--line);${l.id === v.level ? 'background:var(--accent-soft);margin:0 -12px;padding-left:12px;padding-right:12px' : ''}">
      <span class="row gap-10">
        <span class="mono" style="font-size:12px;font-weight:500;color:${l.id === v.level ? 'var(--accent)' : 'inherit'};opacity:${l.id === v.level ? 1 : .5}">${l.id}</span>
        <span style="font-size:13px;font-weight:${l.id === v.level ? 600 : 400};opacity:${l.id === v.level ? 1 : .55}">${esc(l.name)}</span>
      </span>
      <span class="label" style="display:inline;opacity:${l.id === v.level ? .8 : .35}">${l.id === v.level ? 'This assessment' : (l.available ? 'Available' : 'Planned')}</span>
    </div>`).join('');

  const body = `
${mockModeBanner()}
<div class="shell">

  <header style="padding:56px 0 40px">
    <div class="row gap-10 wrap" style="margin-bottom:20px">
      <a class="label" href="/skills" style="display:inline;text-decoration:none">← Skills</a>
      <span class="label" style="display:inline;opacity:.3">/</span>
      <span class="label" style="display:inline">${esc(skill.code)}</span>
    </div>
    <div class="grid" style="grid-template-columns:1.5fr 1fr;gap:56px;align-items:end">
      <div>
        <h1 class="display display-xl">${esc(skill.name)}</h1>
        <p class="lede mt-18">${esc(skill.blurb)}</p>
      </div>
      <div class="panel-dark">
        <span class="label label-accent">You are verifying</span>
        <div class="display" style="font-size:27px;margin-top:10px;line-height:1.1">${esc(v.competency)}</div>
        <div class="row gap-8 wrap mt-14">
          <span class="pill pill-solid">${esc(v.level)} · ${esc(d.levelName)}</span>
          <span class="pill" style="border:1px solid rgba(255,255,255,.25);color:#fff">${esc(v.archetype)}</span>
        </div>
        <p class="small mt-14" style="opacity:.7">${esc(d.levelMeaning)}</p>
      </div>
    </div>
  </header>

  <!-- Scope. The most important block on the page. -->
  <section class="grid grid-2" style="gap:18px">
    <div class="panel-hard" style="border-color:var(--accent)">
      <span class="label label-accent">✓ What a pass certifies</span>
      <p class="body mt-14">${esc(v.certifies)}</p>
    </div>
    <div class="panel-hard">
      <span class="label">✕ What it does not</span>
      <p class="body mt-14" style="opacity:.78">${esc(v.doesNotCertify)}</p>
    </div>
  </section>

  <!-- Competency map -->
  <section style="padding:56px 0 0">
    <div class="row between baseline wrap gap-14">
      <h2 class="display display-m">Where this sits in ${esc(skill.name)}</h2>
      <span class="label" style="display:inline">1 of ${(skill.clusters || []).reduce((n, c) => n + c.competencies.length, 0)} competencies</span>
    </div>
    <div class="panel mt-18" style="padding:6px 24px 20px">
      ${map}
    </div>
    <p class="small mt-14" style="max-width:70ch">
      ${esc(skill.crossCutting)} Competencies do not sum to a skill — orchestrating them under real
      conditions is its own competence, which is what the L3 capstone is for. Verifying one node
      narrows what a later skill-level assessment has to cover; it never replaces it.
    </p>
  </section>

  <!-- The task -->
  <section style="padding:56px 0 0">
    <div class="grid" style="grid-template-columns:1.3fr 1fr;gap:36px;align-items:start">
      <div>
        <h2 class="display display-m">The task</h2>
        <p class="body mt-14" style="font-size:17px">${esc(v.task)}</p>
        <div class="stack gap-10 mt-24">
          ${v.whatYouDo.map((step, i) => `
            <div class="row gap-14 start">
              <span class="mono" style="font-size:11px;color:var(--accent);padding-top:4px">0${i + 1}</span>
              <span class="body" style="opacity:.82">${esc(step)}</span>
            </div>`).join('')}
        </div>

        <h3 class="display display-s mt-40">What is being measured</h3>
        <ul class="stack gap-10 mt-14" style="list-style:none">
          ${v.measures.map(m => `<li class="row gap-12 start"><span style="color:var(--accent)">—</span><span class="small" style="opacity:.82">${esc(m)}</span></li>`).join('')}
        </ul>
        <p class="small mt-18" style="opacity:.6;max-width:64ch">
          We publish what we measure on purpose. The anchors are public; what stays private is the
          specific scenario you get. Knowing the criteria does not help you fake them — that is the
          test of whether the anchors are any good.
        </p>
      </div>

      <div class="stack gap-18">
        <div class="panel">
          <span class="label">How evidence is produced</span>
          <div class="stack gap-14 mt-14">
            ${v.evidenceStreams.map(s => `
              <div>
                <div style="font-size:13px;font-weight:600">${esc(s.name)}</div>
                <p class="small mt-8" style="opacity:.7">${esc(s.how)}</p>
              </div>`).join('')}
          </div>
        </div>

        <div class="panel">
          <span class="label">Level ladder</span>
          <div class="mt-8">${levelRow}</div>
          <div style="border-top:1px solid var(--line)"></div>
        </div>

        <div class="panel">
          <span class="label">Assurance tier</span>
          <div class="pill pill-accent mt-8">${esc(d.assurance.tier)}</div>
          <p class="small mt-14" style="opacity:.7">${esc(d.assurance.note)}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Start -->
  <section class="panel-hard mt-64" style="padding:36px">
    <div class="grid" style="grid-template-columns:1fr auto;gap:32px;align-items:end">
      <div>
        <h2 class="display display-m">Ready?</h2>
        <p class="small mt-8" style="max-width:60ch">
          Roughly ${v.durationMin} minutes, in one sitting. Scoring stays hidden until you finish —
          you will not be able to steer toward a number. Your name appears on your public profile
          and nowhere else.
        </p>
        <label class="label mt-18" for="name" style="display:block">Your name</label>
        <input class="field mt-8" id="name" type="text" maxlength="60" style="max-width:340px"
               placeholder="e.g. Anshika Rao" value="${esc(user && user.display_name !== 'Candidate' ? user.display_name : '')}"
               autocomplete="name">
        <p class="small mt-8" id="err" style="color:#b00;display:none"></p>
      </div>
      <button class="btn btn-accent" id="start" style="padding:18px 32px">Start verification →</button>
    </div>
  </section>

</div>`;

  const tail = `<script>
(function () {
  var btn = document.getElementById('start');
  var name = document.getElementById('name');
  var err = document.getElementById('err');

  function fail(msg) { err.textContent = msg; err.style.display = 'block'; btn.disabled = false; btn.textContent = 'Start verification →'; }

  btn.addEventListener('click', async function () {
    var value = name.value.trim();
    if (!value) { name.focus(); return fail('Enter a name so your result can be attributed.'); }
    btn.disabled = true; btn.textContent = 'Starting…'; err.style.display = 'none';
    try {
      var res = await fetch('/api/identity', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: value })
      });
      if (!res.ok) { var e = await res.json().catch(function () { return {}; }); return fail(e.error || 'Could not save your name.'); }
      window.location.href = ${JSON.stringify(v.assessmentPath)};
    } catch (e) { fail('Network problem — check your connection and try again.'); }
  });

  name.addEventListener('keydown', function (e) { if (e.key === 'Enter') btn.click(); });
})();
</script>`;

  return layout({
    title: `${skill.name} · ${v.competency} ${v.level}`,
    description: `${v.certifies} ${v.doesNotCertify}`,
    here: 'skills',
    body,
    tail,
    rubi: rubi('watching', `"Read the <span style="color:#fa6519">second</span> box. The one about what this isn't."`),
  });
}

module.exports = { render };
