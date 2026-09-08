# rubrik. V1 — scope & honesty contract

Companion to `rubric-blueprint-v0.1.md`. The blueprint describes the product;
this document records what V1 actually implements, and — more importantly —
what it must never claim.

rubrik. is a trust product. A feature that *appears* verified but isn't does
more damage than a missing feature. Everything below is therefore split into
three buckets, and the third one is binding.

---

## V1 demonstrates one loop

```
Landing → Skill selection → Verification overview → Assessment
        → Server-side evaluation → Verified result → Public profile
```

Two competencies work end to end.

| | Skill 1 | Skill 2 |
|---|---|---|
| Skill | Consultancy | Visual Layout & Composition |
| Competency | Problem Framing | Composition under a changing brief |
| Level | L2 | L2 |
| Archetype | Simulation / performance | Artifact + defense |
| Assurance tier | Self-serve, AI-assessed | Self-serve, AI-assessed |
| Provenance of evidence | Tier 3 (observed performance) | Tier 3 (observed performance) |

**Consultancy is the skill; Problem Framing L2 is the competency.** Passing it
verifies one competency inside Consultancy's DISCOVERY cluster. It does not
verify Consultancy. Per blueprint §7.2 a skill-level claim additionally requires
an integrative capstone, which V1 does not implement. The UI must say so.

---

## 1. Genuinely real

These are load-bearing for the trust claim. They are implemented for real.

- **Evaluation is server-side.** The verdict is computed on the server, stored,
  and re-read from the store for display. No client-submitted score is ever
  trusted or accepted.
- **Hidden assessment material never reaches the browser.** `actualProblem`,
  cue text, cue-unlock thresholds, anchor definitions, pass thresholds and
  constraint checks are absent from every API response the candidate receives.
- **Every anchor score above 0 cites real evidence** — a verbatim candidate
  quote (Consultancy) or a computed geometric fact (Composition).
- **Pass/fail is deterministic policy, not model discretion.** The model
  proposes anchor scores; `points >= threshold && no universal fail` is applied
  in code, outside the model.
- **The behavioral state machine is deterministic.** Trust/openness/frustration
  move by fixed rules keyed to classified behaviors. Same physics for every
  candidate, so results are comparable.
- **The trust curve is computed, not judged.** Whether the client opened up is
  arithmetic over the state trajectory — a second scoring stream a candidate
  cannot talk their way through.
- **Composition geometry is computed, not judged.** Alignment, margins,
  overlap, balance, hierarchy, whitespace, grid adherence and the R1→R2
  adaptation delta are all measured from submitted coordinates.
- **Rationale claims are checked against the computed delta.** A candidate who
  describes changes they did not make trips a universal fail.
- **Mock mode runs the real pipeline** — same state machine, same geometry, same
  thresholds. Only the LLM-dependent judgments degrade, and they are labelled.

## 2. Legitimately scaffolded

Acceptable for V1 *because the UI states the limitation*.

| Scaffold | Required label |
|---|---|
| Demo identity: a cookie-issued id and a display name, no password | Not an authentication system |
| One hand-authored brief instance per competency | Blueprint calls for fresh generation per candidate from a private template |
| Mock-mode / degraded evaluation | Badged `HEURISTIC` or `DEGRADED`; never presented as a verified result |
| Profile aggregation = a query over this user's attempts | No evidence ledger, no transfer discounts, no gap analysis, no decay |
| Assurance tier | Stated plainly: self-serve, AI-assessed, no identity verification |
| Integrity telemetry (focus loss, paste attempts) | Client-reported, logged, never scored |
| Non-implemented skills in the picker | Visibly unavailable and not clickable |
| Human review / appeals | Not available at this tier |

## 3. Must not be faked — binding

Never ship any of these, in any form:

- **A verification endpoint that returns valid for input it did not verify.**
  (The pre-V1 `verifyCredential` returned `isValid: true` with a hardcoded skill
  and level for *any* id whenever Web3 was unconfigured, which was its default
  state. Removed.)
- **Fabricated transaction hashes or block-explorer links** for transactions
  that never happened. (Removed.)
- **Invented social proof** — verified-user counts, pass rates, skill catalogue
  sizes. (Removed from the ported pages.)
- **Invented endorsements or named human reviewers.** V1 has no human review, so
  the profile has no endorsements. (Removed.)
- **Immutability or permanence claims.** V1 stores rows in Postgres. It is not
  an immutable ledger and must not say it is.
- **Baseline-relative scoring / "AI floor" claims.** Not implemented, not
  mentioned.
- **Mock or degraded output styled as a real verdict.** If the evaluator fails,
  the result is marked degraded and excluded from the profile.

---

## Out of scope for V1

Blueprint features deliberately deferred. Recorded so the boundary is explicit,
not forgotten:

on-chain credentials · credential marketplace · human-review marketplace ·
appeals · full competency graph · skill-distance map & transfer discounts ·
gap analysis over a ledger · spot-check sampling · competency decay &
re-verification cadence · L3 integrative capstone · L4/L5 assurance
(proctoring, photo checks, voice biometrics) · voice / speech-to-speech persona
layer · prosody observables · in-platform copilot · AI Direction competency
cluster · seeded flaws · hygiene traps · baseline-relative scoring ·
Chalance integration & builder logs · bottom-up discovery · verifier portal ·
payments · admin dashboard · multilingual persona variants · real authentication

---

## Runtime & architecture decisions (V1)

- **Runtime:** the existing long-running Node HTTP server (`node server.js`).
  No Next.js, no React, no bundler. Static HTML + vanilla JS per page.
- **Deployment:** Render (single web service).
- **Database:** PostgreSQL, reached through `engine/store.js`. Hand-written SQL,
  no ORM. A zero-dependency file adapter is used when `DATABASE_URL` is unset so
  local development and mock mode need no database and no install.
- **AI:** `assessment logic → engine/ai/router.js → selected provider`. Per-task
  provider/model selection from environment variables. Groq / OpenAI / Gemini /
  Anthropic adapters, ~30 lines each. Keys are server-side only.
- **Web3:** removed from the V1 flow. `hashEvidence` is retained as a tamper-
  evidence digest over the stored evidence payload. The contract, deploy scripts
  and issuance/verification module remain in the tree, unrouted and unreachable,
  as future work.
