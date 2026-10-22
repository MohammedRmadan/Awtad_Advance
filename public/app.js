'use strict';
/* Awtad BD Hub – browser application (Arabic-first, bilingual). Talks to the REST API and listens to server-sent events. */
let SCHEMA = null, ENUM = {}, AR = {}, MOD = {}, KPI_DEF = [], DEF_TARGETS = {};
const DONE = ['Approved', 'Active', 'Complete'];

const T = {
  ar: { app: 'منصة تطوير الأعمال', org: 'أوتاد أدفانس', dashboard: 'لوحة الإدارة', mine: 'مهامي', settings: 'الإعدادات', activity: 'سجل النشاط', users: 'المستخدمون',
    search: 'بحث…', all: 'الكل', add: 'إضافة سجل', exportCsv: 'تصدير CSV', exportXlsx: 'تصدير Excel', save: 'حفظ', cancel: 'إغلاق', del: 'حذف', confirmDel: 'تأكيد الحذف',
    saved: 'تم الحفظ', deleted: 'تم الحذف', tracked: 'ضمن المتابعة فقط', records: 'سجل', showMore: 'عرض المزيد', history: 'سجل التغييرات', noHistory: 'لا توجد تغييرات بعد.',
    updated: 'آخر تحديث', by: 'بواسطة', someone: 'مستخدم', overdue: 'متأخر', daysLeft: 'يوم متبقٍ', expired: 'منتهٍ', attention: 'يحتاج انتباهًا',
    renewals: 'تجديدات خلال 90 يومًا', nextActions: 'أقرب الإجراءات المفتوحة', workload: 'العبء حسب المسؤول', byType: 'الجهات حسب النوع',
    pqStatus: 'حالة التأهيل (الجهات المتابَعة)', oemStatus: 'حالة الشراكات (المتابَعة)', rmProgress: 'تقدم الخطة 90/180/365', gap: 'الفجوة',
    empty: 'لا توجد بيانات.', readonly: 'صلاحيتك قراءة فقط. اطلب من مدير النظام صلاحية محرر لتعديل البيانات.', myRole: 'دوري في الفريق',
    myRoleHint: 'تظهر لك مهام هذا الدور إضافة إلى ما أُسند إليك باسمك.', assignedToMe: 'مسندة إليّ أو لدوري', none: 'لا يوجد', lang: 'English',
    assignee: 'المسؤول (شخص)', pick: 'ابحث عن زميل…', clear: 'إزالة', targets: 'أهداف المؤشرات', targetsHint: 'تظهر في لوحة الإدارة مقابل القيم الفعلية.',
    managersOnly: 'للإدارة فقط', nochanges: 'لا تغييرات', newRec: 'سجل جديد', required: 'الحقل الرئيسي مطلوب', failed: 'تعذّر الحفظ', conflict: 'عدّل مستخدم آخر هذا السجل قبل حفظك. عُرضت أحدث نسخة، أعد إدخال تعديلك.',
    today: 'اليوم', created: 'أنشأ السجل', attach: 'أرفق ملفًا', detach: 'حذف مرفقًا', delete: 'حذف السجل', files: 'المرفقات', upload: 'رفع', noFiles: 'لا توجد مرفقات.',
    notifications: 'الإشعارات', markRead: 'تعليم الكل كمقروء', noNotifs: 'لا توجد إشعارات.', logout: 'تسجيل الخروج', role: 'الصلاحية', teamRole: 'الدور في الفريق',
    active: 'نشط', lastLogin: 'آخر دخول', addUser: 'إضافة مستخدم', email: 'البريد (اختياري)', name: 'الاسم', username: 'اسم المستخدم', changePw: 'تغيير كلمة المرور', resetPw: 'إعادة تعيين كلمة المرور', unlock: 'فك القفل', locked: 'مقفل', mustChange: 'بانتظار تغيير كلمة المرور', tempPwTitle: 'كلمة المرور المؤقتة', tempPwHint: 'سلّمها للمستخدم بطريقة آمنة. لن تظهر مرة أخرى، وسيُطلب منه تغييرها عند أول دخول.', copy: 'نسخ', copied: 'تم النسخ', done: 'تم', confirmReset: 'تأكيد إعادة التعيين', status: 'الحالة', actionsCol: 'إجراءات', userHint: 'أحرف إنجليزية صغيرة وأرقام، مثل: ahmed.ali', live: 'متصل', offline: 'غير متصل – يعيد المحاولة',
    kinds: { overdue: 'متأخر', due_soon: 'مستحق قريبًا', expiry: 'قرب الانتهاء', expired: 'منتهٍ', assigned: 'إسناد جديد' },
    actions: { create: 'إنشاء', update: 'تعديل', delete: 'حذف', attach: 'إرفاق', detach: 'حذف مرفق', login: 'تسجيل دخول', login_failed: 'محاولة دخول خاطئة', login_locked: 'قفل الحساب بعد محاولات خاطئة', password_changed: 'تغيير كلمة المرور', password_reset: 'إعادة تعيين كلمة المرور', user_created: 'إنشاء مستخدم' }, loadErr: 'تعذّر تحميل البيانات. أعد تحميل الصفحة.' },
  en: { app: 'BD Hub', org: 'Awtad Advance', dashboard: 'Dashboard', mine: 'My work', settings: 'Settings', activity: 'Activity log', users: 'Users',
    search: 'Search…', all: 'All', add: 'Add record', exportCsv: 'Export CSV', exportXlsx: 'Export Excel', save: 'Save', cancel: 'Close', del: 'Delete', confirmDel: 'Confirm delete',
    saved: 'Saved', deleted: 'Deleted', tracked: 'Tracked only', records: 'records', showMore: 'Show more', history: 'Change history', noHistory: 'No changes yet.',
    updated: 'Last updated', by: 'by', someone: 'Someone', overdue: 'Overdue', daysLeft: 'days left', expired: 'Expired', attention: 'Needs attention',
    renewals: 'Renewals within 90 days', nextActions: 'Next open actions', workload: 'Workload by owner', byType: 'Entities by type',
    pqStatus: 'Prequal status (tracked)', oemStatus: 'Partnership status (tracked)', rmProgress: 'Roadmap progress 90/180/365', gap: 'Gap',
    empty: 'No data.', readonly: 'You have read-only access. Ask an administrator for Editor access.', myRole: 'My team role',
    myRoleHint: "You see this role's items plus anything assigned to you by name.", assignedToMe: 'Assigned to me or my role', none: 'None', lang: 'العربية',
    assignee: 'Assignee', pick: 'Search a colleague…', clear: 'Clear', targets: 'KPI targets', targetsHint: 'Shown on the dashboard against actuals.',
    managersOnly: 'Managers only', nochanges: 'No changes', newRec: 'New record', required: 'The main field is required', failed: "Couldn't save", conflict: 'Someone else changed this record first. The latest version is shown; enter your change again.',
    today: 'Today', created: 'Created the record', attach: 'Attached a file', detach: 'Removed a file', delete: 'Deleted the record', files: 'Attachments', upload: 'Upload', noFiles: 'No attachments.',
    notifications: 'Notifications', markRead: 'Mark all read', noNotifs: 'No notifications.', logout: 'Sign out', role: 'Access', teamRole: 'Team role',
    active: 'Active', lastLogin: 'Last sign-in', addUser: 'Add user', email: 'Email (optional)', name: 'Name', username: 'Username', changePw: 'Change password', resetPw: 'Reset password', unlock: 'Unlock', locked: 'Locked', mustChange: 'Must change password', tempPwTitle: 'Temporary password', tempPwHint: 'Give it to the user securely. It will not be shown again, and they must change it at first sign-in.', copy: 'Copy', copied: 'Copied', done: 'Done', confirmReset: 'Confirm reset', status: 'Status', actionsCol: 'Actions', userHint: 'lowercase letters and digits, e.g. ahmed.ali', live: 'Live', offline: 'Offline – retrying',
    kinds: { overdue: 'Overdue', due_soon: 'Due soon', expiry: 'Expiring', expired: 'Expired', assigned: 'Assigned to you' },
    actions: { create: 'Create', update: 'Update', delete: 'Delete', attach: 'Attach', detach: 'Remove file', login: 'Signed in', login_failed: 'Failed sign-in', login_locked: 'Account locked after failed sign-ins', password_changed: 'Password changed', password_reset: 'Password reset', user_created: 'User created' }, loadErr: "Couldn't load data. Reload the page." }
};
let LANG = 'ar'; try { LANG = localStorage.getItem('bd_lang') || 'ar'; } catch (e) {}
const t = k => T[LANG][k] ?? k;
const L = (e, v) => (v == null || v === '') ? '' : (LANG === 'ar' && AR[e] && AR[e][v]) ? AR[e][v] : v;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);
const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const days = iso => iso ? Math.round((new Date(iso + 'T00:00:00') - new Date(todayISO() + 'T00:00:00')) / 864e5) : null;
const fmtTS = s => { if (!s) return ''; const d = new Date(s); return isNaN(d) ? s : d.toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); };
const ROLE_RANK = { viewer: 0, editor: 1, manager: 2, admin: 3 };

const S = { data: {}, users: [], userMap: {}, targets: {}, me: null, route: 'dashboard', filters: {}, q: {}, sort: {}, limit: {}, open: null, detail: null,
  notifs: [], unread: 0, npanel: false, live: false, adminUsers: null, activity: null, loaded: false };
const can = r => S.me && ROLE_RANK[S.me.role] >= ROLE_RANK[r];

/* ---------- API ---------- */
async function api(path, opts = {}) {
  const o = { method: opts.method || 'GET', headers: { 'X-Requested-With': 'bdhub' }, credentials: 'same-origin' };
  if (opts.body instanceof FormData) o.body = opts.body;
  else if (opts.body !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(opts.body); }
  const r = await fetch('/api' + path, o);
  if (r.status === 401) { location.href = '/auth/login'; throw new Error('unauthenticated'); }
  const j = r.headers.get('content-type')?.includes('json') ? await r.json() : {};
  if (r.status === 403 && j.error === 'password_change_required') { location.href = '/auth/change-password'; throw new Error('unauthenticated'); }
  if (!r.ok) { const e = new Error(j.error || r.statusText); e.status = r.status; e.body = j; throw e; }
  return j;
}

/* ---------- routing ---------- */
const NAVS = () => [['dashboard'], ['mine'], ...Object.keys(MOD).map(m => [m]), ['settings'], ...(can('manager') ? [['activity']] : []), ...(can('admin') ? [['users']] : [])];
const navLabel = k => MOD[k] ? (LANG === 'ar' ? MOD[k].ar : MOD[k].en) : t(k);
function route() {
  const h = (location.hash || '').replace('#', '');
  S.route = NAVS().some(n => n[0] === h) ? h : 'dashboard';
  if (S.route === 'users' && !S.adminUsers) loadUsers();
  if (S.route === 'activity') loadActivity();
  render();
}
window.addEventListener('hashchange', route);
function applyLang() { const a = $('#app'); a.dir = LANG === 'ar' ? 'rtl' : 'ltr'; document.documentElement.lang = LANG; document.documentElement.dir = a.dir; }

/* ---------- people ---------- */
const pname = id => id ? ((S.userMap[id] && S.userMap[id].name) || t('someone')) : '';
const initials = n => (n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
const avatar = id => `<span class="chip s-purple" style="padding:0 6px">${esc(initials(pname(id)))}</span>`;

/* ---------- chips ---------- */
const sClass = s => ({ Approved: 's-ok', Active: 's-ok', Complete: 's-ok', 'In Progress': 's-blue', Planned: 's-purple', Submitted: 's-warn', Pending: 's-warn', Blocked: 's-crit', 'On Hold': 's-mute', 'Renewal Due': 's-orange', 'Not Started': 's-mute' }[s] || 's-mute');
const pClass = p => ({ 'P1 - Critical': 's-crit', 'P2 - High': 's-orange', 'P3 - Medium': 's-warn', 'P4 - Low': 's-mute' }[p] || 's-mute');
const cClass = c => ({ Existing: 's-ok', Partial: 's-blue', 'Gap – Build': 's-warn', 'Gap – Partner': 's-purple' }[c] || 's-mute');
const chip = (txt, cls) => `<span class="chip ${cls}">${esc(txt)}</span>`;
function dueChip(iso, status) {
  if (!iso) return '—'; const d = days(iso); const done = DONE.includes(status) || status === 'Submitted';
  if (d < 0 && !done) return `<span class="num">${iso}</span> ${chip(t('overdue'), 's-crit')}`;
  if (d <= 7 && !done) return `<span class="num">${iso}</span> ${chip(d + ' ' + t('daysLeft'), 's-warn')}`;
  return `<span class="num">${iso}</span>`;
}
function expChip(iso) {
  if (!iso) return '—'; const d = days(iso);
  if (d < 0) return `<span class="num">${iso}</span> ${chip(t('expired'), 's-crit')}`;
  if (d <= 30) return `<span class="num">${iso}</span> ${chip('≤30', 's-crit')}`;
  if (d <= 60) return `<span class="num">${iso}</span> ${chip('≤60', 's-orange')}`;
  if (d <= 90) return `<span class="num">${iso}</span> ${chip('≤90', 's-warn')}`;
  return `<span class="num">${iso}</span>`;
}

/* ---------- derived ---------- */
function isOverdue(mod, r) {
  const M = MOD[mod];
  if (mod === 'docs') return !!r.expiry && days(r.expiry) < 0;
  if (!M.dueKey || !r[M.dueKey]) return false;
  if (days(r[M.dueKey]) >= 0) return false;
  const st = r[M.statusKey]; if (DONE.includes(st)) return false; if (mod === 'entities' && st === 'Submitted') return false; return true;
}
function renewalItems() {
  const out = [];
  for (const [mod, k] of [['entities', 'expiry'], ['oems', 'renewal'], ['docs', 'expiry']]) for (const r of S.data[mod] || []) { if (!r[k]) continue; const d = days(r[k]); if (d <= 90) out.push({ mod, r, d, k }); }
  return out.sort((a, b) => a.d - b.d);
}
function kpiActual(k) {
  const D = S.data, cnt = (a, f) => a.filter(f).length;
  return { services: D.services.length, existing: cnt(D.services, r => r.cap === 'Existing'), certs: D.certs.length, certsDone: cnt(D.certs, r => ['Complete', 'Active'].includes(r.status)),
    oems: D.oems.length, oemVerified: cnt(D.oems, r => String(r.verif || '').startsWith('Verified')), entities: D.entities.length,
    submitted: cnt(D.entities, r => ['Submitted', 'Pending'].includes(r.status)), approved: cnt(D.entities, r => ['Approved', 'Active'].includes(r.status)),
    partners: cnt(D.oems, r => ['Approved', 'Active'].includes(r.status)), docsDone: cnt(D.docs, r => ['Complete', 'Active'].includes(r.status)), rmDone: cnt(D.roadmap, r => r.status === 'Complete') }[k];
}
const isMine = r => (S.me && r.assignee === S.me.id) || (S.me && S.me.team_role && r.owner === S.me.team_role);
const workMods = () => Object.keys(MOD).filter(m => MOD[m].statusKey);

/* ---------- nav & top bar ---------- */
function renderNav() {
  const od = workMods().reduce((a, m) => a + S.data[m].filter(r => isOverdue(m, r)).length, 0);
  const mine = workMods().reduce((a, m) => a + S.data[m].filter(r => isMine(r) && !DONE.includes(r[MOD[m].statusKey])).length, 0);
  $('#nav').innerHTML = `<div class="brand"><div class="brand-chip"><img src="/img/mark.png" alt="Awtad Advance"></div><div class="brand-txt"><b>${t('app')}</b><span>${t('org')}</span></div></div>` +
    NAVS().map(([k]) => {
      let b = '';
      if (k === 'dashboard' && od) b = `<span class="badge num" title="${t('overdue')}">${od}</span>`;
      if (k === 'mine' && mine) b = `<span class="badge num" style="background:var(--purple-soft);color:var(--purple)">${mine}</span>`;
      return `<a class="item ${S.route === k ? 'on' : ''}" href="#${k}"><span class="node"></span>${esc(navLabel(k))}${b}</a>`;
    }).join('') +
    `<div class="foot"><span class="conn ${S.live ? '' : 'off'}"><i></i>${S.live ? t('live') : t('offline')}</span><br>${Object.values(S.data).reduce((a, x) => a + x.length, 0)} ${t('records')}</div>`;
}
function topbar(title, sub, extra = '') {
  return `<div class="topbar"><div><h1>${esc(title)}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div><div class="grow"></div>${extra}
  <button class="btn ghost bell" data-act="bell" aria-label="${t('notifications')}">🔔${S.unread ? `<span class="dot num">${S.unread}</span>` : ''}</button>
  <button class="btn ghost" data-act="lang">${t('lang')}</button>
  <span class="userbox">${avatar(S.me.id)}<span>${esc(S.me.name || S.me.username)}<br><span class="chip s-mute role">${esc(L('role', S.me.role))}</span></span></span>
  <a class="btn ghost" href="/auth/change-password">${t('changePw')}</a><a class="btn ghost" href="/auth/logout">${t('logout')}</a></div>`;
}

/* ---------- dashboard ---------- */
function hbars(rows, max, color, go) {
  max = Math.max(max, 1);
  return `<div class="hbars">${rows.map(([lab, n, key]) => `<div class="hb" ${go ? `data-go="${go}" data-fv="${esc(key)}"` : ''}><span class="t" title="${esc(lab)}">${esc(lab)}</span><span class="track"><span class="fill" style="width:${(n / max * 100).toFixed(1)}%;background:${color}"></span></span><span class="n num">${n}</span></div>`).join('')}</div>`;
}
const SCOL = { 'Not Started': 'var(--line-strong)', Planned: 'var(--purple)', 'In Progress': 'var(--blue)', Submitted: 'var(--warn)', Pending: 'var(--warn)', Approved: 'var(--ok)', Active: 'var(--teal)', 'On Hold': 'var(--muted)', Blocked: 'var(--crit)', Complete: 'var(--ok)', 'Renewal Due': 'var(--orange)' };
function statusStack(rows) {
  const tot = rows.length || 1; const c = {}; rows.forEach(r => c[r.status] = (c[r.status] || 0) + 1);
  const keys = ENUM.status.filter(s => c[s]);
  return `<div class="stack">${keys.map(s => `<i style="width:${c[s] / tot * 100}%;background:${SCOL[s]}" title="${esc(L('status', s))}: ${c[s]}"></i>`).join('')}</div>
  <div class="legend">${keys.map(s => `<span><i style="background:${SCOL[s]}"></i>${esc(L('status', s))} <b class="num">${c[s]}</b></span>`).join('')}</div>`;
}
function listItems(items) {
  if (!items.length) return `<div class="empty">${t('none')}</div>`;
  return `<div class="list">${items.map(({ m, r, exp }) => {
    const M = MOD[m]; const st = r[M.statusKey]; const dk = exp || M.dueKey || M.expKey;
    return `<div class="li" data-open="${m}:${r.id}"><span class="t" dir="auto">${esc(String(r[M.title]).slice(0, 120))}</span><span>${st ? chip(L('status', st), sClass(st)) : ''}</span>
    <span class="m"><span>${esc(navLabel(m))}</span>${r.owner ? `<span>· ${esc(L('owner', r.owner))}</span>` : ''}${r.assignee ? `<span>· ${esc(pname(r.assignee))}</span>` : ''}<span>· ${exp || m === 'docs' ? expChip(r[dk]) : dueChip(r[dk], st)}</span></span></div>`;
  }).join('')}</div>`;
}
function viewDashboard() {
  const D = S.data, tg = S.targets;
  const kpis = KPI_DEF.map(([k, ar, en, go]) => {
    const a = kpiActual(k), tv = tg[k], p = tv ? Math.min(100, a / tv * 100) : 0, g = a - (tv || 0);
    return `<button class="kpi" data-nav="${go}"><span class="l">${LANG === 'ar' ? ar : en}</span><span class="v num">${a}<small> / ${tv ?? '—'}</small></span><span class="bar"><i style="width:${p.toFixed(0)}%"></i></span><span class="gap num">${t('gap')}: ${g > 0 ? '+' : ''}${g}</span></button>`;
  }).join('');
  const overdueAll = []; for (const m of workMods()) for (const r of D[m]) if (isOverdue(m, r)) overdueAll.push({ m, r });
  const odTile = `<button class="kpi ${overdueAll.length ? 'alert' : ''}" data-nav="mine"><span class="l">${t('overdue')}</span><span class="v num">${overdueAll.length}</span><span class="gap">${t('attention')}</span></button>`;
  const byType = ENUM.etype.map(e => [L('etype', e), D.entities.filter(r => r.type === e).length, e]);
  const trk = D.entities.filter(r => r.tracked), otrk = D.oems.filter(r => r.tracked);
  const hz = ENUM.horizon.map(h => {
    const rs = D.roadmap.filter(r => r.horizon === h); const done = rs.filter(r => r.status === 'Complete').length;
    const avg = rs.length ? Math.round(rs.reduce((a, r) => a + (r.status === 'Complete' ? 100 : (+r.progress || 0)), 0) / rs.length) : 0;
    return `<div class="hb" data-go="roadmap"><span class="t">${esc(L('horizon', h))} · <span class="num">${done}/${rs.length}</span></span><span class="track"><span class="fill" style="width:${avg}%;background:var(--teal)"></span></span><span class="n num">${avg}%</span></div>`;
  }).join('');
  const next = D.actions.filter(r => r.status !== 'Complete' && r.due).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 8);
  const ren = renewalItems();
  const wl = {}; for (const m of workMods()) for (const r of D[m]) { const st = r[MOD[m].statusKey]; if (DONE.includes(st) || !r.owner) continue; wl[r.owner] = wl[r.owner] || { o: 0, d: 0 }; wl[r.owner].o++; if (isOverdue(m, r)) wl[r.owner].d++; }
  const wlRows = Object.entries(wl).sort((a, b) => b[1].d - a[1].d || b[1].o - a[1].o).slice(0, 10); const wmax = Math.max(1, ...wlRows.map(x => x[1].o));
  return topbar(t('dashboard'), `${t('today')}: <span class="num">${todayISO()}</span>`, `<a class="btn" href="/api/export.xlsx?lang=${LANG}">${t('exportXlsx')}</a>`) +
  `<div class="grid g-kpi" style="margin-bottom:14px">${odTile}${kpis}</div>
  <div class="grid g-3" style="margin-bottom:14px">
   <section class="panel"><h2>${t('byType')}<span class="hint num">${D.entities.length}</span></h2>${hbars(byType, Math.max(...byType.map(x => x[1])), 'var(--blue)', 'entities:type')}</section>
   <section class="panel"><h2>${t('pqStatus')}<span class="hint num">${trk.length}</span></h2>${statusStack(trk)}<h2 style="margin-top:18px">${t('oemStatus')}<span class="hint num">${otrk.length}</span></h2>${statusStack(otrk)}</section>
   <section class="panel"><h2>${t('rmProgress')}</h2><div class="hbars">${hz}</div><h2 style="margin-top:18px">${t('workload')}</h2>${wlRows.length ? `<div class="hbars">${wlRows.map(([o, v]) => `<div class="hb"><span class="t">${esc(L('owner', o))}</span><span class="track"><span class="fill" style="width:${v.o / wmax * 100}%;background:var(--purple)"></span></span><span class="n num" ${v.d ? `style="color:var(--crit)" title="${t('overdue')}: ${v.d}"` : ''}>${v.o}</span></div>`).join('')}</div>` : `<div class="empty">${t('none')}</div>`}</section>
  </div>
  <div class="grid g-3">
   <section class="panel"><h2>${t('attention')}<span class="hint num">${overdueAll.length}</span></h2>${listItems(overdueAll.slice(0, 8))}</section>
   <section class="panel"><h2>${t('nextActions')}</h2>${listItems(next.map(r => ({ m: 'actions', r })))}</section>
   <section class="panel"><h2>${t('renewals')}<span class="hint num">${ren.length}</span></h2>${listItems(ren.slice(0, 8).map(x => ({ m: x.mod, r: x.r, exp: x.k })))}</section>
  </div>`;
}

/* ---------- my work ---------- */
function roleSelect(id) {
  return `<select id="${id}" class="btn">${['', ...ENUM.owner].map(o => `<option value="${esc(o)}" ${o === (S.me.team_role || '') ? 'selected' : ''}>${o ? esc(L('owner', o)) : '— ' + t('myRole') + ' —'}</option>`).join('')}</select>`;
}
function viewMine() {
  const items = []; for (const m of workMods()) for (const r of S.data[m]) if (isMine(r) && !DONE.includes(r[MOD[m].statusKey])) items.push({ m, r });
  const k = x => { const M = MOD[x.m]; return x.r[M.dueKey || M.expKey] || '9999'; }; items.sort((a, b) => k(a).localeCompare(k(b)));
  const od = items.filter(x => isOverdue(x.m, x.r));
  return topbar(t('mine'), t('myRoleHint'), roleSelect('myrole')) +
  `<div class="grid g-2"><section class="panel"><h2>${t('overdue')}<span class="hint num">${od.length}</span></h2>${listItems(od)}</section>
  <section class="panel"><h2>${t('assignedToMe')}<span class="hint num">${items.length}</span></h2>${listItems(items.slice(0, 80))}</section></div>`;
}

/* ---------- module lists ---------- */
const colLabel = (mod, k) => { const f = MOD[mod].fields.find(x => x.k === k); return f ? (LANG === 'ar' ? f.ar : f.en) : k; };
function rowsFor(mod) {
  const M = MOD[mod], f = S.filters[mod] || {}, q = (S.q[mod] || '').trim().toLowerCase();
  let rs = S.data[mod].filter(r => {
    for (const k in f) { if (k === '_tracked') { if (f[k] && !r.tracked) return false; continue; } if (f[k] && r[k] !== f[k]) return false; }
    if (q) { const hay = Object.values(r).filter(v => typeof v === 'string').join(' ').toLowerCase() + ' ' + pname(r.assignee).toLowerCase(); if (!hay.includes(q)) return false; }
    return true;
  });
  const so = S.sort[mod];
  if (so) {
    const [k, dir] = so; const pi = v => k === 'priority' ? ENUM.priority.indexOf(v) : k === 'status' ? ENUM.status.indexOf(v) : v;
    rs = [...rs].sort((a, b) => { const x = pi(a[k]), y = pi(b[k]); if (x == null || x === '') return 1; if (y == null || y === '') return -1; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * dir; });
  } else rs = [...rs].sort((a, b) => ENUM.priority.indexOf(a.priority) - ENUM.priority.indexOf(b.priority) || String(a[M.title]).localeCompare(String(b[M.title])));
  return rs;
}
function cell(mod, r, [k, , , kind]) {
  const v = r[k];
  if (kind === 'title') return `<td class="title" dir="auto">${esc(v)}${r.assignee ? `<div class="small">${esc(pname(r.assignee))}</div>` : ''}</td>`;
  if (kind === 'status') return `<td><select class="inl chip ${sClass(v)}" data-inl="${mod}:${r.id}:${k}" ${can('editor') ? '' : 'disabled'} aria-label="${esc(colLabel(mod, k))}">${ENUM.status.map(s => `<option value="${s}" ${s === v ? 'selected' : ''}>${esc(L('status', s))}</option>`).join('')}</select></td>`;
  if (kind === 'prio') return `<td>${v ? chip(L('priority', v), pClass(v)) : '—'}</td>`;
  if (kind === 'cap') return `<td>${v ? chip(L('cap', v), cClass(v)) : '—'}</td>`;
  if (kind === 'owner') return `<td>${esc(L('owner', v)) || '—'}</td>`;
  if (kind === 'due') return `<td>${dueChip(v, r[MOD[mod].statusKey])}</td>`;
  if (kind === 'exp') return `<td>${expChip(v)}</td>`;
  if (kind === 'pct') return `<td class="num">${r.status === 'Complete' ? 100 : (+v || 0)}%</td>`;
  if (kind === 'money') return `<td class="num">${v !== '' && v != null ? (+v).toLocaleString('en-US') : '—'}</td>`;
  if (kind === 'cost') return `<td class="num">${(+r.costLow || 0).toLocaleString('en-US')} – ${(+r.costHigh || 0).toLocaleString('en-US')}</td>`;
  if (kind === 'link') return `<td>${v ? `<a href="${esc(v)}" target="_blank" rel="noopener" data-stop="1">↗</a>` : '—'}</td>`;
  if (kind && kind.startsWith('enum:')) return `<td dir="auto">${esc(L(kind.slice(5), v)) || '—'}</td>`;
  return `<td dir="auto">${esc(v) || '—'}</td>`;
}
function viewList(mod) {
  const M = MOD[mod], f = S.filters[mod] || {}, rs = rowsFor(mod), lim = S.limit[mod] || 100, so = S.sort[mod];
  const opts = (k, e) => {
    const vals = e ? ENUM[e] : [...new Set(S.data[mod].map(r => r[k]).filter(Boolean))].sort();
    return `<select data-flt="${mod}:${k}" aria-label="${esc(colLabel(mod, k))}"><option value="">${esc(colLabel(mod, k))}: ${t('all')}</option>${vals.map(v => `<option value="${esc(v)}" ${f[k] === v ? 'selected' : ''}>${esc(e ? L(e, v) : v)}</option>`).join('')}</select>`;
  };
  const extra = `${can('editor') ? `<button class="btn primary" data-act="new">+ ${t('add')}</button>` : ''}<button class="btn" data-act="csv">${t('exportCsv')}</button>`;
  return topbar(navLabel(mod), '', extra) + (can('editor') ? '' : `<div class="notice warn" style="margin-bottom:12px">${t('readonly')}</div>`) +
  `<div class="toolbar"><input type="search" id="q" placeholder="${t('search')}" value="${esc(S.q[mod] || '')}">${M.filters.map(([k, e]) => opts(k, e)).join('')}
  ${M.trackToggle ? `<label class="chk"><input type="checkbox" data-trk="${mod}" ${f._tracked ? 'checked' : ''}>${t('tracked')}</label>` : ''}<span class="count num">${rs.length} ${t('records')}</span></div>` +
  (mod === 'roadmap' ? gantt(rs) : '') +
  `<div class="tablewrap"><table><thead><tr>${M.cols.map(c => `<th data-sort="${mod}:${c[0]}">${esc(LANG === 'ar' ? c[1] : c[2])} <span class="arr">${so && so[0] === c[0] ? (so[1] > 0 ? '▲' : '▼') : ''}</span></th>`).join('')}</tr></thead>
  <tbody>${rs.slice(0, lim).map(r => `<tr data-open="${mod}:${r.id}">${M.cols.map(c => cell(mod, r, c)).join('')}</tr>`).join('') || `<tr><td colspan="${M.cols.length}" class="empty">${t('empty')}</td></tr>`}</tbody></table>
  ${rs.length > lim ? `<div class="more"><button class="btn" data-more="${mod}">${t('showMore')} (${rs.length - lim})</button></div>` : ''}</div>`;
}
function gantt(rs) {
  const all = S.data.roadmap.filter(r => r.start && r.due); if (!all.length) return '';
  const min = new Date(all.map(r => r.start).sort()[0] + 'T00:00:00'); min.setDate(1);
  const max = new Date(all.map(r => r.due).sort().pop() + 'T00:00:00'); max.setMonth(max.getMonth() + 1, 1);
  const span = max - min, pos = iso => Math.max(0, Math.min(100, (new Date(iso + 'T00:00:00') - min) / span * 100));
  const side = LANG === 'ar' ? 'right' : 'left'; const months = []; const d = new Date(min); while (d < max) { months.push(new Date(d)); d.setMonth(d.getMonth() + 1); }
  const iso = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-01';
  const mh = months.map(m => `<span style="${side}:${pos(iso(m)) + 100 / months.length / 2}%" class="num">${m.toLocaleDateString(LANG === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { month: 'short', year: '2-digit' })}</span>`).join('');
  const tp = pos(todayISO());
  const byH = ENUM.horizon.map(h => [h, rs.filter(r => r.horizon === h && r.start && r.due)]).filter(x => x[1].length);
  return `<section class="panel gantt" style="margin-bottom:14px;padding:0"><div class="gt"><div class="ghead"><div style="padding:6px 10px">${esc(navLabel('roadmap'))}</div><div class="months">${mh}</div></div>
  ${byH.map(([h, list]) => `<div class="hz">${esc(L('horizon', h))}</div>` + list.sort((a, b) => a.start.localeCompare(b.start)).map(r => {
    const a = pos(r.start), b = pos(r.due), pr = r.status === 'Complete' ? 100 : (+r.progress || 0);
    const c = isOverdue('roadmap', r) ? 'var(--crit)' : r.status === 'Complete' ? 'var(--ok)' : 'var(--blue)';
    return `<div class="grow-r" data-open="roadmap:${r.id}"><div class="lbl" dir="auto">${esc(String(r.deliverable).slice(0, 70))}<small>${esc(L('owner', r.owner))} · ${esc(L('status', r.status))}</small></div>
    <div class="track2"><span class="today" style="${side}:${tp}%" title="${t('today')}"></span><span class="b" style="${side}:${a}%;width:${Math.max(1, b - a)}%;box-shadow:inset 0 0 0 1px ${c}"><i style="width:${pr}%;background:${c}"></i></span></div></div>`;
  }).join('')).join('')}</div></section>`;
}

/* ---------- settings / activity / users ---------- */
function viewSettings() {
  const tg = S.targets, m = can('manager');
  return topbar(t('settings'), '') + `<div class="grid g-2">
  <section class="panel"><h2>${t('myRole')}</h2><p class="lead" style="margin-top:0">${t('myRoleHint')}</p>${roleSelect('myrole2')}</section>
  <section class="panel"><h2>${t('targets')}<span class="hint">${m ? '' : t('managersOnly')}</span></h2><p class="lead" style="margin-top:0">${t('targetsHint')}</p>
   ${KPI_DEF.map(([k, ar, en]) => `<div class="set-row"><label for="tg-${k}">${LANG === 'ar' ? ar : en}</label><input id="tg-${k}" class="num" type="number" min="0" value="${tg[k] ?? ''}" ${m ? '' : 'readonly'}></div>`).join('')}
   ${m ? `<div style="margin-top:12px"><button class="btn primary" data-act="savetargets">${t('save')}</button></div>` : ''}</section></div>`;
}
async function loadActivity() { try { S.activity = (await api('/activity?limit=200')).activity; render(); } catch (e) { toast(e.message); } }
function histLine(mod, a) {
  if (a.module === 'users') return esc(T[LANG].actions[a.action] || a.action);
  if (a.action !== 'update') return `${esc(T[LANG].actions[a.action] || a.action)}${a.changes && a.changes.file ? ': ' + esc(a.changes.file[1] || a.changes.file[0]) : ''}`;
  return Object.entries(a.changes || {}).map(([k, [x, y]]) => `${esc(colLabel(mod, k))}: ${esc(fmtV(k, x))} ${LANG === 'ar' ? '←' : '→'} ${esc(fmtV(k, y))}`).join(' · ');
}
function viewActivity() {
  const rows = S.activity || [];
  return topbar(t('activity'), '') + `<section class="panel">${rows.length ? rows.map(a => {
    const rec = (S.data[a.module] || []).find(r => r.id === a.record_id);
    const title = rec ? rec[MOD[a.module].title] : a.module === 'users' ? pname(a.record_id) : a.record_id;
    return `<div class="act-row"><div class="w"><b>${esc(a.user_name || t('someone'))}</b><br><span class="num">${esc(fmtTS(a.at))}</span></div><div ${rec ? `data-open="${a.module}:${a.record_id}" style="cursor:pointer"` : ''}><span dir="auto">${esc(String(title).slice(0, 120))}</span> <span class="chip s-mute">${esc(navLabel(a.module))}</span><div class="c" dir="auto">${histLine(a.module, a)}</div></div></div>`;
  }).join('') : `<div class="empty">${t('none')}</div>`}</section>`;
}
async function loadUsers() { try { S.adminUsers = (await api('/users')).users; render(); } catch (e) { toast(e.message); } }
function viewUsers() {
  const us = S.adminUsers || [];
  const now = Date.now();
  return topbar(t('users'), '') + `<section class="panel" style="margin-bottom:14px"><h2>${t('addUser')}</h2>
  <div class="toolbar"><input id="nu-username" dir="ltr" autocomplete="off" placeholder="${t('username')}" title="${t('userHint')}"><input id="nu-name" placeholder="${t('name')}"><input id="nu-email" type="email" dir="ltr" placeholder="${t('email')}">
  <select id="nu-role">${ENUM.role.map(r => `<option value="${r}" ${r === 'editor' ? 'selected' : ''}>${esc(L('role', r))}</option>`).join('')}</select>
  <select id="nu-team"><option value="">${t('teamRole')}</option>${ENUM.owner.map(o => `<option value="${esc(o)}">${esc(L('owner', o))}</option>`).join('')}</select>
  <button class="btn primary" data-act="adduser">${t('addUser')}</button></div><div class="small" style="color:var(--muted);font-size:12px">${t('username')}: ${t('userHint')}</div></section>
  <div class="tablewrap"><table class="utable"><thead><tr><th>${t('name')}</th><th>${t('username')}</th><th>${t('email')}</th><th>${t('role')}</th><th>${t('teamRole')}</th><th>${t('active')}</th><th>${t('status')}</th><th>${t('lastLogin')}</th><th>${t('actionsCol')}</th></tr></thead><tbody>
  ${us.map(u => {
    const locked = u.locked_until && new Date(u.locked_until).getTime() > now;
    return `<tr><td>${esc(u.name)}</td><td dir="ltr">${esc(u.username)}</td>
   <td><input type="email" dir="ltr" value="${esc(u.email || '')}" data-user="${u.id}:email" style="width:190px"></td>
   <td><select data-user="${u.id}:role">${ENUM.role.map(r => `<option value="${r}" ${r === u.role ? 'selected' : ''}>${esc(L('role', r))}</option>`).join('')}</select></td>
   <td><select data-user="${u.id}:team_role"><option value="">—</option>${ENUM.owner.map(o => `<option value="${esc(o)}" ${o === u.team_role ? 'selected' : ''}>${esc(L('owner', o))}</option>`).join('')}</select></td>
   <td><input type="checkbox" data-user="${u.id}:active" ${u.active ? 'checked' : ''} aria-label="${t('active')}"></td>
   <td>${locked ? chip(t('locked'), 's-crit') : ''} ${u.must_change_password ? chip(t('mustChange'), 's-warn') : ''}</td>
   <td class="num">${esc(fmtTS(u.last_login_at))}</td>
   <td style="white-space:nowrap">${locked ? `<button class="btn" data-unlock="${u.id}">${t('unlock')}</button> ` : ''}<button class="btn" data-resetpw="${u.id}">${t('resetPw')}</button></td></tr>`;
  }).join('')}
  </tbody></table></div>`;
}
function showTempPassword(user, pw) {
  $('#overlay').innerHTML = `<div class="scrim" data-act="closetemp"></div><div class="drawer" role="dialog" aria-label="${t('tempPwTitle')}" style="height:auto;bottom:auto;top:20%;inset-inline:0;margin:auto;width:min(460px,calc(100% - 32px));border-radius:var(--radius)">
  <div class="dh"><h3>${t('tempPwTitle')} – <span dir="ltr">${esc(user.username)}</span></h3></div>
  <div class="db"><p class="lead">${t('tempPwHint')}</p>
  <div style="display:flex;gap:8px;align-items:center"><input id="temppw" readonly dir="ltr" value="${esc(pw)}" class="num" style="flex:1;font-size:18px;padding:8px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface-2);color:var(--ink)"><button class="btn" data-act="copytemp">${t('copy')}</button></div></div>
  <div class="df"><button class="btn primary" data-act="closetemp">${t('done')}</button></div></div>`;
  const i = $('#temppw'); i.focus(); i.select();
}

/* ---------- notifications panel ---------- */
async function loadNotifs() { try { const j = await api('/notifications'); S.notifs = j.notifications; S.unread = j.unread; if (S.npanel) renderNPanel(); renderTopOnly(); } catch (e) {} }
function renderNPanel() {
  const host = $('#npanel-host');
  if (!S.npanel) { host.innerHTML = ''; return; }
  host.innerHTML = `<div class="npanel" role="dialog" aria-label="${t('notifications')}"><div class="nh"><span>${t('notifications')}</span><button class="btn ghost" data-act="markread">${t('markRead')}</button></div>
  ${S.notifs.length ? S.notifs.map(n => `<div class="ni ${n.read_at ? '' : 'unread'}" ${n.module && n.record_id ? `data-open="${n.module}:${n.record_id}"` : ''}><div class="t" dir="auto">${esc(n.title)}</div><div class="d">${esc(T[LANG].kinds[n.kind] || n.kind)} · ${esc(n.detail || '')} · <span class="num">${esc(fmtTS(n.created_at))}</span></div></div>`).join('') : `<div class="empty">${t('noNotifs')}</div>`}</div>`;
}
function renderTopOnly() { const b = document.querySelector('.bell'); if (b) b.innerHTML = '🔔' + (S.unread ? `<span class="dot num">${S.unread}</span>` : ''); }

/* ---------- render ---------- */
function render() {
  if (!S.loaded) return;
  renderNav();
  const active = document.activeElement && document.activeElement.id === 'q';
  const r = S.route;
  $('#main').innerHTML = r === 'dashboard' ? viewDashboard() : r === 'mine' ? viewMine() : r === 'settings' ? viewSettings() : r === 'activity' ? viewActivity() : r === 'users' ? viewUsers() : viewList(r);
  if (active) { const q = $('#q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
}

/* ---------- drawer ---------- */
let draft = null;
async function openRec(mod, id) {
  if (!MOD[mod]) return;
  const r = id ? S.data[mod].find(x => x.id === id) : null; if (id && !r) return;
  S.open = { mod, id: id || null }; S.detail = null;
  draft = r ? JSON.parse(JSON.stringify(r)) : newDefaults(mod);
  S.npanel = false; renderNPanel();
  renderDrawer();
  if (id) loadDetail();
}
async function loadDetail() {
  const { mod, id } = S.open || {}; if (!id) return;
  try { const j = await api(`/r/${mod}/${id}`); if (S.open && S.open.id === id) { S.detail = j; renderDetailParts(); } } catch (e) {}
}
function newDefaults(mod) {
  const d = { priority: 'P3 - Medium', owner: S.me.team_role || '', assignee: S.me.id };
  if (MOD[mod].statusKey) d.status = 'Not Started';
  if (mod === 'services') d.cap = 'Gap – Build'; if (mod === 'certs') d.type = 'Company';
  if (mod === 'roadmap') { d.horizon = '90 Days'; d.progress = 0; d.status = 'Planned'; }
  if (mod === 'docs') { d.mand = 'Mandatory'; d.status = 'Pending'; }
  if (mod === 'actions') d.code = 'A-' + String(S.data.actions.length + 1).padStart(3, '0');
  return d;
}
function fieldHtml(f) {
  if (f.group) return `<div class="fgroup">${esc(LANG === 'ar' ? f.ar : f.en)}</div>`;
  const v = draft[f.k], w = can('editor'), ro = w ? '' : 'readonly', dis = w ? '' : 'disabled', id = 'f-' + f.k, lab = LANG === 'ar' ? f.ar : f.en;
  if (f.type === 'user') return `<div class="f"><label for="f-assignee-q">${t('assignee')}</label><div class="picker"><input id="f-assignee-q" placeholder="${v ? esc(pname(v)) : t('pick')}" autocomplete="off" ${ro}><div class="menu" id="pmenu" hidden></div></div>
   ${v ? `<div style="display:flex;gap:8px;align-items:center;font-size:12.5px"><span class="person">${avatar(v)}${esc(pname(v))}</span>${w ? `<button class="btn ghost" data-act="clearassignee">${t('clear')}</button>` : ''}</div>` : ''}</div>`;
  if (f.type === 'select') { const vals = ENUM[f.e]; return `<div class="f ${f.wide ? 'wide' : ''}"><label for="${id}">${lab}</label><select id="${id}" data-k="${f.k}" ${dis}><option value=""></option>${vals.map(o => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${esc(L(f.e, o))}</option>`).join('')}</select></div>`; }
  if (f.type === 'bool') return `<div class="f"><label class="chk" style="margin-top:22px"><input type="checkbox" id="${id}" data-k="${f.k}" ${v ? 'checked' : ''} ${dis}>${lab}</label></div>`;
  if (f.type === 'textarea') return `<div class="f ${f.wide ? 'wide' : ''}"><label for="${id}">${lab}${f.required ? ' *' : ''}</label><textarea id="${id}" data-k="${f.k}" dir="auto" ${ro}>${esc(v)}</textarea></div>`;
  const type = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'url' ? 'url' : 'text';
  return `<div class="f ${f.wide ? 'wide' : ''}"><label for="${id}">${lab}${f.required ? ' *' : ''}</label><input id="${id}" type="${type}" data-k="${f.k}" dir="auto" value="${esc(v ?? '')}" ${ro}>${f.type === 'url' && v && /^https?:/.test(v) ? `<a class="linkout" href="${esc(v)}" target="_blank" rel="noopener">↗ ${esc(String(v).replace(/^https?:\/\//, '').slice(0, 60))}</a>` : ''}</div>`;
}
function fmtV(k, v) {
  if (v == null || v === '') return '∅'; if (k === 'assignee') return pname(v);
  for (const e of ['status', 'priority', 'owner', 'cap', 'horizon', 'route', 'oemRoute', 'etype', 'mand', 'ctype', 'bu', 'ocat', 'verif']) if (AR[e] && AR[e][v]) return L(e, v);
  if (typeof v === 'boolean') return v ? '✓' : '✗'; return String(v).slice(0, 60);
}
function renderDrawer() {
  const { mod, id } = S.open, M = MOD[mod]; const cur = id ? S.data[mod].find(x => x.id === id) : null;
  $('#overlay').innerHTML = `<div class="scrim" data-act="close"></div><aside class="drawer" id="drawer" role="dialog" aria-label="${esc(draft[M.title] || t('newRec'))}">
  <div class="dh"><div style="flex:1"><h3 dir="auto">${esc(draft[M.title] || t('newRec'))}</h3><div class="meta">${esc(navLabel(mod))}${cur ? ` · ${t('updated')}: <span class="num">${esc(fmtTS(cur.updatedAt))}</span>${cur.updatedBy ? ` ${t('by')} ${esc(pname(cur.updatedBy))}` : ''}` : ''}</div></div><button class="btn ghost" data-act="close" aria-label="${t('cancel')}">✕</button></div>
  <div class="db"><div class="fgrid">${M.fields.map(fieldHtml).join('')}</div><div id="dparts"></div></div>
  <div class="df"><span class="msg" id="dmsg"></span>${can('manager') && cur ? `<button class="btn danger" data-act="del">${t('del')}</button>` : ''}<button class="btn" data-act="close">${t('cancel')}</button>${can('editor') ? `<button class="btn primary" data-act="save">${t('save')}</button>` : ''}</div></aside>`;
  renderDetailParts();
}
function renderDetailParts() {
  const host = $('#dparts'); if (!host || !S.open || !S.open.id) return;
  const { mod } = S.open; const d = S.detail;
  if (!d) { host.innerHTML = '<div class="empty">…</div>'; return; }
  host.innerHTML = `<div class="hist"><div class="fgroup" style="margin-bottom:6px">${t('files')}</div>
   <div class="files">${d.files.length ? d.files.map(f => `<div class="file"><a href="/api/files/${f.id}" dir="auto">${esc(f.filename)}</a><small class="num">${(f.size / 1024).toFixed(0)} KB · ${esc(f.uploaded_by_name || '')}</small>${can('editor') && (f.uploaded_by === S.me.id || can('manager')) ? `<button class="btn ghost" data-delfile="${f.id}" aria-label="${t('del')}">✕</button>` : ''}</div>`).join('') : `<div class="empty">${t('noFiles')}</div>`}</div>
   ${can('editor') ? `<div class="upl"><input type="file" id="fup" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx"><button class="btn" data-act="upload">${t('upload')}</button></div>` : ''}</div>
  <div class="hist"><div class="fgroup" style="margin-bottom:6px">${t('history')}</div>${d.audit.length ? d.audit.map(a => `<div class="h"><b>${esc(a.user_name || t('someone'))}</b> <span class="c num">${esc(fmtTS(a.at))}</span><div class="c" dir="auto">${histLine(mod, a)}</div></div>`).join('') : `<div class="empty">${t('noHistory')}</div>`}</div>`;
}
function closeDrawer() { S.open = null; S.detail = null; draft = null; $('#overlay').innerHTML = ''; }
function collectDraft() {
  document.querySelectorAll('#drawer [data-k]').forEach(el => {
    const k = el.dataset.k; const f = MOD[S.open.mod].fields.find(x => x.k === k);
    let v = el.type === 'checkbox' ? el.checked : el.value; if (f && f.type === 'number') v = v === '' ? null : Number(v); draft[k] = v;
  });
}
function msg(s) { const m = $('#dmsg'); if (m) m.textContent = s; }
async function saveRec() {
  collectDraft(); const { mod, id } = S.open, M = MOD[mod];
  if (!String(draft[M.title] || '').trim()) { msg(t('required')); return; }
  const btn = document.querySelector('[data-act="save"]'); if (btn) btn.disabled = true;
  try {
    if (id) {
      const cur = S.data[mod].find(x => x.id === id); const changes = {};
      for (const f of M.fields) { if (f.group) continue; const a = cur[f.k] ?? '', b = draft[f.k] ?? ''; if (JSON.stringify(a) !== JSON.stringify(b)) changes[f.k] = draft[f.k]; }
      if (!Object.keys(changes).length) { msg(t('nochanges')); if (btn) btn.disabled = false; return; }
      const j = await api(`/r/${mod}/${id}`, { method: 'PATCH', body: { version: cur.version, changes } });
      upsertLocal(mod, j.record);
    } else {
      const data = {}; for (const f of M.fields) if (!f.group && draft[f.k] !== undefined && draft[f.k] !== '') data[f.k] = draft[f.k];
      const j = await api(`/r/${mod}`, { method: 'POST', body: { data } }); upsertLocal(mod, j.record);
    }
    toast(t('saved')); closeDrawer(); render();
  } catch (e) {
    if (btn) btn.disabled = false;
    if (e.status === 409 && e.body && e.body.current) { upsertLocal(mod, e.body.current); draft = JSON.parse(JSON.stringify(e.body.current)); renderDrawer(); loadDetail(); msg(t('conflict')); return; }
    msg(t('failed') + ': ' + e.message); toast(t('failed'));
  }
}
async function quickUpdate(mod, id, k, v) {
  const cur = S.data[mod].find(x => x.id === id); if (!cur || cur[k] === v) return;
  try { const j = await api(`/r/${mod}/${id}`, { method: 'PATCH', body: { version: cur.version, changes: { [k]: v } } }); upsertLocal(mod, j.record); toast(t('saved')); render(); }
  catch (e) { if (e.status === 409 && e.body.current) { upsertLocal(mod, e.body.current); toast(t('conflict')); } else toast(t('failed') + ': ' + e.message); render(); }
}
let delArm = false;
async function delRec() {
  const b = document.querySelector('[data-act="del"]');
  if (!delArm) { delArm = true; b.textContent = t('confirmDel'); setTimeout(() => { delArm = false; if (b.isConnected) b.textContent = t('del'); }, 4000); return; }
  delArm = false; const { mod, id } = S.open;
  try { await api(`/r/${mod}/${id}`, { method: 'DELETE' }); removeLocal(mod, id); toast(t('deleted')); closeDrawer(); render(); } catch (e) { msg(t('failed') + ': ' + e.message); }
}
async function uploadFiles() {
  const inp = $('#fup'); if (!inp || !inp.files.length) return;
  const fd = new FormData(); [...inp.files].forEach(f => fd.append('files', f));
  try { await api(`/r/${S.open.mod}/${S.open.id}/files`, { method: 'POST', body: fd }); toast(t('saved')); loadDetail(); } catch (e) { msg(t('failed') + ': ' + e.message); }
}
let tt; function toast(s) { let el = $('#toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); } el.textContent = s; el.hidden = false; clearTimeout(tt); tt = setTimeout(() => el.hidden = true, 2600); }

/* ---------- local data sync ---------- */
function upsertLocal(mod, rec) { const a = S.data[mod]; const i = a.findIndex(x => x.id === rec.id); if (i >= 0) { if ((a[i].version || 0) <= rec.version) a[i] = rec; } else a.push(rec); }
function removeLocal(mod, id) { S.data[mod] = S.data[mod].filter(x => x.id !== id); }
let rt; const scheduleRender = () => { clearTimeout(rt); rt = setTimeout(render, 80); };
function connectEvents() {
  const es = new EventSource('/api/events');
  es.onopen = () => { S.live = true; renderNav(); };
  es.onerror = () => { S.live = false; renderNav(); };
  es.addEventListener('upsert', e => { const { mod, record } = JSON.parse(e.data); if (S.data[mod]) { upsertLocal(mod, record); if (!S.userMap[record.assignee] && record.assignee) refreshUsers(); scheduleRender(); if (S.open && S.open.id === record.id) loadDetail(); } });
  es.addEventListener('delete', e => { const { mod, id } = JSON.parse(e.data); if (S.data[mod]) { removeLocal(mod, id); if (S.open && S.open.id === id) closeDrawer(); scheduleRender(); } });
  es.addEventListener('files', e => { const { id } = JSON.parse(e.data); if (S.open && S.open.id === id) loadDetail(); });
  es.addEventListener('targets', e => { S.targets = JSON.parse(e.data).targets; scheduleRender(); });
  es.addEventListener('notify', () => loadNotifs());
}
async function refreshUsers() { try { const j = await api('/data'); S.users = j.users; S.userMap = Object.fromEntries(j.users.map(u => [u.id, u])); } catch (e) {} }

/* ---------- assignee picker ---------- */
let pq;
function pickerSearch(q) {
  clearTimeout(pq); pq = setTimeout(async () => {
    const menu = $('#pmenu'); if (!menu) return;
    const { users } = await api('/users/search?q=' + encodeURIComponent(q));
    users.forEach(u => { S.userMap[u.id] = S.userMap[u.id] || u; });
    menu.innerHTML = users.map(u => `<div class="opt" data-pick="${esc(u.id)}">${avatar(u.id)}<span>${esc(u.name)}<br><small dir="ltr">${esc(u.username || '')}</small></span></div>`).join('');
    menu.hidden = !users.length;
  }, 150);
}

/* ---------- CSV ---------- */
function exportCsv() {
  const mod = S.route, M = MOD[mod]; const keys = M.fields.filter(f => !f.group).map(f => f.k);
  const q = v => { v = v == null ? '' : (typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const csv = '﻿' + [keys.map(k => q(colLabel(mod, k))).join(','), ...rowsFor(mod).map(r => keys.map(k => q(k === 'assignee' ? pname(r[k]) : r[k])).join(','))].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `awtad-${mod}-${todayISO()}.csv`; document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  if (S.npanel && !e.target.closest('.npanel') && !e.target.closest('[data-act="bell"]')) { S.npanel = false; renderNPanel(); }
  const el = e.target.closest('[data-act],[data-open],[data-nav],[data-go],[data-sort],[data-more],[data-pick],[data-delfile],[data-resetpw],[data-unlock]'); if (!el) return;
  if (e.target.closest('[data-stop]') || e.target.closest('select.inl')) return;
  if (el.dataset.pick) { collectDraft(); draft.assignee = el.dataset.pick; renderDrawer(); return; }
  if (el.dataset.resetpw) {
    if (el.dataset.armed !== '1') { el.dataset.armed = '1'; el.textContent = t('confirmReset'); setTimeout(() => { if (el.isConnected) { el.dataset.armed = ''; el.textContent = t('resetPw'); } }, 4000); return; }
    api('/users/' + el.dataset.resetpw + '/reset-password', { method: 'POST', body: {} }).then(j => { loadUsers(); showTempPassword(j.user, j.tempPassword); }).catch(x => toast(t('failed') + ': ' + x.message));
    return;
  }
  if (el.dataset.unlock) { api('/users/' + el.dataset.unlock, { method: 'PATCH', body: { unlock: true } }).then(() => { toast(t('saved')); loadUsers(); }).catch(x => toast(x.message)); return; }
  if (el.dataset.delfile) { api('/files/' + el.dataset.delfile, { method: 'DELETE' }).then(loadDetail).catch(x => msg(x.message)); return; }
  if (el.dataset.open) { const [m, id] = el.dataset.open.split(':'); openRec(m, id); return; }
  if (el.dataset.nav) { location.hash = el.dataset.nav; return; }
  if (el.dataset.go) { const [m, k] = el.dataset.go.split(':'); if (k && el.dataset.fv) S.filters[m] = { [k]: el.dataset.fv }; location.hash = m; return; }
  if (el.dataset.sort) { const [m, k] = el.dataset.sort.split(':'); const s = S.sort[m]; S.sort[m] = s && s[0] === k ? (s[1] > 0 ? [k, -1] : null) : [k, 1]; render(); return; }
  if (el.dataset.more) { const m = el.dataset.more; S.limit[m] = (S.limit[m] || 100) + 300; render(); return; }
  const a = el.dataset.act;
  if (a === 'close') closeDrawer(); else if (a === 'save') saveRec(); else if (a === 'del') delRec(); else if (a === 'new') openRec(S.route, null);
  else if (a === 'csv') exportCsv(); else if (a === 'upload') uploadFiles();
  else if (a === 'lang') { if (S.open) collectDraft(); LANG = LANG === 'ar' ? 'en' : 'ar'; try { localStorage.setItem('bd_lang', LANG); } catch (x) {} applyLang(); render(); if (S.open) renderDrawer(); renderNPanel(); }
  else if (a === 'clearassignee') { collectDraft(); draft.assignee = ''; renderDrawer(); }
  else if (a === 'savetargets') saveTargets();
  else if (a === 'bell') { S.npanel = !S.npanel; renderNPanel(); if (S.npanel) loadNotifs(); }
  else if (a === 'markread') api('/notifications/read', { method: 'POST', body: {} }).then(loadNotifs);
  else if (a === 'adduser') addUser();
  else if (a === 'closetemp') { $('#overlay').innerHTML = ''; }
  else if (a === 'copytemp') { const i = $('#temppw'); navigator.clipboard.writeText(i.value).then(() => toast(t('copied'))).catch(() => { i.focus(); i.select(); }); }
});
document.addEventListener('change', async e => {
  const el = e.target;
  if (el.dataset.inl) { const [m, id, k] = el.dataset.inl.split(':'); quickUpdate(m, id, k, el.value); return; }
  if (el.dataset.flt) { const [m, k] = el.dataset.flt.split(':'); S.filters[m] = S.filters[m] || {}; S.filters[m][k] = el.value; S.limit[m] = 100; render(); return; }
  if (el.dataset.trk) { const m = el.dataset.trk; S.filters[m] = S.filters[m] || {}; S.filters[m]._tracked = el.checked; render(); return; }
  if (el.dataset.user) {
    const [uid, k] = el.dataset.user.split(':'); const v = el.type === 'checkbox' ? el.checked : el.value;
    try { const j = await api('/users/' + uid, { method: 'PATCH', body: { [k]: v } }); const i = S.adminUsers.findIndex(u => u.id === uid); S.adminUsers[i] = { ...S.adminUsers[i], ...j.user }; toast(t('saved')); refreshUsers(); }
    catch (x) { toast(t('failed') + ': ' + x.message); loadUsers(); }
    return;
  }
  if (el.id === 'myrole' || el.id === 'myrole2') { try { const j = await api('/me', { method: 'PATCH', body: { team_role: el.value } }); S.me = j.user; toast(t('saved')); render(); } catch (x) { toast(t('failed')); } }
});
let qt; document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'q') { clearTimeout(qt); qt = setTimeout(() => { S.q[S.route] = el.value; S.limit[S.route] = 100; render(); }, 180); }
  if (el.id === 'f-assignee-q') pickerSearch(el.value);
});
document.addEventListener('focusin', e => { if (e.target.id === 'f-assignee-q' && can('editor')) pickerSearch(''); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (S.npanel) { S.npanel = false; renderNPanel(); } else if (S.open) closeDrawer(); } });
async function saveTargets() {
  const body = {}; KPI_DEF.forEach(([k]) => { const v = $('#tg-' + k).value; if (v !== '') body[k] = Number(v); });
  try { S.targets = (await api('/settings/targets', { method: 'PUT', body })).targets; toast(t('saved')); render(); } catch (e) { toast(t('failed') + ': ' + e.message); }
}
async function addUser() {
  const body = { username: $('#nu-username').value, email: $('#nu-email').value, name: $('#nu-name').value, role: $('#nu-role').value, team_role: $('#nu-team').value };
  try { const j = await api('/users', { method: 'POST', body }); S.adminUsers = null; await loadUsers(); refreshUsers(); showTempPassword(j.user, j.tempPassword); } catch (e) { toast(t('failed') + ': ' + e.message); }
}

/* ---------- boot ---------- */
(async () => {
  applyLang();
  try {
    const [sch, me, data] = await Promise.all([api('/schema'), api('/me'), api('/data')]);
    SCHEMA = sch; ENUM = sch.ENUM; AR = sch.AR; MOD = sch.MODULES; KPI_DEF = sch.KPI_DEF; DEF_TARGETS = sch.DEF_TARGETS;
    S.me = me.user; S.data = data.data; S.users = data.users; S.userMap = Object.fromEntries(data.users.map(u => [u.id, u])); S.targets = data.targets;
    S.loaded = true; route(); connectEvents(); loadNotifs();
  } catch (e) { if (e.message !== 'unauthenticated') $('#main').innerHTML = `<div class="notice warn">${t('loadErr')}</div>`; }
})();
