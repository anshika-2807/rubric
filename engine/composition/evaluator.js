// Composition evaluator — evidence-linked, conclusion-blind, thresholds in code.
//
// Structurally identical to the consultancy evaluator, on purpose: anchors scored
// 0/1/2, every score above zero carries evidence, universal-fail checks, a fixed
// threshold applied outside any model, grading tagged model|heuristic|degraded.
//
// The difference is where the evidence comes from. Five of the six anchors are
// decided by geometry (measured, cited as a computed fact); only the rationale
// anchor needs a language model, and even that is cross-checked against the
// measured delta so a candidate cannot claim a change the layouts do not show.

const { CONFIG } = require('../config');
const { callModel, extractJson } = require('../ai/router');
const { COMPOSITION_L2 } = require('./anchors');
const { measure, delta } = require('./geometry');

// ── The five computed anchors ────────────────────────────────────────────────
// Each returns { score: 0|1|2, evidence: [computed facts], note }.

function scoreFocalPoint(m1) {
  const h = m1.hierarchy;
  if (!h.dominantId || !h.hasFocalPoint) {
    return { id: 'CC2-1', score: 0, evidence: [], note: 'No element is given clear dominance — nothing anchors the eye.' };
  }
  const distinction = h.dominantShare >= 0.34 && h.clear && h.inUpperField;
  return {
    id: 'CC2-1',
    score: distinction ? 2 : 1,
    evidence: [`Dominant element "${h.dominantId}" carries ${Math.round(h.dominantShare * 100)}% of visual weight`,
               h.clear ? 'with clear space around it' : `crowded by ${h.crowdedBy.join(', ') || 'nearby elements'}`],
    note: distinction ? 'A strong, uncrowded focal point in the upper field.' : 'A focal point exists but is weak or crowded.',
  };
}

function scoreStructure(m1, canvas) {
  // Hard faults zero the anchor: overlapping essential text, or an element off
  // the canvas, breaks the composition outright. A safe-margin breach is a soft
  // fault — the element is still on the poster, just crowding the edge — so it
  // caps the score at 1 rather than zeroing it.
  const hardFaults = [];
  if (m1.collisions.length) hardFaults.push(`${m1.collisions.length} essential-text collision(s)`);
  if (m1.outOfBounds.length) hardFaults.push(`${m1.outOfBounds.length} element(s) off-canvas`);

  const aligned = m1.alignment.alignedFraction;
  const evidence = [
    `${Math.round(aligned * 100)}% of elements share an alignment axis`,
    m1.alignment.dominantAxis ? `dominant axis: ${m1.alignment.dominantAxis.count} elements on ${m1.alignment.dominantAxis.kind}` : 'no shared axis',
  ];
  if (m1.marginBreaches.length) evidence.push(`${m1.marginBreaches.length} element(s) crowd the safe margin`);

  if (hardFaults.length) return { id: 'CC2-2', score: 0, evidence: hardFaults, note: 'Structural faults present: ' + hardFaults.join('; ') + '.' };
  if (aligned >= 0.6 && m1.marginBreaches.length === 0) return { id: 'CC2-2', score: 2, evidence, note: 'Clean margins, no collisions, elements share a consistent axis.' };
  return { id: 'CC2-2', score: 1, evidence, note: m1.marginBreaches.length ? 'Collision-free, but elements crowd the safe margin.' : 'Inside the margins and collision-free, but alignment is loose.' };
}

function scoreConstraintMet(constraintChecks) {
  const met = constraintChecks.filter(c => c.satisfied).length;
  const total = constraintChecks.length;
  const evidence = constraintChecks.map(c => `${c.satisfied ? '✓' : '✗'} ${c.requirement} (${c.measured})`);
  if (total === 0) return { id: 'CC2-3', score: 0, evidence: ['no constraint recorded'], note: 'Constraint could not be evaluated.' };
  if (met === total) return { id: 'CC2-3', score: 2, evidence, note: 'Every requirement of the changed brief is satisfied.' };
  if (met === 0) return { id: 'CC2-3', score: 0, evidence, note: 'The changed brief was not satisfied.' };
  return { id: 'CC2-3', score: 1, evidence, note: `${met} of ${total} requirements of the changed brief satisfied.` };
}

function scoreAdaptation(d) {
  if (d.restart) return { id: 'CC2-4', score: 0, evidence: [`${Math.round(d.movedFraction * 100)}% of elements relocated, mean move ${Math.round(d.meanDisplacementRatio * 100)}% of the diagonal`], note: 'The revision restarts rather than adapts.' };
  if (d.noop) return { id: 'CC2-4', score: 0, evidence: ['nothing moved between rounds'], note: 'No adaptation was made.' };
  const preserved = d.preservedFraction;
  const evidence = [`${Math.round(preserved * 100)}% of positions preserved`,
                    `${d.moved.length} element(s) moved: ${d.moved.join(', ') || 'none'}`];
  if (preserved >= 0.4 && d.moved.length >= 1) return { id: 'CC2-4', score: 2, evidence, note: 'Adapts the existing composition — targeted moves, recognisable continuity.' };
  return { id: 'CC2-4', score: 1, evidence, note: 'Some continuity preserved, but the revision is close to a rebuild.' };
}

function scoreQualitySurvives(m1, m2) {
  const newBreaches = m2.marginBreaches.length - m1.marginBreaches.length;
  const newCollisions = m2.collisions.length - m1.collisions.length;
  const newOob = m2.outOfBounds.length - m1.outOfBounds.length;
  const regressions = [];
  if (newBreaches > 0) regressions.push(`${newBreaches} new margin breach(es)`);
  if (newCollisions > 0) regressions.push(`${newCollisions} new collision(s)`);
  if (newOob > 0) regressions.push(`${newOob} newly off-canvas`);

  if (regressions.length) return { id: 'CC2-5', score: 0, evidence: regressions, note: 'The change introduced new structural faults.' };
  const evidence = [`margins ${m2.marginBreaches.length === 0 ? 'clean' : m2.marginBreaches.length + ' breach(es)'}`,
                    `collisions ${m2.collisions.length}`,
                    `focal point ${m2.hierarchy.hasFocalPoint ? 'intact' : 'lost'}`];
  if (m2.hierarchy.hasFocalPoint && m2.marginBreaches.length === 0 && m2.collisions.length === 0) {
    return { id: 'CC2-5', score: 2, evidence, note: 'Structural quality fully survives the change.' };
  }
  return { id: 'CC2-5', score: 1, evidence, note: 'No new faults, though the revision is not pristine.' };
}

// ── Universal fails ──────────────────────────────────────────────────────────

function computedFails(m1, m2, d, constraintChecks) {
  const fails = [];
  if (d.restart) fails.push({ id: 'UF-C1', evidence: [`${Math.round(d.movedFraction * 100)}% relocated at mean ${Math.round(d.meanDisplacementRatio * 100)}% of the diagonal`], note: 'Rebuilt from scratch instead of adapting.' });
  const constraintUnmet = constraintChecks.length && constraintChecks.every(c => !c.satisfied);
  if (d.noop && constraintUnmet) fails.push({ id: 'UF-C2', evidence: ['no elements moved and the new constraint is unmet'], note: 'No adaptation while the constraint remains unmet.' });
  if (constraintUnmet && !d.noop) fails.push({ id: 'UF-C3', evidence: constraintChecks.map(c => `✗ ${c.requirement}`), note: 'The changed brief was ignored entirely.' });
  if (m2.outOfBounds.length || m2.collisions.length) {
    fails.push({ id: 'UF-C4', evidence: [...m2.outOfBounds.map(id => `${id} off-canvas`), ...m2.collisions.map(c => `${c.pair.join(' overlaps ')}`)], note: 'The final artefact is broken: elements off-canvas or essential text obscured.' });
  }
  return fails;
}

// ── Rationale (the one model-scored anchor) ──────────────────────────────────

const RATIONALE_SYSTEM = `You score ONE short written rationale from a design assessment. The candidate arranged a poster, the brief changed, and they adapted it. You are told, as ground truth, which elements actually moved between their two submissions.

Score anchor CC2-6 (0/1/2): does the rationale explain the trade-off they made — naming specific elements and the new constraint — AND is it consistent with what actually changed?
Also flag UF-C5 if the rationale claims changes the movement data shows were NOT made.

You are conclusion-blind: you are not judging whether their design is good, only whether their explanation is specific and truthful about what they did.

Return STRICT JSON only:
{"cc2_6": {"score": 0|1|2, "evidence": ["short quote from the rationale"], "note": "one line"},
 "uf_c5": {"triggered": bool, "evidence": ["quote"], "note": "one line"}}`;

function heuristicRationale(rationale, d) {
  const text = String(rationale || '').trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const lower = text.toLowerCase();
  const namesElement = /title|kicker|tagline|date|venue|meta|photo|accent|mark|sponsor|logo/.test(lower);
  const namesConstraint = /crop|square|tile|sponsor|margin|order|read|top|constraint|brief|hierarchy|focal/.test(lower);
  const claimsMove = /mov|shift|reposition|relocat|resize|swap/.test(lower);

  let score = 0;
  if (words >= 12 && namesElement && namesConstraint) score = 2;
  else if (words >= 8 && (namesElement || namesConstraint)) score = 1;

  // Consistency: claims movement but nothing measurably moved.
  const contradicts = claimsMove && d.moved.length === 0 && d.added.length === 0;
  return {
    cc2_6: { score: contradicts ? Math.min(score, 1) : score, evidence: text ? [text.slice(0, 140)] : [], note: score ? 'Rationale is specific about the trade-off.' : 'Rationale is thin or generic.' },
    uf_c5: contradicts
      ? { triggered: true, evidence: [text.slice(0, 140)], note: 'Rationale describes moves the layouts do not show.' }
      : { triggered: false },
    grading: 'heuristic',
  };
}

async function scoreRationale(rationale, d, budget) {
  if (CONFIG.mockMode || !String(rationale || '').trim()) {
    return heuristicRationale(rationale, d);
  }
  try {
    const text = await callModel({
      task: 'evaluate',
      maxTokens: 500,
      json: true,
      budget,
      system: RATIONALE_SYSTEM,
      messages: [{
        role: 'user',
        content: `GROUND TRUTH — what actually changed between the two submissions:\nmoved: ${d.moved.join(', ') || 'nothing'}\nadded: ${d.added.join(', ') || 'nothing'}\npreserved: ${Math.round(d.preservedFraction * 100)}% of positions\n\nCANDIDATE RATIONALE:\n"""${rationale}"""\n\nReturn the JSON.`,
      }],
    });
    const parsed = extractJson(text);
    if (!parsed || !parsed.cc2_6) throw new Error('rationale evaluator returned nothing usable');
    return { ...parsed, grading: 'model' };
  } catch (e) {
    console.error('[composition] rationale scoring degraded to heuristic:', e.message);
    return { ...heuristicRationale(rationale, d), grading: 'degraded' };
  }
}

/**
 * Evaluate a full composition attempt.
 *
 * @param {object} instance    the private brief instance (canvas, change, elements)
 * @param {object} round1      sanitised layout
 * @param {object} round2      sanitised layout
 * @param {string} rationale   the candidate's written explanation
 * @param {CallBudget} budget
 */
async function evaluate(instance, round1, round2, rationale, budget) {
  const { canvas, elements, change } = instance;

  const m1 = measure(round1, elements, canvas);
  const m2 = measure(round2, elements, canvas);
  const d = delta(round1, round2, elements, canvas);
  const constraintChecks = change.check(round2, elements, canvas);

  const rationaleResult = await scoreRationale(rationale, d, budget);

  const anchorScores = [
    scoreFocalPoint(m1),
    scoreStructure(m1, canvas),
    scoreConstraintMet(constraintChecks),
    scoreAdaptation(d),
    scoreQualitySurvives(m1, m2),
    { id: 'CC2-6', score: rationaleResult.cc2_6.score, evidence: rationaleResult.cc2_6.evidence, note: rationaleResult.cc2_6.note },
  ];

  const universalFails = computedFails(m1, m2, d, constraintChecks);
  if (rationaleResult.uf_c5 && rationaleResult.uf_c5.triggered) {
    universalFails.push({ id: 'UF-C5', evidence: rationaleResult.uf_c5.evidence, note: rationaleResult.uf_c5.note });
  }

  // Deterministic decision layer — identical policy shape to consultancy.
  const points = anchorScores.reduce((s, a) => s + (a.score || 0), 0);
  const maxPoints = COMPOSITION_L2.anchors.length * 2;
  const hasFail = universalFails.length > 0;
  const pass = points >= COMPOSITION_L2.passThreshold && !hasFail;

  // Grading is the WEAKEST of the two streams: if the rationale degraded to a
  // heuristic, the whole result is at best heuristic even though the geometry is
  // exact. A verified result requires the model-scored stream to have run.
  const grading = CONFIG.mockMode ? 'heuristic'
    : rationaleResult.grading === 'model' ? 'model'
    : rationaleResult.grading === 'degraded' ? 'degraded' : 'heuristic';
  const verified = pass && grading === 'model';

  const summary = buildSummary({ pass, points, maxPoints, d, constraintChecks, change, grading });

  return {
    anchorScores,
    universalFails,
    // Second evidence stream, exposed for the result page — the geometry that
    // decided five of the six anchors, plus the adaptation delta.
    metrics: { round1: m1, round2: m2, delta: d, constraintChecks },
    grading,
    summary,
    points, maxPoints, pass, verified, hasFail,
    passThreshold: COMPOSITION_L2.passThreshold,
    ...(grading === 'degraded' ? { degradedReason: 'The rationale could not be scored by a model. This result is provisional.' } : {}),
  };
}

function buildSummary({ pass, points, maxPoints, d, constraintChecks, change, grading }) {
  const met = constraintChecks.filter(c => c.satisfied).length;
  const adapt = d.restart ? 'restarted the composition rather than adapting it'
    : d.noop ? 'left the composition essentially unchanged'
    : `adapted it while preserving ${Math.round(d.preservedFraction * 100)}% of the original placement`;
  const base = `${points}/${maxPoints}. Against the changed brief ("${change.headline}"), ${met} of ${constraintChecks.length} requirement(s) were met, and the candidate ${adapt}.`;
  if (grading === 'heuristic') return base + ' The geometry is measured exactly; the written rationale was scored by heuristic (demo mode), so this is not a verified result.';
  if (grading === 'degraded') return base + ' The rationale could not be model-scored, so this result is provisional.';
  return base;
}

module.exports = { evaluate };
