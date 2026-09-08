// Machine-readable rubric anchors — Composition under a changing brief, L2.
// PUBLIC by design, and printed verbatim on /methodology. The brief instance and
// the specific constraint that gets introduced stay private.
//
// Note which anchors are computed rather than judged. Five of the six are
// decided by measuring the coordinates the candidate submitted; only the
// rationale anchor needs a language model. That is deliberate — geometry is
// measurable, so measuring it is both cheaper and more defensible than asking a
// model for an opinion about it.

const COMPOSITION_L2 = {
  competency: 'Composition under a changing brief',
  competencyId: 'composition_changing_brief',
  level: 'L2',
  passThreshold: 8,          // of 12 points (6 anchors × 2), AND no universal fail
  anchors: [
    { id: 'CC2-1', source: 'computed', text: 'The first composition establishes a clear focal point: one element carries dominant visual weight rather than competing evenly with the rest.' },
    { id: 'CC2-2', source: 'computed', text: 'The first composition is structurally sound — elements sit inside the margins, essential text does not collide, and positions align to a consistent axis or grid.' },
    { id: 'CC2-3', source: 'computed', text: 'The revised composition satisfies the constraint introduced by the changed brief.' },
    { id: 'CC2-4', source: 'computed', text: 'The revision adapts the existing composition rather than restarting: parts that still worked are recognisably preserved.' },
    { id: 'CC2-5', source: 'computed', text: 'Structural quality survives the change — the revision introduces no new margin breaches, collisions or alignment regressions.' },
    { id: 'CC2-6', source: 'model', text: 'The written rationale explains the trade-off made, naming specific elements and the new constraint, and is consistent with what actually changed.' },
  ],
  universalFails: [
    { id: 'UF-C1', source: 'computed', text: 'Restart: the revision discards the first composition and rebuilds from scratch instead of adapting it.' },
    { id: 'UF-C2', source: 'computed', text: 'No adaptation: the revision is effectively unchanged while the new constraint remains unmet.' },
    { id: 'UF-C3', source: 'computed', text: 'Constraint ignored: the requirement introduced by the changed brief is not satisfied at all.' },
    { id: 'UF-C4', source: 'computed', text: 'Broken artefact: elements fall outside the canvas, or essential text is obscured by another element.' },
    { id: 'UF-C5', source: 'model', text: 'Unsupported rationale: the explanation describes changes that the submitted layouts show were never made.' },
  ],
};

module.exports = { COMPOSITION_L2 };
