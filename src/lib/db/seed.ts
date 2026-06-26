import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { trainers, slots } from "./schema";
import {
  DEFAULT_TRAINER_ID,
  nowIso,
  slotDayOfWeek,
  slotTimeLabel,
} from "@/lib/constants";
import { createClient, setRecurringPreferences } from "@/lib/services/clients";
import {
  createTemplate,
  applyTemplateToWeek,
} from "@/lib/services/templates";
import { defaultWeekStart, shiftWeekStart } from "@/lib/schedule-utils";
import { createBookingForSlot } from "@/lib/services/bookings";

export async function seed() {
  const db = getDb();

  const existing = await db.query.trainers.findFirst({
    where: eq(trainers.id, DEFAULT_TRAINER_ID),
  });

  if (existing) {
    return;
  }

  const ts = nowIso();
  await db.insert(trainers).values({
    id: DEFAULT_TRAINER_ID,
    name: "Alex Trainer",
    email: "alex@example.com",
    timezone: "Europe/London",
    createdAt: ts,
  });

  const templateId = await createTemplate(
    "Standard Week",
    [
      { dayOfWeek: 1, startTime: "09:00" },
      { dayOfWeek: 1, startTime: "10:00" },
      { dayOfWeek: 1, startTime: "11:00" },
      { dayOfWeek: 3, startTime: "09:00" },
      { dayOfWeek: 3, startTime: "10:00" },
      { dayOfWeek: 5, startTime: "14:00" },
      { dayOfWeek: 5, startTime: "15:00" },
    ],
    DEFAULT_TRAINER_ID,
  );

  const jamieId = await createClient({
    trainerId: DEFAULT_TRAINER_ID,
    name: "Jamie Recurring",
    phone: "+447700900001",
    lastMinuteOptIn: false,
  });

  await setRecurringPreferences(jamieId, DEFAULT_TRAINER_ID, [
    { dayOfWeek: 1, startTime: "09:00" },
  ]);

  const flexibleClientId = await createClient({
    trainerId: DEFAULT_TRAINER_ID,
    name: "Sam Flexible",
    phone: "+447700900002",
    lastMinuteOptIn: true,
  });

  await createClient({
    trainerId: DEFAULT_TRAINER_ID,
    name: "Taylor Waitlist",
    phone: "+447700900003",
    lastMinuteOptIn: true,
  });

  await applyTemplateToWeek(templateId, defaultWeekStart());
  await applyTemplateToWeek(templateId, shiftWeekStart(defaultWeekStart(), 1));

  const allSlots = await db.select().from(slots);
  const samSlot = allSlots.find((s) => {
    return (
      slotDayOfWeek(s.startAt) === 1 &&
      slotTimeLabel(s.startAt) === "10:00" &&
      s.status === "available"
    );
  });

  if (samSlot) {
    await createBookingForSlot({
      slotId: samSlot.id,
      clientId: flexibleClientId,
      trainerId: DEFAULT_TRAINER_ID,
      sendConfirmation: true,
    });
  }
}

if (require.main === module) {
  import("./migrate").then(({ runMigrations }) => {
    runMigrations();
    return seed();
  }).then(() => console.log("Seed complete.")).catch(console.error);
}
