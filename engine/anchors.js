// Machine-readable rubric anchors — Problem Framing L2 (from spec v0.1)
// plus secondary Active Listening / Questioning evidence anchors.
// PUBLIC by design (anchors are published); instance briefs are private.

const PROBLEM_FRAMING_L2 = {
  competency: 'problem_framing',
  level: 'L2',
  passThreshold: 8, // of 12 points (6 anchors × 2), AND no universal fail
  anchors: [
    { id: 'PF2-1', text: 'Treats the stated problem as a hypothesis: at least one question probes whether the stated problem is actually the problem.' },
    { id: 'PF2-2', text: 'Picks up at least two buried cues AND connects them to each other (connection, not mere mention).' },
    { id: 'PF2-3', text: 'Proposes a reframe explicitly ("you came in about X, but this suggests Y because...").' },
    { id: 'PF2-4', text: 'Grounds the reframe ONLY in information from this session (no phantom facts).' },
    { id: 'PF2-5', text: 'Handles client resistance to the reframe without capitulating instantly or bulldozing — walks through the evidence.' },
    { id: 'PF2-6', text: 'Secures explicit agreement on the reframe, or explicitly logs the disagreement and its consequence.' },
  ],
  universalFails: [
    { id: 'UF-1', text: 'Solution-jumping: proposes solutions before any problem statement exists.' },
    { id: 'UF-2', text: 'Frame absorption: adopts the stated problem verbatim with no testing — including competently solving the WRONG problem.' },
    { id: 'UF-3', text: 'Contrarian reframing: rejects the stated frame without citing discovered cues.' },
    { id: 'UF-4', text: 'Phantom facts: the frame relies on information that appears nowhere in the session.' },
    { id: 'UF-5', text: 'No agreement loop: never confirms the frame with the client.' },
    { id: 'UF-6', text: 'Frozen frame: holds the initial frame after clearly contradicting information.' },
  ],
};

const SECONDARY = [
  { competency: 'active_listening', anchors: [
    { id: 'AL-1', text: 'References and builds on information the client offered unprompted.' },
    { id: 'AL-2', text: 'Summarizes accurately without inserting assumptions.' },
  ]},
  { competency: 'questioning', anchors: [
    { id: 'Q-1', text: 'Uses open questions to explore before narrowing with closed ones.' },
    { id: 'Q-2', text: 'Follows up on answers rather than running a fixed script.' },
  ]},
];

module.exports = { PROBLEM_FRAMING_L2, SECONDARY };
