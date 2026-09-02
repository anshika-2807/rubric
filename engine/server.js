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
const { issueCredential, verifyCredential, getRecipientCredentials, hashEvidence } = require('./web3');

const sessions = new Map(); // id -> { brief, state, messages, candidateTurns, telemetry, startedAt, walletAddress }

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

async function handleStart(res, body = {}) {
  const id = crypto.randomUUID();
  const brief = L2_INSTANCE; // production: generated per candidate from the level template
  const state = new ClientState();
  const messages = [{ role: 'assistant', content: brief.openingLine }];
  sessions.set(id, {
    brief,
    state,
    messages,
    candidateTurns: 0,
    telemetry: { focusLosses: 0, pasteBlocks: 0 },
    startedAt: Date.now(),
    walletAddress: body.walletAddress || null,
  });
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
  if (body.walletAddress && !s.walletAddress) s.walletAddress = body.walletAddress;
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
  if (body.walletAddress) s.walletAddress = body.walletAddress;

  const report = await evaluate(s.brief, s.messages, s.state.trajectory);
  report.telemetry = s.telemetry; // integrity signals: logged, never deducted from score
  report.durationMin = Math.round((Date.now() - s.startedAt) / 60000);

  // Cryptographic evidence hash: hashes off-chain evidence (anchors, quotes, trajectory)
  const evidencePayload = {
    sessionId: body.sessionId,
    statedProblem: s.brief.statedProblem,
    actualProblem: s.brief.actualProblem,
    turns: s.candidateTurns,
    points: report.points,
    anchorScores: report.anchorScores,
    universalFails: report.universalFails,
    trustDelta: report.trustDelta,
    opennessDelta: report.opennessDelta,
    endedAt: Date.now(),
  };
  const evidenceHash = hashEvidence(evidencePayload);

  report.evidenceHash = evidenceHash;
  report.walletAddress = s.walletAddress;
  report.web3 = {
    isConfigured: CONFIG.isWeb3Configured,
    contractAddress: CONFIG.contractAddress,
    explorerUrl: CONFIG.explorerUrl,
    sepoliaRpcUrl: CONFIG.sepoliaRpcUrl,
  };

  sessions.delete(body.sessionId);
  json(res, 200, report);
}

async function handleIssueCredential(res, body) {
  try {
    const { recipient, skill, level, evidence } = body || {};
    if (!recipient) {
      return json(res, 400, { error: 'Recipient wallet address is required' });
    }

    const result = await issueCredential({
      recipient,
      skill: skill || 'Problem Framing',
      level: level || 'L2',
      evidence: evidence || { timestamp: Date.now() },
    });

    json(res, 200, result);
  } catch (err) {
    console.error('[Web3 Issuance]', err);
    json(res, 500, { error: err.message });
  }
}

async function handleVerifyCredential(res, queryOrBody) {
  try {
    const { credentialId, walletAddress } = queryOrBody || {};
    if (credentialId) {
      const result = await verifyCredential(credentialId);
      return json(res, 200, result);
    }
    if (walletAddress) {
      const result = await getRecipientCredentials(walletAddress);
      return json(res, 200, { walletAddress, credentials: result });
    }
    json(res, 400, { error: 'Provide credentialId or walletAddress to verify' });
  } catch (err) {
    console.error('[Web3 Verification]', err);
    json(res, 500, { error: err.message });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    if (req.method === 'GET' && pathname === '/api/verify-credential') {
      const q = Object.fromEntries(parsedUrl.searchParams.entries());
      return await handleVerifyCredential(res, q);
    }

    if (req.method === 'POST' && pathname === '/api/start') return await handleStart(res, await readBody(req));
    if (req.method === 'POST' && pathname === '/api/message') return await handleMessage(res, await readBody(req));
    if (req.method === 'POST' && pathname === '/api/end') return await handleEnd(res, await readBody(req));
    if (req.method === 'POST' && pathname === '/api/issue-credential') return await handleIssueCredential(res, await readBody(req));
    if (req.method === 'POST' && pathname === '/api/verify-credential') return await handleVerifyCredential(res, await readBody(req));

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
