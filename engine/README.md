# rubrik. — assessment engine prototype

The riskiest part of the platform, built first: a working **Problem Framing L2** assessment — live client simulation with a behavioral state machine, per-turn behavior classification, and an evidence-linked evaluator.

## Run it

Requires Node 18+. No installs, no dependencies.

```
cd engine
node server.js
```

Open http://localhost:4600

**Live mode:** create `engine/.env` with:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Without a key it runs in **mock mode** (scripted client, sample report) so the full pipeline is still clickable.

## What happens in a session

1. **Meera** (founder of Kahva, a D2C chai brand) opens with her *stated* problem: "Instagram content isn't working."
2. The *actual* problem (price competition from a new rival) is only reachable through three buried cues — one free, one gated on openness ≥ 5, one gated on trust ≥ 6.
3. Every candidate message is classified into behaviors (reflection, open/closed questions, solution-jumping, reframing…). **Deterministic rules** — not the model — update the client's trust / openness / frustration. The client's style and what she'll volunteer follow from that state.
4. "End & score" runs the evaluator: 6 Problem Framing L2 anchors scored 0/1/2 **with quoted evidence**, universal-fail checks (incl. the seductive failure: competently solving the wrong problem), plus the computed **trust curve** and ledger entries.

## Architecture (mirrors the blueprint)

| File | Role | Principle |
|---|---|---|
| `brief.js` | Hidden-brief instance (PRIVATE) | templates private, anchors public |
| `state.js` | Behavioral state machine | deterministic rules = comparability; trajectory = evidence |
| `classifier.js` | Turn → behaviors | AI interprets, policy scores |
| `persona.js` | State-conditioned client | LLM speaks, state governs |
| `anchors.js` | Rubric anchors (PUBLIC) | from Problem Framing spec v0.1 |
| `evaluator.js` | Evidence-linked scoring | conclusion-blind; fixed thresholds |
| `server.js` + `public/` | Session loop + chat UI | paste-block >5 chars; telemetry logged, never scored |

## Deliberate prototype shortcuts

- One hand-authored brief instance (production: generated fresh per candidate from the level template)
- In-memory sessions (nothing persists)
- Debug panel shows client state live — dev only, never shown to candidates
- No auth, no ledger storage, no baseline-relative scoring yet
