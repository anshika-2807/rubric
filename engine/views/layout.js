// Shared page chrome. Pages are server-rendered template strings — no bundler,
// no client-side framework, and no round-trip just to draw a nav bar.
//
// Every page goes through layout(), which is what makes seven separate routes
// read as one product rather than a set of prototypes.

const { CONFIG } = require('../config');

/** Escape anything interpolated into HTML. Used for all user-supplied text. */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Serialise server data for a page's inline bootstrap.
 * `</script` is broken up so a string value can never close the script element.
 */
function jsonScript(id, data) {
  const safe = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/json" id="${id}">${safe}</script>`;
}

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">';

/** The rubrik. mark, carried over from the logo explorations. */
function logoMark(width = 36.4, stroke = 15) {
  const height = (width * 23.4 / 36.4).toFixed(1);
  return `<svg width="${width}" height="${height}" viewBox="-60 -32 120 64" style="overflow:visible" aria-hidden="true"><path d="M -48 14 Q -36 -22 -20 -6 Q -8 14 -22 22 Q -32 22 -20 8 Q -4 -18 12 0 Q 28 18 14 24 Q 4 24 16 12 Q 28 -6 44 4 Q 56 16 50 24" fill="none" stroke="#fa6519" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function brand(size = 22) {
  return `<a class="brand" href="/">${logoMark()}<span class="brand-word" style="font-size:${size}px">rubrik<span>.</span></span></a>`;
}

/**
 * @param {string} here  which nav item is current: skills | profile | ''
 */
function nav(here = '', user = null) {
  const link = (href, label, key) =>
    `<a href="${href}"${here === key ? ' class="here"' : ''}>${label}</a>`;
  return `<nav class="nav no-print">
    ${brand()}
    <div class="nav-links">
      ${link('/skills', 'Skills', 'skills')}
      ${link('/methodology', 'Methodology', 'methodology')}
      ${link('/profile/me', 'My profile', 'profile')}
      <a class="btn btn-sm" href="/skills">${user ? 'Verify a skill' : 'Get verified'}</a>
    </div>
  </nav>`;
}

function footer() {
  return `<footer class="site-footer no-print">
    <a class="brand" href="/">${logoMark(25.2, 17)}<span class="brand-word" style="font-size:16px">rubrik<span>.</span></span></a>
    <div class="row gap-18 wrap">
      <a class="small" style="text-decoration:none" href="/methodology">How assessment works</a>
      <span class="label" style="display:inline">Verified, not certified</span>
    </div>
  </footer>`;
}

/** Rubi, with a line. Purely decorative and pointer-events:none. */
function rubi(mood, line, variant = 'dark') {
  const faces = {
    // neutral
    watching: `<circle cx="74" cy="78" r="4.5" fill="#000"/><circle cx="106" cy="78" r="4.5" fill="#000"/><path d="M75 95 Q90 92 105 95" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    // narrowed, mid-assessment
    focused: `<path d="M65 65 L82 73" stroke="#000" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M115 65 L98 73" stroke="#000" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="74" cy="80" r="4.5" fill="#000"/><circle cx="106" cy="80" r="4.5" fill="#000"/><path d="M76 100 L104 100" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    // faint approval, results only
    pleased: `<circle cx="74" cy="78" r="4.5" fill="#000"/><circle cx="106" cy="78" r="4.5" fill="#000"/><path d="M76 95 Q90 103 104 95" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  };
  return `<div class="rubi no-print" aria-hidden="true">
    <div class="rubi-bubble ${variant === 'accent' ? 'accent' : ''}">
      <span class="label">Rubi · ${esc(mood)}</span>
      <p>${line}</p>
      <div class="rubi-tail"></div>
    </div>
    <svg width="62" height="70" viewBox="0 0 180 200" style="filter:drop-shadow(3px 3px 0 rgba(0,0,0,.14))">
      <path d="M40 70 Q40 22 90 22 Q140 22 140 70 Q140 118 90 118 Q40 118 40 70 Z" fill="#fff" stroke="#000" stroke-width="4" stroke-linejoin="round"/>
      ${faces[mood in faces ? mood : 'watching']}
      <path d="M44 95 Q26 130 50 168" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M136 95 Q160 70 156 26" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="156" cy="22" r="6" fill="#fa6519" stroke="#000" stroke-width="2.5"/>
    </svg>
  </div>`;
}

/**
 * @param {object} o
 * @param {string} o.title
 * @param {string} o.body          page HTML
 * @param {string} [o.here]        nav highlight key
 * @param {string} [o.head]        extra head markup (page-scoped CSS)
 * @param {string} [o.tail]        extra markup after body (page script)
 * @param {string} [o.rubi]        pre-rendered rubi block
 * @param {boolean} [o.chrome]     include nav/footer (default true)
 * @param {string} [o.description] meta description
 */
function layout({ title, body, here = '', head = '', tail = '', rubi: rubiBlock = '', chrome = true, description = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · rubrik.</title>
${description ? `<meta name="description" content="${esc(description)}">` : ''}
${FONTS}
<link rel="stylesheet" href="/rubrik.css">
${head}
</head>
<body>
${chrome ? `<div class="shell">${nav(here)}</div>` : ''}
${body}
${chrome ? `<div class="shell">${footer()}</div>` : ''}
${rubiBlock}
${tail}
</body>
</html>`;
}

/** Banner shown while the engine has no provider key configured. */
function mockModeBanner() {
  if (!CONFIG.mockMode) return '';
  return `<div class="shell" style="padding-top:16px">
    <div class="notice notice-warn">
      <span class="notice-mark">◆</span>
      <span><strong>Demo mode.</strong> No AI provider key is configured, so the client's replies are scripted and
      evaluations are scored by keyword heuristics. The state machine, geometry measurements, thresholds and
      universal-fail policy are the real ones — but nothing produced in this mode is a verified result.</span>
    </div>
  </div>`;
}

module.exports = { layout, nav, footer, brand, logoMark, rubi, esc, jsonScript, mockModeBanner };
