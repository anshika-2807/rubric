// Groq — OpenAI-compatible API. Preferred default provider: fast and free-tier
// friendly, which suits the per-turn classifier and persona calls.
//
// Model defaults are cheap-first and overridable per task via MODEL_* env vars.

const { makeOpenAICompatibleProvider } = require('./openai-compatible');

module.exports = makeOpenAICompatibleProvider({
  name: 'groq',
  baseUrl: 'https://api.groq.com/openai/v1',
  defaultModels: {
    classify: 'llama-3.1-8b-instant',      // 10 booleans per turn — smallest model
    persona: 'llama-3.3-70b-versatile',    // client's spoken reply — latency matters
    evaluate: 'llama-3.3-70b-versatile',   // once per session — best available here
  },
});
