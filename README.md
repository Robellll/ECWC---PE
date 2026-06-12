# ECWC Plant & Equipment

Next.js App Router application with PostgreSQL (Neon), Auth.js login, and role-based access control.

## Quick start

```bash
npm install
npm run db:migrate   # first time: create tables + user accounts
npm run db:clear     # remove all operational data (keeps users)
npm run dev          # http://localhost:3000
```

Sign in with your ECWC user email. Initial accounts are created by `npm run db:migrate` (see `scripts/migrate.js`).

## Project structure

```
ECWC - PE/
├── app/                    # Next.js App Router (routes + API)
├── components/             # React UI (pages, drawers, layout, dashboards)
├── hooks/                  # Shared React hooks
├── lib/                    # Server utilities (auth, db, permissions, mappers)
├── public/                 # Static assets (logo, favicon)
├── schema/                 # PostgreSQL SQL migrations + seed data
├── scripts/                # DB migrate, verify, auth smoke tests
├── store/                  # Client UI state (theme only)
├── middleware.js           # Auth gate for all routes
├── next.config.mjs
└── package.json
```

### `app/` — routes and API

| Path | Purpose |
|------|---------|
| `app/layout.jsx` | Root HTML shell, global CSS, SessionProvider |
| `app/page.jsx` | `/` redirects to `/dashboard` |
| `app/login/` | Login page |
| `app/(app)/layout.jsx` | Authenticated shell (Sidebar + Header) |
| `app/(app)/dashboard/` | Dashboard page |
| `app/(app)/managers/` | Contact Log (Kanban) |
| `app/(app)/equipment/` | Equipment registry |
| `app/(app)/garage/` | Central Garage |
| `app/(app)/insurance/` | Insurance claims |
| `app/api/` | REST API route handlers (CRUD + auth) |

### `components/` — UI building blocks

| Folder | Purpose |
|--------|---------|
| `components/pages/` | Full page views + page CSS (imported by `app/(app)/*/page.jsx`) |
| `components/layout/` | Sidebar, Header, shared layout CSS |
| `components/dashboard/` | Executive & project dashboard widgets |
| `components/equipment/` | Equipment detail drawer |
| `components/garage/` | Vehicle detail drawer |
| `components/insurance/` | Insurance claim drawer |
| `components/kanban/` | Contact Log Kanban board |

### `lib/` — backend helpers

| File | Purpose |
|------|---------|
| `db.js` | Neon PostgreSQL client |
| `auth.js` | Auth.js config (credentials + JWT) |
| `auth.config.js` | Edge-safe auth config for middleware |
| `permissions.js` | Role → permission flags (RBAC) |
| `mappers.js` | DB rows → UI camelCase shapes |
| `api-helpers.js` | Session/permission guards for API routes |
| `api-client.js` | Browser `fetch` wrapper for API calls |
| `constants.js` | Stage labels (garage, insurance) |
| `stages.js` | Stage advancement logic |

### `schema/` — database

SQL files run in order by `npm run db:migrate`:

1. Extensions & enums  
2. Tables & indexes  
3. Seed data (projects, equipment, garage, insurance, contacts)  
4. Demo users (bcrypt hashed in `scripts/migrate.js`)

### `scripts/`

| Script | Command |
|--------|---------|
| `migrate.js` | `npm run db:migrate` |
| `verify.js` | `npm run db:verify` |
| `test-auth-api.js` | Login + API smoke test |

### `store/`

`useStore.js` — theme toggle only (light/dark, persisted in localStorage). All domain data lives in PostgreSQL via API.
