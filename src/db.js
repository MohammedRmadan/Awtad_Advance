'use strict';
const { Pool, types } = require('pg');
const { config } = require('./config');
const { MODULES, col, dataFields } = require('./schema');

// Keep DATE as 'YYYY-MM-DD' strings and NUMERIC as numbers.
types.setTypeParser(1082, v => v);
types.setTypeParser(1700, v => (v === null ? null : parseFloat(v)));

const pool = new Pool({ connectionString: config.databaseUrl, max: 10 });

const SQLTYPE = { text: 'text', textarea: 'text', select: 'text', url: 'text', date: 'date', number: 'numeric', bool: 'boolean', user: 'uuid' };

async function migrate() {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        oid text UNIQUE,
        email text UNIQUE,
        name text NOT NULL DEFAULT '',
        role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','manager','editor','viewer')),
        role_source text NOT NULL DEFAULT 'db',
        team_role text,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        last_login_at timestamptz
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS username text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until timestamptz;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;
      CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users (username);
      UPDATE users SET username = lower(email) WHERE username IS NULL AND email IS NOT NULL;
      CREATE TABLE IF NOT EXISTS settings (
        key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id bigserial PRIMARY KEY, at timestamptz NOT NULL DEFAULT now(), user_id uuid REFERENCES users(id),
        module text NOT NULL, record_id text NOT NULL, action text NOT NULL, changes jsonb NOT NULL DEFAULT '{}'::jsonb
      );
      CREATE INDEX IF NOT EXISTS audit_rec_idx ON audit_log (module, record_id, at DESC);
      CREATE INDEX IF NOT EXISTS audit_at_idx ON audit_log (at DESC);
      CREATE TABLE IF NOT EXISTS notifications (
        id bigserial PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), kind text NOT NULL, module text, record_id text,
        title text NOT NULL, detail text, day date NOT NULL DEFAULT current_date, created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz
      );
      CREATE UNIQUE INDEX IF NOT EXISTS notif_once_idx ON notifications (user_id, kind, coalesce(module,''), coalesce(record_id,''), day);
      CREATE INDEX IF NOT EXISTS notif_user_idx ON notifications (user_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), module text NOT NULL, record_id text NOT NULL, filename text NOT NULL,
        mime text NOT NULL, size integer NOT NULL, storage_name text NOT NULL, uploaded_by uuid REFERENCES users(id),
        uploaded_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS att_rec_idx ON attachments (module, record_id);
    `);
    for (const mod of Object.keys(MODULES)) {
      const M = MODULES[mod];
      await c.query(`CREATE TABLE IF NOT EXISTS ${M.table} (
        id text PRIMARY KEY, version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        created_by uuid REFERENCES users(id), updated_by uuid REFERENCES users(id), deleted_at timestamptz)`);
      for (const f of dataFields(mod)) {
        const t = SQLTYPE[f.type];
        const ref = f.type === 'user' ? ' REFERENCES users(id) ON DELETE SET NULL' : '';
        const def = f.type === 'bool' ? ' NOT NULL DEFAULT false' : '';
        await c.query(`ALTER TABLE ${M.table} ADD COLUMN IF NOT EXISTS ${col(f.k)} ${t}${def}${ref}`);
      }
      await c.query(`CREATE INDEX IF NOT EXISTS ${M.table}_live_idx ON ${M.table} (deleted_at)`);
    }
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK'); throw e;
  } finally { c.release(); }
}

module.exports = { pool, migrate };
