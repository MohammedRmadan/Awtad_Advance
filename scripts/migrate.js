'use strict';
const { migrate, pool } = require('../src/db');
migrate().then(() => { console.log('Migration complete'); return pool.end(); }).catch(e => { console.error(e); process.exit(1); });
