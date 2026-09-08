// rubrik. — application server.
//
//   node server.js   →  http://localhost:4600
//
// One long-running Node process. No build step, no bundler, no framework.
// Pages are server-rendered from engine/views/*; the assessment pipeline lives
// in the modules the routes delegate to.
//
// Two invariants this file is responsible for:
//
//   1. Hidden assessment material never leaves the process. Sessions hold the
//      brief, cues and thresholds; responses carry only what the candidate is
//      entitled to see. The one exception is the client-state debug block, which
//      is gated on CONFIG.debugPanel and therefore absent in any deployment that
//      has not explicitly opted in.
//   2. No verdict is ever accepted from a client. Results are computed here and
//      read back from the store for display.

const http = require('http');
const path = require('path');

const { CONFIG } = require('./config');
const { json, html, redirect, readBody, serveStatic } = require('./http');
const { initStore, getStore } = require('./store');
const { currentUser, ensureUser, cleanDisplayName } = require('./identity');
const sessions = require('./sessions');
const skills = require('./skills');
const { describeRouting } = require('./ai/router');

const views = {
  landing: require('./views/landing'),
  skills: require('./views/skills'),
  skill: require('./views/skill'),
  methodology: require('./views/methodology'),
  result: require('./views/result'),
  profile: require('./views/profile'),
  error: require('./views/error'),
};

const PUBLIC_DIR = path.join(__dirname, 'public');

// ── Routing ──────────────────────────────────────────────────────────────────

/** Match '/skills/:id' against a pathname; returns params or null. */
function match(pattern, pathname) {
  const p = pattern.split('/').filter(Boolean);
  const u = pathname.split('/').filter(Boolean);
  if (p.length !== u.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(u[i]);
    else if (p[i] !== u[i]) return null;
  }
  return params;
}

async function handle(req, res, url) {
  const { pathname } = url;
  const method = req.method;

  // ── Health. Render's health check hits this; it must not touch the database
  // on every poll, so it reports store kind without querying.
  if (method === 'GET' && pathname === '/healthz') {
    return json(res, 200, {
      ok: true,
      mode: CONFIG.mockMode ? 'mock' : 'live',
      store: getStore().kind,
      liveSessions: sessions.count(),
      uptimeSec: Math.round(process.uptime()),
    });
  }

  // ── Static assets
  if (method === 'GET' && (pathname === '/rubrik.css' || pathname.startsWith('/js/') || pathname.startsWith('/assets/'))) {
    if (serveStatic(res, PUBLIC_DIR, pathname)) return;
    return notFound(res);
  }

  const user = await currentUser(req);

  // ── Pages
  if (method === 'GET' && pathname === '/') {
    return html(res, 200, views.landing.render({ user }));
  }

  if (method === 'GET' && pathname === '/skills') {
    return html(res, 200, views.skills.render({ user }));
  }

  if (method === 'GET' && pathname === '/methodology') {
    return html(res, 200, views.methodology.render({ user }));
  }

  {
    const p = match('/skills/:id', pathname);
    if (method === 'GET' && p) {
      const skill = skills.bySkillId(p.id);
      if (!skill) return notFound(res, 'No such skill.');
      return html(res, 200, views.skill.render({ skill, user }));
    }
  }

  {
    const p = match('/profile/:handle', pathname);
    if (method === 'GET' && p) {
      const store = getStore();
      // 'me' resolves to the signed-in user; redirect to their real handle so the
      // URL is shareable, or show the empty state if there is no identity yet.
      if (p.handle === 'me') {
        if (!user) return html(res, 200, views.profile.render({ owner: null, signedIn: false }));
        return redirect(res, `/profile/${user.handle}`);
      }
      const owner = await store.users.byHandle(p.handle);
      if (!owner) return notFound(res, 'No profile at that address.');
      const [verified, attempts] = await Promise.all([
        store.verified.listByUser(owner.id),
        store.attempts.listByUser(owner.id),
      ]);
      return html(res, 200, views.profile.render({
        owner, verified, attempts,
        isOwner: Boolean(user && user.id === owner.id),
        signedIn: Boolean(user),
      }));
    }
  }

  {
    const p = match('/result/:id', pathname);
    if (method === 'GET' && p) {
      const row = await getStore().attempts.get(p.id);
      if (!row || row.status !== 'complete') {
        return notFound(res, 'No completed result at that address.');
      }
      const owner = await getStore().users.byId(row.user_id);
      return html(res, 200, views.result.render({
        row, owner, viewer: user,
        shareUrl: `${url.origin}/result/${row.id}`,
      }));
    }
  }

  // ── Assessment routes are registered by their own modules (see M2/M3).
  for (const route of assessmentRoutes) {
    const p = match(route.pattern, pathname);
    if (p && route.method === method) {
      const body = method === 'POST' ? await readBody(req) : {};
      return route.handler({ req, res, url, params: p, body, user });
    }
  }

  // ── Identity
  if (method === 'POST' && pathname === '/api/identity') {
    const body = await readBody(req);
    const name = cleanDisplayName(body.displayName);
    if (!name) return json(res, 400, { error: 'A name is required.' });
    const u = await ensureUser(req, res, name);
    return json(res, 200, { handle: u.handle, displayName: u.display_name });
  }

  if (method === 'GET' && pathname === '/api/whoami') {
    return json(res, 200, user
      ? { signedIn: true, handle: user.handle, displayName: user.display_name }
      : { signedIn: false });
  }

  if (method === 'GET' && pathname === '/api/routing') {
    // Diagnostics: which provider/model serves each task. Names only, no keys.
    return json(res, 200, describeRouting());
  }

  return notFound(res);
}

function notFound(res, detail) {
  return html(res, 404, views.error.render({
    code: 404,
    title: 'Not here',
    detail: detail || 'That page does not exist.',
  }));
}

// Routes contributed by assessment modules. Kept as a list so each assessment
// owns its own endpoints instead of this file accumulating them.
const assessmentRoutes = [];
function registerRoutes(routes) { assessmentRoutes.push(...routes); }

// ── Server ───────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    await handle(req, res, url);
  } catch (err) {
    const status = err.statusCode || 500;
    // Log the real error; never send provider or database detail to a client.
    console.error(`[${status}] ${req.method} ${url.pathname}:`, err.stack || err.message);
    if (res.headersSent) return res.end();
    if (url.pathname.startsWith('/api/')) {
      return json(res, status, {
        error: status === 500
          ? 'Something went wrong on our side. Your session is still open — try again.'
          : err.message,
      });
    }
    return html(res, status, views.error.render({
      code: status,
      title: 'Something broke',
      detail: 'An unexpected error occurred. This has been logged.',
    }));
  }
});

async function boot() {
  await initStore();
  sessions.startSweeper();

  // Assessment modules register after the store exists.
  registerRoutes(require('./routes/consultancy').routes);
  registerRoutes(require('./routes/composition').routes);

  server.listen(CONFIG.port, () => {
    const routing = describeRouting();
    console.log(`\n  rubrik. → http://localhost:${CONFIG.port}`);
    console.log(`  mode: ${CONFIG.mockMode
      ? 'MOCK (no provider key — scripted client, heuristic scoring)'
      : `LIVE (${routing.providers.join(' → ')})`}`);
    if (CONFIG.debugPanel) {
      console.log('  ⚠ DEBUG_PANEL=on — client state is exposed. Never enable where candidates can reach it.');
    }
    console.log('');
  });
}

boot().catch(err => {
  console.error('\n  failed to start:', err.message, '\n');
  process.exit(1);
});

// Render sends SIGTERM on deploy; close cleanly so in-flight requests finish.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`\n  ${signal} — shutting down`);
    server.close(() => getStore?.().close?.().finally(() => process.exit(0)));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}

module.exports = { server, registerRoutes };
