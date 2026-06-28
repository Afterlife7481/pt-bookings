import Link from "next/link";
import { Button, Card } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">PT Bookings</h1>
        <p className="mt-2 text-slate-600">
          Personal trainer session scheduling with change flow and last-minute waitlist.
        </p>
      </div>
      <Card className="w-full text-center space-y-3">
        <Link href="/login">
          <Button className="w-full">Trainer sign in</Button>
        </Link>
        <Link href="/info" className="block text-sm text-slate-600 hover:text-slate-900">
          How PT Bookings works →
        </Link>
        <p className="text-xs text-slate-500">
          Clients use their personal link from their trainer — no account needed.
        </p>
      </Card>
    </main>
  );
}
