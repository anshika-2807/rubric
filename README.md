# rubrik.

A trusted layer between learning and opportunity: prove a competency by
demonstrating it against a situation that shifts under you, with every judgment
tied to evidence.

> **Assessment is the mechanism. Trust is the product.**

## Where things are

| Path | What |
|---|---|
| [`engine/`](engine/) | the V1 application — run `node server.js`, see [`engine/README.md`](engine/README.md) |
| [`docs/rubric-blueprint-v0.1.md`](docs/rubric-blueprint-v0.1.md) | the full product blueprint (conceptual source of truth) |
| [`docs/v1-scope.md`](docs/v1-scope.md) | what V1 implements, what is scaffolded, and the claims it must never make |
| `render.yaml` | one-click Render deploy (web service + Postgres) |
| `*.dc.html`, `support.js` | the original design mocks (the visual language the app is built from) |
| [`future-work/web3/`](future-work/web3/) | parked on-chain credential work — unrouted, not part of V1 |

## V1 in one line

One coherent flow — **landing → pick a skill → verification overview →
assessment → evidence-linked result → public profile** — with two competencies
verifiable end to end:

- **Consultancy · Problem Framing L2** — a live client simulation (the existing
  hidden-brief / behavioral-state-machine engine).
- **Visual Layout & Composition L2** — a canvas artifact you produce, adapt to a
  changed brief, and defend; scored mostly by measured geometry.

Runs with no API key (mock mode) and no database (file store); scales to
multi-provider AI and Postgres by configuration alone.
