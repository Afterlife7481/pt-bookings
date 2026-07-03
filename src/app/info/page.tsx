import type { Metadata } from "next";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { getTrainerIdFromRequest } from "@/lib/auth/api";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "How PT Bookings Works for UK Personal Trainers",
  description:
    "Learn how PT Bookings helps UK personal trainers set up weekly schedules, recurring clients, client portal links, last-minute offers, and session payments.",
  path: "/info",
  keywords: [
    "how personal trainer booking works UK",
    "PT scheduling guide",
    "personal trainer client portal UK",
    "recurring PT sessions UK",
  ],
});

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">
        {children}
      </div>
    </section>
  );
}

export default async function InfoPage() {
  const loggedIn = !!(await getTrainerIdFromRequest());

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-bold text-slate-900 hover:text-slate-700">
            PT Bookings
          </Link>
          {loggedIn ? (
            <Link href="/dashboard/schedule">
              <Button variant="secondary" className="text-xs sm:text-sm">
                Back to dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="secondary" className="text-xs sm:text-sm">
                Trainer sign in
              </Button>
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            How PT Bookings works
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Weekly scheduling for trainers: 30-minute grid, recurring clients,
            last-minute fill-ins, client portal, payments, WhatsApp logging.
          </p>
        </div>

        <Card className="space-y-6">
          <Section id="getting-started" title="Getting started (new trainers)">
            <p>
              Follow these steps in order the first time you set up your
              account. Each step builds on the one before it.
            </p>
            <ol className="list-decimal space-y-3 pl-5">
              <li>
                <strong className="text-slate-800">Set up your locations.</strong>{" "}
                In{" "}
                <Link href="/dashboard/settings" className="underline">
                  Settings → Locations
                </Link>
                , add every place you train (studio, gym, park, home visits).
                Every slot must have a location, so nothing else works until you
                have at least one.
              </li>
              <li>
                <strong className="text-slate-800">
                  Build your weekly template.
                </strong>{" "}
                In{" "}
                <Link
                  href="/dashboard/settings/templates"
                  className="underline"
                >
                  Settings → Edit weekly template
                </Link>
                , lay out the slots you offer in a typical week (each with a
                time and location, on 30-minute steps).{" "}
                <strong className="text-slate-800">
                  This is the backbone of the whole app.
                </strong>{" "}
                Recurring client slots, last-minute preferences, and the{" "}
                <em>Apply template</em> action that fills each week all derive
                from it — so a well-built template means the rest of your setup
                is mostly a few clicks.
              </li>
              <li>
                <strong className="text-slate-800">Add your first clients.</strong>{" "}
                In the{" "}
                <Link href="/dashboard/clients" className="underline">
                  Clients
                </Link>{" "}
                tab, add each client&apos;s name, phone, and session price.
              </li>
              <li>
                <strong className="text-slate-800">
                  Configure each client.
                </strong>{" "}
                Open a client&apos;s profile to:
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>Enable the locations they can train at.</li>
                  <li>
                    Set any recurring slots (these must match template slots at
                    enabled locations).
                  </li>
                  <li>
                    Add notes — shared notes appear on the client&apos;s portal
                    (e.g. training instructions); private notes are only ever
                    seen by you (e.g. injury reminders).
                  </li>
                </ul>
              </li>
              <li>
                <strong className="text-slate-800">
                  Apply the template to upcoming weeks.
                </strong>{" "}
                In the{" "}
                <Link href="/dashboard/schedule" className="underline">
                  Schedule
                </Link>
                , use <em>Apply template</em> to generate that week&apos;s slots
                and auto-book your recurring clients.
              </li>
              <li>
                <strong className="text-slate-800">
                  Share portal links and go live.
                </strong>{" "}
                Send each client their portal link so they can view, book, and
                change sessions within your booking window, and opt in to
                last-minute offers. Optionally add your payment details in
                Settings so you can send invoices.
              </li>
            </ol>
            <p className="text-slate-500">
              The sections below explain each area in more detail.
            </p>
          </Section>

          <Section id="basics" title="Basics">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Start and end times must both sit on 30-minute steps (09:00,
                09:30, 10:00…). Valid lengths: 30 min, 1 hr, 90 min, etc. — not
                45 min.
              </li>
              <li>
                Trainers sign in via magic link (
                <Link href="/login" className="underline">
                  /login
                </Link>
                ). Dashboard tabs: Schedule, Clients, Sessions, WhatsApp,
                Settings.
              </li>
              <li>Clients use a personal link — no password.</li>
              <li>
                WhatsApp is a stub: messages are saved in the WhatsApp tab and
                logged to the server console until you wire a provider.
              </li>
            </ul>
          </Section>

          <Section id="schedule" title="Schedule">
            <p>Day or week view on a 30-minute grid. Colours:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-slate-800">Blue</strong> recurring ·{" "}
                <strong className="text-slate-800">Dark</strong> booked/manual
                · <strong className="text-slate-800">Green</strong> open ·{" "}
                <strong className="text-slate-800">Amber</strong> open with
                last-minute matches ·{" "}
                <strong className="text-slate-800">Purple</strong> locked offer
              </li>
              <li>
                Click a booking → trainer session page (
                <code className="rounded bg-slate-100 px-1 text-xs">
                  /dashboard/sessions/…
                </code>
                ). Click an open slot → send offer, allocate, change location,
                or remove (remove is blocked while an offer is active).
              </li>
              <li>
                <strong className="text-slate-800">+ Add</strong> on an empty
                cell: cell time = start; pick end (30-min step) and location.
              </li>
              <li>
                <strong className="text-slate-800">Apply template</strong> when
                the week has no booked sessions — adds missing future template
                slots and books matching recurring clients.
              </li>
            </ul>
          </Section>

          <Section id="clients-tab" title="Clients tab">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Clients tab lists clients. Open a profile to edit price,
                allowed locations, portal link, recurring slots, upcoming
                sessions, and History (canceled/voided included).
              </li>
              <li>
                Recurring grid: match template slots. Enable the template
                location first. Amber = another client (read-only). Red notice =
                fix needed before saving.
              </li>
            </ul>
          </Section>

          <Section id="sessions" title="Sessions tab">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Upcoming and past lists. Status: Recurring, Manual, Changing,
                Past, or Voided. Payment: paid/unpaid + invoice sent/not sent.
                Canceled sessions are hidden — see client History.
              </li>
              <li>
                Trainer session page — upcoming: payment, invoice, WhatsApp
                confirmation, cancel, change on schedule. Past: payment,
                invoice, or void (past-only, keeps audit trail).
              </li>
              <li>
                Cancel frees the slot for rebooking. Void marks a past session
                as if it did not happen.
              </li>
            </ul>
          </Section>

          <Section id="client-portal" title="Client portal">
            <p>
              Home link{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">
                /c/token
              </code>
              ; session link{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">
                /s/token
              </code>
              . Clients can view sessions, book/change within your booking
              window (default: this week and next week), opt in to last-minute
              slots (green → blue, auto-saved), and cancel/change a session.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Book/change: open slots at enabled locations in allowed calendar
                weeks only (this week counts as one).
              </li>
              <li>
                Cancel/change blocked inside the deadline (default 36 h before
                session) — client must contact you.
              </li>
              <li>
                Cancel keeps the record and frees the slot. Void is trainer-only
                on past sessions.
              </li>
            </ul>
          </Section>

          <Section id="last-minute" title="Last-minute offers">
            <ol className="list-decimal space-y-1 pl-5">
              <li>Client opts in to template times on their portal.</li>
              <li>A slot is open: created manually/from template, or freed by cancel/change.</li>
              <li>You pick a matching client and send an offer (slot locks, default 1 h).</li>
              <li>Client opens the WhatsApp link and accepts on the web page.</li>
              <li>If they don&apos;t accept, offer someone else or allocate directly.</li>
            </ol>
            <p className="text-slate-500">
              Offers are never sent automatically.
            </p>
          </Section>

          <Section id="settings" title="Settings">
            <ul className="list-disc space-y-1 pl-5">
              <li>Time zone, schedule hours, default day/week view</li>
              <li>
                Client booking window: 1, 2, 3, or custom calendar weeks
                (default 2 = this week and next week)
              </li>
              <li>Cancel/change deadline (default 36 h), last-minute lock (default 1 h)</li>
              <li>
                <strong className="text-slate-800">Edit weekly template</strong>{" "}
                — + on a cell, set end time and location (30-min steps, e.g.
                09:00–10:00). Separate page; no same-day overlaps.
              </li>
              <li>Locations — required on slots; restrict per client</li>
              <li>
                Payment details — payee name, bank name, account, sort code for
                invoice WhatsApp messages
              </li>
            </ul>
          </Section>

          <Section id="payments" title="Payments">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Mark paid/unpaid and payment type on the trainer session page.
                Sessions tab shows payment and invoice status.
              </li>
              <li>
                Send/resend invoice via WhatsApp (client price + bank details).
                Requires client price and payment details; not on inactive
                sessions.
              </li>
            </ul>
          </Section>
        </Card>

        <div className="flex flex-wrap gap-3">
          {loggedIn ? (
            <Link href="/dashboard/schedule">
              <Button>Back to dashboard</Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button>Trainer sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
