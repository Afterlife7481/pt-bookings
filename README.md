# PT Bookings

Personal trainer booking app focused on the **change session** flow, recurring slot auto-holds, and last-minute waitlist.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- SQLite via Drizzle ORM (local dev; schema is designed to migrate to Postgres/Supabase for production)

## Getting started

```bash
npm install
npm run db:reset   # wipe DB, migrate, seed Alex + 10 sample clients
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Trainer login:** magic link at `/login` (dev links print to the server console)
- **Trainer dashboard:** `/dashboard` → redirects to `/dashboard/schedule`
- **Client portal:** `/c/{clientToken}` (book sessions)
- **Session page:** `/s/{bookingToken}` (change or cancel)

### Environment variables

| Variable | Purpose |
|----------|---------|
| `APP_BASE_URL` | Public base URL for magic links and WhatsApp messages (read at runtime on the server; recommended on Railway) |
| `NEXT_PUBLIC_APP_URL` | Same URL for client-side code (must be set at build time if used in the browser) |
| `NODE_ENV` | `development` exposes magic-link URLs in API responses |
| `PT_BOOKINGS_DB_PATH` | Override SQLite file path (used by tests and e2e) |

## Dashboard routes

The trainer dashboard is split into route-based sections:

| Route | Purpose |
|-------|---------|
| `/dashboard/schedule` | Week calendar, open slots, last-minute holds |
| `/dashboard/clients` | Client list and detail |
| `/dashboard/sessions` | All bookings |
| `/dashboard/whatsapp` | Message log |
| `/dashboard/settings` | Trainer settings and locations |
| `/dashboard/settings/templates` | Weekly templates → apply for upcoming weeks |

## Core flows

1. **Apply template** — Settings → Templates → “Apply for next 2 weeks” generates slots and auto-books recurring clients.
2. **Change session** — Client opens `/s/{token}` → Change session → picks a new slot (atomic move inside a DB transaction).
3. **Last-minute** — When a slot opens, opted-in clients get a WhatsApp stub message → tap link → trainer assigns from the schedule calendar.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply schema migrations |
| `npm run db:seed` | Seed sample data (same as reset) |
| `npm run db:reset` | Wipe database and seed fresh sample data |
| `npm test` | Run integration tests (Vitest) |
| `npm run test:e2e` | Run Playwright smoke test (login → schedule → allocate) |

## Testing

**Unit / integration tests** (`npm test`) use Vitest with isolated temp SQLite databases. Coverage includes:

- Rate limiting
- Booking allocation and double-book prevention
- Session change atomicity
- Cancel deadlines
- Trainer session expiry

**End-to-end smoke test** (`npm run test:e2e`) seeds a dedicated database (`data/pt-bookings-e2e.db`), starts the app on port 3001, and walks through magic-link login → schedule → allocate via the UI.

First-time e2e setup:

```bash
npx playwright install chromium
```

## WhatsApp

Messages are logged to the database and printed to the server console. Wire Twilio or WhatsApp Cloud API in `src/lib/whatsapp.ts`.

## Security model

### Trainer authentication

- Magic-link login creates a server-side session row (`trainer_sessions`) stored in an HTTP-only cookie (`pt_session`).
- Middleware validates the session against `/api/auth/me` before serving dashboard pages or trainer API routes. Expired or invalid cookies are cleared.
- Magic-link requests are rate-limited (5 per IP / 15 min, 3 per email / 15 min).

### Client capability URLs

Client and booking links use **unguessable tokens** (`/c/{clientToken}`, `/s/{bookingToken}`). Anyone with the link can act as that client for that session. Treat links like passwords:

- Send only over private channels (WhatsApp, SMS, email).
- Always serve over HTTPS in production.
- Tokens do not expire by default; rotate by issuing new client records or booking tokens if a link is leaked.

Public client actions live on dedicated routes (not the trainer `/api/bookings` endpoint):

- `POST /api/client-book` — book a slot
- `POST /api/change` — start / confirm / abort session changes
- `POST /api/client/sessions/cancel` — cancel a session

These endpoints are rate-limited per IP (including `/api/opt-in` for last-minute preferences).

### Booking integrity

Slot allocation and session changes run inside SQLite transactions with conditional updates (`WHERE status = 'available'`) to prevent double-booking races.

### Production database

SQLite with WAL mode is fine for **single-node** local dev or a single-server deploy. For multiple app instances or higher concurrency, migrate to Postgres (Drizzle schema is compatible) and use a shared rate-limit store (Redis) instead of the in-memory limiter in `src/lib/rate-limit.ts`.

Database files live under `data/` (`pt-bookings.db` plus WAL/SHM sidecars). Back up this directory or use managed Postgres in production.
