// OpenAI. Only the once-per-session evaluator call uses the larger model; the
// high-volume classifier and persona calls stay on the mini tier.

const { makeOpenAICompatibleProvider } = require('./openai-compatible');

module.exports = makeOpenAICompatibleProvider({
  name: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  defaultModels: {
    classify: 'gpt-4o-mini',
    persona: 'gpt-4o-mini',
    evaluate: 'gpt-4o',
  },
});
