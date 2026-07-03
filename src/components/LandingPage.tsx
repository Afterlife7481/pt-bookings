import Image from "next/image";
import Link from "next/link";
import { Button, Card } from "@/components/ui";

const FEATURES = [
  {
    title: "Weekly schedule that runs itself",
    description:
      "Build a template once, apply it each week, and auto-book recurring clients on your 30-minute grid.",
    image:
      "https://images.unsplash.com/photo-1758875570137-8691b7c55033?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Personal trainer planning a session with a client on a tablet",
  },
  {
    title: "Client portal — no app required",
    description:
      "Each client gets a personal link to view sessions, book open slots, and request changes within your rules.",
    image:
      "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Personal trainer coaching a client through an exercise",
  },
  {
    title: "Fill last-minute gaps",
    description:
      "When a slot opens up, offer it to opted-in clients on your waitlist before it goes empty.",
    image:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Personal trainer spotting a client during a workout",
  },
  {
    title: "Sessions, payments & notes",
    description:
      "Track every booking, mark sessions paid, send invoices, and keep shared or private notes per client.",
    image:
      "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Personal trainer working one-to-one with a client in the gym",
  },
] as const;

const HIGHLIGHTS = [
  {
    title: "Recurring & one-off bookings",
    text: "Recurring clients land on the same slot each week; manual bookings when you need flexibility.",
  },
  {
    title: "Multiple locations",
    text: "Studios, gyms, parks, home visits — every slot is tied to a place you train.",
  },
  {
    title: "Change & cancel flow",
    text: "Clients reschedule within your booking window; you stay in control from the dashboard.",
  },
  {
    title: "Magic-link sign-in",
    text: "Trainers sign in with email — no passwords to forget. Clients never need an account.",
  },
] as const;

const ADDONS = [
  {
    title: "Banking",
    description:
      "Bank transfer details on invoices and payment tracking so clients know exactly how to pay you.",
  },
  {
    title: "Accounting",
    description:
      "Export and sync session income with your bookkeeping tools — less admin at month end.",
  },
  {
    title: "Messaging",
    description:
      "WhatsApp confirmations, reminders, and last-minute offers sent automatically from your schedule.",
  },
] as const;

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-white">
          PT Bookings
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/info"
            className="hidden text-sm text-slate-300 hover:text-white sm:inline"
          >
            How it works
          </Link>
          <Link href="/login">
            <Button className="bg-emerald-500 text-white hover:bg-emerald-400">
              Trainer sign in
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SiteHeader />

      <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1758875569414-120ebc62ada3?auto=format&fit=crop&w=1920&q=80"
            alt="Personal trainer discussing a workout plan with a client in the gym"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <div className="max-w-2xl">
            <p className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-emerald-300">
              Built for personal trainers in the UK
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Run your PT diary.
              <span className="block text-emerald-400">Keep clients booked.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              PT Bookings is free scheduling software for UK personal trainers —
              weekly templates, recurring clients, a client portal, last-minute
              fill-ins, and payment tracking in one place.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/login">
                <Button className="w-full bg-emerald-500 px-6 py-3 text-base text-white hover:bg-emerald-400 sm:w-auto">
                  Get started free
                </Button>
              </Link>
              <Link href="/info">
                <Button
                  variant="secondary"
                  className="w-full border-slate-600 bg-white/5 px-6 py-3 text-base text-white hover:bg-white/10 sm:w-auto"
                >
                  See how it works
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-400">
              Clients use a personal link from you — no account or app download
              needed.
            </p>
          </div>
        </div>
      </section>

      {/* Feature cards with images */}
      <section className="border-t border-slate-800 bg-slate-950 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to stay organised
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Less back-and-forth on WhatsApp, fewer empty slots, and a clear
              view of who is training when.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <Card
                key={feature.title}
                className="overflow-hidden border-slate-800 bg-slate-900 p-0"
              >
                <div className="relative aspect-[16/10] w-full">
                  <Image
                    src={feature.image}
                    alt={feature.imageAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {feature.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Quick highlights */}
      <section className="border-t border-slate-800 bg-slate-900/50 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Designed around how PTs actually work
          </h2>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HIGHLIGHTS.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-6"
              >
                <div className="h-1 w-8 rounded-full bg-emerald-500" aria-hidden />
                <h3 className="mt-4 font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-slate-800 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, honest pricing
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Start with the full scheduling experience at no cost. Add
              integrations only when you need them. Pricing in GBP for UK
              trainers.
            </p>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-slate-900 p-8">
              <p className="text-sm font-medium uppercase tracking-wider text-emerald-400">
                Core platform
              </p>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">Free</span>
              </div>
              <p className="mt-4 text-slate-300">
                Everything you need to run your diary — no trial, no credit
                card.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  Weekly schedule & template
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  Unlimited clients & sessions
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  Client portal links
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  Last-minute waitlist
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  Session notes & change flow
                </li>
              </ul>
              <Link href="/login" className="mt-8 block">
                <Button className="w-full bg-emerald-500 text-white hover:bg-emerald-400">
                  Create your account
                </Button>
              </Link>
            </Card>

            <Card className="border-slate-800 bg-slate-900 p-8">
              <p className="text-sm font-medium uppercase tracking-wider text-slate-400">
                Optional add-ons
              </p>
              <p className="mt-4 text-2xl font-bold text-white">
                Small monthly fee
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Enable only what saves you time. Switch integrations on or off
                from Settings.
              </p>
              <ul className="mt-8 space-y-6">
                {ADDONS.map((addon) => (
                  <li key={addon.title} className="border-t border-slate-800 pt-6 first:border-0 first:pt-0">
                    <h3 className="font-semibold text-white">{addon.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-400">
                      {addon.description}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-800 bg-slate-900/50 py-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to simplify your week?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            Set up your locations, build your template, add clients, and share
            their portal links — most trainers are live in under an hour.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login">
              <Button className="bg-emerald-500 px-8 py-3 text-base text-white hover:bg-emerald-400">
                Trainer sign in
              </Button>
            </Link>
            <Link
              href="/info#getting-started"
              className="text-sm text-slate-400 hover:text-white"
            >
              Read the getting-started guide →
            </Link>
          </div>
        </div>
      </section>
      </main>

      <footer className="border-t border-slate-800 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} PT Bookings</p>
          <div className="flex gap-6">
            <Link href="/info" className="hover:text-slate-300">
              How it works
            </Link>
            <Link href="/login" className="hover:text-slate-300">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
