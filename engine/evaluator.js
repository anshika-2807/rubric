// Post-session evaluator — conclusion-blind, evidence-linked.
// Receives: transcript + hidden brief + anchors + state trajectory.
// Emits: anchor scores WITH quoted evidence spans, universal-fail flags,
// pass/fail vs fixed threshold, and ledger entries.

const { callClaude, extractJson } = require('./llm');
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

function mockReport() {
  return {
    anchorScores: PROBLEM_FRAMING_L2.anchors.map(a => ({ id: a.id, score: 1, evidence: ['(mock mode — add ANTHROPIC_API_KEY to engine/.env for real evaluation)'], note: 'mock' })),
    universalFails: [],
    cues: { pickedUp: ['timing'], connected: false },
    secondary: SECONDARY.flatMap(s => s.anchors.map(a => ({ id: a.id, score: 1, evidence: ['(mock)'] }))),
    summary: 'MOCK REPORT — the pipeline ran end-to-end without an API key. Real evaluation requires ANTHROPIC_API_KEY.',
  };
}

async function evaluate(brief, transcript, trajectory) {
  let report;
  if (CONFIG.mockMode) {
    report = mockReport();
  } else {
    const convo = transcript.map(m => `${m.role === 'assistant' ? 'CLIENT' : 'CANDIDATE'}: ${m.content}`).join('\n\n');
    const text = await callClaude({
      model: CONFIG.evaluatorModel,
      maxTokens: 3000,
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
    report = extractJson(text) || mockReport();
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

  const ledgerEntries = pass ? [{
    competency: 'problem_framing', level: 'L2', provenance: 3,
    context: 'misframed-single-stakeholder', date: new Date().toISOString().slice(0, 10),
    source: brief.id,
  }] : [];
  // Secondary evidence can accrue even on a framing fail (evidence ≠ verification)
  for (const s of (report.secondary || [])) {
    if (s.score >= 2) {
      const comp = s.id.startsWith('AL') ? 'active_listening' : 'questioning';
      if (!ledgerEntries.find(e => e.competency === comp)) {
        ledgerEntries.push({ competency: comp, level: 'L1', provenance: 3, context: 'discovery-conversation', date: new Date().toISOString().slice(0, 10), source: brief.id });
      }
    }
  }

  return { ...report, points, maxPoints, pass, hasFail, trustDelta, opennessDelta, trajectory, ledgerEntries };
}

module.exports = { evaluate };
