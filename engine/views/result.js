// Result / verification page — shared by both skills.
//
// This is where the product's central claim has to land: not "you scored 82%"
// but "here is a verified competency, and here is the evidence behind it." So the
// page leads with what was certified, states its limits in the same breath, and
// backs every anchor score with the specific thing that earned it.
//
// Nothing here is recomputed from anything the client sends. The row is read from
// the store; the verdict was decided server-side at evaluation time.
//
// Disclosure (blueprint §10): the conclusion and its evidence-linked citations
// are visible to anyone with the link — that is what makes the credential
// checkable. The full raw transcript is shown only to the candidate.

const { layout, esc, rubi } = require('./layout');
const { credentialDescriptor } = require('../skills');
const { PROBLEM_FRAMING_L2, SECONDARY } = require('../anchors');
const { COMPOSITION_L2 } = require('../composition/anchors');

// Anchor id → published text, so the breakdown shows what each score was against.
function anchorText(skillId) {
  const map = {};
  if (skillId === 'consultancy') {
    PROBLEM_FRAMING_L2.anchors.forEach(a => { map[a.id] = a.text; });
    PROBLEM_FRAMING_L2.universalFails.forEach(f => { map[f.id] = f.text; });
    SECONDARY.forEach(s => s.anchors.forEach(a => { map[a.id] = a.text; }));
  } else if (skillId === 'visual-layout') {
    COMPOSITION_L2.anchors.forEach(a => { map[a.id] = a.text; });
    COMPOSITION_L2.universalFails.forEach(f => { map[f.id] = f.text; });
  }
  return map;
}

// ── verdict framing by grading ───────────────────────────────────────────────
// A model-graded pass is the only thing that reads as verified. Heuristic (demo)
// and degraded results still show the candidate their verdict, labelled honestly.

function verdictFraming(row) {
  const g = row.grading;
  if (g === 'model') {
    return row.pass
      ? { headline: 'Verified', tone: 'pass', badge: 'Verified competency', note: null }
      : { headline: 'Not yet', tone: 'fail', badge: 'Assessed — not passed', note: 'This attempt did not clear the bar. The breakdown below shows exactly where.' };
  }
  if (g === 'degraded') {
    return { headline: row.pass ? 'Provisional pass' : 'Provisional', tone: 'degraded', badge: 'Provisional — not verified',
      note: 'The evaluation model could not be reached, so scoring fell back to heuristics. This result is provisional and is not recorded as a verified competency.' };
  }
  // heuristic / demo
  return { headline: row.pass ? 'Demo pass' : 'Demo result', tone: 'demo', badge: 'Demo — not a verified result',
    note: 'This ran in demo mode with no AI provider configured. The state machine, geometry and thresholds are real, but the language-model judgments were replaced by heuristics — so this is not recorded as a verified competency.' };
}

const TONE = {
  pass: { fg: '#0a7', bar: 'var(--accent)' },
  fail: { fg: '#b00', bar: 'var(--muted)' },
  degraded: { fg: '#a60', bar: 'var(--muted)' },
  demo: { fg: '#666', bar: 'var(--muted)' },
};

// ── evidence-linked anchor breakdown ─────────────────────────────────────────

function anchorRow(a, texts) {
  const scoreColor = a.score === 2 ? 'var(--accent)' : a.score === 1 ? '#000' : 'var(--muted)';
  return `<div style="display:grid;grid-template-columns:56px 1fr;gap:16px;padding:16px 0;border-top:1px solid var(--line)">
    <div>
      <div class="serif" style="font-size:26px;color:${scoreColor};line-height:1">${a.score}<span style="font-size:14px;opacity:.5">/2</span></div>
      <div class="mono" style="font-size:10px;opacity:.5;margin-top:2px">${esc(a.id)}</div>
    </div>
    <div>
      <p class="small" style="font-weight:500;opacity:.9">${esc(texts[a.id] || a.id)}</p>
      ${a.note ? `<p class="small mt-8" style="opacity:.62">${esc(a.note)}</p>` : ''}
      ${(a.evidence || []).map(q => `<div class="quote">${esc(q)}</div>`).join('')}
    </div>
  </div>`;
}

function failBlock(fails, texts) {
  if (!fails || !fails.length) return '';
  return `<div class="panel-dark mt-18" style="padding:20px">
    <span class="label label-accent">Universal fail — overrides points</span>
    ${fails.map(f => `<div style="padding:12px 0;border-top:1px solid rgba(255,255,255,.12)">
      <div class="row gap-10 baseline"><span class="mono" style="font-size:11px;color:var(--accent)">${esc(f.id)}</span>
      <span class="small" style="font-weight:500">${esc(texts[f.id] || '')}</span></div>
      ${f.note ? `<p class="small mt-8" style="opacity:.7">${esc(f.note)}</p>` : ''}
      ${(f.evidence || []).map(q => `<div class="quote" style="background:rgba(255,255,255,.07);border-color:var(--accent)">${esc(q)}</div>`).join('')}
    </div>`).join('')}
  </div>`;
}

// ── second evidence stream: consultancy trust curve ──────────────────────────

function trustCurve(report, artifacts) {
  const traj = (artifacts && artifacts.trajectory) || report.trajectory || [];
  if (!traj.length) return '';
  const bars = traj.map(t => {
    const h = Math.max(4, (t.trust / 10) * 72);
    return `<div title="turn ${t.turn}: trust ${t.trust}, openness ${t.openness}" style="flex:1;min-width:8px;max-width:22px;height:${h}px;background:var(--accent)"></div>`;
  }).join('');
  const d = report;
  return `<div class="panel">
    <span class="label">Trust curve — did the client open up?</span>
    <p class="small mt-8" style="opacity:.62">Computed from the state machine, not judged. A candidate can perform listening; they cannot perform the client's state responding to it.</p>
    <div class="row end gap-6" style="height:78px;margin-top:14px">${bars}</div>
    <div class="mono mt-8" style="font-size:10px;opacity:.6">
      Δ trust ${d.trustDelta >= 0 ? '+' : ''}${d.trustDelta} · Δ openness ${d.opennessDelta >= 0 ? '+' : ''}${d.opennessDelta}
      · cues reached: ${(d.cues && d.cues.pickedUp || []).join(', ') || 'none'}${d.cues && d.cues.connected ? ' (connected)' : ''}
    </div>
  </div>`;
}

// ── second evidence stream: composition geometry ─────────────────────────────

function miniLayout(layoutData, elements, canvas, title) {
  if (!layoutData || !elements) return '';
  const scale = 150 / canvas.width;
  const rects = elements.filter(e => layoutData[e.id]).map(e => {
    const p = layoutData[e.id];
    const kind = (e.kind || '').split(' ')[0].toLowerCase();
    const fill = kind === 'form' ? 'var(--accent)' : kind === 'logo' ? '#000' : kind === 'image' ? '#ccc' : 'rgba(0,0,0,.18)';
    return `<rect x="${(p.x * scale).toFixed(1)}" y="${(p.y * scale).toFixed(1)}" width="${(e.w * scale).toFixed(1)}" height="${(e.h * scale).toFixed(1)}" fill="${fill}" stroke="rgba(0,0,0,.4)" stroke-width="0.5"/>`;
  }).join('');
  return `<div class="stack gap-8" style="align-items:center">
    <span class="label">${esc(title)}</span>
    <svg viewBox="0 0 ${canvas.width * scale} ${canvas.height * scale}" width="${canvas.width * scale}" height="${canvas.height * scale}" style="background:#fff;border:1px solid var(--line)">${rects}</svg>
  </div>`;
}

function compositionEvidence(report, artifacts) {
  const m = report.metrics;
  if (!m) return '';
  const d = m.delta;
  const checks = m.constraintChecks || [];
  const canvas = artifacts && artifacts.canvas;
  const elements = artifacts && artifacts.elements;

  const layoutsBlock = (canvas && elements && artifacts.round1 && artifacts.round2)
    ? `<div class="row center gap-24 wrap" style="margin-top:8px">
         ${miniLayout(artifacts.round1, elements, canvas, 'Round 1')}
         ${miniLayout(artifacts.round2, elements, canvas, 'Round 2 · adapted')}
       </div>` : '';

  return `<div class="panel">
    <span class="label">Adaptation — did they adapt, or restart?</span>
    <p class="small mt-8" style="opacity:.62">Measured from the coordinates of both submissions. This is arithmetic, not opinion.</p>
    ${layoutsBlock}
    <div class="mono mt-14" style="font-size:11px;opacity:.75;line-height:1.7">
      preserved ${Math.round((d.preservedFraction || 0) * 100)}% of placement · moved ${(d.moved || []).length} element(s)
      ${d.added && d.added.length ? '· added ' + d.added.join(', ') : ''}
      · ${d.restart ? 'classified as RESTART' : d.noop ? 'classified as NO CHANGE' : 'classified as ADAPTATION'}
    </div>
  </div>
  <div class="panel">
    <span class="label">Changed brief — was the new constraint met?</span>
    <div class="stack gap-8 mt-14">
      ${checks.map(c => `<div class="row between gap-10 baseline">
        <span class="small" style="opacity:.85">${c.satisfied ? '✓' : '✗'} ${esc(c.requirement)}</span>
        <span class="mono" style="font-size:10px;opacity:.5;text-align:right">${esc(c.measured)}</span>
      </div>`).join('')}
    </div>
  </div>`;
}

// ── owner-only artifact ──────────────────────────────────────────────────────

function transcriptBlock(artifacts, isOwner) {
  const t = artifacts && artifacts.transcript;
  if (!t) return '';
  if (!isOwner) {
    return `<div class="notice mt-18">
      <span class="notice-mark">◆</span>
      <span>The full transcript is shown only to the candidate. Everything above — the conclusion and the
      evidence quotes behind each score — is what a verifier sees. (Blueprint §10: verifiers read
      conclusions, not raw evidence, unless the candidate opts to share it.)</span>
    </div>`;
  }
  return `<details class="panel mt-18">
    <summary style="cursor:pointer;font-weight:600">Full transcript <span class="small" style="opacity:.55">(visible to you only)</span></summary>
    <div class="stack gap-10 mt-14">
      ${t.map(m => `<div class="small"><span class="mono" style="font-size:9px;letter-spacing:.12em;opacity:.5">${m.role === 'assistant' ? 'CLIENT' : 'YOU'}</span><br>${esc(m.content)}</div>`).join('')}
    </div>
  </details>`;
}

function rationaleBlock(artifacts) {
  if (!artifacts || !artifacts.rationale) return '';
  return `<div class="panel mt-18">
    <span class="label">Your rationale — defended, then checked against what moved</span>
    <p class="small mt-8" style="font-style:italic;opacity:.85">${esc(artifacts.rationale)}</p>
  </div>`;
}

// ── page ─────────────────────────────────────────────────────────────────────

function render({ row, owner, viewer, shareUrl }) {
  const d = credentialDescriptor(row.skill_id);
  const report = row.report || {};
  const artifacts = row.artifacts || {};
  const texts = anchorText(row.skill_id);
  const framing = verdictFraming(row);
  const tone = TONE[framing.tone];
  const isOwner = Boolean(viewer && owner && viewer.id === owner.id);
  const date = row.completed_at ? new Date(row.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const primaryAnchors = (report.anchorScores || []);
  const secondary = (report.secondary || []);
  const skillEvidence = row.skill_id === 'consultancy'
    ? trustCurve(report, artifacts)
    : compositionEvidence(report, artifacts);

  const body = `
<div class="shell" style="padding:48px 0 96px">

  <!-- Verdict -->
  <div class="row between end wrap gap-18" style="padding-bottom:24px;border-bottom:2px solid #000">
    <div>
      <a class="label" href="/skills" style="display:inline;text-decoration:none">← Skills</a>
      <h1 class="display display-xl mt-14" style="color:${tone.fg}">${esc(framing.headline)}</h1>
      <p class="lede mt-8" style="font-size:18px">${esc(d.competency)} · ${esc(d.level)} <span style="opacity:.5">·</span> ${esc(d.skill)}</p>
    </div>
    <div class="right">
      <div class="pill ${framing.tone === 'pass' ? 'pill-solid' : 'pill-line'}" style="margin-bottom:10px">${esc(framing.badge)}</div>
      <div class="serif" style="font-size:40px;line-height:1">${report.points}<span style="font-size:18px;opacity:.5">/${report.maxPoints}</span></div>
      <div class="label" style="display:block;margin-top:2px">pass mark ${report.passThreshold} · ${report.durationMin || '—'} min</div>
    </div>
  </div>

  ${framing.note ? `<div class="notice ${framing.tone === 'demo' || framing.tone === 'degraded' ? 'notice-warn' : ''} mt-18">
    <span class="notice-mark">◆</span><span>${esc(framing.note)}</span></div>` : ''}

  ${report.summary ? `<p class="body mt-24" style="font-size:16px;max-width:80ch">${esc(report.summary)}</p>` : ''}

  <!-- Credential + scope -->
  <section class="grid" style="grid-template-columns:1.3fr 1fr;gap:18px;margin-top:32px">
    <div class="panel-hard">
      <span class="label">Credential</span>
      <div class="stack gap-10 mt-14">
        ${[
          ['Skill', d.skill],
          ['Competency', d.competency],
          ['Level', `${d.level} · ${d.levelName} — ${d.levelMeaning}`],
          ['Assurance tier', d.assurance.tier],
          ['Evidence provenance', `Tier ${d.provenance} · observed performance`],
          ['Assessed', date],
          ['Reference', row.id],
        ].map(([k, v]) => `<div class="row between gap-14 baseline" style="border-bottom:1px dashed var(--line);padding-bottom:8px">
          <span class="label" style="display:inline">${esc(k)}</span>
          <span class="small right" style="font-weight:500;max-width:60%">${esc(v)}</span>
        </div>`).join('')}
      </div>
      <div class="mono mt-14" style="font-size:9px;opacity:.5;word-break:break-all">evidence digest · ${esc(row.evidence_hash || '—')}</div>
    </div>
    <div class="stack gap-18">
      <div class="panel" style="border-color:var(--accent)">
        <span class="label label-accent">✓ Certifies</span>
        <p class="small mt-8">${esc(d.certifies)}</p>
      </div>
      <div class="panel">
        <span class="label">✕ Does not certify</span>
        <p class="small mt-8" style="opacity:.75">${esc(d.doesNotCertify)}</p>
      </div>
    </div>
  </section>

  <!-- Evidence-linked breakdown -->
  <section style="margin-top:48px">
    <div class="row between baseline wrap gap-14">
      <h2 class="display display-m">The evidence</h2>
      <span class="label" style="display:inline">Every score above zero cites what earned it</span>
    </div>
    <div class="panel mt-18" style="padding:4px 24px 20px">
      ${primaryAnchors.map(a => anchorRow(a, texts)).join('')}
    </div>
    ${failBlock(report.universalFails, texts)}
    ${secondary.length ? `<div class="mt-18">
      <span class="label">Secondary evidence — recorded even when the primary competency does not pass</span>
      <div class="panel mt-8" style="padding:4px 24px 16px">${secondary.map(a => anchorRow(a, texts)).join('')}</div>
    </div>` : ''}
  </section>

  <!-- Second evidence stream -->
  <section style="margin-top:40px">
    <div class="row between baseline wrap gap-14">
      <h2 class="display display-m">Computed, not judged</h2>
      <span class="label" style="display:inline">The stream you can't talk your way past</span>
    </div>
    <div class="grid ${row.skill_id === 'consultancy' ? '' : 'grid-2'} mt-18" style="gap:18px">${skillEvidence}</div>
  </section>

  ${rationaleBlock(artifacts)}
  ${transcriptBlock(artifacts, isOwner)}

  <!-- Actions -->
  <section class="panel-dark mt-64" style="padding:36px">
    <div class="row between wrap gap-24 end">
      <div>
        <span class="label label-accent">${owner ? esc(owner.display_name) : 'This candidate'}</span>
        <h2 class="display" style="font-size:28px;margin-top:10px">${isOwner ? 'This sits on your public profile.' : 'Part of a verified profile.'}</h2>
        <p class="small mt-8" style="opacity:.68">${isOwner
          ? 'Share the profile link and prove this competency once, instead of re-proving it in every application.'
          : 'A rubrik. profile collects verified competencies with the evidence behind each.'}</p>
      </div>
      <div class="row gap-14 wrap">
        ${owner ? `<a class="btn btn-quiet" href="/profile/${esc(owner.handle)}">View profile</a>` : ''}
        <a class="btn btn-accent" href="/skills">${isOwner ? 'Verify another' : 'Get verified'}</a>
      </div>
    </div>
    ${isOwner ? `<div class="row gap-10 mt-24 wrap">
      <input class="field" id="shareUrl" readonly value="${esc(shareUrl)}" style="max-width:420px;background:rgba(255,255,255,.06);color:#fff;border-color:rgba(255,255,255,.2)">
      <button class="btn btn-sm" id="copyShare" type="button">Copy result link</button>
    </div>` : ''}
  </section>

</div>`;

  const tail = isOwner ? `<script>
    var b = document.getElementById('copyShare');
    if (b) b.addEventListener('click', function () {
      var f = document.getElementById('shareUrl'); f.select();
      navigator.clipboard.writeText(f.value).then(function(){ b.textContent = 'Copied'; setTimeout(function(){ b.textContent = 'Copy result link'; }, 1500); });
    });
  </script>` : '';

  const rubiLine = framing.tone === 'pass'
    ? `"Okay. <span style="color:#fa6519">Now</span> I'm a little impressed."`
    : framing.tone === 'fail'
    ? `"Not yet. Come back <span style="color:#fa6519">sharper</span>."`
    : `"This one <span style="color:#fa6519">doesn't count</span>. You know that."`;

  return layout({
    title: `${framing.headline} · ${d.competency} ${d.level}`,
    description: `${d.certifies}`,
    here: '',
    body,
    tail,
    rubi: rubi(framing.tone === 'pass' ? 'pleased' : 'watching', rubiLine, framing.tone === 'pass' ? 'accent' : 'dark'),
  });
}

module.exports = { render };
