'use strict';
const path = require('path');

const env = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' ? process.env[k] : d);

const config = {
  nodeEnv: env('NODE_ENV', 'development'),
  port: Number(env('PORT', 8080)),
  host: env('HOST', '0.0.0.0'),
  baseUrl: env('BASE_URL', 'http://localhost:8080').replace(/\/$/, ''),
  trustProxy: env('TRUST_PROXY', '1'),
  databaseUrl: env('DATABASE_URL', 'postgres://bdhub:bdhub@localhost:5432/bdhub'),
  sessionSecret: env('SESSION_SECRET', ''),
  sessionHours: Number(env('SESSION_HOURS', 10)),

  // Username / password sign-in
  loginMaxAttempts: Number(env('LOGIN_MAX_ATTEMPTS', 5)),
  loginLockMinutes: Number(env('LOGIN_LOCK_MINUTES', 15)),
  passwordMinLength: Number(env('PASSWORD_MIN_LENGTH', 10)),
  // Created on first start when the database has no administrator yet (must be changed at first sign-in)
  initialAdminUsername: env('INITIAL_ADMIN_USERNAME', 'admin').toLowerCase(),
  initialAdminPassword: env('INITIAL_ADMIN_PASSWORD', ''),

  mailMode: env('MAIL_MODE', 'none'), // none | smtp
  mailFrom: env('MAIL_FROM', ''),
  smtp: {
    host: env('SMTP_HOST', ''), port: Number(env('SMTP_PORT', 587)), secure: env('SMTP_SECURE', 'false') === 'true',
    user: env('SMTP_USER', ''), pass: env('SMTP_PASS', '')
  },
  digestCron: env('DIGEST_CRON', '0 7 * * 0-4'), // 07:00 Sun–Thu
  weeklyCron: env('WEEKLY_CRON', '30 7 * * 0'),  // 07:30 Sunday management summary
  timezone: env('TZ', 'Asia/Riyadh'),

  uploadDir: path.resolve(env('UPLOAD_DIR', path.join(__dirname, '..', 'data', 'uploads'))),
  maxUploadMb: Number(env('MAX_UPLOAD_MB', 25))
};

function assertConfig() {
  const errs = [];
  if (!config.sessionSecret || config.sessionSecret.length < 32) errs.push('SESSION_SECRET must be at least 32 characters');
  if (!['none', 'smtp'].includes(config.mailMode)) errs.push('MAIL_MODE must be none or smtp');
  if (config.mailMode === 'smtp' && !config.smtp.host) errs.push('SMTP_HOST is required for MAIL_MODE=smtp');
  if (config.initialAdminPassword && config.initialAdminPassword.length < config.passwordMinLength) errs.push(`INITIAL_ADMIN_PASSWORD must be at least ${config.passwordMinLength} characters`);
  if (errs.length) { console.error('Configuration errors:\n - ' + errs.join('\n - ')); process.exit(1); }
}

module.exports = { config, assertConfig };
