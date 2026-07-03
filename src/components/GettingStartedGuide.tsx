import Link from "next/link";

export function GettingStartedGuide({
  footer = "full-guide",
}: {
  footer?: "full-guide" | "sections-below";
}) {
  return (
    <>
      <p>
        Follow these steps in order the first time you set up your account. Each
        step builds on the one before it.
      </p>
      <ol className="list-decimal space-y-3 pl-5">
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
          <strong className="text-slate-800">Build your weekly template.</strong>{" "}
          In{" "}
          <Link href="/dashboard/settings/templates" className="underline">
            Settings → Weekly template
          </Link>
          , lay out the slots you offer in a typical week (each with a time and
          location, on 30-minute steps).{" "}
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
          tab, add each client&apos;s name, phone, and session price.
        </li>
        <li>
          <strong className="text-slate-800">Configure each client.</strong> Open
          a client&apos;s profile to:
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Enable the locations they can train at.</li>
            <li>
              Set any recurring slots (these must match template slots at enabled
              locations).
            </li>
            <li>
              Add notes — shared notes appear on the client&apos;s portal (e.g.
              training instructions); private notes are only ever seen by you
              (e.g. injury reminders).
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
          auto-book your recurring clients.
        </li>
        <li>
          <strong className="text-slate-800">Share portal links and go live.</strong>{" "}
          Send each client their portal link so they can view, book, and change
          sessions within your booking window, and opt in to last-minute offers.
          Optionally add your payment details in Settings so you can send
          invoices.
        </li>
      </ol>
      {footer === "sections-below" ? (
        <p className="text-slate-500">
          The sections below explain each area in more detail.
        </p>
      ) : (
        <p className="text-slate-500">
          The full guide on{" "}
          <Link href="/info" className="underline">
            How PT Bookings works
          </Link>{" "}
          explains each area in more detail.
        </p>
      )}
    </>
  );
}
