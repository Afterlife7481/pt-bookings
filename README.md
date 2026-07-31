# PT Bookings

Personal trainer booking app focused on the **change session** flow, recurring slot auto-holds, and last-minute waitlist.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Postgres via Drizzle ORM (`pg`)
- Vitest (unit/integration) + Playwright (e2e)

## Getting started

1. Create a local Postgres database (and a separate one for tests).
2. Copy env defaults and fill in connection strings:

```bash
cp .env.example .env.local
# Set DATABASE_URL and TEST_DATABASE_URL
npm install
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Trainer login:** email OTP at `/login` (via Resend; in local tier without `RESEND_API_KEY`, the code is printed to the server console and may appear in the UI)
- **Trainer dashboard:** `/dashboard` → redirects to `/dashboard/schedule`
- **Client portal:** `/c/{clientToken}` (book sessions)
- **Session page:** `/s/{bookingToken}` (change or cancel)

Invite-only signup: create codes with `npm run invite:create`.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `APP_ENV` | Deployment tier: `local` \| `staging` \| `production`. Controls OTP/debug exposure and staging rate-limit bypass. Inferred from `next dev` when unset. |
| `DATABASE_URL` | Postgres connection string for the app |
| `TEST_DATABASE_URL` | Isolated Postgres DB for `npm test` / e2e — **never** point this at your dev database |
| `DATABASE_SSL_INSECURE` | Set to `1` only if remote DB TLS fails because the provider CA is missing (prefer installing the CA) |
| `APP_BASE_URL` | Public base URL for generated links. Falls back to the Railway/Vercel domain when unset |
| `RESEND_API_KEY` | Resend API key for email. **Required in production.** Without it, OTP codes print to the server console (local only) |
| `EMAIL_FROM` | Verified sender (e.g. `PT Bookings <noreply@yourdomain.com>`) |
| `AUTH_OTP_PEPPER` | Optional pepper for hashing trainer OTP codes (defaults from `DATABASE_URL`) |
| `EXPOSE_DEV_MAGIC_LINKS` | Local tier only: set to `0` to hide OTP codes in the UI |
| `MAGIC_LINK_DEBUG_EMAILS` | Staging only: comma-separated emails allowed to see OTP codes on screen |

Server processes should run with `TZ=UTC` (already set in `npm run dev` / `start` / `test`).

## Dashboard routes

| Route | Purpose |
|-------|---------|
| `/dashboard/schedule` | Week calendar, open slots, last-minute holds |
| `/dashboard/clients` | Client list and detail |
| `/dashboard/sessions` | All bookings |
| `/dashboard/feed` | Message log, template clash alerts |
| `/dashboard/settings` | Trainer settings and locations |
| `/dashboard/settings/templates` | Weekly templates → apply for upcoming weeks |

## Core flows

1. **Apply template** — Settings → Templates → “Apply for next 2 weeks” generates slots and auto-books recurring clients.
2. **Change session** — Client opens `/s/{token}` → Change session → picks a new slot (atomic move inside a DB transaction).
3. **Last-minute** — When a slot opens, opted-in clients get a WhatsApp stub message → tap link → trainer assigns from the schedule calendar.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start dev server (`TZ=UTC`) |
| `npm run build` | Production build |
| `npm start` | Production server (`TZ=UTC`) |
| `npm run db:migrate` | Apply schema migrations (uses `.env.local`) |
| `npm run db:migrate:deploy` | Apply migrations (uses process env — for deploy) |
| `npm run db:generate` | Generate a new Drizzle migration from schema changes |
| `npm run invite:create` | Create invite codes |
| `npm test` | Vitest unit/integration tests |
| `npm run test:e2e` | Playwright e2e (seeds `TEST_DATABASE_URL`, app on port 3001) |
| `npm run lint` | ESLint via `next lint` |

## Testing

**Unit / integration** (`npm test`) use Vitest against `TEST_DATABASE_URL`. Each test file wipes and re-seeds that database. Coverage includes rate limiting, booking races, session changes, cancel deadlines, auth OTP, and ownership checks.

**End-to-end** (`npm run test:e2e`) seeds the test database, starts the app on port 3001 with `E2E_TEST=1`, and exercises OTP login → schedule allocate, client book API, and feed confirmation.

First-time e2e setup:

```bash
npx playwright install chromium
```

**CI** (GitHub Actions) runs lint, Vitest, and Playwright on every push/PR to `main` / `master` / `develop`, with a Postgres 16 service container.

## Invoices (email & WhatsApp)

**Send invoice** opens a channel picker (email or WhatsApp — not both):

- **Email** — default when available (sent via Resend; needs `RESEND_API_KEY`)
- **WhatsApp** — used when email is missing, or when both contacts exist and the
  client profile prefers WhatsApp; opens `wa.me` so the trainer sends from their
  own number
- If neither contact is available, the trainer is prompted to add email and phone
  on the client profile

Each send is logged to the Feed (Email or WhatsApp badge). Client phones
should include a country code (e.g. `+447…`); UK `07…` mobiles are normalised
automatically.

Other WhatsApp drafts (confirmations, last-minute offers) still use click-to-chat
the same way. Fully automatic WhatsApp (Twilio / Cloud API) is not wired.

## Security model

### Trainer authentication

- Email OTP creates a server-side session row (`trainer_sessions`) stored in an HTTP-only `Secure` cookie (`pt_session`) outside local.
- Codes are delivered by email (Resend). Production never returns codes in API responses; the local tier may surface them for development.
- Middleware validates the session before serving dashboard pages or trainer API routes. Expired or invalid cookies are cleared.
- OTP request/verify are rate-limited per IP and email (shared across instances via Postgres).

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

Slot allocation and session changes run inside Postgres transactions with conditional updates (`WHERE status = 'available'`) and a partial unique index on active bookings per slot to prevent double-booking races.

### Database

Use managed Postgres in all environments (local, staging, production). Keep an isolated `TEST_DATABASE_URL` for automated tests so they never wipe developer data. Rate limiting and booking invariants are enforced in Postgres so multiple app instances can share one database safely.
