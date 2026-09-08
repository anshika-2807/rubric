# RUBRIC — System Blueprint v0.1

**Purpose of this document:** the complete conceptual structure of the platform, consolidated from all design discussions, organized for markup. Everything is tagged:

- **[LOCKED]** — agreed in discussion; treated as settled unless you reopen it
- **[DRAFT]** — proposed with reasoning; needs your ratification
- **[OPEN]** — genuinely undecided; listed in the Decision Register (§18) with a number, so you can respond by number

---

## 1. Vision & Positioning

**[LOCKED]** Rubric is a trusted layer between learning and opportunity: anyone who genuinely possesses a skill — however they learned it — gets a credible way to prove it.

**[LOCKED]** The product is *trust*; assessment is the mechanism. Every design decision is tested against: *does this make the verification more believable to someone who doesn't know the candidate?*

**[LOCKED]** Two-sided structure: learners (students, self-taught, career switchers — primarily Indian students at launch) are the users; verifiers (employers, recruiters, clients) are the consumers of the signal. Primary use case: resume/hiring proof. Companies to be approached directly to accept the credential.

**[LOCKED]** Rubric verifies **AI-augmented competence**, not solo competence. The construct measured is "what can this person produce with real tools, and can they be trusted doing it" — because that is the question verifiers actually have in 2026.

**[LOCKED]** Ecosystem: Rubric (verification) + Chalance (opportunities/projects) form a flywheel — experience → discovery → verification → opportunity → new experience → new evidence.

---

## 2. Actors

| Actor | Role | Wants |
|---|---|---|
| Learner | Builds evidence, takes assessments | Credible proof, low friction, fairness |
| Verifier | Consumes credentials | Predictive, ungameable, comparable signal |
| Platform AI | Personas, copilots, evaluation, discovery | — |
| Human experts | Calibrate rubrics, audit AI judgments, proctored/paid sessions, appeals | — |
| Chalance | Generates real-world evidence (projects) | — |
| Skill communities / experts | Legitimize competency definitions | — |

---

## 3. The Core Loop

```
                    USER'S LIFE
                        │
        ┌───────────────┴───────────────┐
        │                               │
 "I want to prove X"          "I don't know what I'm good at"
        │                               │
        ▼                               ▼
  TOP-DOWN VERIFICATION        BOTTOM-UP DISCOVERY
        │                               │
        └───────────────┬───────────────┘
                        ▼
                 EVIDENCE LEDGER  ←──────────────┐
                        │                        │
                        ▼                        │
              GAP ANALYSIS (per skill)           │
                        ▼                        │
             PERSONALIZED ASSESSMENT             │
              (incl. mandatory capstone)         │
                        ▼                        │
              VERIFIED COMPETENCIES              │
                        ▼                        │
                 VERIFIED SKILL                  │
                        ▼                        │
          CHALANCE OPPORTUNITIES / PROJECTS      │
                        ▼                        │
              NEW REAL-WORLD EVIDENCE ───────────┘
```

---

## 4. The Evidence Ledger

The core asset. Verification is a gap-filling operation over accumulated evidence, not a from-scratch exam.

### 4.1 Three-level discipline **[LOCKED]**

```
Experience  →  Potential Evidence  →  Competency Hypothesis
           →  Existing Evidence + New Assessment
           →  Verified Competency  →  Aggregated  →  Verified Skill
```

The system never jumps Experience → Verified Skill.

### 4.2 Provenance tiers **[LOCKED]**

| Tier | Source | Verification weight |
|---|---|---|
| 0 | Self-reported narrative | **Zero — routing/personalization only** |
| 1 | Artifact (portfolio, deliverable) | Moderate |
| 2 | Third-party attestation (structured, behavioral questions) | Moderate |
| 3 | Observed performance in Rubric assessment | High |
| 4 | Attested Chalance project (builder log + proof of work) | Highest |

**[LOCKED]** Claims never earn points. Strong artifacts earn a *shortcut into a higher-level assessment attempt*, never score. (Kills the fabricated-experience attack while rewarding honest users identically.)

### 4.3 Evidence dimensions **[LOCKED]**

Every entry carries: competency + **level demonstrated** + **context tag** (e.g. cooperative-single-stakeholder vs contested-multi-stakeholder) + **recency** + **provenance tier**. Gap analysis reads the weighted combination, not binary checkmarks (✓/?/✗ is display-layer only).

### 4.4 Transfer **[LOCKED]**

Evidence travels between skills with a **discount** determined by a **precomputed skill-distance map + fixed deterministic rules**. AI classifies evidence into the graph; it never sets weights ad hoc. Conclusions never travel; integration never transfers (see §7.2).

### 4.5 Spot-checks **[LOCKED]**

Previously-evidenced competencies are re-probed at a sampling rate during new assessments. "Already evidenced" is never a permanent free pass.

### 4.6 Decay **[LOCKED]**

Stagnant competencies lose weight over time; **decay rate is domain-dependent** (framing decays slowly; tool-specific competence fast). Refresh via any assessment or attested project exercising the competency. Re-verification is a lightweight top-up, not a full redo.

### 4.7 Ownership & disclosure **[OPEN — D1]**

Proposed: ledger belongs to the user (portable/exportable/deletable); verifiers see conclusions by default; underlying evidence disclosed only by candidate opt-in (§10).

---

## 5. The Competency Graph

### 5.1 Structure **[LOCKED]**

One shared, governed graph. A competency (e.g. Active Listening) is a single node reused across all skills that require it. Nodes must be **behaviorally observable** — "Critical Thinking" is not a node; it is a **scoring dimension inside every rubric** (reasoning quality, updating on contradiction).

### 5.2 Granularity rule **[DRAFT]**

A node is correctly sized when (a) it can be evidenced by observable transcript behavior, and (b) it plausibly recurs in ≥2 skills. Too coarse → evidence inflation; too fine → no reuse.

### 5.3 Levels **[LOCKED]**

Every competency defined at 4–5 levels. Levels differ by the **ambiguity/difficulty structure of the situation**, not by persona politeness (established in the Problem Framing spec: L1 stated≈actual, L2 stated≠actual, L3 competing frames, L4 contested frames).

### 5.4 Governance & versioning **[OPEN — D2]**

Proposed: AI-drafted, expert-ratified, versioned. Splits/merges of nodes re-anchor existing evidence via mapping rules. Who ratifies, and the change process, is undecided.

---

## 6. Entry Points

### 6.1 Top-down verification **[LOCKED]**

User names the skill → scoping dialogue produces a precise claim → skill's competency requirements loaded → ledger gap analysis → personalized assessment on gaps + spot-checks + capstone.

### 6.2 Bottom-up discovery **[LOCKED]**

User describes what they've done (solves the vocabulary problem — "requirement gathering is a *skill*?"). AI maps experiences → possible competencies → suggests skills *as hypotheses* ("may have demonstrated"). Discovery output routes and motivates; it never scores (§4.2).

---

## 7. Skill Model

### 7.1 Anatomy of a skill **[LOCKED]**

A skill = competency clusters (lifecycle-ordered where natural) + level definitions + declared **assessment archetype** + capstone definition + decay profile + transfer notes.

Reference instance — Consultancy:

```
CONSULTANCY
├── DISCOVERY:      Active Listening · Questioning · Requirement Gathering · Problem Framing
├── INVESTIGATION:  Research · Analysis
├── SYNTHESIS:      Solution Development · Recommendation Building
└── ENGAGEMENT:     Presentation · Client Communication · Stakeholder Management
(Critical Thinking = cross-cutting scoring dimension, not a node)
```

### 7.2 Capstone rule **[LOCKED]**

Competencies don't sum to skills — orchestration under real conditions is itself the competence. **Component evidence reduces assessment scope but never eliminates the integrative capstone.** Every skill verification includes at least one whole-skill challenge.

### 7.3 Assessment archetypes **[LOCKED]**

No universal method. A small set of archetypes; each skill declares its category:

| Archetype | For | Core mechanic |
|---|---|---|
| Simulation / performance | Consultancy, sales, client handling, communication | Live engagement with persona engine (§8.3) |
| Artifact + defense | Design, writing, marketing assets | Produce artifact (open-book, instrumented AI) → live interrogation + perturbation |
| Socratic teach-back | Theoretical/conceptual knowledge | Explain to child-persona AI that probes until satisfied; simplification on demand |
| Output-verifiable task | Code, data analysis | Task with checkable output + reasoning defense |

**[LOCKED]** Universal pattern inside all archetypes: *Question + Application + Unexpected change + Critique + Prediction → pattern of performance → evidence of understanding.* Never quiz-like; nothing memorizable.

---

## 8. Assessment System

### 8.1 Principles **[LOCKED]**

1. **Personalized assessment + standardized competency framework + standardized rubric = comparable verification.** AI generates instances; fixed policy governs parameters, thresholds, discounts.
2. **No-correct-answer rule:** for judgment-heavy tasks, score process, evidence-consistency, and defense — never the conclusion. Evaluator is conclusion-blind (receives hidden brief + anchors, no "right answer").
3. **Artifact + defense:** every artifact task ends with live interrogation of the artifact.
4. **Open-book by design:** assessments assume resource/AI use and are built so that even cheating requires — and produces — understanding.
5. **Production is assisted and instrumented; defense is always unassisted.** The defense verifies *ownership* — you can't bring the AI to the client meeting.

### 8.2 Level ladder = trust ladder **[LOCKED]**

| Level | Meaning (generic) | Assurance tier |
|---|---|---|
| L1 | Structured performance, cooperative conditions | Self-serve, AI-assessed, light identity checks |
| L2 | Handles misframing/vagueness | Self-serve |
| L3 | Full engagement capstone | + random photo verification (check, not store) + evidence review |
| L4 | Adverse/contested conditions | Proctored (paid) or proof-of-work |
| L5 | Real-world | Attested Chalance/real engagements + builder logs + proctored defense |

Credential visibly states its assurance tier. Low-assurance levels admit they're low-assurance; high-stakes hiring reads the top tiers. Price scales with rigor.

**[OPEN — D3]** Whether higher-level attempts auto-extract lower-level evidence from their transcripts (proposed: yes).

### 8.3 The persona engine **[LOCKED architecture / DRAFT details]**

Voice-first for interpersonal skills — in text, Active Listening degrades into reading comprehension. Composed, not monolithic (no off-the-shelf "behavioral model" exists):

```
PERSONA ENGINE
├── Reasoning LLM             → what the client says (content, from hidden brief)
├── Behavioral state machine  → how the client is right now  ← RUBRIC'S CORE IP
└── Empathic speech layer     → how it sounds (off-the-shelf realtime S2S)
```

- **Hidden brief template** per level: stated problem, actual problem, buried cues (content *and* delivery cues — hesitations, tone shifts), constraints, personality parameters. Templates private, generated fresh per candidate; anchors public.
- **State machine:** deterministic variables (trust, openness, frustration, evasiveness) updated by defined rules keyed to candidate behavior. Cue-unlocks gated by state thresholds. Same persona physics for all candidates = comparability.
- **State trajectory as evidence:** whether the client *opened up* is computed, not judged — a second, hard-to-fake scoring stream (the "trust curve"). A candidate can perform listening phrases; they cannot fake the state machine responding.
- Voice adds: turn-taking/interruption/silence observables; pace-based relay defense; voice-consistency as soft identity signal.

### 8.4 Instrumented AI use **[LOCKED]**

- Every production phase provides a frontier-grade **in-platform copilot**; its interaction log is a first-class evidence stream (delegation choices, steering, verification behavior, integration).
- **Seeded flaws:** copilot occasionally emits plausible-but-wrong output contradicting session facts; catching it is a scored anchor (defeats verification theater — only real understanding catches confident nonsense).
- **Hygiene traps:** confidential client material in scenario — does it get pasted into the copilot? Facts checked before client-facing use? Honest attribution when asked in defense?
- Incentive: in-platform AI is genuinely good, and only in-platform use earns AI Direction evidence → external AI use gains nothing.

### 8.5 Baseline-relative scoring **[LOCKED]**

Before a scenario goes live, its task is run through current frontier models with naive prompting and scored on the same rubric → the **AI floor**. Candidate levels are defined as deltas above the floor. The bar auto-rises with model generations (solves assessment depreciation); scenarios re-baselined per model generation (operational cost, competitive moat).

---

## 9. Evaluation Pipeline

**[LOCKED]**

1. Inputs per session: transcript + prosody annotations + persona state log + copilot interaction log + artifacts.
2. Anchor scoring 0/1/2 (absent / present / with distinction); level pass = fixed threshold **and** no universal fail indicator. Thresholds pilot-calibrated, then fixed — never AI-discretionary.
3. **Evidence-linked judgments:** every anchor score cites the transcript span that earned it. Platform-wide invariant; enables audits, appeals, spot-checks, drift detection.
4. **Confidence-routed human review:** low-confidence, borderline, high-stakes, and a random sample route to human experts. Random sampling measures AI-evaluator drift continuously.
5. Human evaluation otherwise on-demand (paid bookings, proctored tiers, level-extension proof-of-work reviews).
6. **[OPEN — D4]** Appeals process shape.

---

## 10. Credential & Disclosure

**[LOCKED]**

- Credential states: skill · level · assurance tier · **assistance mode** (AI-augmented, AI Direction score) · date · competency breakdown.
- **Methodology transparency (public, always):** rubrics, level definitions, sample assessments a hiring manager can try, what each level required. Trust the *system* without seeing any candidate.
- **Candidate evidence (hidden by default):** verifiers see conclusions, not transcripts (degree/CGPA model — prevents bias re-judging). Candidate may **opt in** to share the dossier (trust curve, defended artifacts) for a specific application — the early-days trust lever while brand is nil.
- Failures: **[OPEN — D5]** visibility of failed attempts / retry policy (cooldowns, fresh instances, attempt count on credential).

---

## 11. AI Direction (new competency cluster)

**[LOCKED]** Cross-cutting cluster verified through instrumented production phases:

```
AI DIRECTION
├── Decomposition & delegation judgment (what to hand off vs keep)
├── Steering (supplying context AI lacks; iterating)
├── Output evaluation & verification (incl. seeded-flaw catches)
├── Integration (digesting vs laminating AI output)
├── Use hygiene (confidentiality, attribution honesty)
└── Accountability (unassisted defense of the final artifact)
```

Maximally reusable node cluster (lowest transfer discounts in the graph); reported alongside every skill; likely the highest-demand signal for verifiers.

---

## 12. Lifecycle

**[LOCKED]** Time decay per §4.6; upward progression (re-verify at higher level) preferred over pure maintenance; competency-graph changes are versioned with evidence re-anchoring rules **[OPEN — D2]**.

---

## 13. Chalance Integration

**[LOCKED]**

- Verified skills → matched projects/opportunities.
- **Builder log** (regular in-project updates) = process evidence layer; timestamped logs are harder to fabricate than deliverables.
- End-of-project **proof of work** (can be lightweight) + structured attestation (specific behavioral questions, not "were they good?").
- Chalance evidence enters ledger at Tier 4; feeds L5 verification and decay refresh.

---

## 14. Integrity & Threat Model

**[LOCKED]** Posture: assume cheating; design so cheating requires understanding.

| Threat | Countermeasure |
|---|---|
| External AI relay | Live pace (voice), perturbation, defense unassisted, in-platform copilot incentives |
| Fabricated experiences | Tier-0 = zero weight; shortcuts only into *assessments* |
| Ledger farming to shrink assessed surface | Spot-check sampling; capstone never waived |
| Coached "always reframe" behavior | Earned-reframe anchors (must cite cues); seductive-failure scenario design |
| Rubric gaming (public anchors) | Anchors public, instance templates private; fresh generation per candidate |
| Assessment leakage | Generative instances from private templates; no fixed item bank |
| Impersonation | Assurance ladder: photo checks (L3), proctoring (L4–5), voice consistency; **[OPEN — D6]** full identity model deferred |
| Verification theater | Seeded flaws (only understanding catches them) |
| Attestation collusion | Structured behavioral attestations; builder-log cross-checks |

---

## 15. Fairness

- **[LOCKED]** Fluency is never scored; anchors score behaviors.
- **[DRAFT]** Multilingual/Hinglish personas — realism feature for the Indian market, not an accommodation.
- **[OPEN — D7]** Equivalent-standing text mode (accessibility for deaf/HoH candidates; also the language-fairness fallback). Must be designed early, with an explicit equivalence ruling.
- **[LOCKED]** Everyday-business scenario domains (no specialist knowledge) for process skills; "skill + domain" combos are separate, later claims.

---

## 16. Launch Scope

**[LOCKED]**

- **Skill:** Consultancy (hub skill — seeds the ledger; hard-to-verify = where the market gap is; AI-as-client is *better* than human role-play here).
- **Selection criteria going forward:** verifier demand × learner volume × assessability (not learner popularity — "Python rarely needs verification").
- **Exists:** Problem Framing competency spec v0.1 (the template all specs copy).

---

## 17. Authoring Roadmap (pre-platform artifacts)

Order of documents to produce, each following the established template pattern:

1. **AI Direction competency spec** — referenced by every other spec; do it first
2. **Behavioral state machine spec** for the L2 consultancy client (state variables, update rules, cue-unlock thresholds) — the persona-engine template
3. Remaining Consultancy competency specs (Active Listening next — hardest boundary with Problem Framing; best test of discipline)
4. **L3 capstone assembly spec** — how competencies, copilot, seeded flaws, baseline scoring compose into one session flow
5. **Skill-distance map v0** for Consultancy's neighbors (transfer discounts)
6. **Credential schema** — exact fields a verifier sees at each disclosure layer
7. **Evaluation rubric calibration plan** — pilot protocol: thresholds, AI-vs-human agreement targets, baseline runs
8. Then: platform.

---

## 18. Decision Register (respond by number)

| # | Decision | Status | Current proposal |
|---|---|---|---|
| D1 | Ledger ownership & default disclosure | OPEN | User-owned, portable; conclusions-only default; candidate opt-in dossier |
| D2 | Competency-graph governance & versioning | OPEN | AI-drafted, expert-ratified, versioned with re-anchoring rules; ratifier TBD |
| D3 | Auto-extract lower-level evidence from higher-level transcripts | OPEN | Yes |
| D4 | Appeals process | OPEN | Human review of evidence-linked judgments; scope/pricing TBD |
| D5 | Failed-attempt visibility & retry policy | OPEN | Cooldown + fresh instance; attempt count visible at L3+ only — TBD |
| D6 | Full identity model | OPEN (deferred) | Photo-check L3, proctor L4–5, voice consistency; formal design later |
| D7 | Text-mode equivalence | OPEN | Equal-standing mode with explicit equivalence ruling; design early |
| D8 | Level-pass thresholds & human-review sampling rates | OPEN | Pilot-calibrated, then fixed |
| D9 | Human-review economics (ratio affordable per verification) | OPEN | Determines price/throughput; model during pilot |
| D10 | Verifier partnerships at launch (which companies, which claim) | OPEN | 2–3 design partners in one hiring vertical |
