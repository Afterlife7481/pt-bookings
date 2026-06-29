import type { Metadata } from "next";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { getTrainerIdFromRequest } from "@/lib/auth/api";

export const metadata: Metadata = {
  title: "How it works · PT Bookings",
  description:
    "Guide to PT Bookings — scheduling, client portal, last-minute offers, and WhatsApp messaging.",
};

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
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
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

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            How PT Bookings works
          </h1>
          <p className="mt-2 text-slate-600">
            A scheduling app for personal trainers: a 30-minute calendar for
            bookings and last-minute offers, flexible session lengths, recurring
            clients, session changes, and a simple client portal with WhatsApp
            message logging.
          </p>
        </div>

        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            On this page
          </p>
          <nav className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <a href="#overview" className="text-slate-700 hover:text-slate-900">
              Overview
            </a>
            <a href="#trainers" className="text-slate-700 hover:text-slate-900">
              Trainer dashboard
            </a>
            <a href="#clients" className="text-slate-700 hover:text-slate-900">
              Client portal
            </a>
            <a href="#last-minute" className="text-slate-700 hover:text-slate-900">
              Last-minute offers
            </a>
            <a href="#whatsapp" className="text-slate-700 hover:text-slate-900">
              WhatsApp
            </a>
            <a href="#settings" className="text-slate-700 hover:text-slate-900">
              Settings
            </a>
            <a href="#payments" className="text-slate-700 hover:text-slate-900">
              Payments
            </a>
          </nav>
        </Card>

        <Card className="space-y-8">
          <Section id="overview" title="Overview">
            <p>
              PT Bookings helps you run a weekly session calendar, keep recurring
              clients on their usual slots, and fill gaps when someone cancels or
              moves a session — all from a single schedule view. Sessions can be
              any length in 30-minute steps (for example 45 minutes, 1 hour, or
              90 minutes).
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="font-medium text-slate-800">Trainers</strong>{" "}
                sign in with a magic link. The dashboard has five tabs: Schedule,
                Clients, Sessions, WhatsApp, and Settings.
              </li>
              <li>
                <strong className="font-medium text-slate-800">Clients</strong>{" "}
                use a personal link — no account or password required.
              </li>
              <li>
                WhatsApp messages are logged in the app with timestamps (and
                printed to the server console) so you can see what would be sent
                before wiring a real provider.
              </li>
            </ul>
          </Section>

          <Section id="trainers" title="Trainer dashboard">
            <p>
              After signing in at{" "}
              <Link href="/login" className="font-medium text-slate-800 underline">
                /login
              </Link>
              , open the dashboard. Use the header link{" "}
              <strong className="font-medium text-slate-800">How it works</strong>{" "}
              to return to this guide anytime.
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-slate-800">Schedule</h3>
                <p className="mt-1">
                  Your main workspace — a calendar in{" "}
                  <strong className="font-medium text-slate-800">day</strong> or{" "}
                  <strong className="font-medium text-slate-800">week</strong>{" "}
                  view (default set in Settings). Both views use a{" "}
                  <strong className="font-medium text-slate-800">
                    30-minute grid
                  </strong>
                  : longer slots span multiple rows so you can see duration at a
                  glance. Navigate between weeks, add slots, apply a weekly
                  template, and manage every session.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    In <strong className="font-medium text-slate-800">week</strong>{" "}
                    view, day columns show the date on the first row (e.g.{" "}
                    <strong className="font-medium text-slate-800">Jun 24</strong>
                    ) and the day initial below (
                    <strong className="font-medium text-slate-800">M</strong>,{" "}
                    <strong className="font-medium text-slate-800">T</strong>, …).
                  </li>
                  <li>
                    <strong className="font-medium text-slate-800">Booked</strong>{" "}
                    cells show the client name and location. Click a booking to
                    open the{" "}
                    <strong className="font-medium text-slate-800">
                      trainer session page
                    </strong>{" "}
                    (not the client link). Recurring sessions appear in{" "}
                    <strong className="font-medium text-slate-800">blue</strong>;
                    one-off bookings are{" "}
                    <strong className="font-medium text-slate-800">dark grey</strong>.
                  </li>
                  <li>
                    <strong className="font-medium text-slate-800">Open</strong>{" "}
                    cells are green and show the training location. If clients
                    have matching last-minute preferences, the cell turns{" "}
                    <strong className="font-medium text-slate-800">amber</strong>{" "}
                    and shows how many matches there are.
                  </li>
                  <li>
                    When you send a last-minute offer, the slot is{" "}
                    <strong className="font-medium text-slate-800">locked</strong>{" "}
                    for that client and appears{" "}
                    <strong className="font-medium text-slate-800">purple</strong>{" "}
                    until the hold expires or they accept.
                  </li>
                  <li>
                    Tap or click an open slot to send last-minute offers, allocate
                    a client directly, or change the location. Close the modal
                    with the{" "}
                    <strong className="font-medium text-slate-800">×</strong>{" "}
                    in the top-right corner. You cannot remove a slot while a
                    last-minute offer is active — wait for the hold to expire or
                    for the client to respond.
                  </li>
                  <li>
                    Tap or click{" "}
                    <strong className="font-medium text-slate-800">+ Add</strong>{" "}
                    on any empty cell to create a slot. Choose start time, end
                    time (30-minute steps only), and location. You can add slots
                    in past weeks as well as future ones — the schedule is fully
                    under your control.
                  </li>
                  <li>
                    Use{" "}
                    <strong className="font-medium text-slate-800">
                      Apply template
                    </strong>{" "}
                    on a week with no bookings to populate open slots from your
                    saved weekly pattern (templates are managed in Settings).
                  </li>
                </ul>
                <p className="mt-2 text-slate-500">
                  A colour legend and short usage hint appear below the calendar.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-slate-800">Clients</h3>
                <p className="mt-1">
                  Table of all clients with contact details, session price, and
                  last-minute opt-in status. Open a client to edit their profile,
                  set recurring weekly slots (location must match your template —
                  enable that location for the client first), choose allowed
                  locations, copy their portal link, and view upcoming bookings
                  and{" "}
                  <strong className="font-medium text-slate-800">History</strong>{" "}
                  (past sessions, including{" "}
                  <strong className="font-medium text-slate-800">canceled</strong>{" "}
                  and{" "}
                  <strong className="font-medium text-slate-800">voided</strong>{" "}
                  — useful if you want to see how often a client canceled). Use{" "}
                  <strong className="font-medium text-slate-800">Session</strong>{" "}
                  to open the trainer session page;{" "}
                  <strong className="font-medium text-slate-800">Client link</strong>{" "}
                  opens the shareable client URL.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    On the recurring grid,{" "}
                    <strong className="font-medium text-slate-800">amber</strong>{" "}
                    cells are assigned to another client — click to view who
                    (read-only; close with{" "}
                    <strong className="font-medium text-slate-800">×</strong>).
                    Available template slots can be saved for this client from
                    the modal.
                  </li>
                  <li>
                    If a location is not enabled for the client, or there is no
                    template slot at that time, the modal shows a{" "}
                    <strong className="font-medium text-slate-800">red</strong>{" "}
                    notice explaining what to fix (for example, enable the
                    template location for this client).
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-slate-800">Sessions</h3>
                <p className="mt-1">
                  Two lists —{" "}
                  <strong className="font-medium text-slate-800">
                    Upcoming sessions
                  </strong>{" "}
                  and{" "}
                  <strong className="font-medium text-slate-800">
                    Past sessions
                  </strong>{" "}
                  (up to 100 shown in total). Columns:{" "}
                  <strong className="font-medium text-slate-800">Client</strong>{" "}
                  (name with a{" "}
                  <strong className="font-medium text-slate-800">Session</strong>{" "}
                  link underneath to open the trainer session page),{" "}
                  <strong className="font-medium text-slate-800">When</strong>{" "}
                  (date and time on two lines),{" "}
                  <strong className="font-medium text-slate-800">Status</strong>{" "}
                  —{" "}
                  <strong className="font-medium text-slate-800">
                    Recurring
                  </strong>{" "}
                  (from template apply or recurring preference) or{" "}
                  <strong className="font-medium text-slate-800">Manual</strong>{" "}
                  (direct allocation, last-minute accept, or client self-book),{" "}
                  <strong className="font-medium text-slate-800">
                    Changing
                  </strong>{" "}
                  while a client reschedules,{" "}
                  <strong className="font-medium text-slate-800">Past</strong>{" "}
                  plus booking type for completed sessions, or{" "}
                  <strong className="font-medium text-slate-800">Voided</strong>.
                  One badge per line. And{" "}
                  <strong className="font-medium text-slate-800">Payment</strong>{" "}
                  (paid/unpaid and invoice sent/not sent, stacked one badge per
                  line).{" "}
                  <strong className="font-medium text-slate-800">
                    Canceled
                  </strong>{" "}
                  sessions are hidden here; see the client profile{" "}
                  <strong className="font-medium text-slate-800">History</strong>{" "}
                  section for those.
                </p>
                <p className="mt-2">
                  The trainer session page (
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                    /dashboard/sessions/…
                  </code>
                  ) is for you only. It is separate from the client session link (
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                    /s/…
                  </code>
                  ).
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    <strong className="font-medium text-slate-800">
                      Upcoming sessions
                    </strong>{" "}
                    — Mark payment status, set payment type, send WhatsApp
                    confirmation, send an invoice, cancel the session, or copy
                    the client link. Use{" "}
                    <strong className="font-medium text-slate-800">
                      Change on schedule
                    </strong>{" "}
                    to move the booking via the calendar.
                  </li>
                  <li>
                    <strong className="font-medium text-slate-800">
                      Past sessions
                    </strong>{" "}
                    — Change, confirmation, and cancel are disabled (the session
                    already happened). You can still record payment, send or
                    resend an invoice, or{" "}
                    <strong className="font-medium text-slate-800">
                      Void session
                    </strong>{" "}
                    if the booking should not count (e.g. booked in error).
                    Voiding is past-only and cannot be undone.
                  </li>
                  <li>
                    <strong className="font-medium text-slate-800">
                      Cancel vs void
                    </strong>{" "}
                    — Cancel is for upcoming sessions: the slot is freed for
                    rebooking. Void is for past sessions only: the record stays
                    for your audit trail but is marked as if it did not take
                    place. Neither action hard-deletes the booking row.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-slate-800">WhatsApp</h3>
                <p className="mt-1">
                  Feed of every message the app would send — newest first, each
                  with a timestamp, readable message type, recipient phone
                  number, and full body text.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-slate-800">Settings</h3>
                <p className="mt-1">
                  App preferences, payment details, training locations, and a
                  link to manage weekly templates. See Settings and Payments
                  below for details.
                </p>
              </div>
            </div>
          </Section>

          <Section id="clients" title="Client portal">
            <p>
              Each client gets a unique link (e.g.{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                /c/their-token
              </code>
              ). From there they can:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>See upcoming sessions and session history</li>
              <li>
                Book a new session from open slots within your configured booking
                window (see Settings)
              </li>
              <li>
                Opt in to last-minute openings — green slots turn blue when
                selected (saved automatically)
              </li>
              <li>
                Open a session page to view details, cancel, or change the time
              </li>
            </ul>

            <div className="mt-2">
              <h3 className="font-medium text-slate-800">Booking a session</h3>
              <p className="mt-1">
                From their portal, clients can book any open slot at an enabled
                location that falls within your{" "}
                <strong className="font-medium text-slate-800">
                  client booking window
                </strong>{" "}
                (default 2 weeks; configurable in Settings as 1, 2, 3, or a
                custom number of weeks). Slots outside that range are not
                shown.
              </p>
            </div>

            <div className="mt-2">
              <h3 className="font-medium text-slate-800">Last-minute opt-in</h3>
              <p className="mt-1">
                Clients choose which template session times they would accept if
                something opens up. The grid matches the trainer schedule — a
                compact 30-minute week view. Only template slots at locations
                enabled for that client are shown.{" "}
                <strong className="font-medium text-slate-800">Green</strong>{" "}
                slots are available to opt in; tap one to opt in and it turns{" "}
                <strong className="font-medium text-slate-800">blue</strong>.
                Choices save automatically. If no locations are enabled or no
                matching template slots exist, the client cannot opt in yet.
              </p>
            </div>

            <div className="mt-2">
              <h3 className="font-medium text-slate-800">Changing a session</h3>
              <p className="mt-1">
                From a session page, the client can start a change flow and pick a
                new open slot within the same booking window as self-booking.
                Changes are blocked inside the cancellation deadline
                (configurable in Settings, default 36 hours before the session).
                To change within that window, the client must contact you
                directly.
              </p>
            </div>

            <div className="mt-2">
              <h3 className="font-medium text-slate-800">Cancelling</h3>
              <p className="mt-1">
                Clients can cancel outside the deadline (see Settings). Inside
                that window they must contact you — there is no trainer override.
                When a session is canceled the booking is kept (soft delete):
                status becomes canceled, the original date/time is preserved, and
                the slot is freed on your Schedule for last-minute offers or
                direct allocation. Canceled sessions appear in the client&apos;s
                portal history and on the client profile History section, but not
                on the main Sessions tab.
              </p>
            </div>

            <div className="mt-2">
              <h3 className="font-medium text-slate-800">Voided sessions</h3>
              <p className="mt-1">
                If a past session should not count (booked in error, etc.), you
                can void it from the trainer session page. The client sees it as
                voided in their history. Voided sessions stay in the database for
                your audit trail but payment and invoice actions are disabled.
              </p>
            </div>
          </Section>

          <Section id="last-minute" title="Last-minute offers">
            <p>
              Last-minute is built into the Schedule tab — there is no separate
              last-minute page. When you click an open slot, the modal has two
              sections:
            </p>

            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="font-medium text-slate-800">
                  Last-minute offers
                </strong>{" "}
                — Clients who opted in and whose day/time preferences match.
                Send an offer to one client at a time; view offer history and
                hold status here.
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Direct allocation
                </strong>{" "}
                — Book any client immediately, without the offer-and-claim flow
                (useful for walk-ins or clients who did not opt in).
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Location
                </strong>{" "}
                — Change the venue for an open slot. Remove is only available
                when no last-minute offer is active on that slot.
              </li>
            </ul>

            <p className="mt-3">End-to-end flow:</p>

            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <strong className="font-medium text-slate-800">
                  Client opts in
                </strong>{" "}
                — On their portal, they tap green template slots; opted-in slots
                turn blue (auto-saved).
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Slot opens
                </strong>{" "}
                — A cancel, reschedule, or empty template slot appears on
                Schedule (green = open, amber = last-minute matches, purple =
                locked for an offer).
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Trainer sends offer
                </strong>{" "}
                — Click the slot, choose a matching client, and send. The slot
                locks for that client (default 1 hour, set in Settings).
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Client accepts
                </strong>{" "}
                — They receive a WhatsApp message with a link. The link opens a
                confirmation page showing session details and an{" "}
                <strong className="font-medium text-slate-800">
                  Accept session
                </strong>{" "}
                button — the booking is not created until they tap accept (if
                the hold is still valid).
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  If they don&apos;t accept
                </strong>{" "}
                — When the lock expires, offer the slot to the next matching
                client or allocate directly.
              </li>
            </ol>

            <p>
              Offers are never sent automatically when a slot opens — you choose
              who to contact from the eligible list.
            </p>
          </Section>

          <Section id="whatsapp" title="WhatsApp messaging">
            <p>
              The app currently uses a WhatsApp stub: messages are saved to the
              database, shown in the WhatsApp tab with timestamps and message
              types, and printed to the server console. To connect a real provider
              (Twilio, WhatsApp Cloud API, etc.), update{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                src/lib/whatsapp.ts
              </code>
              .
            </p>
            <p>Message types shown in the feed:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="font-medium text-slate-800">
                  Booking confirmation
                </strong>{" "}
                — When a session is booked (direct allocation, template apply,
                last-minute accept, or client self-booking).
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Last-minute offer
                </strong>{" "}
                — When you offer an open slot to a client, including a link to
                view and accept the offer, plus the lock duration.
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Interest acknowledgement
                </strong>{" "}
                — Legacy acknowledgement when a client expresses interest.
              </li>
              <li>
                <strong className="font-medium text-slate-800">Invoice</strong>{" "}
                — When you send an invoice from the trainer session page, with
                the session amount and your bank payment details.
              </li>
            </ul>
          </Section>

          <Section id="settings" title="Settings">
            <p>Configure the app from the Settings tab:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="font-medium text-slate-800">Time zone</strong>{" "}
                — Used for WhatsApp message timestamps and other times in your
                dashboard.
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Schedule hours
                </strong>{" "}
                — Start and end time for calendar grids (Schedule tab and
                template editor). Rows are shown in 30-minute steps within this
                range.
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Default schedule view
                </strong>{" "}
                — Day or week view when opening the Schedule tab.
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Client booking window
                </strong>{" "}
                — How far ahead clients can book a new session or pick a
                different time when changing: 1 week, 2 weeks, 3 weeks, or a
                custom value (1–52 weeks). Default is 2 weeks.
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Cancel / change deadline
                </strong>{" "}
                — How many hours before a session clients can still cancel or
                reschedule (default 36). Inside that window they must message
                you — the app does not allow a per-session override.
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Last-minute offer lock
                </strong>{" "}
                — How long a slot is held after you send an offer (default 1
                hour).
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Weekly templates
                </strong>{" "}
                — Open{" "}
                <strong className="font-medium text-slate-800">
                  Manage templates
                </strong>{" "}
                to plan your typical week on the same 30-minute grid used on
                Schedule. Click{" "}
                <strong className="font-medium text-slate-800">+</strong> to add
                a slot, then set its{" "}
                <strong className="font-medium text-slate-800">start time</strong>
                ,{" "}
                <strong className="font-medium text-slate-800">end time</strong>
                , and{" "}
                <strong className="font-medium text-slate-800">location</strong>{" "}
                (times must land on 30-minute steps, e.g. 09:00 or 09:30).
                Longer slots span multiple rows on the grid. Overlapping slots
                on the same day are rejected when you save — your previous
                template is kept unchanged until the conflict is fixed. Apply a
                saved template from the Schedule tab; clients with matching
                recurring preferences are auto-booked when a template is applied.
              </li>
              <li>
                <strong className="font-medium text-slate-800">Locations</strong>{" "}
                — Add, rename, or remove training venues. Template and schedule
                slots require a location; clients can be restricted to specific
                venues.
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Payment details
                </strong>{" "}
                — Company or trainer name, bank name, account number, and sort
                code for invoice WhatsApp messages. See Payments below.
              </li>
            </ul>
          </Section>

          <Section id="payments" title="Payments">
            <p>
              Track payment per session on the trainer session page, and store
              your bank details in Settings for future payment requests.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="font-medium text-slate-800">
                  Session payment
                </strong>{" "}
                — On each trainer session page, mark a session as{" "}
                <strong className="font-medium text-slate-800">Paid</strong> or{" "}
                <strong className="font-medium text-slate-800">Unpaid</strong>{" "}
                and choose a payment type: Cash, Bank transfer, Card, or Other.
                The Sessions tab Payment column shows paid/unpaid and invoice
                status at a glance (one badge per line). Not available on
                voided sessions.
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Send invoice
                </strong>{" "}
                — On the trainer session page, send a WhatsApp with the session
                amount and your payment details (payee name, bank name, sort
                code, and account number). Works on past sessions until voided.
                Resend anytime; the Sessions tab shows{" "}
                <strong className="font-medium text-slate-800">
                  Invoice sent
                </strong>{" "}
                or{" "}
                <strong className="font-medium text-slate-800">
                  Invoice not sent
                </strong>.
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Payment details (Settings)
                </strong>{" "}
                — Save your company or trainer name, bank name, account number,
                and sort code for invoice messages.
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Integrations (coming soon)
                </strong>{" "}
                — Connect Stripe, Revolut invoicing, or Sterling account
                invoicing from Settings → Payment details.
              </li>
            </ul>
          </Section>
        </Card>

        <div className="flex flex-wrap gap-3">
          {loggedIn ? (
            <>
              <Link href="/dashboard/schedule">
                <Button>Back to dashboard</Button>
              </Link>
              <Link href="/">
                <Button variant="secondary">Home</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/">
                <Button variant="secondary">← Home</Button>
              </Link>
              <Link href="/login">
                <Button>Trainer sign in</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
