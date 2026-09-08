-- rubrik. V1 schema.
--
-- Deliberately three tables. The blueprint's evidence ledger, competency graph,
-- transfer discounts and decay engine are NOT modelled here (see docs/v1-scope.md);
-- this is the minimum that makes the V1 loop real, shaped so those can grow out
-- of it rather than replace it.
--
-- What is NOT stored, on purpose:
--   * Live session state (hidden brief, cue-unlock state, state machine) — that
--     is in-process memory only. It contains hidden assessment material and has
--     no reason to outlive the session.
--   * Anything derived. Points, pass/fail and verification status are computed
--     server-side at evaluation time and then stored as facts.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  handle        TEXT UNIQUE NOT NULL,     -- public profile slug: /profile/<handle>
  display_name  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per assessment attempt. Created when the candidate starts, updated
-- once when evaluation completes. Holds the artifacts the candidate produced and
-- the full evidence-linked report.
CREATE TABLE IF NOT EXISTS attempts (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id       TEXT NOT NULL,
  competency_id  TEXT NOT NULL,
  level          TEXT NOT NULL,
  brief_id       TEXT,                    -- which hidden-brief instance was served
  status         TEXT NOT NULL DEFAULT 'in_progress',  -- in_progress | complete | abandoned

  -- Verdict. Computed server-side; never accepted from a client.
  pass           BOOLEAN,
  verified       BOOLEAN,                 -- pass AND model-graded (not heuristic/degraded)
  grading        TEXT,                    -- model | heuristic | degraded
  points         INTEGER,
  max_points     INTEGER,
  pass_threshold INTEGER,
  assurance_tier TEXT,

  -- Evidence. `report` is the evidence-linked evaluation (anchor scores with
  -- their quoted spans, universal fails, computed metrics). `artifacts` is what
  -- the candidate produced (transcript, layouts, rationale).
  report         JSONB,
  artifacts      JSONB,
  evidence_hash  TEXT,                    -- tamper-evidence digest over the stored evidence

  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS attempts_user_idx ON attempts (user_id, started_at DESC);

-- Verified competencies. Written only when an attempt both passes and was
-- model-graded. This is the seed of the evidence ledger: every row carries the
-- blueprint's evidence dimensions (level, context tag, provenance tier, date) so
-- the ledger can later be built over it without a migration of meaning.
CREATE TABLE IF NOT EXISTS verified_competencies (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_id     TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  skill_id       TEXT NOT NULL,
  competency_id  TEXT NOT NULL,
  level          TEXT NOT NULL,
  provenance     INTEGER NOT NULL,        -- blueprint §4.2 tier; 3 = observed performance
  context_tag    TEXT,                    -- e.g. misframed-single-stakeholder
  assurance_tier TEXT,
  verified_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verified_user_idx ON verified_competencies (user_id, verified_at DESC);
