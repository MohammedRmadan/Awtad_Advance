'use strict';
const cron = require('node-cron');
const { config } = require('./config');
const { pool } = require('./db');
const { MODULES, AR, DONE, KPI_DEF } = require('./schema');
const { listAll } = require('./records');
const { sendMail, emailLayout, esc } = require('./mailer');
const { broadcast } = require('./events');

function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
const daysFrom = (iso, today) => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 864e5);

// Every open item that needs someone's attention today.
async function collectAlerts() {
  const today = todayISO();
  const out = [];
  for (const mod of Object.keys(MODULES)) {
    const M = MODULES[mod];
    if (!M.statusKey) continue;
    for (const r of await listAll(mod)) {
      const st = r[M.statusKey];
      if (M.dueKey && r[M.dueKey] && !DONE.includes(st) && !(mod === 'entities' && st === 'Submitted')) {
        const d = daysFrom(r[M.dueKey], today);
        if (d < 0) out.push({ kind: 'overdue', mod, r, d, date: r[M.dueKey] });
        else if (d <= 7) out.push({ kind: 'due_soon', mod, r, d, date: r[M.dueKey] });
      }
      if (M.expKey && r[M.expKey]) {
        const d = daysFrom(r[M.expKey], today);
        if (d <= 90) out.push({ kind: d < 0 ? 'expired' : 'expiry', mod, r, d, date: r[M.expKey] });
      }
    }
  }
  return { today, alerts: out };
}

const KIND_AR = { overdue: 'متأخر', due_soon: 'مستحق خلال 7 أيام', expiry: 'ينتهي خلال 90 يومًا', expired: 'منتهٍ', assigned: 'أُسند إليك' };
const titleOf = (mod, r) => String(r[MODULES[mod].title] || '').slice(0, 160);

async function recipientsFor(r, users) {
  if (r.assignee) return users.filter(u => u.id === r.assignee);
  const byRole = users.filter(u => u.team_role && u.team_role === r.owner);
  return byRole.length ? byRole : users.filter(u => u.role === 'manager' || u.role === 'admin');
}

async function runDailyDigest({ sendEmail = true } = {}) {
  const { today, alerts } = await collectAlerts();
  const { rows: users } = await pool.query('SELECT id,email,name,role,team_role FROM users WHERE active');
  const perUser = new Map();
  for (const a of alerts) for (const u of await recipientsFor(a.r, users)) {
    if (!perUser.has(u.id)) perUser.set(u.id, { u, items: [] });
    perUser.get(u.id).items.push(a);
  }
  let emails = 0, notes = 0;
  for (const { u, items } of perUser.values()) {
    for (const a of items) {
      const r = await pool.query(`INSERT INTO notifications (user_id,kind,module,record_id,title,detail,day) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [u.id, a.kind, a.mod, a.r.id, titleOf(a.mod, a.r), `${KIND_AR[a.kind]} · ${a.date}`, today]);
      notes += r.rowCount;
    }
    broadcast('notify', { count: items.length }, u.id);
    if (sendEmail && u.email) {
      items.sort((x, y) => x.d - y.d);
      const rowsHtml = items.slice(0, 40).map(a => `<tr><td style="padding:6px;border-bottom:1px solid #eee">${esc(KIND_AR[a.kind])}</td><td style="padding:6px;border-bottom:1px solid #eee">${esc(MODULES[a.mod].ar)}</td><td style="padding:6px;border-bottom:1px solid #eee" dir="auto">${esc(titleOf(a.mod, a.r))}</td><td style="padding:6px;border-bottom:1px solid #eee;white-space:nowrap">${esc(a.date)}</td></tr>`).join('');
      const html = emailLayout(`لديك ${items.length} عنصرًا يحتاج متابعة`, `<table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#F5F4F9"><th style="padding:6px;text-align:right">الحالة</th><th style="padding:6px;text-align:right">الوحدة</th><th style="padding:6px;text-align:right">العنصر</th><th style="padding:6px;text-align:right">التاريخ</th></tr>${rowsHtml}</table>${items.length > 40 ? `<p>و${items.length - 40} عنصرًا آخر في المنصة.</p>` : ''}`);
      try { if (await sendMail({ to: u.email, subject: `متابعة يومية – ${items.length} عنصر`, html })) emails++; } catch (e) { console.error('digest mail failed for', u.email, e.message); }
    }
  }
  return { today, alerts: alerts.length, users: perUser.size, notifications: notes, emails };
}

async function kpiActuals() {
  const d = {};
  for (const mod of Object.keys(MODULES)) d[mod] = await listAll(mod);
  const cnt = (a, f) => a.filter(f).length;
  return {
    services: d.services.length, existing: cnt(d.services, r => r.cap === 'Existing'), certs: d.certs.length,
    certsDone: cnt(d.certs, r => ['Complete', 'Active'].includes(r.status)), oems: d.oems.length,
    oemVerified: cnt(d.oems, r => String(r.verif).startsWith('Verified')), entities: d.entities.length,
    submitted: cnt(d.entities, r => ['Submitted', 'Pending'].includes(r.status)), approved: cnt(d.entities, r => ['Approved', 'Active'].includes(r.status)),
    partners: cnt(d.oems, r => ['Approved', 'Active'].includes(r.status)), docsDone: cnt(d.docs, r => ['Complete', 'Active'].includes(r.status)),
    rmDone: cnt(d.roadmap, r => r.status === 'Complete')
  };
}

async function runWeeklySummary() {
  const { alerts } = await collectAlerts();
  const act = await kpiActuals();
  const { rows: s } = await pool.query(`SELECT value FROM settings WHERE key='targets'`);
  const tg = (s[0] && s[0].value) || {};
  const { rows: mgrs } = await pool.query(`SELECT email FROM users WHERE active AND role IN ('admin','manager') AND email IS NOT NULL`);
  const kpiHtml = KPI_DEF.map(([k, ar]) => `<tr><td style="padding:5px;border-bottom:1px solid #eee">${esc(ar)}</td><td style="padding:5px;border-bottom:1px solid #eee;text-align:center"><b>${act[k]}</b></td><td style="padding:5px;border-bottom:1px solid #eee;text-align:center">${tg[k] ?? '—'}</td></tr>`).join('');
  const od = alerts.filter(a => a.kind === 'overdue');
  const html = emailLayout('الملخص الأسبوعي للإدارة', `<p>متأخرات: <b>${od.length}</b> · تنتهي خلال 90 يومًا: <b>${alerts.filter(a => a.kind === 'expiry' || a.kind === 'expired').length}</b></p>
    <table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#F5F4F9"><th style="padding:5px;text-align:right">المؤشر</th><th style="padding:5px">الفعلي</th><th style="padding:5px">الهدف</th></tr>${kpiHtml}</table>
    ${od.length ? '<h2 style="font-size:15px">أهم المتأخرات</h2><ul>' + od.sort((a, b) => a.d - b.d).slice(0, 15).map(a => `<li>${esc(titleOf(a.mod, a.r))} – ${esc(AR.owner[a.r.owner] || a.r.owner || '')} – ${esc(a.date)}</li>`).join('') + '</ul>' : ''}`);
  let sent = 0;
  for (const m of mgrs) { try { if (await sendMail({ to: m.email, subject: 'الملخص الأسبوعي – منصة تطوير الأعمال', html })) sent++; } catch (e) { console.error('weekly mail failed', m.email, e.message); } }
  return { managers: mgrs.length, sent };
}

// Immediate notice when a record is assigned to someone.
async function notifyAssignment(mod, rec, byUser) {
  if (!rec.assignee || rec.assignee === byUser.id) return;
  const today = todayISO();
  await pool.query(`INSERT INTO notifications (user_id,kind,module,record_id,title,detail,day) VALUES ($1,'assigned',$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
    [rec.assignee, mod, rec.id, titleOf(mod, rec), `أسنده ${byUser.name || byUser.email}`, today]);
  broadcast('notify', { count: 1 }, rec.assignee);
  const { rows } = await pool.query('SELECT email FROM users WHERE id=$1 AND active', [rec.assignee]);
  if (rows[0] && rows[0].email) {
    const html = emailLayout('أُسند إليك عنصر جديد', `<p><b dir="auto">${esc(titleOf(mod, rec))}</b></p><p>الوحدة: ${esc(MODULES[mod].ar)} · أسنده: ${esc(byUser.name || byUser.email)}</p>`);
    sendMail({ to: rows[0].email, subject: 'إسناد جديد – منصة تطوير الأعمال', html }).catch(e => console.error('assign mail failed', e.message));
  }
}

function scheduleJobs() {
  cron.schedule(config.digestCron, () => runDailyDigest().then(r => console.log('daily digest', r)).catch(e => console.error('daily digest failed', e)), { timezone: config.timezone });
  cron.schedule(config.weeklyCron, () => runWeeklySummary().then(r => console.log('weekly summary', r)).catch(e => console.error('weekly summary failed', e)), { timezone: config.timezone });
}

module.exports = { runDailyDigest, runWeeklySummary, notifyAssignment, scheduleJobs, collectAlerts, kpiActuals, todayISO };
