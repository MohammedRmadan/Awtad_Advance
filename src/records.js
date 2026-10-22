'use strict';
const crypto = require('crypto');
const { pool } = require('./db');
const { MODULES, ENUM, col, dataFields } = require('./schema');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

class HttpError extends Error { constructor(status, msg, extra) { super(msg); this.status = status; this.extra = extra; } }

const fieldMap = mod => Object.fromEntries(dataFields(mod).map(f => [f.k, f]));
const selectList = mod => ['id', 'version', 'created_at', 'updated_at', 'created_by', 'updated_by', ...dataFields(mod).map(f => col(f.k))].join(',');

function toRecord(mod, row) {
  const r = { id: row.id, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at, createdBy: row.created_by, updatedBy: row.updated_by };
  for (const f of dataFields(mod)) {
    const v = row[col(f.k)];
    r[f.k] = v === null || v === undefined ? (f.type === 'bool' ? false : '') : v;
  }
  return r;
}

// Validates and normalises one value; throws 400 on bad input.
function clean(mod, key, value) {
  const f = fieldMap(mod)[key];
  if (!f) throw new HttpError(400, `Unknown field: ${key}`);
  const empty = value === null || value === undefined || value === '';
  switch (f.type) {
    case 'bool': return value === true || value === 'true';
    case 'number': {
      if (empty) return null;
      const n = Number(value);
      if (!Number.isFinite(n)) throw new HttpError(400, `${key} must be a number`);
      if (f.min !== undefined && n < f.min) throw new HttpError(400, `${key} must be ≥ ${f.min}`);
      if (f.max !== undefined && n > f.max) throw new HttpError(400, `${key} must be ≤ ${f.max}`);
      return n;
    }
    case 'date':
      if (empty) return null;
      if (!ISO.test(String(value)) || isNaN(Date.parse(value))) throw new HttpError(400, `${key} must be a date (YYYY-MM-DD)`);
      return String(value);
    case 'user':
      if (empty) return null;
      if (!UUID.test(String(value))) throw new HttpError(400, `${key} must be a user id`);
      return String(value);
    case 'select':
      if (empty) return null;
      if (!ENUM[f.e].includes(String(value))) throw new HttpError(400, `${key}: "${value}" is not an allowed value`);
      return String(value);
    case 'url': {
      if (empty) return null;
      const s = String(value).trim();
      if (!/^https?:\/\//i.test(s) || s.length > 2000) throw new HttpError(400, `${key} must be an http(s) link`);
      return s;
    }
    default: {
      if (empty) return null;
      const s = String(value);
      const max = f.type === 'textarea' ? 10000 : 1000;
      if (s.length > max) throw new HttpError(400, `${key} is too long (max ${max})`);
      return s;
    }
  }
}

const same = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');

async function listAll(mod) {
  const M = MODULES[mod];
  const { rows } = await pool.query(`SELECT ${selectList(mod)} FROM ${M.table} WHERE deleted_at IS NULL`);
  return rows.map(r => toRecord(mod, r));
}

async function getOne(mod, id, client = pool) {
  const M = MODULES[mod];
  const { rows } = await client.query(`SELECT ${selectList(mod)} FROM ${M.table} WHERE id=$1 AND deleted_at IS NULL`, [id]);
  return rows[0] ? toRecord(mod, rows[0]) : null;
}

async function assertUsersExist(client, ids) {
  ids = ids.filter(Boolean);
  if (!ids.length) return;
  const { rows } = await client.query('SELECT id FROM users WHERE id = ANY($1::uuid[])', [ids]);
  if (rows.length !== new Set(ids).size) throw new HttpError(400, 'Assignee not found');
}

async function create(mod, data, userId) {
  const M = MODULES[mod];
  const vals = {};
  for (const k of Object.keys(data || {})) if (fieldMap(mod)[k]) vals[k] = clean(mod, k, data[k]);
  if (!vals[M.title]) throw new HttpError(400, 'Title field is required');
  const id = `${M.prefix}-${crypto.randomBytes(5).toString('hex')}`;
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await assertUsersExist(c, dataFields(mod).filter(f => f.type === 'user').map(f => vals[f.k]));
    const keys = Object.keys(vals);
    const cols = ['id', 'created_by', 'updated_by', ...keys.map(col)];
    const params = [id, userId, userId, ...keys.map(k => vals[k])];
    await c.query(`INSERT INTO ${M.table} (${cols.join(',')}) VALUES (${params.map((_, i) => '$' + (i + 1)).join(',')})`, params);
    await c.query('INSERT INTO audit_log (user_id,module,record_id,action,changes) VALUES ($1,$2,$3,$4,$5)', [userId, mod, id, 'create', JSON.stringify({})]);
    const rec = await getOne(mod, id, c);
    await c.query('COMMIT');
    return rec;
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}

// Applies changes only if the record is still at `version` (optimistic locking).
async function update(mod, id, version, changes, userId) {
  const M = MODULES[mod];
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows } = await c.query(`SELECT ${selectList(mod)} FROM ${M.table} WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`, [id]);
    if (!rows[0]) throw new HttpError(404, 'Record not found');
    const cur = toRecord(mod, rows[0]);
    if (Number(version) !== cur.version) throw new HttpError(409, 'Record was changed by someone else', { current: cur });
    const diff = {}; const set = {};
    for (const k of Object.keys(changes || {})) {
      const v = clean(mod, k, changes[k]);
      const oldV = cur[k] === '' ? null : cur[k];
      if (!same(oldV, v)) { diff[k] = [oldV, v]; set[k] = v; }
    }
    if (set[M.title] === null) throw new HttpError(400, 'Title field is required');
    if (!Object.keys(set).length) { await c.query('ROLLBACK'); return { record: cur, diff }; }
    await assertUsersExist(c, dataFields(mod).filter(f => f.type === 'user' && f.k in set).map(f => set[f.k]));
    const keys = Object.keys(set);
    const params = [id, userId, ...keys.map(k => set[k])];
    await c.query(`UPDATE ${M.table} SET ${keys.map((k, i) => `${col(k)}=$${i + 3}`).join(',')}, version=version+1, updated_at=now(), updated_by=$2 WHERE id=$1`, params);
    await c.query('INSERT INTO audit_log (user_id,module,record_id,action,changes) VALUES ($1,$2,$3,$4,$5)', [userId, mod, id, 'update', JSON.stringify(diff)]);
    const rec = await getOne(mod, id, c);
    await c.query('COMMIT');
    return { record: rec, diff };
  } catch (e) { try { await c.query('ROLLBACK'); } catch (_) {} throw e; } finally { c.release(); }
}

async function softDelete(mod, id, userId) {
  const M = MODULES[mod];
  const r = await pool.query(`UPDATE ${M.table} SET deleted_at=now(), updated_by=$2, updated_at=now() WHERE id=$1 AND deleted_at IS NULL`, [id, userId]);
  if (!r.rowCount) throw new HttpError(404, 'Record not found');
  await pool.query('INSERT INTO audit_log (user_id,module,record_id,action,changes) VALUES ($1,$2,$3,$4,$5)', [userId, mod, id, 'delete', '{}']);
}

module.exports = { HttpError, listAll, getOne, create, update, softDelete, clean, toRecord, fieldMap };
