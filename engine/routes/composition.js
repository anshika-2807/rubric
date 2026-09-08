// Visual Layout & Composition · L2 — routes.
//
// Same boundary discipline as consultancy. The critical rule here: the brief
// CHANGE is withheld until round 1 is submitted, because "adapt what you already
// built" is the assessment. Serving the change up front would turn it into an
// ordinary layout task.
//
// The round-1 layout is held in the session, never trusted from the client at
// end time — the delta that decides "adapt vs restart" is computed from the
// server's own copy of round 1 against the submitted round 2.

const { CONFIG } = require('../config');
const { json, html } = require('../http');
const { getStore } = require('../store');
const { ensureUser } = require('../identity');
const sessions = require('../sessions');
const skills = require('../skills');
const { hashEvidence } = require('../evidence');

const brief = require('../composition/brief');
const { sanitiseLayout } = require('../composition/geometry');
const { evaluate } = require('../composition/evaluator');
const view = require('../views/session-composition');

const SKILL_ID = 'visual-layout';

// ── GET /assess/visual-layout ────────────────────────────────────────────────

async function page({ res, user }) {
  return html(res, 200, view.render({ skill: skills.bySkillId(SKILL_ID), user }));
}

// ── POST /api/composition/start ──────────────────────────────────────────────

async function start({ req, res, body }) {
  const user = await ensureUser(req, res, body.displayName);
  const skill = skills.bySkillId(SKILL_ID);
  const v = skill.verification;

  const attempt = await getStore().attempts.create({
    userId: user.id,
    skillId: SKILL_ID,
    competencyId: v.competencyId,
    level: v.level,
  });

  // The change is derived deterministically from the attempt id, so it is fixed
  // for this attempt and reproducible when auditing the stored result — but it
  // stays server-side until round 1 lands.
  const instance = brief.instanceForSession(attempt.id);

  const session = sessions.create({
    attemptId: attempt.id,
    userId: user.id,
    skillId: SKILL_ID,
    hidden: instance,
    extra: { round1: null, phase: 'round1' },
  });

  await getStore().attempts.patch(attempt.id, { brief_id: instance.id });

  return json(res, 200, {
    sessionId: session.id,
    mockMode: CONFIG.mockMode,
    canvas: instance.canvas,
    elements: brief.publicElements(instance.elements),
    originalBrief: instance.originalBrief,
    // No change here — withheld until submitRound1.
  });
}

// ── POST /api/composition/submit-round1 ──────────────────────────────────────

async function submitRound1({ res, body, user }) {
  if (!user) return json(res, 401, { error: 'Your session has expired.' });
  const session = sessions.get(body.sessionId, user.id);
  if (!session) return json(res, 404, { error: 'That session is no longer open.' });
  if (session.phase !== 'round1') return json(res, 409, { error: 'Round 1 has already been submitted.' });

  const instance = session.hidden;
  const layout = sanitiseLayout(body.layout, instance.elements, instance.canvas);

  // Require the essentials to be on the canvas before the brief is allowed to
  // change — otherwise "round 1" is empty and the adaptation delta is meaningless.
  const essentials = instance.elements.filter(e => e.essential && e.id !== 'sponsor');
  const placed = essentials.filter(e => layout[e.id]);
  if (placed.length < essentials.length) {
    return json(res, 400, {
      error: `Place all ${essentials.length} essential elements before submitting. ${essentials.length - placed.length} still off the canvas.`,
    });
  }

  session.round1 = layout;
  session.phase = 'round2';

  // NOW the change is revealed, along with any element it introduces.
  return json(res, 200, {
    change: brief.publicChange(instance.change),
    newElements: brief.publicElements(instance.elements).filter(e =>
      (instance.change.requiredElements || []).includes(e.id)),
  });
}

// ── POST /api/composition/end ────────────────────────────────────────────────

async function end({ res, body, user }) {
  if (!user) return json(res, 401, { error: 'Your session has expired.' });
  const session = sessions.get(body.sessionId, user.id);
  if (!session) return json(res, 404, { error: 'That session is no longer open.' });
  if (session.phase !== 'round2') return json(res, 409, { error: 'Submit your first composition before adapting it.' });

  const instance = session.hidden;
  const round2 = sanitiseLayout(body.layout, instance.elements, instance.canvas);
  const rationale = String(body.rationale || '').trim().slice(0, 1500);

  const store = getStore();
  const skill = skills.bySkillId(SKILL_ID);
  const descriptor = skills.credentialDescriptor(SKILL_ID);

  // Evaluated server-side, from the server's own round-1 copy against round 2.
  const report = await evaluate(instance, session.round1, round2, rationale, session.budget);
  report.durationMin = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
  report.ai = session.budget.summary();

  const artifacts = {
    round1: session.round1,
    round2,
    rationale,
    change: brief.publicChange(instance.change),
    elements: brief.publicElements(instance.elements),
    canvas: instance.canvas,
  };

  const evidenceHash = hashEvidence({
    attemptId: session.attemptId,
    briefId: instance.id,
    points: report.points,
    anchorScores: report.anchorScores,
    universalFails: report.universalFails,
    round1: session.round1,
    round2,
  });

  await store.attempts.patch(session.attemptId, {
    status: 'complete',
    pass: report.pass,
    verified: report.verified,
    grading: report.grading,
    points: report.points,
    max_points: report.maxPoints,
    pass_threshold: report.passThreshold,
    assurance_tier: descriptor.assurance.tier,
    report,
    artifacts,
    evidence_hash: evidenceHash,
    completed_at: new Date().toISOString(),
  });

  if (report.verified) {
    await store.verified.add({
      userId: session.userId,
      attemptId: session.attemptId,
      skillId: SKILL_ID,
      competencyId: skill.verification.competencyId,
      level: skill.verification.level,
      provenance: 3,
      contextTag: skill.verification.contextTag,
      assuranceTier: descriptor.assurance.tier,
    });
  }

  sessions.drop(session.id);
  return json(res, 200, { resultUrl: `/result/${session.attemptId}` });
}

const routes = [
  { method: 'GET', pattern: '/assess/visual-layout', handler: page },
  { method: 'POST', pattern: '/api/composition/start', handler: start },
  { method: 'POST', pattern: '/api/composition/submit-round1', handler: submitRound1 },
  { method: 'POST', pattern: '/api/composition/end', handler: end },
];

module.exports = { routes };
