// Demo identity.
//
// V1 has no authentication. A candidate is identified by an unguessable id in an
// HttpOnly cookie, which is enough to attribute attempts to a profile and to
// keep one candidate's evidence separate from another's.
//
// This is explicitly NOT an auth system, and docs/v1-scope.md records it as
// scaffolding. What it does get right, because the trust claim depends on it:
//
//   * The cookie carries an identity, never a result. Verdicts live in the
//     store and are recomputed server-side; editing the cookie can at most
//     change whose profile you are looking at, never what it says.
//   * HttpOnly, so page scripts cannot read or forge it.
//   * Users are created lazily — on starting an assessment or naming yourself —
//     so crawling the site does not fill the database with empty users.

const { getStore } = require('./store');
const { parseCookies, setCookie, isSecureRequest } = require('./http');

const COOKIE = 'rubrik_uid';

/** The user this request belongs to, or null. Never creates anything. */
async function currentUser(req) {
  const id = parseCookies(req)[COOKIE];
  if (!id) return null;
  try { return await getStore().users.byId(id); }
  catch { return null; }
}

/** The user this request belongs to, creating one if needed. */
async function ensureUser(req, res, displayName) {
  const existing = await currentUser(req);
  if (existing) {
    // Let a candidate name themselves after the fact — the placeholder name is
    // replaced the first time they supply a real one.
    if (displayName && displayName !== existing.display_name) {
      const renamed = await getStore().users.rename(existing.id, displayName);
      return renamed || existing;
    }
    return existing;
  }
  const user = await getStore().users.create({ displayName: displayName || 'Candidate' });
  setCookie(res, COOKIE, user.id, { secure: isSecureRequest(req) });
  return user;
}

/** Trim and bound a submitted display name. */
function cleanDisplayName(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return name || null;
}

module.exports = { currentUser, ensureUser, cleanDisplayName, COOKIE };
