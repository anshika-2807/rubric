// Consultancy session — the live discovery call.
//
// Derived from the original single-page prototype UI, restyled into the shared shell and with
// the client-state debug panel removed from the default view (it is hidden
// assessment material; the server omits the data entirely unless DEBUG_PANEL is
// on, so there is nothing here to reveal).

const { layout, esc, rubi, jsonScript } = require('./layout');
const { CONFIG } = require('../config');

function render({ skill, user }) {
  const v = skill.verification;

  const head = `<style>
  .chat {
    background: #fff; border: 1px solid var(--line); height: min(56vh, 520px);
    overflow-y: auto; padding: 22px; display: flex; flex-direction: column; gap: 14px;
  }
  .msg { max-width: 78%; padding: 12px 14px; font-size: 14px; line-height: 1.55; }
  .msg .who { font-family: var(--mono); font-size: 9px; letter-spacing: .14em; display: block; margin-bottom: 5px; opacity: .65; }
  .msg.client { background: var(--paper-alt); border: 1px solid var(--line); align-self: flex-start; }
  .msg.client .who { color: var(--accent); opacity: 1; }
  .msg.cand { background: #000; color: #fff; align-self: flex-end; }
  .msg.sys { align-self: center; max-width: 100%; background: transparent; border: 1px dashed var(--muted); font-size: 12px; opacity: .8; }
  .typing { align-self: flex-start; display: flex; gap: 4px; padding: 12px 14px; }
  .typing i { width: 6px; height: 6px; background: var(--accent); display: block; animation: blink 1.2s infinite; }
  .typing i:nth-child(2) { animation-delay: .2s } .typing i:nth-child(3) { animation-delay: .4s }
  @keyframes blink { 0%,100% { opacity: .25 } 50% { opacity: 1 } }
  .composer { display: flex; gap: 10px; margin-top: 12px; align-items: stretch; }
  .composer textarea { flex: 1; height: 78px; }
  .session-grid { display: grid; grid-template-columns: 1fr 300px; gap: 18px; align-items: start; }
  @media (max-width: 900px) { .session-grid { grid-template-columns: 1fr } .chat { height: 60vh } }
</style>`;

  const body = `
<div class="shell-wide" style="padding-bottom:56px">

  <!-- Session bar -->
  <header class="row between wrap gap-14" style="background:#000;color:#fff;padding:13px 20px;margin:0 -28px 22px">
    <div class="row gap-24 wrap">
      <span class="row gap-10">
        <span class="brand-word" style="font-size:17px">rubrik<span>.</span></span>
      </span>
      <span class="label" style="display:inline;opacity:.55">${esc(skill.name)} · ${esc(v.competency)} · ${esc(v.level)}</span>
    </div>
    <div class="row gap-18 wrap">
      <span class="label" id="turnCount" style="display:inline;opacity:.55">Turn 0</span>
      <span class="label label-accent" style="display:inline"><span class="dot"></span> Scoring hidden until you finish</span>
    </div>
  </header>

  <div class="session-grid">
    <div>
      <div class="row between end wrap gap-18" style="margin-bottom:16px">
        <div>
          <span class="label label-accent">Discovery call</span>
          <h1 class="display display-m mt-8" id="clientHeading">Connecting…</h1>
        </div>
      </div>

      <div class="chat" id="chat" aria-live="polite" aria-label="Conversation with the client"></div>

      <div class="composer">
        <textarea class="field" id="input" placeholder="Talk to the client — Enter to send, Shift+Enter for a new line"
                  aria-label="Your message to the client" disabled></textarea>
        <div class="stack gap-8">
          <button class="btn" id="send" disabled>Send</button>
          <button class="btn btn-accent" id="end" disabled>End &amp; score</button>
        </div>
      </div>
      <p class="small mt-8" id="status" style="min-height:20px;opacity:.7"></p>
    </div>

    <aside class="stack gap-18">
      <div class="panel">
        <span class="label">Your task</span>
        <p class="small mt-8" style="opacity:.85">
          This is a first discovery call. Understand the client's situation. When you are confident you
          know what the <em>actual</em> problem is, put it to her and get her agreement — then end the
          session.
        </p>
      </div>

      <div class="panel">
        <span class="label">What is being measured</span>
        <ul class="stack gap-8 mt-8" style="list-style:none">
          ${v.measures.map(m => `<li class="row gap-10 start"><span style="color:var(--accent);font-size:11px;padding-top:3px">—</span><span class="small" style="opacity:.78">${esc(m)}</span></li>`).join('')}
        </ul>
      </div>

      <div class="notice">
        <span class="notice-mark">◆</span>
        <span>Pasting into the message box is blocked, and tab-switches are counted. Both are
        <strong>recorded and never scored</strong> — at this assurance tier they are context for a
        reviewer, not a penalty.</span>
      </div>

      ${CONFIG.debugPanel ? `
      <div class="panel" style="border-color:var(--accent)" id="debugPanel">
        <span class="label label-accent">Client state · dev only</span>
        <p class="small mt-8" style="opacity:.7">DEBUG_PANEL is on. This exposes the cue-unlock mechanism and must never be enabled where candidates can reach it.</p>
        <div class="mt-14 stack gap-8" id="stateBars"></div>
        <div class="mono mt-8" id="ruleTrace" style="font-size:9px;opacity:.65;line-height:1.7"></div>
      </div>` : ''}
    </aside>
  </div>
</div>

${jsonScript('session-config', {
  startUrl: '/api/consultancy/start',
  messageUrl: '/api/consultancy/message',
  endUrl: '/api/consultancy/end',
  debug: CONFIG.debugPanel,
})}`;

  const tail = `<script src="/js/session-consultancy.js" defer></script>`;

  return layout({
    title: `${v.competency} ${v.level}`,
    here: '',
    head,
    body,
    tail,
    rubi: rubi('focused', `"I'm listening to <span style="color:#fa6519">how</span> you listen."`),
  });
}

module.exports = { render };
