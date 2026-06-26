# PT Bookings

Personal trainer booking app focused on the **change session** flow, recurring slot auto-holds, and last-minute waitlist.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- SQLite via Drizzle ORM (local dev; schema mirrors planned Postgres/Supabase model)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — trainer dashboard at `/dashboard`.

The database is auto-migrated and seeded on first request with sample clients, a weekly template, and bookings.

## Core flows

1. **Apply template** — Dashboard → Templates → "Apply for next 2 weeks" generates slots and auto-books recurring clients.
2. **Change session** — Client opens `/s/{token}` → Change session → picks new slot (atomic move).
3. **Last-minute** — When a slot opens, opted-in clients get a WhatsApp stub message → tap link → trainer assigns from Last-minute inbox.

## WhatsApp

Messages are logged to the database and printed to the server console. Wire Twilio or WhatsApp Cloud API in `src/lib/whatsapp.ts`.

## Scripts

- `npm run db:migrate` — apply schema
- `npm run db:seed` — seed sample data
