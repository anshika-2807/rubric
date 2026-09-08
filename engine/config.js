// rubrik. engine — configuration.
//
// Single place where the environment is read. Nothing else in the engine
// touches process.env, so what is configurable is visible in one file.
//
// Everything here is server-side. No value in this file is ever serialised to
// the browser; see server.js for the (short) list of fields that are.

const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const p = path.join(__dirname, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    // tolerate quoted values (Render's dashboard export style)
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnvFile();

// Provider keys, in the order they are preferred. A provider is "available"
// only if its key is present, so deployment with one key works unchanged.
const PROVIDER_KEYS = {
  groq: process.env.GROQ_API_KEY || null,
  gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null,
  openai: process.env.OPENAI_API_KEY || null,
  anthropic: process.env.ANTHROPIC_API_KEY || null,
};

const fallbackOrder = (process.env.AI_FALLBACK_ORDER || 'groq,gemini,openai,anthropic')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(s => s in PROVIDER_KEYS);

const CONFIG = {
  port: parseInt(process.env.PORT || '4600', 10),

  // ── AI ─────────────────────────────────────────────────────────────────────
  providerKeys: PROVIDER_KEYS,
  fallbackOrder,
  // Providers we actually hold a key for, in preference order.
  get availableProviders() {
    return this.fallbackOrder.filter(p => this.providerKeys[p]);
  },
  // No key anywhere → mock mode. The full pipeline still runs; LLM-dependent
  // judgments become heuristic and are labelled as such in the UI.
  get mockMode() {
    return this.availableProviders.length === 0;
  },
  // Per-task model override. Unset → the chosen provider's own default for
  // that task (engine/ai/providers/*). Tasks are: classify | persona | evaluate.
  modelOverrides: {
    classify: process.env.MODEL_CLASSIFY || null,
    persona: process.env.MODEL_PERSONA || null,
    evaluate: process.env.MODEL_EVALUATE || null,
  },
  aiSessionCallBudget: parseInt(process.env.AI_SESSION_CALL_BUDGET || '80', 10),
  aiTimeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '45000', 10),
  aiMaxAttemptsPerProvider: 2,

  // ── Database ───────────────────────────────────────────────────────────────
  // Unset → zero-dependency JSON file store (local dev, no install needed).
  databaseUrl: process.env.DATABASE_URL || null,
  pgSsl: (process.env.PGSSL || '').toLowerCase() === 'require',
  dataDir: path.join(__dirname, '.data'),

  // ── Assessment policy ──────────────────────────────────────────────────────
  maxCandidateTurns: parseInt(process.env.MAX_CANDIDATE_TURNS || '30', 10),

  // ── Development affordances ────────────────────────────────────────────────
  // The client-state panel reveals the cue-unlock mechanism, which is hidden
  // assessment material. Off unless explicitly enabled, and enforced
  // server-side: the state block is simply absent from API responses when off.
  debugPanel: (process.env.DEBUG_PANEL || '').toLowerCase() === 'on',
};

module.exports = { CONFIG };
