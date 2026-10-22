'use strict';
const nodemailer = require('nodemailer');
const { config } = require('./config');

let transport = null;

// Sends one HTML email over SMTP. Returns false when mail is disabled or the user has no address.
async function sendMail({ to, subject, html }) {
  if (config.mailMode !== 'smtp' || !to) return false;
  if (!transport) transport = nodemailer.createTransport({
    host: config.smtp.host, port: config.smtp.port, secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined
  });
  await transport.sendMail({ from: config.mailFrom || config.smtp.user, to, subject, html });
  return true;
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function emailLayout(title, inner) {
  return `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#F5F4F9;font-family:Tajawal,Tahoma,Arial,sans-serif;color:#1D1B33">
  <div style="max-width:640px;margin:0 auto;padding:24px">
  <div style="background:#fff;border:1px solid #E4E1EE;border-radius:10px;padding:20px">
  <div style="font-size:12px;color:#684A96;font-weight:bold">أوتاد أدفانس · منصة تطوير الأعمال</div>
  <h1 style="font-size:18px;margin:6px 0 14px">${esc(title)}</h1>${inner}
  <p style="margin-top:18px"><a href="${esc(config.baseUrl)}" style="background:#684A96;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none">فتح المنصة</a></p>
  </div><p style="font-size:11px;color:#6E6A85;text-align:center">رسالة آلية من منصة تطوير الأعمال</p></div></body></html>`;
}

module.exports = { sendMail, emailLayout, esc };
