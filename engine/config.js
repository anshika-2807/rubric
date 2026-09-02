// rubrik. assessment engine — config (zero-dependency)
// Reads engine/.env if present. Never commit .env.
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
    const val = t.slice(i + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnvFile();

const CONFIG = {
  apiKey: process.env.ANTHROPIC_API_KEY || null,
  personaModel: process.env.PERSONA_MODEL || 'claude-sonnet-5',
  classifierModel: process.env.CLASSIFIER_MODEL || 'claude-haiku-4-5-20251001',
  evaluatorModel: process.env.EVALUATOR_MODEL || 'claude-sonnet-5',
  port: parseInt(process.env.PORT || '4600', 10),
  maxCandidateTurns: 40,
  get mockMode() { return !this.apiKey; },
};

module.exports = { CONFIG };
