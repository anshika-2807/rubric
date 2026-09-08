// Minimal HTTP helpers. Node's http module plus what a small server actually
// needs — no framework.

const fs = require('fs');
const path = require('path');

const MAX_BODY = 512 * 1024;   // generous for a layout payload, small enough to be safe

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

function html(res, code, markup, extraHeaders = {}) {
  res.writeHead(code, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    // Assessment pages must not be framed, and nothing here needs to be.
    'x-frame-options': 'DENY',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'same-origin',
    ...extraHeaders,
  });
  res.end(markup);
}

function redirect(res, location, code = 302) {
  res.writeHead(code, { location, 'cache-control': 'no-store' });
  res.end();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => {
      data += c;
      if (data.length > MAX_BODY) {
        req.destroy();
        reject(Object.assign(new Error('request body too large'), { statusCode: 413 }));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch { reject(Object.assign(new Error('invalid JSON body'), { statusCode: 400 })); }
    });
    req.on('error', reject);
  });
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function setCookie(res, name, value, { maxAge = 60 * 60 * 24 * 365, secure = false } = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',                 // never readable from page scripts
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push('Secure');
  // Preserve any cookie already queued on this response.
  const existing = res.getHeader('set-cookie');
  const list = existing ? [].concat(existing) : [];
  list.push(parts.join('; '));
  res.setHeader('set-cookie', list);
}

/** Render is behind a TLS-terminating proxy, so trust the forwarded scheme. */
function isSecureRequest(req) {
  const proto = req.headers['x-forwarded-proto'];
  if (proto) return String(proto).split(',')[0].trim() === 'https';
  return Boolean(req.socket.encrypted);
}

// ── Static files ─────────────────────────────────────────────────────────────

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/**
 * Serve a file from `root`. Returns false when the path does not resolve to a
 * real file inside root, so the caller can fall through to a 404.
 */
function serveStatic(res, root, urlPath) {
  const rel = decodeURIComponent(urlPath).replace(/^\/+/, '');
  const full = path.resolve(root, rel);
  // Path traversal guard: the resolved path must stay inside root.
  if (!full.startsWith(path.resolve(root) + path.sep)) return false;
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return false;

  const type = TYPES[path.extname(full).toLowerCase()] || 'application/octet-stream';
  const body = fs.readFileSync(full);
  res.writeHead(200, {
    'content-type': type,
    'content-length': body.length,
    'cache-control': 'public, max-age=300',
  });
  res.end(body);
  return true;
}

module.exports = { json, html, redirect, readBody, parseCookies, setCookie, isSecureRequest, serveStatic };
