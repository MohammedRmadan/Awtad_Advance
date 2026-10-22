'use strict';
const path = require('path');
const express = require('express');
const session = require('express-session');
const PgStore = require('connect-pg-simple')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { config, assertConfig } = require('./config');
const { pool, migrate } = require('./db');
const { authRouter, loadUser, requireAuth, bootstrapAdmin } = require('./auth');
const api = require('./routes/api');
const { scheduleJobs } = require('./notify');

assertConfig();
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', /^\d+$/.test(config.trustProxy) ? Number(config.trustProxy) : config.trustProxy);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"], 'script-src': ["'self'"], 'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:'], 'font-src': ["'self'"], 'connect-src': ["'self'"], 'form-action': ["'self'"],
      'frame-ancestors': ["'none'"], 'upgrade-insecure-requests': config.baseUrl.startsWith('https') ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.get('/healthz', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true }); } catch (e) { res.status(503).json({ ok: false }); }
});

app.use(session({
  store: new PgStore({ pool, createTableIfMissing: true, pruneSessionInterval: 900 }),
  name: 'bdhub.sid', secret: config.sessionSecret, resave: false, saveUninitialized: false, rolling: true,
  cookie: { httpOnly: true, sameSite: 'lax', secure: config.baseUrl.startsWith('https'), maxAge: config.sessionHours * 3600 * 1000 }
}));
app.use(loadUser);

app.use('/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false }), authRouter());

// API: authentication, rate limiting and a same-origin check on every state-changing request.
app.use('/api', rateLimit({ windowMs: 5 * 60 * 1000, limit: 1500, standardHeaders: true, legacyHeaders: false }));
app.use('/api', requireAuth, (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'bdhub') return res.status(403).json({ error: 'Missing request header' });
  const origin = req.get('Origin');
  if (origin && origin !== config.baseUrl) return res.status(403).json({ error: 'Cross-origin request refused' });
  next();
});
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, api);

// Static assets are public; the application shell requires a signed-in user.
const pub = path.join(__dirname, '..', 'public');
app.use(express.static(pub, { index: false, maxAge: '1h', setHeaders: (res, p) => { if (p.endsWith('.js') || p.endsWith('.css')) res.set('Cache-Control', 'no-cache'); } }));
app.get(['/', '/index.html'], requireAuth, (req, res) => { res.set('Cache-Control', 'no-store'); res.sendFile(path.join(__dirname, '..', 'views', 'index.html')); });

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Internal error' : err.message, ...(err.extra || {}) });
});

(async () => {
  await migrate();
  await bootstrapAdmin();
  app.listen(config.port, config.host, () => console.log(`Awtad BD Hub listening on ${config.host}:${config.port} (mail: ${config.mailMode})`));
  scheduleJobs();
})().catch(e => { console.error('Startup failed:', e); process.exit(1); });
