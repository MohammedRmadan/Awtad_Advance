# Awtad BD Hub

Business-development operations platform for **Awtad Advance**. It covers Saudi client prequalification, OEM partnerships, certifications, the corporate document vault, the 90/180/365 roadmap, the action plan and the service portfolio benchmarked against ICS Arabia. It includes a live management dashboard.

- Arabic-first RTL UI with English toggle, Tajawal font (self-hosted)
- Username / password sign-in managed by administrators (scrypt hashing, lockout, forced change of temporary passwords), roles admin / manager / editor / viewer
- PostgreSQL, schema-driven tables (`src/schema.js` is the single source of truth for fields, enums and labels)
- Optimistic locking, full audit log, soft delete, attachments, server-sent live updates
- In-app notifications, daily email digests and a weekly management summary (optional, SMTP)
- Excel export of every module; CSV export per list
- Docker Compose deployment on a Linux VPS with Caddy (automatic HTTPS) and nightly backups, built for in-Kingdom hosting

**Install on a Linux VPS (Ubuntu 22.04/24.04):** `sudo bash deploy/linux/install.sh`, step by step in [`docs/INSTALL-LINUX-AR.md`](docs/INSTALL-LINUX-AR.md). Day-to-day: `bdhub status | logs | update | backup | restore | reset-admin`. Reference guide: [`docs/INSTALL-AR.md`](docs/INSTALL-AR.md). Laptop trial (Docker Desktop): `start-trial.bat` / `start-trial.sh` and [`docs/TRIAL-AR.md`](docs/TRIAL-AR.md), sign in `admin` / `Trial-Admin-2026`.

## Layout
```
src/            server (Express): auth, API, records, notifications, mail, SSE
public/         browser app (app.js, app.css), fonts, logo
views/          authenticated app shell
scripts/        migrate, seed, run-digest, backup, admin-password (reset / create an administrator)
seed/           initial data (from Awtad_Business_Development_Master.xlsx)
deploy/linux/   install.sh (one-time installer), bdhub.sh (management command)
deploy/caddy/   Caddyfile (reverse proxy + automatic HTTPS)
```

## API (all under /api, session cookie; writes need header `X-Requested-With: bdhub`)
| Method | Path | Role |
|---|---|---|
| GET | /me, /schema, /data, /events, /notifications, /users/search, /r/:mod/:id, /files/:id, /export.xlsx | viewer |
| POST/PATCH | /r/:mod, /r/:mod/:id (`{version, changes}` → 409 on conflict), /r/:mod/:id/files | editor |
| DELETE | /r/:mod/:id | manager |
| PUT/GET | /settings/targets, /activity | manager |
| GET/POST/PATCH | /users, /users/:id/reset-password | admin |

Sign-in pages (form posts with CSRF token): `/auth/login`, `/auth/change-password`, `/auth/logout`.

Modules: `entities, oems, certs, docs, actions, roadmap, services`.
