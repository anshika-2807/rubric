// Post-session evaluator — conclusion-blind, evidence-linked.
// Receives: transcript + hidden brief + anchors + state trajectory.
// Emits: anchor scores WITH quoted evidence spans, universal-fail flags,
// pass/fail vs fixed threshold, and ledger entries.

const { callModel, extractJson } = require('./ai/router');
const { CONFIG } = require('./config');
const { PROBLEM_FRAMING_L2, SECONDARY } = require('./anchors');

const SYSTEM = `You are the evaluator for a consulting discovery assessment. You score a transcript against fixed behavioral anchors.

RULES:
- Score each anchor 0 (absent), 1 (present), or 2 (present with distinction).
- EVERY score above 0 must cite exact quotes from the CANDIDATE's messages as evidence. No quote, no points.
- You are conclusion-blind: there is no "correct recommendation". Score process, evidence-consistency, and behavior — never whether you agree with their conclusion.
- Flag universal fails only when clearly present; quote evidence for each flag.
- Also record which cue ids the candidate picked up and whether they CONNECTED them.
Return STRICT JSON only:
{
  "anchorScores": [{"id": "...", "score": 0|1|2, "evidence": ["exact quote", ...], "note": "one line"}],
  "universalFails": [{"id": "...", "evidence": ["quote"], "note": "one line"}],
  "cues": {"pickedUp": ["cue ids"], "connected": bool},
  "secondary": [{"id": "...", "score": 0|1|2, "evidence": ["quote"]}],
  "summary": "3-4 sentences on the candidate's framing behavior, written for the candidate"
}`;

// ── Heuristic scorer ─────────────────────────────────────────────────────────
// Used in mock mode (no API key) and when every provider fails. It is a real
// scorer, not a stub: it reads the actual transcript and cites actual candidate
// quotes, so the whole pipeline — thresholds, universal fails, ledger entries —
// exercises genuine inputs and a bad session still fails.
//
// It is NOT a verified result, and every report it produces is stamped
// grading:'heuristic' so the UI can say so and the profile can exclude it.
function heuristicReport(brief, transcript) {
  const turns = transcript.filter(m => m.role === 'user').map(m => m.content);
  const all = turns.join('\n').toLowerCase();
  const quote = re => turns.find(t => re.test(t.toLowerCase())) || null;

  // Which buried cues did the candidate actually engage with?
  const cueProbes = {
    timing: /six weeks|6 weeks|when did|how long|dip(ped)?|timeline|a year|last year|since when/,
    competitor: /competitor|chaigo|rival|other brand|cheaper|price|pricing|cost/,
    discount_dms: /discount|combo|offer|dm|message|asking about price/,
  };
  const pickedUp = Object.entries(cueProbes)
    .filter(([id, re]) => brief.cues.some(c => c.id === id) && re.test(all))
    .map(([id]) => id);

  const score = (present, distinction) => (present ? (distinction ? 2 : 1) : 0);
  const ev = q => (q ? [q] : []);

  const probesStated = quote(/why do you think|what makes you|how do you know|is it possible|what else/);
  const connects = pickedUp.length >= 2 && /because|which suggests|connect|both|same time|around the same|that lines up|correlat/.test(all);
  const reframeQ = quote(/actually|real problem|not (about|the) content|rather than|underlying|root/);
  const groundsIt = reframeQ && /you (said|mentioned|told me)|earlier|you just|based on what/.test(all);
  const holdsGround = quote(/i hear you|i understand, but|let's test|walk through|evidence|the reason i ask/);
  const agreementQ = quote(/does that (sound|feel)|do you agree|shall we|are we aligned|make sense to you|would you say/);

  const anchorScores = [
    { id: 'PF2-1', score: score(!!probesStated, /why do you think/.test(all)), evidence: ev(probesStated), note: probesStated ? 'Tested the stated problem rather than accepting it.' : 'No question probed whether the stated problem was the real one.' },
    { id: 'PF2-2', score: score(pickedUp.length >= 2, connects), evidence: ev(quote(cueProbes.competitor) || quote(cueProbes.timing)), note: `Cues engaged: ${pickedUp.join(', ') || 'none'}${connects ? ' — and connected to each other.' : pickedUp.length >= 2 ? ' — mentioned but not connected.' : ''}` },
    { id: 'PF2-3', score: score(!!reframeQ, /you came (in|to me) about|but this suggests/.test(all)), evidence: ev(reframeQ), note: reframeQ ? 'Offered a reframe of the problem.' : 'Never proposed an alternative framing.' },
    { id: 'PF2-4', score: score(!!groundsIt, false), evidence: ev(groundsIt ? reframeQ : null), note: groundsIt ? 'Reframe cited information from this conversation.' : 'Reframe not visibly grounded in session facts.' },
    { id: 'PF2-5', score: score(!!holdsGround, false), evidence: ev(holdsGround), note: holdsGround ? 'Worked through the evidence rather than capitulating or bulldozing.' : 'No visible handling of client resistance.' },
    { id: 'PF2-6', score: score(!!agreementQ, false), evidence: ev(agreementQ), note: agreementQ ? 'Sought explicit agreement on the frame.' : 'Frame never confirmed with the client.' },
  ];

  // Universal fails — same policy as live grading, applied to heuristic signals.
  const universalFails = [];
  const solutionJump = quote(/you should|i suggest|my recommendation|let's create|we could make|start posting|run ads/);
  if (solutionJump && turns.indexOf(solutionJump) <= 1 && !probesStated) {
    universalFails.push({ id: 'UF-1', evidence: [solutionJump], note: 'Proposed solutions before any problem statement existed.' });
  }
  if (!reframeQ && pickedUp.length <= 1 && turns.length >= 3) {
    universalFails.push({ id: 'UF-2', evidence: ev(turns[turns.length - 1]), note: 'Adopted the stated problem without testing it.' });
  }
  if (reframeQ && !groundsIt && pickedUp.length === 0) {
    universalFails.push({ id: 'UF-3', evidence: [reframeQ], note: 'Rejected the stated frame without citing anything discovered in the session.' });
  }

  const secondary = [
    { id: 'AL-1', score: score(/you (said|mentioned)|earlier you/.test(all), false), evidence: ev(quote(/you (said|mentioned)|earlier you/)) },
    { id: 'AL-2', score: score(/so (what )?(you|you're|your)|sounds like|if i understand|let me summar/.test(all), false), evidence: ev(quote(/so (what )?(you|you're|your)|sounds like|if i understand|let me summar/)) },
    { id: 'Q-1', score: score(/\b(how|why|tell me|walk me)\b/.test(all), false), evidence: ev(quote(/\b(how|why|tell me|walk me)\b/)) },
    { id: 'Q-2', score: score(/you mentioned|going back to|more about that|on that point/.test(all), false), evidence: ev(quote(/you mentioned|going back to|more about that|on that point/)) },
  ];

  return {
    anchorScores,
    universalFails,
    cues: { pickedUp, connected: connects },
    secondary,
    grading: 'heuristic',
    summary: `Heuristic assessment over ${turns.length} candidate turn(s). Cues engaged: ${pickedUp.join(', ') || 'none'}.${connects ? ' Cues were connected to each other.' : ''} This is a pattern-matched reading of the transcript, not a verified evaluation — it runs the real thresholds and universal-fail policy, but the anchor judgments come from keyword heuristics rather than a language model.`,
  };
}

async function evaluate(brief, transcript, trajectory, budget) {
  let report;
  if (CONFIG.mockMode) {
    report = heuristicReport(brief, transcript);
  } else {
    const convo = transcript.map(m => `${m.role === 'assistant' ? 'CLIENT' : 'CANDIDATE'}: ${m.content}`).join('\n\n');
    try {
      // ONE call per session. This is where the reasoning budget belongs, and
      // it is the only LLM call in the whole evaluation path.
      const text = await callModel({
        task: 'evaluate',
        maxTokens: 3000,
        json: true,
        budget,
        system: SYSTEM,
        messages: [{
          role: 'user',
          content:
`HIDDEN BRIEF (for discoverability checks only — remember: conclusion-blind):
Stated problem: ${brief.statedProblem}
Actual situation: ${brief.actualProblem}
Cues: ${brief.cues.map(c => `[${c.id}] ${c.text}`).join(' | ')}

ANCHORS (Problem Framing L2): ${JSON.stringify(PROBLEM_FRAMING_L2.anchors)}
UNIVERSAL FAILS: ${JSON.stringify(PROBLEM_FRAMING_L2.universalFails)}
SECONDARY ANCHORS: ${JSON.stringify(SECONDARY)}

TRANSCRIPT:
${convo}

Return the JSON.`,
        }],
      });
      const parsed = extractJson(text);
      if (!parsed || !Array.isArray(parsed.anchorScores)) throw new Error('evaluator returned no usable anchor scores');
      report = { ...parsed, grading: 'model' };
    } catch (e) {
      // Never present a degraded evaluation as a verified one. Fall back to the
      // heuristic scorer, but mark it so the UI labels the result and the
      // profile excludes it from verified competencies.
      console.error('[evaluator] degraded to heuristic:', e.message);
      report = { ...heuristicReport(brief, transcript), grading: 'degraded', degradedReason: 'The evaluation model could not be reached. This result is provisional.' };
    }
  }

  // Deterministic decision layer — thresholds are POLICY, never model discretion.
  const points = (report.anchorScores || []).reduce((s, a) => s + (a.score || 0), 0);
  const maxPoints = PROBLEM_FRAMING_L2.anchors.length * 2;
  const hasFail = (report.universalFails || []).length > 0;
  const pass = points >= PROBLEM_FRAMING_L2.passThreshold && !hasFail;

  // State-trajectory evidence: did the client actually open up? (computed, not judged)
  const first = trajectory[0], last = trajectory[trajectory.length - 1];
  const trustDelta = last.trust - first.trust;
  const opennessDelta = last.openness - first.openness;

  // Only a model-graded pass deposits verified evidence. A heuristic or
  // degraded run may still show a provisional verdict to the candidate, but it
  // must never enter the record as a verified competency.
  const verified = pass && report.grading === 'model';

  const ledgerEntries = verified ? [{
    competency: 'problem_framing', level: 'L2', provenance: 3,
    context: 'misframed-single-stakeholder', date: new Date().toISOString().slice(0, 10),
    source: brief.id,
  }] : [];
  // Secondary evidence can accrue even on a framing fail (evidence ≠ verification)
  if (verified || report.grading === 'model') {
    for (const s of (report.secondary || [])) {
      if (s.score >= 2) {
        const comp = s.id.startsWith('AL') ? 'active_listening' : 'questioning';
        if (!ledgerEntries.find(e => e.competency === comp)) {
          ledgerEntries.push({ competency: comp, level: 'L1', provenance: 3, context: 'discovery-conversation', date: new Date().toISOString().slice(0, 10), source: brief.id });
        }
      }
    }
  }

  return {
    ...report,
    points, maxPoints, pass, verified, hasFail,
    passThreshold: PROBLEM_FRAMING_L2.passThreshold,
    trustDelta, opennessDelta, trajectory, ledgerEntries,
  };
}

module.exports = { evaluate };
