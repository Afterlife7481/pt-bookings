import Link from "next/link";
import { SwipeCarousel, type SwipeCarouselItem } from "./SwipeCarousel";

const STORIES: SwipeCarouselItem[] = [
  {
    id: "james",
    eyebrow: "James · gym & park",
    title: "Recurring roster, last-minute saves",
    body: "James trains at a city gym on Tuesday and Thursday mornings, and in the park on Saturdays. His eight regulars are on fixed slots every week. When someone cancels Thursday at 7am, he sends a last-minute offer to clients who opted in — Sarah claims it before he finishes his coffee.",
  },
  {
    id: "priya",
    eyebrow: "Priya · studio & home visits",
    title: "Regulars plus drop-ins on open slots",
    body: "Priya splits the week between a studio and home visits. Tom has the same Wednesday slot every week without a single WhatsApp thread. Emma, a drop-in client, spots a gap on Priya’s portal and books a one-off session herself — no back-and-forth.",
  },
  {
    id: "marcus",
    eyebrow: "Marcus · mixed diary",
    title: "Rules that fit how he works",
    body: "Marcus blocks admin time, sets a 24-hour cancellation cut-off, and lets clients rebook within a two-week window. Some slots are locked to recurring clients; others stay open for anyone on the app. His diary reflects his terms — not the other way around.",
  },
];

function HeroScheduleVisual() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const cells = [
    [0, 1, 0, 1, 1, 0, 0],
    [1, 1, 0, 0, 1, 1, 0],
    [0, 1, 1, 1, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 0],
  ];

  return (
    <div className="home-hero__visual" aria-hidden="true">
      <div className="home-hero__grid">
        <div className="home-hero__days">
          {days.map((day, i) => (
            <span key={`${day}-${i}`}>{day}</span>
          ))}
        </div>
        {cells.map((row, rowIndex) => (
          <div key={rowIndex} className="home-hero__row">
            {row.map((filled, colIndex) => (
              <span
                key={colIndex}
                className={
                  filled ? "home-hero__cell home-hero__cell--filled" : "home-hero__cell"
                }
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomeLanding() {
  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-hero__atmosphere" aria-hidden="true" />
        <HeroScheduleVisual />

        <div className="home-hero__content">
          <p className="home-brand home-animate home-animate--1">PT Bookings</p>
          <h1 className="home-headline home-animate home-animate--2">
            The calendar crm app for personal trainers
          </h1>
          <p className="home-lede home-animate home-animate--3">
            Perfect if you train clients from one or multiple locations, with a
            mix of regular clients and drop-ins. Manage new and recurring
            clients, fill the gaps in your schedule, track payments and let
            clients book on your terms.
          </p>
          <div className="home-cta home-animate home-animate--4">
            <Link href="/login" className="home-cta__primary">
              Trainer sign in
            </Link>
            <a href="#who-its-for" className="home-cta__secondary">
              Who it&apos;s for
            </a>
          </div>
        </div>
      </section>

      <section id="who-its-for" className="home-section home-audience">
        <div className="home-section__intro">
          <h2 className="home-section__title">Who this is for</h2>
          <p className="home-section__copy">
            PT Bookings is for personal trainers who run their own diary — not
            big-box gym software with features you&apos;ll never use. It was
            designed to help you manage your slots: assign them to clients on a
            recurring basis or as a one-off, leave them open for anyone to book,
            or ping opted-in clients when something opens up.
          </p>
        </div>
        <ul className="home-audience__highlights">
          <li>
            <strong>One location or several</strong> — gym, studio, park, home
            visits, all in one week view.
          </li>
          <li>
            <strong>Regulars and drop-ins</strong> — fixed recurring slots for
            your core clients, open gaps for one-off bookings.
          </li>
          <li>
            <strong>Clients who help themselves</strong> — book, cancel, and
            rebook within the rules you set.
          </li>
          <li>
            <strong>Your terms, your operations</strong> — booking windows,
            cancellation cut-offs, prices, and last-minute preferences.
          </li>
        </ul>
      </section>

      <section className="home-section home-section--muted">
        <div className="home-section__intro">
          <h2 className="home-section__title">A week in the life</h2>
          <p className="home-section__copy">
            Trainers like you — mixed locations, mixed clients, same admin
            headaches. Here&apos;s how they use it.
          </p>
        </div>
        <SwipeCarousel items={STORIES} label="Trainer stories" />
      </section>

      <section className="home-section home-section--muted home-prose">
        <div className="home-section__intro">
          <h2 className="home-section__title">Clients stay in their lane</h2>
          <p className="home-section__copy">
            Each client gets a personal portal link — no app install, no password.
            They see their upcoming sessions, book open slots that match their
            locations, cancel within your deadline, and rebook into times that
            still fit your booking window. You approve the rules once; they handle
            the day-to-day moves themselves.
          </p>
        </div>
      </section>

      <section className="home-footer-cta">
        <p className="home-footer-cta__brand">PT Bookings</p>
        <h2 className="home-footer-cta__title">Ready when your next client texts</h2>
        <p className="home-footer-cta__copy">
          Set up your locations, lay out your week, and share portal links.
          Recurring clients land on their slots; drop-ins fill the rest — on
          your terms.
        </p>
        <Link href="/login" className="home-cta__primary">
          Create your trainer account
        </Link>
      </section>
    </div>
  );
}
