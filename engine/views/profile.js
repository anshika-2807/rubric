// Public profile / résumé.
//
// Ported from 2026-08-11_rubrik_public-resume.dc.html. The visual language is
// kept; the invented content is not. The mock shipped a fictional person (Dana
// Okonkwo, 7 skills, 42 rounds, 94% pass rate), a strengths radar over invented
// dimensions, two named human proctors delivering endorsement quotes, and a
// re-verification cadence. V1 has no human review and no decay, so all of that
// is removed rather than faked. Every number on this page is counted from the
// candidate's real attempts.
//
// The point of the page, per the blueprint flywheel: prove a competency once and
// carry it, instead of re-proving it in every application.

const { layout, esc, rubi, logoMark } = require('./layout');
const { credentialDescriptor, bySkillId, V1_ASSURANCE } = require('../skills');

function initials(name) {
  const parts = String(name || 'C').trim().split(/\s+/);
  return ((parts[0] || '')[0] || '' + (parts[1] ? parts[1][0] : '')).toUpperCase().slice(0, 2) ||
    (parts[0] || 'C').slice(0, 2).toUpperCase();
}

function statusOf(attempt) {
  if (attempt.grading === 'model') return attempt.pass
    ? { label: 'Verified', cls: 'pill-solid' }
    : { label: 'Not passed', cls: 'pill-line' };
  if (attempt.grading === 'degraded') return { label: 'Provisional', cls: 'pill-line' };
  return { label: 'Demo', cls: 'pill-line' };
}

// ── empty state (no identity, or a signed-in user with nothing yet) ──────────

function emptyState({ signedIn }) {
  return `
<div class="shell" style="padding:80px 0 120px;max-width:66ch">
  <span class="label label-accent">Public profile</span>
  <h1 class="display display-xl mt-14">Nothing verified<br><span class="em">yet.</span></h1>
  <p class="lede mt-18">
    ${signedIn
      ? 'You have an identity but no completed verifications. Prove one competency and it appears here, with the evidence behind it — ready to share.'
      : 'A rubrik. profile collects the competencies you have verified, each linked to the evidence that earned it. Verify one to begin.'}
  </p>
  <div class="row gap-18 mt-40 wrap">
    <a class="btn btn-accent" href="/skills">Verify a skill</a>
    <a class="btn-link" href="/methodology">How assessment works</a>
  </div>
</div>`;
}

// ── page ─────────────────────────────────────────────────────────────────────

function render({ owner, verified, attempts, isOwner, signedIn }) {
  if (!owner) return layout({ title: 'Profile', here: 'profile', body: emptyState({ signedIn }) });

  const completed = attempts.filter(a => a.status === 'complete');
  const verifiedRows = verified;                       // already only genuine passes
  const skillsCovered = new Set(verifiedRows.map(v => v.skill_id));
  const highest = verifiedRows.length ? verifiedRows.map(v => v.level).sort().reverse()[0] : null;

  if (!verifiedRows.length && !completed.length) {
    return layout({ title: `${owner.display_name} · profile`, here: 'profile', body: emptyState({ signedIn: isOwner }) });
  }

  const stats = [
    { value: String(verifiedRows.length), label: 'Verified competencies', accent: true },
    { value: String(completed.length), label: 'Assessments taken' },
    { value: String(skillsCovered.size), label: 'Skills touched' },
    { value: highest || '—', label: 'Highest level', accent: Boolean(highest) },
  ];

  const verifiedList = verifiedRows.map(v => {
    const d = credentialDescriptor(v.skill_id) || {};
    const date = v.verified_at ? new Date(v.verified_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    return `<a href="/result/${esc(v.attempt_id)}" style="text-decoration:none;color:inherit;display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center;padding:16px 0;border-top:1px solid var(--line)" class="card-lift">
      <div class="stack gap-4">
        <div class="row gap-10 baseline wrap">
          <span style="font-size:15px;font-weight:600">${esc(d.competency || v.competency_id)}</span>
          <span class="mono" style="font-size:9px;opacity:.45">${esc(d.skill || v.skill_id)}</span>
        </div>
        <span class="small" style="opacity:.62">Verified ${esc(date)} · ${esc(d.level || v.level)} · provenance tier ${v.provenance} · ${esc(v.assurance_tier || V1_ASSURANCE.tier)}</span>
      </div>
      <span class="pill pill-solid">Verified →</span>
    </a>`;
  }).join('');

  const history = completed.map(a => {
    const d = credentialDescriptor(a.skill_id) || {};
    const s = statusOf(a);
    const date = a.completed_at ? new Date(a.completed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';
    return `<a href="/result/${esc(a.id)}" style="text-decoration:none;color:inherit;display:grid;grid-template-columns:64px 1fr auto;gap:16px;align-items:start;padding:12px 0;border-top:1px solid var(--line)">
      <span class="mono" style="font-size:11px;opacity:.6">${esc(date)}</span>
      <div class="stack gap-2">
        <span style="font-size:13px;font-weight:600">${esc(d.competency || a.competency_id)} · ${esc(a.level)}</span>
        <span class="small" style="opacity:.6">${esc(d.skill || a.skill_id)} · ${a.points}/${a.max_points} points</span>
      </div>
      <span class="pill ${s.cls}">${esc(s.label)}</span>
    </a>`;
  }).join('');

  const body = `
<div class="shell" style="padding:32px 0 96px">

  <div class="row between wrap gap-14 no-print" style="margin-bottom:24px">
    <span class="label">Public profile · /${esc(owner.handle)}</span>
    <div class="row gap-10 wrap">
      ${isOwner ? '<a class="btn btn-quiet btn-sm" href="/skills">+ Verify a skill</a>' : ''}
      <button class="btn btn-quiet btn-sm" id="copyProfile" type="button">Copy link</button>
      <button class="btn btn-sm" onclick="window.print()" type="button">Print / PDF</button>
    </div>
  </div>

  <!-- Printable card -->
  <div class="panel-hard" style="padding:0;position:relative;overflow:hidden">
    <div style="height:6px;background:var(--accent)"></div>
    <div style="padding:40px 40px 32px">

      <!-- header -->
      <div class="row between end wrap gap-24" style="padding-bottom:24px;border-bottom:2px solid #000">
        <div>
          <div class="row gap-10 baseline">
            <span class="label label-accent">Verified profile · rubrik.</span>
          </div>
          <h1 class="display" style="font-size:48px;margin-top:8px">${esc(owner.display_name)}</h1>
          <p class="small mt-8" style="opacity:.7">/${esc(owner.handle)} · every entry links to the evidence that earned it</p>
        </div>
        <div class="right">
          <div style="width:76px;height:76px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-style:italic;font-size:34px;margin-left:auto">${esc(initials(owner.display_name))}</div>
        </div>
      </div>

      <!-- statement -->
      <p class="serif mt-24" style="font-size:20px;line-height:1.4">
        ${verifiedRows.length
          ? `<span style="background:var(--accent-soft);padding:0 4px">${verifiedRows.length} verified ${verifiedRows.length === 1 ? 'competency' : 'competencies'}</span>, each backed by a recorded assessment. <span class="em">No self-reporting.</span>`
          : `Assessments taken, none yet cleared to a verified competency. The record below is <span class="em">exactly</span> as it stands.`}
      </p>

      <!-- stats -->
      <div class="grid" style="grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);border:1px solid var(--line);margin-top:24px">
        ${stats.map(s => `<div style="background:#fff;padding:20px 16px;text-align:center">
          <div class="serif" style="font-size:32px;line-height:1;color:${s.accent ? 'var(--accent)' : '#000'}">${esc(s.value)}</div>
          <div class="label" style="margin-top:7px">${esc(s.label)}</div>
        </div>`).join('')}
      </div>

      <!-- verified competencies -->
      ${verifiedRows.length ? `
      <section style="margin-top:32px">
        <div class="row between baseline"><h2 class="display display-s">Verified competencies</h2>
          <span class="label">${verifiedRows.length} · click through to the evidence</span></div>
        <div class="mt-8">${verifiedList}<div style="border-top:1px solid var(--line)"></div></div>
      </section>` : `
      <div class="notice mt-24"><span class="notice-mark">◆</span>
        <span>No competency has cleared verification yet. Assessments taken are listed below, honestly, with their real outcome.</span></div>`}

      <!-- history -->
      ${completed.length ? `
      <section style="margin-top:32px">
        <h2 class="display display-s">Assessment history</h2>
        <div class="mt-8">${history}<div style="border-top:1px solid var(--line)"></div></div>
      </section>` : ''}

      <!-- attestation footer -->
      <footer class="row between wrap gap-18" style="margin-top:32px;padding-top:20px;border-top:1px solid var(--line)">
        <div class="mono" style="font-size:10px;opacity:.6;line-height:1.7">
          ATTESTATION · ${esc(owner.handle).toUpperCase()}<br>
          ASSURANCE · ${esc(V1_ASSURANCE.tier).toUpperCase()} · NO IDENTITY VERIFICATION AT THIS TIER
        </div>
        <div class="row gap-10">
          ${logoMark(40, 15)}
          <div class="stack">
            <span class="serif italic" style="font-size:14px">rubrik.</span>
            <span class="label" style="display:block">Verified · not certified</span>
          </div>
        </div>
      </footer>

    </div>
  </div>

  <!-- honesty note, off the printable card -->
  <div class="notice mt-24 no-print">
    <span class="notice-mark">◆</span>
    <span>This profile shows verified competencies, not a whole skill. It carries no endorsements or human
    review — V1 has neither. Verifications do not yet expire, because competency decay is not implemented.
    <a href="/methodology" style="color:var(--accent)">The method, and its limits, are published.</a></span>
  </div>

</div>`;

  const tail = `<script>
    var b = document.getElementById('copyProfile');
    if (b) b.addEventListener('click', function () {
      navigator.clipboard.writeText(window.location.origin + '/profile/' + ${JSON.stringify(owner.handle)}).then(function(){
        b.textContent = 'Copied'; setTimeout(function(){ b.textContent = 'Copy link'; }, 1500);
      });
    });
  </script>`;

  return layout({
    title: `${owner.display_name} · verified profile`,
    description: `${owner.display_name}'s verified competencies on rubrik. — each linked to recorded evidence.`,
    here: isOwner ? 'profile' : '',
    body,
    tail,
    rubi: verifiedRows.length
      ? rubi('pleased', `"Your <span style="color:#fa6519">receipts</span>. Don't lose them."`, 'accent')
      : rubi('watching', `"Empty. For <span style="color:#fa6519">now</span>."`),
  });
}

module.exports = { render, emptyState };
