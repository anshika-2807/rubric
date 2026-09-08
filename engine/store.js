// rubrik. persistence.
//
// One narrow interface, two adapters:
//
//   DATABASE_URL set    → PostgreSQL (Render). Hand-written SQL, no ORM.
//   DATABASE_URL unset  → JSON file at engine/.data/store.json.
//
// The file adapter is not a toy: it exists so `node server.js` works on a fresh
// clone with no database, no install and no configuration, which keeps local
// development and mock-mode demos frictionless. Both adapters implement exactly
// the same methods, so product code never learns which one is live.
//
// Product code calls store.attempts.*, store.users.*, store.verified.* and
// nothing else. Swapping Postgres for something else means editing this file
// only.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { CONFIG } = require('./config');

// ─── helpers ─────────────────────────────────────────────────────────────────

const newId = () => crypto.randomUUID();

/** URL-safe profile slug. Collisions are resolved by the caller retrying. */
function makeHandle(displayName) {
  const base = String(displayName || 'candidate')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28) || 'candidate';
  return `${base}-${crypto.randomBytes(2).toString('hex')}`;
}

// ─── file adapter ────────────────────────────────────────────────────────────

function createFileStore() {
  const file = path.join(CONFIG.dataDir, 'store.json');
  let db = { users: [], attempts: [], verified: [] };

  function load() {
    try {
      if (fs.existsSync(file)) db = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      console.error('[store] could not read local store, starting empty:', e.message);
    }
  }
  function save() {
    fs.mkdirSync(CONFIG.dataDir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(db, null, 2));
  }

  return {
    kind: 'file',
    async init() { load(); save(); return this; },
    async close() {},

    users: {
      async create({ displayName }) {
        const user = { id: newId(), handle: makeHandle(displayName), display_name: displayName, created_at: new Date().toISOString() };
        db.users.push(user); save();
        return user;
      },
      async byId(id) { return db.users.find(u => u.id === id) || null; },
      async byHandle(handle) { return db.users.find(u => u.handle === handle) || null; },
      async rename(id, displayName) {
        const u = db.users.find(x => x.id === id);
        if (u) { u.display_name = displayName; save(); }
        return u || null;
      },
    },

    attempts: {
      async create(a) {
        const row = {
          id: a.id || newId(), user_id: a.userId, skill_id: a.skillId,
          competency_id: a.competencyId, level: a.level, brief_id: a.briefId || null,
          status: 'in_progress', pass: null, verified: null, grading: null,
          points: null, max_points: null, pass_threshold: null, assurance_tier: null,
          report: null, artifacts: a.artifacts || null, evidence_hash: null,
          started_at: new Date().toISOString(), completed_at: null,
        };
        db.attempts.push(row); save();
        return row;
      },
      async get(id) { return db.attempts.find(x => x.id === id) || null; },
      async patch(id, patch) {
        const row = db.attempts.find(x => x.id === id);
        if (!row) return null;
        Object.assign(row, patch); save();
        return row;
      },
      async listByUser(userId) {
        return db.attempts
          .filter(x => x.user_id === userId)
          .sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)));
      },
    },

    verified: {
      async add(v) {
        const row = {
          id: newId(), user_id: v.userId, attempt_id: v.attemptId, skill_id: v.skillId,
          competency_id: v.competencyId, level: v.level, provenance: v.provenance,
          context_tag: v.contextTag || null, assurance_tier: v.assuranceTier || null,
          verified_at: new Date().toISOString(),
        };
        db.verified.push(row); save();
        return row;
      },
      async listByUser(userId) {
        return db.verified
          .filter(x => x.user_id === userId)
          .sort((a, b) => String(b.verified_at).localeCompare(String(a.verified_at)));
      },
    },
  };
}

// ─── postgres adapter ────────────────────────────────────────────────────────

function createPgStore() {
  let pool;

  // Postgres returns snake_case rows already matching the file adapter's shape,
  // so no mapping layer is needed in either direction.
  const one = r => r.rows[0] || null;

  return {
    kind: 'postgres',

    async init() {
      let Pool;
      try {
        ({ Pool } = require('pg'));
      } catch (e) {
        throw new Error(
          'DATABASE_URL is set but the "pg" driver is not installed. Run `npm install` in engine/, ' +
          'or unset DATABASE_URL to use the zero-dependency file store.'
        );
      }
      pool = new Pool({
        connectionString: CONFIG.databaseUrl,
        // Render's managed Postgres terminates TLS with a CA that is often not
        // in the container trust store; PGSSL=require opts into that setup.
        ssl: CONFIG.pgSsl ? { rejectUnauthorized: false } : undefined,
        max: 5,
      });
      const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
      await pool.query(schema);   // idempotent: every statement is IF NOT EXISTS
      return this;
    },

    async close() { if (pool) await pool.end(); },

    users: {
      async create({ displayName }) {
        // Handle is random-suffixed, so a collision is a retry, not an error path.
        for (let i = 0; i < 5; i++) {
          try {
            return one(await pool.query(
              `INSERT INTO users (id, handle, display_name) VALUES ($1,$2,$3) RETURNING *`,
              [newId(), makeHandle(displayName), displayName]
            ));
          } catch (e) {
            if (e.code !== '23505') throw e;   // 23505 = unique violation
          }
        }
        throw new Error('could not allocate a unique profile handle');
      },
      async byId(id) { return one(await pool.query(`SELECT * FROM users WHERE id=$1`, [id])); },
      async byHandle(h) { return one(await pool.query(`SELECT * FROM users WHERE handle=$1`, [h])); },
      async rename(id, displayName) {
        return one(await pool.query(`UPDATE users SET display_name=$2 WHERE id=$1 RETURNING *`, [id, displayName]));
      },
    },

    attempts: {
      async create(a) {
        return one(await pool.query(
          `INSERT INTO attempts (id, user_id, skill_id, competency_id, level, brief_id, artifacts)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [a.id || newId(), a.userId, a.skillId, a.competencyId, a.level, a.briefId || null,
           a.artifacts ? JSON.stringify(a.artifacts) : null]
        ));
      },
      async get(id) { return one(await pool.query(`SELECT * FROM attempts WHERE id=$1`, [id])); },
      async patch(id, patch) {
        // Whitelisted columns only — patch keys never reach SQL as identifiers.
        const cols = ['status', 'pass', 'verified', 'grading', 'points', 'max_points',
          'pass_threshold', 'assurance_tier', 'report', 'artifacts', 'evidence_hash', 'completed_at'];
        const keys = Object.keys(patch).filter(k => cols.includes(k));
        if (!keys.length) return this.get(id);
        const sets = keys.map((k, i) => `${k}=$${i + 2}`).join(', ');
        const vals = keys.map(k => (k === 'report' || k === 'artifacts') && patch[k] !== null
          ? JSON.stringify(patch[k]) : patch[k]);
        return one(await pool.query(`UPDATE attempts SET ${sets} WHERE id=$1 RETURNING *`, [id, ...vals]));
      },
      async listByUser(userId) {
        const r = await pool.query(`SELECT * FROM attempts WHERE user_id=$1 ORDER BY started_at DESC`, [userId]);
        return r.rows;
      },
    },

    verified: {
      async add(v) {
        return one(await pool.query(
          `INSERT INTO verified_competencies
             (id, user_id, attempt_id, skill_id, competency_id, level, provenance, context_tag, assurance_tier)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [newId(), v.userId, v.attemptId, v.skillId, v.competencyId, v.level,
           v.provenance, v.contextTag || null, v.assuranceTier || null]
        ));
      },
      async listByUser(userId) {
        const r = await pool.query(
          `SELECT * FROM verified_competencies WHERE user_id=$1 ORDER BY verified_at DESC`, [userId]);
        return r.rows;
      },
    },
  };
}

// ─── selection ───────────────────────────────────────────────────────────────

let store = null;

async function initStore() {
  if (store) return store;
  store = CONFIG.databaseUrl ? createPgStore() : createFileStore();
  await store.init();
  console.log(`  store: ${store.kind}${store.kind === 'file' ? ' (engine/.data/store.json — set DATABASE_URL for Postgres)' : ''}`);
  return store;
}

function getStore() {
  if (!store) throw new Error('store not initialised — call initStore() during boot');
  return store;
}

module.exports = { initStore, getStore, newId, makeHandle };
