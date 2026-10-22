'use strict';
// Creates an administrator or resets an existing user's password, and prints a one-time temporary password.
// Use it for the first sign-in or if every administrator is locked out.
//   node scripts/admin-password.js            -> account "admin"
//   node scripts/admin-password.js fadi       -> account "fadi" (created as administrator if missing)
const { pool, migrate } = require('../src/db');
const { hashPassword, tempPassword, USERNAME_RE } = require('../src/passwords');

(async () => {
  await migrate();
  const username = String(process.argv[2] || 'admin').trim().toLowerCase();
  if (!USERNAME_RE.test(username)) throw new Error('Invalid username');
  const temp = tempPassword();
  const hash = await hashPassword(temp);
  const { rows } = await pool.query(`INSERT INTO users (username,name,role,password_hash,must_change_password,active) VALUES ($1,$2,'admin',$3,true,true)
    ON CONFLICT (username) DO UPDATE SET password_hash=EXCLUDED.password_hash, must_change_password=true, active=true, failed_attempts=0, locked_until=NULL
    RETURNING username, role, (xmax = 0) AS created`, [username, 'مدير النظام', hash]);
  await pool.query(`DELETE FROM session WHERE sess->>'uid' IN (SELECT id::text FROM users WHERE username=$1)`, [username]).catch(() => {});
  const u = rows[0];
  console.log('');
  console.log(`  ${u.created ? 'Created administrator' : 'Password reset for'}: ${u.username}  (role: ${u.role})`);
  console.log(`  Temporary password:   ${temp}`);
  console.log('  It must be changed at the first sign-in.');
  console.log('');
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
