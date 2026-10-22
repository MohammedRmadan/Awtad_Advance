'use strict';
// Password hashing with scrypt (Node built-in, no native modules).
const crypto = require('crypto');
const { config } = require('./config');

const N = 16384, R = 8, P = 1, KEYLEN = 64;

function scrypt(password, salt, n, r, p, keylen) {
  return new Promise((resolve, reject) => crypto.scrypt(password, salt, keylen, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? reject(e) : resolve(k))));
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(String(password).normalize('NFKC'), salt, N, R, P, KEYLEN);
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

const DUMMY = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(64).toString('base64');

// Constant-time verification; pass null hash for unknown users so timing stays the same.
async function verifyPassword(password, stored) {
  const parts = String(stored || DUMMY).split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(String(password).normalize('NFKC'), Buffer.from(saltB64, 'base64'), Number(n), Number(r), Number(p), expected.length);
  return !!stored && crypto.timingSafeEqual(key, expected);
}

// Returns an error message (Arabic) or null when the password is acceptable.
function passwordProblem(pw, username) {
  pw = String(pw || '');
  if (pw.length < config.passwordMinLength) return `كلمة المرور يجب ألا تقل عن ${config.passwordMinLength} أحرف`;
  if (pw.length > 200) return 'كلمة المرور طويلة جدًا';
  if (!/[A-Za-z؀-ۿ]/.test(pw) || !/\d/.test(pw)) return 'كلمة المرور يجب أن تحتوي على حروف وأرقام';
  if (username && pw.toLowerCase().includes(String(username).toLowerCase())) return 'كلمة المرور يجب ألا تحتوي على اسم المستخدم';
  return null;
}

// Readable temporary password: 4 groups, no ambiguous characters, always passes the policy.
function tempPassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ', digits = '23456789';
  const pick = s => s[crypto.randomInt(s.length)];
  const grp = () => pick(letters) + pick(letters) + pick(digits) + pick(letters);
  return [grp(), grp(), grp()].join('-');
}

const USERNAME_RE = /^[a-z0-9][a-z0-9._@-]{2,63}$/;

module.exports = { hashPassword, verifyPassword, passwordProblem, tempPassword, USERNAME_RE };
