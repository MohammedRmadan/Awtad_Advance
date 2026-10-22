'use strict';
// Manual run: node scripts/run-digest.js [--weekly] [--no-email]
const { runDailyDigest, runWeeklySummary } = require('../src/notify');
const { pool } = require('../src/db');
(async () => {
  console.log('daily', await runDailyDigest({ sendEmail: !process.argv.includes('--no-email') }));
  if (process.argv.includes('--weekly')) console.log('weekly', await runWeeklySummary());
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
