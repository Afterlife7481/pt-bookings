import Link from "next/link";
import { SwipeCarousel, type SwipeCarouselItem } from "./SwipeCarousel";

const FEATURES: SwipeCarouselItem[] = [
  {
    id: "schedule",
    eyebrow: "Schedule",
    title: "Your week on a 30-minute grid",
    body: "Build a weekly template once, then fill each week with recurring clients and open slots in a few taps.",
  },
  {
    id: "portal",
    eyebrow: "Client portal",
    title: "Personal links, no client accounts",
    body: "Share a private link. Clients book, reschedule, and cancel within your rules — without passwords.",
  },
  {
    id: "last-minute",
    eyebrow: "Fill-ins",
    title: "Last-minute offers that lock the slot",
    body: "When a session frees up, send a timed offer to an opted-in client and keep the diary tidy.",
  },
  {
    id: "changes",
    eyebrow: "Changes",
    title: "Clients move sessions themselves",
    body: "A guided change flow shows only slots that fit their locations and booking window.",
  },
];

const STEPS: SwipeCarouselItem[] = [
  {
    id: "locations",
    eyebrow: "Step 1",
    title: "Add where you train",
    body: "Studios, gyms, parks, home visits — every slot needs a location before the rest of setup unlocks.",
  },
  {
    id: "template",
    eyebrow: "Step 2",
    title: "Lay out your weekly template",
    body: "This is the backbone: recurring bookings, last-minute preferences, and apply-template all follow it.",
  },
  {
    id: "clients",
    eyebrow: "Step 3",
    title: "Add clients and share links",
    body: "Set prices, locations, and preferences, then send each client their portal link from WhatsApp or text.",
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
            Run your PT diary without the admin drag
          </h1>
          <p className="home-lede home-animate home-animate--3">
            Schedule sessions, share client links, and fill last-minute gaps —
            built for trainers who work from their phone.
          </p>
          <div className="home-cta home-animate home-animate--4">
            <Link href="/login" className="home-cta__primary">
              Trainer sign in
            </Link>
            <Link href="/info" className="home-cta__secondary">
              How it works
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__intro">
          <h2 className="home-section__title">Built for how you actually train</h2>
          <p className="home-section__copy">
            Swipe through the pieces that keep your week moving.
          </p>
        </div>
        <SwipeCarousel items={FEATURES} label="Product features" />
      </section>

      <section className="home-section home-section--muted">
        <div className="home-section__intro">
          <h2 className="home-section__title">Get set up in three moves</h2>
          <p className="home-section__copy">
            Start simple. Expand when your client list grows.
          </p>
        </div>
        <SwipeCarousel items={STEPS} label="Getting started steps" />
      </section>

      <section className="home-footer-cta">
        <p className="home-footer-cta__brand">PT Bookings</p>
        <h2 className="home-footer-cta__title">Ready when your next client texts</h2>
        <p className="home-footer-cta__copy">
          Clients use the personal link you send them — no app install, no
          account for them to manage.
        </p>
        <Link href="/login" className="home-cta__primary">
          Create your trainer account
        </Link>
      </section>
    </div>
  );
}
