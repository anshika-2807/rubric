// Live assessment sessions — in-process only, deliberately.
//
// A session holds the hidden brief, the cue-unlock state and the behavioural
// state machine. None of that is persisted, because none of it should outlive
// the session: it is hidden assessment material, and the durable record is the
// attempt row plus its evidence-linked report.
//
// The consequence, accepted for V1: restarting the server abandons sessions in
// flight. Render runs a single long-lived process, so this is a deploy-time
// event, not a routine one.

const crypto = require('crypto');
const { CallBudget } = require('./ai/router');

const TTL_MS = 90 * 60 * 1000;          // an abandoned session is swept after 90 min
const SWEEP_MS = 10 * 60 * 1000;

const sessions = new Map();

/**
 * @param {object} o
 * @param {string} o.attemptId  the durable attempt this session will write to
 * @param {string} o.userId
 * @param {string} o.skillId
 * @param {object} o.hidden     brief / cues / anything the candidate must not see
 * @param {object} [o.state]    behavioural state machine, when the skill has one
 */
function create({ attemptId, userId, skillId, hidden, state = null, extra = {} }) {
  const id = crypto.randomUUID();
  const session = {
    id,
    attemptId,
    userId,
    skillId,
    hidden,
    state,
    messages: [],
    candidateTurns: 0,
    telemetry: { focusLosses: 0, pasteBlocks: 0 },
    budget: new CallBudget(),
    startedAt: Date.now(),
    touchedAt: Date.now(),
    ...extra,
  };
  sessions.set(id, session);
  return session;
}

/**
 * Fetch a session, enforcing ownership.
 *
 * Every read goes through here so a session id alone is never enough: the
 * request's own cookie identity must match the session's owner. This is what
 * keeps one candidate from posting turns into, or ending, someone else's
 * assessment.
 */
function get(id, userId) {
  const s = sessions.get(id);
  if (!s) return null;
  if (userId && s.userId !== userId) return null;
  s.touchedAt = Date.now();
  return s;
}

function drop(id) { sessions.delete(id); }

function sweep() {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, s] of sessions) if (s.touchedAt < cutoff) sessions.delete(id);
}

let timer = null;
function startSweeper() {
  if (timer) return;
  timer = setInterval(sweep, SWEEP_MS);
  timer.unref();      // never hold the process open
}

const count = () => sessions.size;

module.exports = { create, get, drop, sweep, startSweeper, count };
