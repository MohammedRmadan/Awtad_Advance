'use strict';
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const ExcelJS = require('exceljs');
const { config } = require('../config');
const { pool } = require('../db');
const { MODULES, ENUM, AR, KPI_DEF, DEF_TARGETS, dataFields } = require('../schema');
const R = require('../records');
const { requireRole, can, endSessions } = require('../auth');
const { hashPassword, tempPassword, USERNAME_RE } = require('../passwords');
const { broadcast, sseHandler } = require('../events');
const { notifyAssignment, runDailyDigest, runWeeklySummary } = require('../notify');

const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const modOr404 = (req, res, next) => (MODULES[req.params.mod] ? next() : res.status(404).json({ error: 'Unknown module' }));

// ---- session & reference data ----
router.get('/me', (req, res) => res.json({ user: req.user }));
router.patch('/me', express.json(), wrap(async (req, res) => {
  const tr = req.body.team_role;
  if (tr !== '' && tr !== null && !ENUM.owner.includes(tr)) throw new R.HttpError(400, 'Unknown team role');
  const { rows } = await pool.query('UPDATE users SET team_role=$2 WHERE id=$1 RETURNING id,username,email,name,role,team_role,active,must_change_password', [req.user.id, tr || null]);
  res.json({ user: rows[0] });
}));
router.get('/schema', (req, res) => res.json({ ENUM, AR, MODULES, KPI_DEF, DEF_TARGETS }));

router.get('/data', wrap(async (req, res) => {
  const out = {};
  for (const mod of Object.keys(MODULES)) out[mod] = await R.listAll(mod);
  const { rows: users } = await pool.query('SELECT id,name,username,email,team_role,role,active FROM users ORDER BY name');
  const { rows: s } = await pool.query(`SELECT value FROM settings WHERE key='targets'`);
  res.json({ data: out, users, targets: { ...DEF_TARGETS, ...((s[0] && s[0].value) || {}) }, serverTime: new Date().toISOString() });
}));

router.get('/events', sseHandler);

// ---- records ----
router.get('/r/:mod/:id', modOr404, wrap(async (req, res) => {
  const rec = await R.getOne(req.params.mod, req.params.id);
  if (!rec) throw new R.HttpError(404, 'Record not found');
  const { rows: audit } = await pool.query(`SELECT a.id,a.at,a.action,a.changes,a.user_id,u.name AS user_name FROM audit_log a LEFT JOIN users u ON u.id=a.user_id
    WHERE a.module=$1 AND a.record_id=$2 ORDER BY a.at DESC LIMIT 100`, [req.params.mod, req.params.id]);
  const { rows: files } = await pool.query(`SELECT f.id,f.filename,f.mime,f.size,f.uploaded_at,f.uploaded_by,u.name AS uploaded_by_name FROM attachments f
    LEFT JOIN users u ON u.id=f.uploaded_by WHERE f.module=$1 AND f.record_id=$2 AND f.deleted_at IS NULL ORDER BY f.uploaded_at DESC`, [req.params.mod, req.params.id]);
  res.json({ record: rec, audit, files });
}));

router.post('/r/:mod', modOr404, requireRole('editor'), express.json({ limit: '1mb' }), wrap(async (req, res) => {
  const rec = await R.create(req.params.mod, req.body.data || {}, req.user.id);
  broadcast('upsert', { mod: req.params.mod, record: rec });
  notifyAssignment(req.params.mod, rec, req.user).catch(e => console.error(e));
  res.status(201).json({ record: rec });
}));

router.patch('/r/:mod/:id', modOr404, requireRole('editor'), express.json({ limit: '1mb' }), wrap(async (req, res) => {
  const { record, diff } = await R.update(req.params.mod, req.params.id, req.body.version, req.body.changes || {}, req.user.id);
  if (Object.keys(diff).length) {
    broadcast('upsert', { mod: req.params.mod, record });
    if (diff.assignee) notifyAssignment(req.params.mod, record, req.user).catch(e => console.error(e));
  }
  res.json({ record, changed: Object.keys(diff) });
}));

router.delete('/r/:mod/:id', modOr404, requireRole('manager'), wrap(async (req, res) => {
  await R.softDelete(req.params.mod, req.params.id, req.user.id);
  broadcast('delete', { mod: req.params.mod, id: req.params.id });
  res.json({ ok: true });
}));

// ---- attachments ----
fs.mkdirSync(config.uploadDir, { recursive: true });
const ALLOWED = /^(application\/pdf|image\/(png|jpeg|gif|webp)|text\/(plain|csv)|application\/zip|application\/x-zip-compressed|application\/msword|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|application\/vnd\.ms-(excel|powerpoint))$/;
const upload = multer({
  storage: multer.diskStorage({ destination: config.uploadDir, filename: (req, file, cb) => cb(null, crypto.randomUUID()) }),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => cb(ALLOWED.test(file.mimetype) ? null : new R.HttpError(400, 'File type not allowed'), ALLOWED.test(file.mimetype))
});
router.post('/r/:mod/:id/files', modOr404, requireRole('editor'), upload.array('files', 5), wrap(async (req, res) => {
  const rec = await R.getOne(req.params.mod, req.params.id);
  if (!rec) { for (const f of req.files || []) fs.unlink(f.path, () => {}); throw new R.HttpError(404, 'Record not found'); }
  const out = [];
  for (const f of req.files || []) {
    const name = Buffer.from(f.originalname, 'latin1').toString('utf8').replace(/[\\/\r\n"]/g, '_').slice(0, 200);
    const { rows } = await pool.query(`INSERT INTO attachments (module,record_id,filename,mime,size,storage_name,uploaded_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,filename,mime,size,uploaded_at`,
      [req.params.mod, req.params.id, name, f.mimetype, f.size, f.filename, req.user.id]);
    out.push(rows[0]);
    await pool.query('INSERT INTO audit_log (user_id,module,record_id,action,changes) VALUES ($1,$2,$3,$4,$5)', [req.user.id, req.params.mod, req.params.id, 'attach', JSON.stringify({ file: [null, name] })]);
  }
  broadcast('files', { mod: req.params.mod, id: req.params.id });
  res.status(201).json({ files: out });
}));
router.get('/files/:fid', wrap(async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.fid)) throw new R.HttpError(404, 'Not found');
  const { rows } = await pool.query('SELECT * FROM attachments WHERE id=$1 AND deleted_at IS NULL', [req.params.fid]);
  if (!rows[0]) throw new R.HttpError(404, 'Not found');
  const f = rows[0];
  res.set('Content-Type', f.mime);
  res.set('Content-Disposition', `attachment; filename="file"; filename*=UTF-8''${encodeURIComponent(f.filename)}`);
  res.set('X-Content-Type-Options', 'nosniff');
  fs.createReadStream(path.join(config.uploadDir, f.storage_name)).on('error', () => res.status(410).end()).pipe(res);
}));
router.delete('/files/:fid', requireRole('editor'), wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM attachments WHERE id=$1 AND deleted_at IS NULL', [req.params.fid]);
  const f = rows[0];
  if (!f) throw new R.HttpError(404, 'Not found');
  if (f.uploaded_by !== req.user.id && !can(req.user, 'manager')) throw new R.HttpError(403, 'Only the uploader or a manager can remove this file');
  await pool.query('UPDATE attachments SET deleted_at=now() WHERE id=$1', [f.id]);
  await pool.query('INSERT INTO audit_log (user_id,module,record_id,action,changes) VALUES ($1,$2,$3,$4,$5)', [req.user.id, f.module, f.record_id, 'detach', JSON.stringify({ file: [f.filename, null] })]);
  broadcast('files', { mod: f.module, id: f.record_id });
  res.json({ ok: true });
}));

// ---- people ----
const USER_COLS = 'id,username,name,email,role,team_role,active,must_change_password,locked_until,created_at,last_login_at';
const cleanEmail = v => { const e = String(v || '').trim().toLowerCase(); if (e && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new R.HttpError(400, 'البريد الإلكتروني غير صحيح'); return e || null; };
const adminCount = async () => Number((await pool.query(`SELECT count(*) FROM users WHERE role='admin' AND active`)).rows[0].count);

router.get('/users/search', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80);
  const { rows } = await pool.query(`SELECT id,name,username,team_role FROM users WHERE active AND ($1='' OR name ILIKE '%'||$1||'%' OR username ILIKE '%'||$1||'%') ORDER BY name LIMIT 10`, [q]);
  res.json({ users: rows });
}));
router.get('/users', requireRole('admin'), wrap(async (req, res) => {
  const { rows } = await pool.query(`SELECT ${USER_COLS} FROM users ORDER BY active DESC, name`);
  res.json({ users: rows });
}));
// Creates a user with a one-time temporary password (returned once, must be changed at first sign-in).
router.post('/users', requireRole('admin'), express.json(), wrap(async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  if (!USERNAME_RE.test(username)) throw new R.HttpError(400, 'اسم المستخدم: 3–64 حرفًا إنجليزيًا صغيرًا أو أرقامًا أو . _ - @');
  const name = String(req.body.name || '').trim().slice(0, 200);
  if (!name) throw new R.HttpError(400, 'الاسم مطلوب');
  const role = ENUM.role.includes(req.body.role) ? req.body.role : 'viewer';
  const team = ENUM.owner.includes(req.body.team_role) ? req.body.team_role : null;
  const email = cleanEmail(req.body.email);
  const temp = tempPassword();
  const { rows } = await pool.query(`INSERT INTO users (username,name,email,role,team_role,password_hash,must_change_password) VALUES ($1,$2,$3,$4,$5,$6,true)
    ON CONFLICT DO NOTHING RETURNING ${USER_COLS}`, [username, name, email, role, team, await hashPassword(temp)]);
  if (!rows[0]) throw new R.HttpError(409, 'اسم المستخدم أو البريد مستخدم من قبل');
  await pool.query(`INSERT INTO audit_log (user_id,module,record_id,action,changes) VALUES ($1,'users',$2,'user_created',$3)`, [req.user.id, rows[0].id, JSON.stringify({ username: [null, username], role: [null, role] })]);
  res.status(201).json({ user: rows[0], tempPassword: temp });
}));
router.post('/users/:id/reset-password', requireRole('admin'), wrap(async (req, res) => {
  const temp = tempPassword();
  const { rows } = await pool.query(`UPDATE users SET password_hash=$2, must_change_password=true, failed_attempts=0, locked_until=NULL WHERE id=$1 RETURNING ${USER_COLS}`,
    [req.params.id, await hashPassword(temp)]);
  if (!rows[0]) throw new R.HttpError(404, 'User not found');
  if (req.params.id !== req.user.id) await endSessions(req.params.id);
  await pool.query(`INSERT INTO audit_log (user_id,module,record_id,action,changes) VALUES ($1,'users',$2,'password_reset','{}')`, [req.user.id, req.params.id]);
  res.json({ user: rows[0], tempPassword: temp });
}));
router.patch('/users/:id', requireRole('admin'), express.json(), wrap(async (req, res) => {
  const sets = []; const vals = [req.params.id]; const add = (col, v) => { vals.push(v); sets.push(`${col}=$${vals.length}`); };
  const self = req.params.id === req.user.id;
  if (req.body.role !== undefined) {
    if (!ENUM.role.includes(req.body.role)) throw new R.HttpError(400, 'Unknown role');
    if (self && req.body.role !== 'admin' && (await adminCount()) <= 1) throw new R.HttpError(400, 'لا يمكن إزالة صلاحية آخر مدير نظام');
    add('role', req.body.role);
  }
  if (req.body.team_role !== undefined) { const t = req.body.team_role || null; if (t && !ENUM.owner.includes(t)) throw new R.HttpError(400, 'Unknown team role'); add('team_role', t); }
  if (req.body.name !== undefined) { const n = String(req.body.name).trim().slice(0, 200); if (!n) throw new R.HttpError(400, 'الاسم مطلوب'); add('name', n); }
  if (req.body.email !== undefined) add('email', cleanEmail(req.body.email));
  if (req.body.active !== undefined) { if (self && !req.body.active) throw new R.HttpError(400, 'لا يمكنك تعطيل حسابك'); add('active', !!req.body.active); }
  if (req.body.unlock) { sets.push('failed_attempts=0', 'locked_until=NULL'); }
  if (!sets.length) throw new R.HttpError(400, 'Nothing to update');
  let rows;
  try { ({ rows } = await pool.query(`UPDATE users SET ${sets.join(',')} WHERE id=$1 RETURNING ${USER_COLS}`, vals)); }
  catch (e) { if (e.code === '23505') throw new R.HttpError(409, 'البريد مستخدم لحساب آخر'); throw e; }
  if (!rows[0]) throw new R.HttpError(404, 'User not found');
  if (req.body.active === false) await endSessions(req.params.id);
  res.json({ user: rows[0] });
}));

// ---- settings, activity, notifications ----
router.put('/settings/targets', requireRole('manager'), express.json(), wrap(async (req, res) => {
  const t = {};
  for (const [k] of KPI_DEF) {
    const v = req.body[k];
    if (v === undefined || v === null || v === '') continue;
    const n = Number(v); if (!Number.isFinite(n) || n < 0) throw new R.HttpError(400, `Invalid target for ${k}`);
    t[k] = n;
  }
  await pool.query(`INSERT INTO settings (key,value,updated_at,updated_by) VALUES ('targets',$1,now(),$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now(), updated_by=EXCLUDED.updated_by`, [JSON.stringify(t), req.user.id]);
  broadcast('targets', { targets: { ...DEF_TARGETS, ...t } });
  res.json({ targets: { ...DEF_TARGETS, ...t } });
}));
router.get('/activity', requireRole('manager'), wrap(async (req, res) => {
  const limit = Math.min(500, Number(req.query.limit) || 150);
  const { rows } = await pool.query(`SELECT a.id,a.at,a.module,a.record_id,a.action,a.changes,a.user_id,u.name AS user_name FROM audit_log a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.at DESC LIMIT $1`, [limit]);
  res.json({ activity: rows });
}));
router.get('/notifications', wrap(async (req, res) => {
  const { rows } = await pool.query(`SELECT id,kind,module,record_id,title,detail,created_at,read_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`, [req.user.id]);
  res.json({ notifications: rows, unread: rows.filter(r => !r.read_at).length });
}));
router.post('/notifications/read', express.json(), wrap(async (req, res) => {
  await pool.query(`UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL`, [req.user.id]);
  res.json({ ok: true });
}));
router.post('/admin/run-digest', requireRole('admin'), wrap(async (req, res) => res.json({ daily: await runDailyDigest(), weekly: req.query.weekly ? await runWeeklySummary() : undefined })));

// ---- exports ----
router.get('/export.xlsx', wrap(async (req, res) => {
  const lang = req.query.lang === 'en' ? 'en' : 'ar';
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Awtad BD Hub'; wb.created = new Date();
  const { rows: users } = await pool.query('SELECT id,name FROM users');
  const uname = Object.fromEntries(users.map(u => [u.id, u.name]));
  for (const mod of Object.keys(MODULES)) {
    const M = MODULES[mod];
    const ws = wb.addWorksheet((lang === 'ar' ? M.ar : M.en).slice(0, 31), { views: [{ state: 'frozen', ySplit: 1, rightToLeft: lang === 'ar' }] });
    const fields = dataFields(mod);
    ws.columns = [{ header: 'ID', key: 'id', width: 14 }, ...fields.map(f => ({ header: lang === 'ar' ? f.ar : f.en, key: f.k, width: f.type === 'textarea' ? 40 : f.type === 'date' ? 12 : 22 })),
      { header: lang === 'ar' ? 'آخر تحديث' : 'Updated at', key: 'updatedAt', width: 18 }];
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF684A96' } };
    for (const r of await R.listAll(mod)) {
      const row = { id: r.id, updatedAt: new Date(r.updatedAt) };
      for (const f of fields) {
        let v = r[f.k];
        if (f.type === 'user') v = v ? (uname[v] || '') : '';
        else if (f.type === 'date') v = v ? new Date(v + 'T00:00:00Z') : null;
        else if (f.type === 'select' && lang === 'ar' && AR[f.e] && AR[f.e][v]) v = AR[f.e][v];
        else if (f.type === 'bool') v = v ? (lang === 'ar' ? 'نعم' : 'Yes') : (lang === 'ar' ? 'لا' : 'No');
        else if (f.type === 'url' && v) v = { text: v, hyperlink: v };
        row[f.k] = v === '' ? null : v;
      }
      ws.addRow(row);
    }
    fields.forEach((f, i) => { if (f.type === 'date') ws.getColumn(i + 2).numFmt = 'yyyy-mm-dd'; });
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: fields.length + 2 } };
  }
  res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.set('Content-Disposition', `attachment; filename="awtad-bd-hub-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}));

module.exports = router;
