// rubrik. AI router.
//
//   assessment logic  →  callModel({ task })  →  selected provider/model
//
// Assessment code names a TASK, never a provider. Which provider and model
// serve that task is decided here from environment configuration, so switching
// provider is an env change and touches no assessment logic.
//
// Tasks, and why they are separated (cost is the reason):
//   classify  — 10 booleans, once per candidate turn. Highest volume, so the
//               smallest model. Callers have a heuristic fallback.
//   persona   — the client's spoken reply, once per candidate turn. Mid-tier;
//               conversational latency matters more than depth, because the
//               judgment lives in the deterministic state machine, not here.
//   evaluate  — anchor scoring with quoted evidence, ONCE per session. This is
//               the only place reasoning quality genuinely matters, so this is
//               where the budget goes.
//
// Responsibilities kept deliberately narrow: pick provider/model, retry
// transient failures, fall through to the next provider, respect a per-session
// call budget. No caching, no orchestration, no prompt management.

const { CONFIG } = require('../config');

const PROVIDERS = {
  groq: require('./providers/groq'),
  gemini: require('./providers/gemini'),
  openai: require('./providers/openai'),
  anthropic: require('./providers/anthropic'),
};

/**
 * Per-session LLM call budget. Protects free tiers from a runaway session and
 * gives the engine a defined way to degrade instead of failing.
 */
class CallBudget {
  constructor(limit = CONFIG.aiSessionCallBudget) {
    this.limit = limit;
    this.calls = 0;
    this.failures = 0;
    this.providersUsed = new Set();
    this.modelsUsed = new Set();
  }
  get exhausted() { return this.calls >= this.limit; }
  record(provider, model) {
    this.calls += 1;
    this.providersUsed.add(provider);
    this.modelsUsed.add(model);
  }
  // Provenance for the evidence record: which models produced the judgments.
  summary() {
    return {
      calls: this.calls,
      failures: this.failures,
      providers: [...this.providersUsed],
      models: [...this.modelsUsed],
    };
  }
}

// 429 and 5xx are worth retrying; a timeout or dropped socket likewise.
// 401/403/404 mean this provider will never serve this request — move on.
function isRetryable(err) {
  if (!err.status) return true; // network error, abort, DNS…
  return err.status === 408 || err.status === 409 || err.status === 429 || err.status >= 500;
}

function isFatalForProvider(err) {
  return err.status === 401 || err.status === 403 || err.status === 404;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Extract the first JSON object from a model reply, tolerating prose or code
 * fences around it. Returns null when nothing parses.
 */
function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(candidate.slice(start, end + 1)); } catch { return null; }
}

/**
 * Run one task against the configured providers.
 *
 * @param {'classify'|'persona'|'evaluate'} task  selects the model tier
 * @param {string}   system     system prompt
 * @param {Array}    messages   [{role:'user'|'assistant', content}]
 * @param {number}   maxTokens
 * @param {boolean}  json       request structured output and validate it parses
 * @param {CallBudget} budget   optional; enforces the per-session ceiling
 * @returns {Promise<string|null>} raw text, or null in mock mode
 * @throws {Error} when every available provider failed (callers must degrade)
 */
async function callModel({ task, system, messages, maxTokens = 1024, json = false, budget }) {
  if (CONFIG.mockMode) return null;           // callers supply mock fallbacks
  if (budget?.exhausted) {
    const err = new Error(`AI call budget exhausted (${budget.limit} calls this session)`);
    err.code = 'BUDGET_EXHAUSTED';
    throw err;
  }

  const providers = CONFIG.availableProviders;
  let lastError = null;

  for (const providerName of providers) {
    const provider = PROVIDERS[providerName];
    const apiKey = CONFIG.providerKeys[providerName];
    const model = CONFIG.modelOverrides[task] || provider.defaultModels[task];

    for (let attempt = 1; attempt <= CONFIG.aiMaxAttemptsPerProvider; attempt++) {
      try {
        const text = await provider.call({
          apiKey, model, system, messages, maxTokens, json,
          signal: AbortSignal.timeout(CONFIG.aiTimeoutMs),
        });

        // A structured task that returned unparseable output is a soft failure:
        // worth one more attempt before giving up on this provider.
        if (json && !extractJson(text)) {
          throw Object.assign(new Error(`${providerName}: response was not valid JSON`), { status: 422 });
        }

        budget?.record(providerName, model);
        return text;
      } catch (err) {
        lastError = err;
        if (budget) budget.failures += 1;

        if (isFatalForProvider(err)) {
          console.error(`[ai] ${providerName} rejected the request (${err.status}) — skipping provider`);
          break;
        }
        if (attempt < CONFIG.aiMaxAttemptsPerProvider && isRetryable(err)) {
          await sleep(400 * attempt);           // brief linear backoff
          continue;
        }
        console.error(`[ai] ${providerName}/${model} failed on task "${task}": ${err.message}`);
        break;                                  // try the next provider
      }
    }
  }

  const err = new Error(`all AI providers failed for task "${task}": ${lastError?.message || 'no providers configured'}`);
  err.code = 'ALL_PROVIDERS_FAILED';
  err.cause = lastError;
  throw err;
}

/** Which provider/model would serve a task right now — for diagnostics only. */
function describeRouting() {
  if (CONFIG.mockMode) return { mode: 'mock', providers: [] };
  return {
    mode: 'live',
    providers: CONFIG.availableProviders,
    tasks: Object.fromEntries(['classify', 'persona', 'evaluate'].map(task => {
      const primary = CONFIG.availableProviders[0];
      return [task, {
        provider: primary,
        model: CONFIG.modelOverrides[task] || PROVIDERS[primary].defaultModels[task],
      }];
    })),
  };
}

module.exports = { callModel, extractJson, CallBudget, describeRouting };
