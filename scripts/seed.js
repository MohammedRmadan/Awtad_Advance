'use strict';
// Loads the initial data set (from Awtad_Business_Development_Master.xlsx) into an empty database.
// Usage: node scripts/seed.js [--force]   (--force replaces records with the same id)
const fs = require('fs');
const path = require('path');
const { pool, migrate } = require('../src/db');
const { MODULES, col, dataFields } = require('../src/schema');

const PREFIX = Object.fromEntries(Object.entries(MODULES).map(([m, M]) => [M.prefix, m]));
(async () => {
  await migrate();
  const force = process.argv.includes('--force');
  const dir = path.join(__dirname, '..', 'seed');
  const counts = {};
  for (const file of fs.readdirSync(dir).filter(f => /^[a-z]{3}-\d+\.json$/.test(f)).sort()) {
    const id = file.replace('.json', '');
    const mod = PREFIX[id.slice(0, 3)];
    if (!mod) continue;
    const src = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const fields = dataFields(mod).filter(f => f.type !== 'user');
    const cols = ['id', ...fields.map(f => col(f.k))];
    const vals = [id, ...fields.map(f => {
      const v = src[f.k];
      if (v === '' || v === undefined) return f.type === 'bool' ? false : null;
      return v;
    })];
    const ph = vals.map((_, i) => '$' + (i + 1)).join(',');
    const conflict = force ? `ON CONFLICT (id) DO UPDATE SET ${cols.slice(1).map(c => `${c}=EXCLUDED.${c}`).join(',')}, deleted_at=NULL` : 'ON CONFLICT (id) DO NOTHING';
    const r = await pool.query(`INSERT INTO ${MODULES[mod].table} (${cols.join(',')}) VALUES (${ph}) ${conflict}`, vals);
    counts[mod] = (counts[mod] || 0) + r.rowCount;
  }
  const t = JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8')).targets;
  await pool.query(`INSERT INTO settings (key,value) VALUES ('targets',$1) ON CONFLICT (key) DO NOTHING`, [JSON.stringify(t)]);
  console.log('Seeded:', counts);
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
