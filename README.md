# Plooy

Independent cinema streaming platform — web app, PWA, Smart TV, admin CMS.

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind, i18next (TR/EN)
- **Backend:** Node.js, Express, SQLite
- **Deploy:** Single VPS, Docker, nginx

## Local development

```bash
npm install
npm install --prefix server
npm run dev
```

Client: `http://localhost:5173` · API: `http://localhost:3001`

## Before push / deploy

```bash
npm run check:deploy
```

Runs server boot smoke test + frontend build + route integrity check.

## Production (VPS)

| Item | Value |
|------|--------|
| Install path | `/opt/sineoda` |
| Database | `persistent/data/sineoda.db` |
| Rebuild | `bash deploy/rebuild-vps.sh` |
| Emergency | `bash deploy/recover-vps.sh` |

Full guide: [deploy/PRODUCTION-VPS.txt](deploy/PRODUCTION-VPS.txt) · Ops cheatsheet: [deploy/OPS.txt](deploy/OPS.txt)

## Project layout

```
src/
  routes/       Route registry + split route modules
  pages/        Route screens (public, admin, creator)
  components/   Shared UI
  i18n/         Locale routing + translations
  locales/      TR/EN JSON bundles
server/
  src/routes/   REST API
  src/services/ Business logic
deploy/         VPS scripts, nginx, backups
```

## Docs

- [config/AYARLAR.txt](config/AYARLAR.txt) — environment variables
- [deploy/tv/README.md](deploy/tv/README.md) — Smart TV + Play Store TWA prep
- [deploy/archive/](deploy/archive/) — deprecated Render/Vercel/cPanel configs
