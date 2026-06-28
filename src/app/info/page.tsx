import type { Metadata } from "next";
import Link from "next/link";
import { Button, Card } from "@/components/ui";

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

export default function InfoPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-bold text-slate-900 hover:text-slate-700">
            PT Bookings
          </Link>
          <Link href="/login">
            <Button variant="secondary" className="text-xs sm:text-sm">
              Trainer sign in
            </Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            How PT Bookings works
          </h1>
          <p className="mt-2 text-slate-600">
            A scheduling app for personal trainers: one weekly calendar for
            bookings and last-minute offers, recurring clients, session changes,
            and a simple client portal with WhatsApp message logging.
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
          </nav>
        </Card>

        <Card className="space-y-8">
          <Section id="overview" title="Overview">
            <p>
              PT Bookings helps you run a weekly session calendar, keep recurring
              clients on their usual slots, and fill gaps when someone cancels or
              moves a session — all from a single schedule view.
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
                  Your main workspace — a week-at-a-glance calendar in day or week
                  view (default set in Settings). Navigate between weeks, add
                  slots, apply a weekly template, and manage every session.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    <strong className="font-medium text-slate-800">Booked</strong>{" "}
                    cells show the client name and location (recurring sessions
                    appear in blue).
                  </li>
                  <li>
                    <strong className="font-medium text-slate-800">Open</strong>{" "}
                    cells are green and show how many last-minute clients match
                    that day and time.
                  </li>
                  <li>
                    <strong className="font-medium text-slate-800">Held</strong>{" "}
                    cells turn blue when a last-minute offer is active for a
                    specific client.
                  </li>
                  <li>
                    Click an open slot to send last-minute offers or allocate a
                    client directly — see the Last-minute section below.
                  </li>
                  <li>
                    Click empty cells to add new slots. Use{" "}
                    <strong className="font-medium text-slate-800">
                      Apply template
                    </strong>{" "}
                    on an empty week to populate slots from a saved pattern
                    (templates are managed in Settings).
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-slate-800">Clients</h3>
                <p className="mt-1">
                  Table of all clients with contact details, session price, and
                  last-minute opt-in status. Open a client to edit their profile,
                  set recurring weekly slots, choose allowed locations, copy their
                  portal link, and view their bookings.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-slate-800">Sessions</h3>
                <p className="mt-1">
                  Table of all bookings with status, client name, session time,
                  and quick actions (e.g. override the cancel deadline, open the
                  client session link).
                </p>
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
                  App preferences, training locations, and a link to manage
                  weekly templates. See the Settings section below for details.
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
              <li>Book a new session from available slots</li>
              <li>
                Set last-minute time preferences on a weekly grid (saved
                automatically when they opt in)
              </li>
              <li>
                Open a session page to view details, cancel, or change the time
              </li>
            </ul>

            <div className="mt-2">
              <h3 className="font-medium text-slate-800">Changing a session</h3>
              <p className="mt-1">
                From a session page, the client can start a change flow and pick a
                new slot. Changes are blocked inside the cancellation deadline
                (configurable in Settings, default 36 hours before the session).
                Trainers can override the deadline per booking from the Sessions
                tab.
              </p>
            </div>

            <div className="mt-2">
              <h3 className="font-medium text-slate-800">Cancelling</h3>
              <p className="mt-1">
                Clients can cancel within the same deadline rules. The freed slot
                appears on your Schedule as an open cell so you can offer it
                last-minute or allocate it directly.
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
            </ul>

            <p className="mt-3">End-to-end flow:</p>

            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <strong className="font-medium text-slate-800">
                  Client opts in
                </strong>{" "}
                — On their portal, they pick the day/time windows they would
                accept (auto-saved).
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Slot opens
                </strong>{" "}
                — A cancel, reschedule, or empty template slot appears on
                Schedule (green = open, blue = held for a client).
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
                — They receive a WhatsApp message with a claim link. Tapping it
                books the session if the hold is still valid.
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
                — When you offer an open slot to a client, including a claim
                link and lock duration.
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Interest acknowledgement
                </strong>{" "}
                — Legacy acknowledgement when a client expresses interest.
              </li>
            </ul>
          </Section>

          <Section id="settings" title="Settings">
            <p>Configure the app from the Settings tab:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="font-medium text-slate-800">
                  Schedule hours
                </strong>{" "}
                — Start and end time shown on calendar grids.
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Default schedule view
                </strong>{" "}
                — Day or week view when opening the Schedule tab.
              </li>
              <li>
                <strong className="font-medium text-slate-800">
                  Cancel / change deadline
                </strong>{" "}
                — How many hours before a session clients can still cancel or
                reschedule (default 36).
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
                to create and edit reusable weekly slot patterns (e.g.
                Mon/Wed/Fri mornings). Apply them from the Schedule tab; clients
                with matching recurring preferences are auto-booked when a
                template is applied.
              </li>
              <li>
                <strong className="font-medium text-slate-800">Locations</strong>{" "}
                — Add, rename, or remove training venues. Slots and clients can
                be tied to specific locations.
              </li>
            </ul>
          </Section>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Link href="/">
            <Button variant="secondary">← Home</Button>
          </Link>
          <Link href="/login">
            <Button>Trainer sign in</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
