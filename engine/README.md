# rubrik. — engine & web app

rubrik. verifies whether someone can actually demonstrate a competency, through
realistic work that shifts under them, and backs every judgment with evidence.
This is the V1 application: one coherent flow, two competencies verifiable end to
end.

> **Assessment is the mechanism. Trust is the product.**

The conceptual source of truth is [`../docs/rubric-blueprint-v0.1.md`](../docs/rubric-blueprint-v0.1.md).
What V1 actually implements — and, more importantly, the claims it must never
make — is in [`../docs/v1-scope.md`](../docs/v1-scope.md). Read that second
document before changing anything that touches scoring or verification.

## Run it

Node 20+. No build step.

```
cd engine
node server.js          # → http://localhost:4600
```

With **no** provider key and **no** database it runs fully: a zero-dependency
JSON file store, and **mock mode** — the client is scripted and scoring is
heuristic. The state machine, the geometry measurement and the pass thresholds
are the real ones; only the language-model judgments are stubbed, and everything
produced this way is labelled *not verified*.

To run with real models, install the one dependency (`pg`, for Postgres) and
supply at least one provider key:

```
npm install
cp .env.example .env     # then add a key
node server.js
```

## The flow

```
/                     landing — the claim
/skills               picker — 2 live, the rest visibly planned
/skills/:id           verification overview — what a pass does and does NOT certify
/assess/consultancy   Consultancy · Problem Framing L2   (simulation)
/assess/visual-layout Visual Layout & Composition L2     (artifact + defense)
/result/:id           the verified result, with its evidence
/profile/:handle      reusable public profile of verified competencies
/methodology          public: the rubrics, the levels, and the known limits
/healthz              liveness + mode + store kind
```

Two competencies are real end to end. **Consultancy** is the skill; **Problem
Framing L2** is the one competency being verified inside it — the UI is explicit
that passing does not verify Consultancy as a whole.

## Architecture

The pipeline the blueprint calls the core IP is preserved exactly:

```
LLM interprets (classifier)  →  deterministic state machine  →
persona speaks (state governs what it may say)  →  evidence-linked evaluation
```

| Area | Files | Note |
|---|---|---|
| AI provider abstraction | `ai/router.js`, `ai/providers/*` | assessment code names a *task*; the router picks provider+model from env |
| Consultancy assessment | `brief.js` `state.js` `classifier.js` `persona.js` `anchors.js` `evaluator.js` | hidden brief, cue-gated by earned state, conclusion-blind scoring |
| Composition assessment | `composition/{brief,geometry,evaluator,anchors}.js` | 5 of 6 anchors measured from coordinates, 1 model-scored |
| Skill registry | `skills.js` | single source of truth for skill / competency / level / assurance |
| Persistence | `store.js`, `db/schema.sql` | one interface, file adapter or Postgres |
| HTTP + routing | `server.js`, `http.js`, `sessions.js`, `identity.js` | zero-framework |
| Pages | `views/*`, `public/rubrik.css`, `public/js/*` | server-rendered, vanilla JS |
| Tamper-evidence | `evidence.js` | keccak-free sha256 digest over stored evidence |

### AI: interchangeable by configuration

```
assessment logic  →  callModel({ task })  →  ai/router.js  →  selected provider
```

Tasks are separated by cost, not prestige:

| Task | When | Model tier |
|---|---|---|
| `classify` | every candidate turn | cheapest/smallest (10 booleans) |
| `persona` | every candidate turn | fast mid-tier (latency matters) |
| `evaluate` | once per session | best model (the only place reasoning quality matters) |

Switching provider or model is an env change and touches no assessment logic:

```
AI_FALLBACK_ORDER=groq,gemini,openai      # first with a key wins; rest are fallbacks
MODEL_CLASSIFY=... MODEL_PERSONA=... MODEL_EVALUATE=...   # optional per-task override
AI_SESSION_CALL_BUDGET=80
```

Keys are server-side only; no variable in this app is ever inlined into browser
code. See `.env.example` for the full set.

### Persistence

`DATABASE_URL` unset → JSON file at `.data/store.json` (local dev, no install).
Set → PostgreSQL via the `pg` driver; the schema is applied idempotently on boot.
All product code goes through `store.js`, so swapping the backend is one file.

## Reliability

The router retries transient failures (429/5xx), falls through the provider
chain, times out per request, and enforces a per-session call budget. When
everything fails the engine **degrades rather than breaks**: the classifier
falls back to a heuristic, the client says a neutral line that leaks no cue, and
the evaluator marks the result `degraded` (shown as *Provisional*, never recorded
as verified). Provider errors are logged server-side and never returned to a
client.

## Trust invariants (do not weaken)

- Evaluation is server-side; no verdict is ever accepted from a client.
- Hidden material — the actual problem, the cues, the unlock thresholds, the
  brief change before round 1 — never reaches the browser.
- Every anchor score above zero cites a real quote or a computed fact.
- Pass/fail is a fixed threshold applied in code, outside the model.
- Only a model-graded pass is recorded as a verified competency.
- `DEBUG_PANEL=on` exposes the cue-unlock mechanism. Never enable it anywhere a
  real candidate can reach — it is off by default and the data is omitted from
  responses entirely when off.

## Deploy (Render)

`../render.yaml` provisions one web service and one Postgres instance and wires
`DATABASE_URL` between them. Provider keys are entered in the dashboard
(`sync:false`), never committed. `DEBUG_PANEL` is intentionally absent.

## Deliberate V1 shortcuts

One hand-authored brief instance per competency; a demo identity (a cookie, not
auth); no human review, appeals, or evidence ledger; verifications do not expire.
Each is listed, with the reason, in `../docs/v1-scope.md`. The former on-chain
credential work is parked, unrouted, in `../future-work/web3/`.
