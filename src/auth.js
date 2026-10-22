'use strict';
// Username / password sign-in with lockout, forced password change and CSRF-protected forms.
const crypto = require('crypto');
const express = require('express');
const { config } = require('./config');
const { pool } = require('./db');
const { hashPassword, verifyPassword, passwordProblem } = require('./passwords');

const ROLE_RANK = { viewer: 0, editor: 1, manager: 2, admin: 3 };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function establishSession(req, user, cb) {
  req.session.regenerate(err => {
    if (err) return cb(err);
    req.session.uid = user.id;
    req.session.save(cb);
  });
}

// Ends every session of a user except (optionally) the current one.
async function endSessions(userId, exceptSid) {
  await pool.query(`DELETE FROM session WHERE sess->>'uid'=$1 AND ($2::text IS NULL OR sid<>$2)`, [userId, exceptSid || null]).catch(() => {});
}

// Loads req.user for every request that has a session.
async function loadUser(req, res, next) {
  if (!req.session || !req.session.uid) return next();
  try {
    const { rows } = await pool.query('SELECT id,username,email,name,role,team_role,active,must_change_password FROM users WHERE id=$1', [req.session.uid]);
    if (rows[0] && rows[0].active) req.user = rows[0];
    else req.session.destroy(() => {});
  } catch (e) { return next(e); }
  next();
}

const requireAuth = (req, res, next) => {
  const api = req.originalUrl.startsWith('/api/');
  if (!req.user) return api ? res.status(401).json({ error: 'unauthenticated' }) : res.redirect('/auth/login');
  if (req.user.must_change_password) return api ? res.status(403).json({ error: 'password_change_required' }) : res.redirect('/auth/change-password');
  next();
};
const requireRole = min => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'unauthenticated' });
  if (ROLE_RANK[req.user.role] < ROLE_RANK[min]) return res.status(403).json({ error: 'forbidden', need: min });
  next();
};
const can = (user, min) => !!user && ROLE_RANK[user.role] >= ROLE_RANK[min];

// Creates the first administrator from INITIAL_ADMIN_PASSWORD when no administrator can sign in yet.
async function bootstrapAdmin() {
  if (!config.initialAdminPassword) return;
  const { rows } = await pool.query(`SELECT 1 FROM users WHERE role='admin' AND active AND password_hash IS NOT NULL LIMIT 1`);
  if (rows.length) return;
  const hash = await hashPassword(config.initialAdminPassword);
  await pool.query(`INSERT INTO users (username,name,role,password_hash,must_change_password,active) VALUES ($1,$2,'admin',$3,true,true)
    ON CONFLICT (username) DO UPDATE SET role='admin', password_hash=EXCLUDED.password_hash, must_change_password=true, active=true, failed_attempts=0, locked_until=NULL`,
  [config.initialAdminUsername, 'مدير النظام', hash]);
  console.log(`Initial administrator "${config.initialAdminUsername}" created – the password must be changed at first sign-in.`);
}

function csrfToken(req) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  return req.session.csrf;
}
function csrfOk(req) {
  const a = Buffer.from(String(req.body && req.body._csrf || '')), b = Buffer.from(String(req.session && req.session.csrf || ''));
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}
const sameOrigin = req => { const o = req.get('Origin'); return !o || o === config.baseUrl || o === 'null'; };

function page(title, body) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<link rel="icon" href="/img/favicon.png"><link rel="stylesheet" href="/auth.css"></head><body><main class="card"><img src="/img/logo.png" alt="Awtad Advance" class="logo">${body}</main></body></html>`;
}
const loginForm = (req, msg, username = '') => page('تسجيل الدخول – منصة تطوير الأعمال', `
<h1>منصة تطوير الأعمال</h1><p class="sub">Business Development Hub</p>
${msg ? `<p class="err" role="alert">${esc(msg)}</p>` : ''}
<form method="post" action="/auth/login" autocomplete="on">
<input type="hidden" name="_csrf" value="${csrfToken(req)}">
<label>اسم المستخدم <span>Username</span><input name="username" autocomplete="username" required autofocus value="${esc(username)}" dir="ltr"></label>
<label>كلمة المرور <span>Password</span><input name="password" type="password" autocomplete="current-password" required dir="ltr"></label>
<button>دخول</button></form>
<p class="hint">نسيت كلمة المرور؟ تواصل مع مدير النظام لإعادة تعيينها.</p>`);
const changeForm = (req, msg, forced) => page('تغيير كلمة المرور', `
<h1>${forced ? 'عيّن كلمة مرور جديدة' : 'تغيير كلمة المرور'}</h1>
${forced ? '<p class="sub">كلمة المرور الحالية مؤقتة، ويجب تغييرها قبل المتابعة.</p>' : ''}
${msg ? `<p class="err" role="alert">${esc(msg)}</p>` : ''}
<form method="post" action="/auth/change-password">
<input type="hidden" name="_csrf" value="${csrfToken(req)}">
<input type="hidden" name="username" value="${esc(req.user.username || '')}" autocomplete="username">
<label>كلمة المرور الحالية<input name="current" type="password" autocomplete="current-password" required dir="ltr"></label>
<label>كلمة المرور الجديدة<input name="next" type="password" autocomplete="new-password" required minlength="${config.passwordMinLength}" dir="ltr"></label>
<label>تأكيد كلمة المرور الجديدة<input name="confirm" type="password" autocomplete="new-password" required dir="ltr"></label>
<p class="hint">${config.passwordMinLength} أحرف على الأقل، وتحتوي على حروف وأرقام.</p>
<button>حفظ</button></form>
${forced ? '<p class="hint"><a href="/auth/logout">تسجيل الخروج</a></p>' : '<p class="hint"><a href="/">رجوع إلى المنصة</a></p>'}`);

function authRouter() {
  const r = express.Router();
  const form = express.urlencoded({ extended: false, limit: '10kb' });
  const save = (req) => new Promise(res => req.session.save(() => res()));

  r.get('/login', async (req, res) => {
    if (req.user && !req.user.must_change_password) return res.redirect('/');
    res.set('Cache-Control', 'no-store');
    const html = loginForm(req, '');
    await save(req);
    res.send(html);
  });

  r.post('/login', form, async (req, res, next) => {
    try {
      res.set('Cache-Control', 'no-store');
      if (!sameOrigin(req) || !csrfOk(req)) { const h = loginForm(req, 'انتهت صلاحية الصفحة. حاول مرة أخرى.'); await save(req); return res.status(403).send(h); }
      const username = String(req.body.username || '').trim().toLowerCase().slice(0, 100);
      const password = String(req.body.password || '').slice(0, 200);
      const { rows } = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
      const u = rows[0];
      const fail = async (msg, status = 401) => { const h = loginForm(req, msg, username); await save(req); res.status(status).send(h); };
      if (u && u.locked_until && new Date(u.locked_until) > new Date()) {
        const mins = Math.ceil((new Date(u.locked_until) - Date.now()) / 60000);
        return fail(`الحساب مقفل مؤقتًا بسبب محاولات دخول خاطئة. حاول بعد ${mins} دقيقة أو تواصل مع مدير النظام.`, 423);
      }
      const ok = await verifyPassword(password, u && u.active ? u.password_hash : null);
      if (!ok || !u || !u.active) {
        if (u) {
          const attempts = u.failed_attempts + 1;
          const lock = attempts >= config.loginMaxAttempts;
          await pool.query(`UPDATE users SET failed_attempts=$2, locked_until=CASE WHEN $3 THEN now() + make_interval(mins => $4) ELSE locked_until END WHERE id=$1`,
            [u.id, lock ? 0 : attempts, lock, config.loginLockMinutes]);
          await pool.query(`INSERT INTO audit_log (user_id,module,record_id,action,changes) VALUES ($1,'users',$2,$3,'{}')`, [u.id, u.id, lock ? 'login_locked' : 'login_failed']);
        }
        return fail('اسم المستخدم أو كلمة المرور غير صحيحة.');
      }
      await pool.query('UPDATE users SET failed_attempts=0, locked_until=NULL, last_login_at=now() WHERE id=$1', [u.id]);
      await pool.query(`INSERT INTO audit_log (user_id,module,record_id,action,changes) VALUES ($1,'users',$2,'login','{}')`, [u.id, u.id]);
      establishSession(req, u, err => err ? next(err) : res.redirect(u.must_change_password ? '/auth/change-password' : '/'));
    } catch (e) { next(e); }
  });

  r.get('/change-password', async (req, res) => {
    if (!req.user) return res.redirect('/auth/login');
    res.set('Cache-Control', 'no-store');
    const h = changeForm(req, '', req.user.must_change_password); await save(req); res.send(h);
  });
  r.post('/change-password', form, async (req, res, next) => {
    try {
      if (!req.user) return res.redirect('/auth/login');
      res.set('Cache-Control', 'no-store');
      const forced = req.user.must_change_password;
      const again = async (msg, status = 400) => { const h = changeForm(req, msg, forced); await save(req); res.status(status).send(h); };
      if (!sameOrigin(req) || !csrfOk(req)) return again('انتهت صلاحية الصفحة. حاول مرة أخرى.', 403);
      const { rows } = await pool.query('SELECT password_hash, username FROM users WHERE id=$1', [req.user.id]);
      if (!(await verifyPassword(String(req.body.current || ''), rows[0] && rows[0].password_hash))) return again('كلمة المرور الحالية غير صحيحة.');
      const next_ = String(req.body.next || '');
      if (next_ !== String(req.body.confirm || '')) return again('كلمتا المرور الجديدتان غير متطابقتين.');
      if (next_ === String(req.body.current || '')) return again('اختر كلمة مرور مختلفة عن الحالية.');
      const problem = passwordProblem(next_, rows[0].username);
      if (problem) return again(problem);
      await pool.query('UPDATE users SET password_hash=$2, must_change_password=false, password_changed_at=now() WHERE id=$1', [req.user.id, await hashPassword(next_)]);
      await pool.query(`INSERT INTO audit_log (user_id,module,record_id,action,changes) VALUES ($1,'users',$2,'password_changed','{}')`, [req.user.id, req.user.id]);
      const uid = req.user.id;
      establishSession(req, { id: uid }, async err => {
        if (err) return next(err);
        await endSessions(uid, req.sessionID);
        res.redirect('/');
      });
    } catch (e) { next(e); }
  });

  r.get('/logout', (req, res) => req.session.destroy(() => { res.clearCookie('bdhub.sid'); res.redirect('/auth/login'); }));
  return r;
}

module.exports = { authRouter, loadUser, requireAuth, requireRole, can, ROLE_RANK, bootstrapAdmin, endSessions };
