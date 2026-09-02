// rubrik. assessment engine — zero-dependency HTTP server.
// Run: node server.js  →  http://localhost:4600
// Optional: engine/.env with ANTHROPIC_API_KEY=sk-ant-... (else mock mode)

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { CONFIG } = require('./config');
const { ClientState } = require('./state');
const { L2_INSTANCE } = require('./brief');
const { classifyTurn } = require('./classifier');
const { clientReply } = require('./persona');
const { evaluate } = require('./evaluator');

const sessions = new Map(); // id -> { brief, state, messages, candidateTurns, telemetry, startedAt }

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

async function handleStart(res) {
  const id = crypto.randomUUID();
  const brief = L2_INSTANCE; // production: generated per candidate from the level template
  const state = new ClientState();
  const messages = [{ role: 'assistant', content: brief.openingLine }];
  sessions.set(id, { brief, state, messages, candidateTurns: 0, telemetry: { focusLosses: 0, pasteBlocks: 0 }, startedAt: Date.now() });
  json(res, 200, {
    sessionId: id,
    mockMode: CONFIG.mockMode,
    clientName: brief.client.name,
    scenario: `Discovery call · ${brief.client.role}`,
    opening: brief.openingLine,
  });
}

async function handleMessage(res, body) {
  const s = sessions.get(body.sessionId);
  if (!s) return json(res, 404, { error: 'unknown session' });
  const text = String(body.message || '').trim();
  if (!text) return json(res, 400, { error: 'empty message' });
  if (s.candidateTurns >= CONFIG.maxCandidateTurns) return json(res, 400, { error: 'turn limit reached — end the session' });

  s.candidateTurns += 1;
  s.messages.push({ role: 'user', content: text });

  // 1) classify candidate behavior (AI interprets)
  const cueIds = s.brief.cues.map(c => c.id);
  const recent = s.messages.slice(-6).map(m => `${m.role === 'assistant' ? 'CLIENT' : 'CANDIDATE'}: ${m.content}`).join('\n');
  const behaviors = await classifyTurn(text, cueIds, recent);

  // 2) update state (deterministic rules apply)
  const applied = s.state.update(behaviors, s.candidateTurns);

  // 3) client replies, conditioned on new state + newly unlocked cues
  const reply = await clientReply(s.brief, s.state, s.messages, s.candidateTurns);
  s.messages.push({ role: 'assistant', content: reply });

  json(res, 200, {
    reply,
    turn: s.candidateTurns,
    // debug block — visible in prototype only; NEVER shipped to candidates in production
    debug: { behaviors, applied, state: s.state.snapshot(), unlockedCues: s.state.unlockedCues(s.brief.cues).map(c => c.id) },
  });
}

async function handleEnd(res, body) {
  const s = sessions.get(body.sessionId);
  if (!s) return json(res, 404, { error: 'unknown session' });
  if (body.telemetry) s.telemetry = { ...s.telemetry, ...body.telemetry };

  const report = await evaluate(s.brief, s.messages, s.state.trajectory);
  report.telemetry = s.telemetry; // integrity signals: logged, never deducted from score
  report.durationMin = Math.round((Date.now() - s.startedAt) / 60000);
  sessions.delete(body.sessionId);
  json(res, 200, report);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    if (req.method === 'POST' && req.url === '/api/start') return await handleStart(res);
    if (req.method === 'POST' && req.url === '/api/message') return await handleMessage(res, await readBody(req));
    if (req.method === 'POST' && req.url === '/api/end') return await handleEnd(res, await readBody(req));
    json(res, 404, { error: 'not found' });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: e.message });
  }
});

server.listen(CONFIG.port, () => {
  console.log(`\n  rubrik. engine → http://localhost:${CONFIG.port}`);
  console.log(`  mode: ${CONFIG.mockMode ? 'MOCK (no ANTHROPIC_API_KEY — scripted client, sample report)' : 'LIVE (' + CONFIG.personaModel + ')'}\n`);
});
