// Consultancy · Problem Framing L2.
//
// The assessment pipeline itself is unchanged from the prototype — that
// separation is the point:
//
//   classifier (LLM interprets)  →  state machine (deterministic rules decide)
//   →  persona (LLM speaks, state governs what it may say)
//   →  evaluator (evidence-linked, conclusion-blind, thresholds applied in code)
//
// What this module adds is the boundary. It owns what crosses to the browser,
// and it persists the attempt so a result outlives the session instead of being
// rendered once into a div and lost.

const crypto = require('crypto');
const { CONFIG } = require('../config');
const { json, html, readBody } = require('../http');
const { getStore } = require('../store');
const { ensureUser } = require('../identity');
const sessions = require('../sessions');
const skills = require('../skills');

const { ClientState } = require('../state');
const { instanceForSession } = require('../brief');
const { classifyTurn } = require('../classifier');
const { clientReply } = require('../persona');
const { evaluate } = require('../evaluator');
const { hashEvidence } = require('../evidence');

const view = require('../views/session-consultancy');

const SKILL_ID = 'consultancy';

/** Everything the candidate is allowed to know about the scenario. */
function publicScenario(brief) {
  return {
    clientName: brief.client.name,
    // Role text is public: the candidate would know who they are meeting.
    clientRole: brief.client.role,
    setting: `Discovery call · ${brief.client.name}`,
    opening: brief.openingLine,
  };
}

/**
 * The client-state block, only when explicitly enabled.
 *
 * This is hidden assessment material: it reveals the cue-unlock mechanism and
 * would let a candidate steer the state machine directly. The prototype showed
 * it to whoever was looking. It is now gated server-side, so when DEBUG_PANEL is
 * off the fields are absent from the response rather than merely hidden by CSS.
 */
function debugBlock(session, behaviors, applied, turn) {
  if (!CONFIG.debugPanel) return undefined;
  return {
    behaviors,
    applied,
    state: session.state.snapshot(),
    unlockedCues: session.state.unlockedCues(session.hidden.cues, turn).map(c => c.id),
  };
}

// ── GET /assess/consultancy ──────────────────────────────────────────────────

async function page({ req, res, user }) {
  const skill = skills.bySkillId(SKILL_ID);
  return html(res, 200, view.render({ skill, user }));
}

// ── POST /api/consultancy/start ──────────────────────────────────────────────

async function start({ req, res, body }) {
  const user = await ensureUser(req, res, body.displayName);
  const skill = skills.bySkillId(SKILL_ID);
  const v = skill.verification;

  const brief = instanceForSession();       // fresh copy — never the shared object
  const state = new ClientState();

  const attempt = await getStore().attempts.create({
    userId: user.id,
    skillId: SKILL_ID,
    competencyId: v.competencyId,
    level: v.level,
    briefId: brief.id,
  });

  const session = sessions.create({
    attemptId: attempt.id,
    userId: user.id,
    skillId: SKILL_ID,
    hidden: brief,
    state,
  });
  // The opening line is the client's first turn, so it belongs in the transcript.
  session.messages.push({ role: 'assistant', content: brief.openingLine });

  return json(res, 200, {
    sessionId: session.id,
    mockMode: CONFIG.mockMode,
    maxTurns: CONFIG.maxCandidateTurns,
    ...publicScenario(brief),
  });
}

// ── POST /api/consultancy/message ────────────────────────────────────────────

async function message({ res, body, user }) {
  if (!user) return json(res, 401, { error: 'Your session has expired. Start again from the skill page.' });
  const session = sessions.get(body.sessionId, user.id);
  if (!session) return json(res, 404, { error: 'That session is no longer open.' });

  const text = String(body.message || '').trim().slice(0, 4000);
  if (!text) return json(res, 400, { error: 'Say something to the client first.' });
  if (session.candidateTurns >= CONFIG.maxCandidateTurns) {
    return json(res, 409, { error: 'You have reached the turn limit for this session. End it to be scored.' });
  }

  session.candidateTurns += 1;
  session.messages.push({ role: 'user', content: text });
  const turn = session.candidateTurns;

  // 1) AI interprets the turn into discrete behaviours.
  const cueIds = session.hidden.cues.map(c => c.id);
  const recent = session.messages.slice(-6)
    .map(m => `${m.role === 'assistant' ? 'CLIENT' : 'CANDIDATE'}: ${m.content}`).join('\n');
  const behaviors = await classifyTurn(text, cueIds, recent, session.budget);

  // 2) Deterministic rules move the client's state. Policy, never the model.
  const applied = session.state.update(behaviors, turn);

  // 3) The client speaks, constrained by the state she is now in.
  const reply = await clientReply(session.hidden, session.state, session.messages, turn, session.budget);
  session.messages.push({ role: 'assistant', content: reply });

  return json(res, 200, {
    reply,
    turn,
    turnsRemaining: Math.max(0, CONFIG.maxCandidateTurns - turn),
    debug: debugBlock(session, behaviors, applied, turn),
  });
}

// ── POST /api/consultancy/end ────────────────────────────────────────────────

async function end({ res, body, user }) {
  if (!user) return json(res, 401, { error: 'Your session has expired.' });
  const session = sessions.get(body.sessionId, user.id);
  if (!session) return json(res, 404, { error: 'That session is no longer open.' });

  if (session.candidateTurns === 0) {
    return json(res, 400, { error: 'You have not spoken to the client yet — there is nothing to evaluate.' });
  }

  // Integrity telemetry is client-reported, so it is recorded and never scored.
  if (body.telemetry && typeof body.telemetry === 'object') {
    session.telemetry = {
      focusLosses: Number(body.telemetry.focusLosses) || 0,
      pasteBlocks: Number(body.telemetry.pasteBlocks) || 0,
    };
  }

  const store = getStore();
  const skill = skills.bySkillId(SKILL_ID);
  const descriptor = skills.credentialDescriptor(SKILL_ID);

  // Evaluation happens here, server-side, from the server's own transcript.
  const report = await evaluate(session.hidden, session.messages, session.state.trajectory, session.budget);

  report.telemetry = session.telemetry;
  report.durationMin = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
  report.turns = session.candidateTurns;
  report.ai = session.budget.summary();

  const artifacts = {
    // The transcript is the artefact for a simulation assessment. Stored so the
    // result page can quote it and the candidate can review what they said.
    transcript: session.messages,
    trajectory: session.state.trajectory,
  };

  // Tamper-evidence digest over the evidence that decided the verdict. Not a
  // blockchain and not immutable — a digest that makes silent edits detectable.
  const evidenceHash = hashEvidence({
    attemptId: session.attemptId,
    briefId: session.hidden.id,
    turns: session.candidateTurns,
    points: report.points,
    anchorScores: report.anchorScores,
    universalFails: report.universalFails,
    trustDelta: report.trustDelta,
    opennessDelta: report.opennessDelta,
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

  // A verified competency is recorded only for a model-graded pass. Heuristic and
  // degraded runs still show the candidate a verdict, but never enter the record.
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

  // The session — and with it the hidden brief — is discarded now.
  sessions.drop(session.id);

  // The client is told where the result lives, not what it says. It will fetch
  // the verdict from the store like any other reader.
  return json(res, 200, { resultUrl: `/result/${session.attemptId}` });
}

const routes = [
  { method: 'GET', pattern: '/assess/consultancy', handler: page },
  { method: 'POST', pattern: '/api/consultancy/start', handler: start },
  { method: 'POST', pattern: '/api/consultancy/message', handler: message },
  { method: 'POST', pattern: '/api/consultancy/end', handler: end },
];

module.exports = { routes };
