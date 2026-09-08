// rubrik. skill & competency registry — single source of truth.
//
// The picker, the verification overview, the result page and the public profile
// all read from here. Nothing about a skill's name, level, archetype or
// assurance tier is written twice, so a credential cannot drift from the page
// that sold it.
//
// Only fields safe for the browser live in this file. Hidden assessment material
// (briefs, cues, anchors, thresholds) lives in the per-assessment modules and is
// never merged into anything sent to a client.

// ─── Level ladder (blueprint §8.2) ───────────────────────────────────────────
// Levels differ by the AMBIGUITY STRUCTURE OF THE SITUATION, not by task
// difficulty and not by persona politeness. The ladder is also the trust ladder:
// each level names the assurance it can honestly claim.
//
// This replaces the earlier design-mock ladder (Recall / Application /
// Reasoning / Adaptation / Mastery), which was a generic knowledge taxonomy and
// made "adaptation" a level. Adaptation is a mechanism used at every level here.
const LEVELS = [
  {
    id: 'L1',
    name: 'Structured',
    meaning: 'Performs under cooperative conditions, where what the client states is essentially what they need.',
    assurance: 'Self-serve · AI-assessed · light identity checks',
    available: false,
  },
  {
    id: 'L2',
    name: 'Shifting',
    // Generic across skills. Each skill states what the shift concretely is,
    // via verification.levelMeaning — the ladder describes the shape of the
    // situation, and the skill describes the instance.
    meaning: 'The situation misleads or moves: what you are given at the start is not what you end up having to handle.',
    assurance: 'Self-serve · AI-assessed',
    available: true,
  },
  {
    id: 'L3',
    name: 'Integrative',
    meaning: 'A whole-skill capstone: orchestrating the competencies together under real conditions.',
    assurance: 'Adds photo verification (checked, never stored) and evidence review',
    available: false,
  },
  {
    id: 'L4',
    name: 'Contested',
    meaning: 'Adverse conditions — competing stakeholders, active resistance, incomplete information.',
    assurance: 'Proctored, or accepted proof of work',
    available: false,
  },
  {
    id: 'L5',
    name: 'Real-world',
    meaning: 'Attested delivery on real engagements, evidenced by timestamped builder logs.',
    assurance: 'Attested project evidence plus proctored defense',
    available: false,
  },
];

// The one assurance tier V1 can actually support. Stated on every credential.
const V1_ASSURANCE = {
  tier: 'Self-serve · AI-assessed',
  identityVerified: false,
  note: 'Assessed by AI against published anchors, with every score linked to evidence from the session. No identity verification, no proctoring, no human review at this tier.',
};

// ─── Skills ──────────────────────────────────────────────────────────────────
// `available: true` means the assessment runs end to end today. Everything else
// is listed as planned and is not clickable — the picker must never imply that
// an unbuilt assessment exists.

const SKILLS = [
  {
    id: 'consultancy',
    code: 'RB-CON-01',
    name: 'Consultancy',
    category: 'Communication',
    archetype: 'Simulation / performance',
    available: true,
    blurb: 'A live client who does not know what their real problem is. Uncover it, reframe it, and get them to agree.',
    // Blueprint §7.1 reference instance. Shown on the overview so the candidate
    // sees that one competency is being verified, not the whole skill.
    clusters: [
      { name: 'Discovery', competencies: ['Active Listening', 'Questioning', 'Requirement Gathering', 'Problem Framing'] },
      { name: 'Investigation', competencies: ['Research', 'Analysis'] },
      { name: 'Synthesis', competencies: ['Solution Development', 'Recommendation Building'] },
      { name: 'Engagement', competencies: ['Presentation', 'Client Communication', 'Stakeholder Management'] },
    ],
    crossCutting: 'Critical Thinking is scored as a dimension inside every rubric, not as a separate competency.',
    verification: {
      competencyId: 'problem_framing',
      competency: 'Problem Framing',
      cluster: 'Discovery',
      level: 'L2',
      levelMeaning: 'The problem the client states is not the problem she actually has.',
      archetype: 'Simulation / performance',
      durationMin: 20,
      contextTag: 'misframed-single-stakeholder',
      assessmentPath: '/assess/consultancy',
      task: 'A 20-minute discovery call with a founder who has misdiagnosed her own problem.',
      whatYouDo: [
        'Talk to the client the way you would in a real first call.',
        'Notice what she says in passing, not just what she came in to say.',
        'When you think you know the actual problem, put it to her and get agreement.',
      ],
      // The candidate is told exactly what is measured. Anchors are public by
      // design (blueprint §14): what stays private is the brief instance.
      measures: [
        'Whether you treat the stated problem as a hypothesis rather than a fact',
        'Whether you pick up the buried cues and connect them to each other',
        'Whether your reframe is grounded only in what was actually said',
        'How you handle the client pushing back on your reframe',
        'Whether you close the loop and secure agreement',
      ],
      // Two independent scoring streams, one of which cannot be talked around.
      evidenceStreams: [
        { name: 'Evidence-linked anchors', how: 'Six behavioural anchors scored 0/1/2. Every score above zero must cite the exact thing you said.' },
        { name: 'Trust curve', how: "Whether the client actually opened up. Computed from a deterministic state machine driven by your behaviour — not a judgement, arithmetic." },
      ],
      certifies: 'Problem Framing at Level 2, within the Discovery cluster of Consultancy.',
      doesNotCertify: 'Consultancy as a whole. That requires the remaining Discovery competencies plus an integrative capstone (Level 3), which is not yet available.',
    },
  },

  {
    id: 'visual-layout',
    code: 'RB-DSG-01',
    name: 'Visual Layout & Composition',
    category: 'Design',
    archetype: 'Artifact + defense',
    available: true,
    blurb: 'Compose a poster from supplied elements. Then the brief changes, and you have to adapt rather than restart.',
    clusters: [
      { name: 'Composition', competencies: ['Hierarchy', 'Balance', 'Alignment & Grid', 'Composition under a changing brief'] },
      { name: 'Craft', competencies: ['Typographic Setting', 'Colour & Contrast'] },
      { name: 'Judgement', competencies: ['Restraint', 'Design Rationale'] },
    ],
    crossCutting: 'Critical Thinking is scored as a dimension inside every rubric, not as a separate competency.',
    verification: {
      competencyId: 'composition_changing_brief',
      competency: 'Composition under a changing brief',
      cluster: 'Composition',
      level: 'L2',
      levelMeaning: 'The brief changes after you have committed to a composition.',
      archetype: 'Artifact + defense',
      durationMin: 15,
      contextTag: 'constraint-introduced-midway',
      assessmentPath: '/assess/visual-layout',
      task: 'Arrange a fixed set of elements into a poster. Submit it. The brief then changes, and you adapt the composition you already have.',
      whatYouDo: [
        'Position the supplied elements on the canvas to satisfy the brief.',
        'Submit the first composition. You cannot revise it afterwards.',
        'Read the changed brief and adapt what you built — the elements stay the same.',
        'Explain, in a few sentences, what you changed and what you chose to protect.',
      ],
      measures: [
        'Whether the first composition has a real focal point and holds together structurally',
        'Whether you satisfy the new constraint once it appears',
        'Whether you adapt the existing composition or quietly start over',
        'Whether structural quality survives the change',
        'Whether your explanation matches what you actually did',
      ],
      evidenceStreams: [
        { name: 'Computed geometry', how: 'Alignment, margins, overlap, balance, hierarchy, whitespace and grid adherence are measured from the coordinates you submit. Not a judgement — measurement.' },
        { name: 'Adaptation delta', how: 'What moved between the two submissions, and how far. This is what separates adapting from restarting, and it is arithmetic.' },
        { name: 'Rationale anchors', how: 'Your written explanation is scored against anchors — and checked against the measured delta, so describing a change you did not make counts against you.' },
      ],
      certifies: 'Composition under a changing brief, at Level 2.',
      doesNotCertify: 'Visual design as a profession. This measures compositional judgement under a shifting constraint using supplied elements. It says nothing about typography, illustration, colour systems or originating a concept.',
    },
  },

  // ── Planned. Listed so the shape of the catalogue is visible; not clickable. ──
  { id: 'stakeholder-comms', code: 'RB-CON-02', name: 'Stakeholder Communication', category: 'Communication', archetype: 'Simulation / performance', available: false,
    blurb: 'A live scenario with a stakeholder who pushes back. Judged on framing, evidence and holding position under pressure.' },
  { id: 'requirement-gathering', code: 'RB-CON-03', name: 'Requirement Gathering', category: 'Communication', archetype: 'Simulation / performance', available: false,
    blurb: 'Elicit what is actually needed from someone who describes solutions instead of needs.' },
  { id: 'technical-writing', code: 'RB-WRT-01', name: 'Technical Writing', category: 'Writing', archetype: 'Artifact + defense', available: false,
    blurb: 'Explain something hard in plain language under a real constraint, then defend the cuts you made.' },
  { id: 'schema-design', code: 'RB-DAT-01', name: 'Schema Design', category: 'Data', archetype: 'Output-verifiable task', available: false,
    blurb: 'Model a domain, then justify keys, normalisation and access patterns against a changed requirement.' },
  { id: 'sql-optimization', code: 'RB-ENG-01', name: 'SQL Query Optimization', category: 'Engineering', archetype: 'Output-verifiable task', available: false,
    blurb: 'Read an execution plan, rewrite the query, defend the trade-offs you accepted.' },
  { id: 'concept-teachback', code: 'RB-THY-01', name: 'Explaining Technical Concepts', category: 'Theory', archetype: 'Socratic teach-back', available: false,
    blurb: 'Explain a concept to a persona that keeps asking why until it genuinely understands, or catches that you do not.' },
];

const CATEGORIES = ['All', 'Communication', 'Design', 'Engineering', 'Data', 'Writing', 'Theory'];

// ─── Lookups ─────────────────────────────────────────────────────────────────

const bySkillId = id => SKILLS.find(s => s.id === id) || null;
const availableSkills = () => SKILLS.filter(s => s.available);

/** The two assessments that run end to end, keyed by their route segment. */
function assessableSkill(id) {
  const skill = bySkillId(id);
  return skill && skill.available ? skill : null;
}

const levelById = id => LEVELS.find(l => l.id === id) || null;

/**
 * The credential header shared by the result page and the public profile.
 * Built from the registry so a displayed credential cannot contradict the
 * catalogue entry that produced it.
 */
function credentialDescriptor(skillId) {
  const skill = bySkillId(skillId);
  if (!skill || !skill.verification) return null;
  const v = skill.verification;
  return {
    skillId: skill.id,
    skill: skill.name,
    code: skill.code,
    competencyId: v.competencyId,
    competency: v.competency,
    cluster: v.cluster,
    level: v.level,
    levelName: levelById(v.level)?.name || v.level,
    // The skill's concrete statement of the shift, falling back to the ladder's
    // generic description of the situation shape.
    levelMeaning: v.levelMeaning || levelById(v.level)?.meaning || '',
    levelShape: levelById(v.level)?.meaning || '',
    archetype: v.archetype,
    contextTag: v.contextTag,
    assurance: V1_ASSURANCE,
    provenance: 3,             // blueprint §4.2 — observed performance in a rubrik assessment
    certifies: v.certifies,
    doesNotCertify: v.doesNotCertify,
  };
}

module.exports = {
  LEVELS, SKILLS, CATEGORIES, V1_ASSURANCE,
  bySkillId, availableSkills, assessableSkill, levelById, credentialDescriptor,
};
