import Link from "next/link";

export function GettingStartedGuide() {
  return (
    <>
      <p>
        Follow these steps in order the first time you set up your account. Each
        step builds on the one before it.
      </p>
      <ol className="list-decimal space-y-3 pl-5">
        <li>
          <strong className="text-slate-800">Set your regional settings.</strong>{" "}
          In{" "}
          <Link href="/dashboard/settings/regional" className="underline">
            Settings → Regional
          </Link>
          , choose your time zone (and currency if needed) so session times
          display correctly for you and your clients.
        </li>
        <li>
          <strong className="text-slate-800">Set up your locations.</strong> In{" "}
          <Link href="/dashboard/settings/locations" className="underline">
            Settings → Your locations
          </Link>
          , add every place you train (studio, gym, park, home visits). Every
          slot must have a location, so nothing else works until you have at
          least one.
        </li>
        <li>
          <strong className="text-slate-800">Set your schedule hours.</strong> In{" "}
          <Link href="/dashboard/settings/schedule" className="underline">
            Settings → Schedule hours
          </Link>
          , choose the start and end times shown on your weekly diary.
        </li>
        <li>
          <strong className="text-slate-800">Build your weekly template.</strong>{" "}
          In{" "}
          <Link href="/dashboard/settings/templates" className="underline">
            Settings → Weekly template
          </Link>
          , lay out the slots you offer in a typical week (each with a time and
          location, on 5-minute steps).{" "}
          <strong className="text-slate-800">
            This is the backbone of the whole app.
          </strong>{" "}
          Recurring client slots, last-minute preferences, and the{" "}
          <em>Apply template</em> action that fills each week all derive from it
          — so a well-built template means the rest of your setup is mostly a
          few clicks.
        </li>
        <li>
          <strong className="text-slate-800">Add your first clients.</strong> In
          the{" "}
          <Link href="/dashboard/clients" className="underline">
            Clients
          </Link>{" "}
          tab, add each client&apos;s name plus a phone number and/or email, and
          their session price.
        </li>
        <li>
          <strong className="text-slate-800">Configure each client.</strong> Open
          a client&apos;s profile to:
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Enable the locations they can train at.</li>
            <li>
              Set their preferred contact channel (email or WhatsApp) and
              session price.
            </li>
            <li>
              Assign recurring slots (these must match template slots at their
              enabled locations).
            </li>
            <li>
              Add notes — public notes appear on the client&apos;s portal;
              private notes are only ever seen by you.
            </li>
            <li>
              Send their portal link so they can view, book, and change
              sessions, and opt in to last-minute offers.
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
          , use <em>Apply template</em> to generate that week&apos;s slots and
          auto-book your recurring clients. You can also open empty cells to add
          one-off slots, allocate clients directly, or send last-minute offers
          when something frees up.
        </li>
        <li>
          <strong className="text-slate-800">
            Review booking rules and payment details.
          </strong>{" "}
          Optionally set how far ahead clients can book and cancel in{" "}
          <Link href="/dashboard/settings/booking-rules" className="underline">
            Settings → Booking rules
          </Link>
          , and add payment methods in{" "}
          <Link href="/dashboard/settings/payment" className="underline">
            Settings → Payment details
          </Link>{" "}
          so you can mark sessions paid and send invoices from the Sessions tab
          or schedule.
        </li>
        <li>
          <strong className="text-slate-800">
            Invite other personal trainers.
          </strong>{" "}
          In{" "}
          <Link href="/dashboard/invitations" className="underline">
            Invitations
          </Link>
          , copy your invite code and share it with PTs you trust. New trainers
          can only create an account with a valid invitation code — this keeps
          signup invite-only.
        </li>
      </ol>
    </>
  );
}
