// Error pages. Deliberately plain: never surfaces stack traces, provider
// messages or database detail to a client.

const { layout, esc } = require('./layout');

function render({ code = 500, title = 'Something broke', detail = '' }) {
  const body = `
<div class="shell" style="padding:96px 0 120px;max-width:60ch">
  <span class="label label-accent">${code}</span>
  <h1 class="display display-l mt-14">${esc(title)}</h1>
  ${detail ? `<p class="lede mt-18" style="font-size:17px">${esc(detail)}</p>` : ''}
  <div class="row gap-18 mt-40 wrap">
    <a class="btn" href="/skills">Browse skills</a>
    <a class="btn-link" href="/">Back to the start</a>
  </div>
</div>`;
  return layout({ title, body, chrome: true });
}

module.exports = { render };
