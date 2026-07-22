import { nanoid } from "nanoid";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clients,
  scheduleConflictAlerts,
  trainers,
} from "@/lib/db/schema";
import {
  addDays,
  conflictUrl,
  formatDate,
  formatTimeRange,
  nowIso,
  parseDateOnly,
  parseTimeOnDate,
  toLocalDateTimeString,
} from "@/lib/constants";
import { dayOfWeekLabel } from "@/lib/schedule-grid";
import { sendWhatsAppTemplateConflictToClient } from "@/lib/whatsapp";
import { assertWhatsAppPhone } from "@/lib/whatsapp-link";

export type TemplateConflictInput = {
  trainerId: string;
  clientId: string;
  clientName: string;
  weekStart: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  locationId: string | null;
  locationName: string | null;
  holidayId: string | null;
  holidayLabel: string | null;
};

export type ScheduleConflictPreview = {
  clientName: string;
  clientToken: string;
  slotLabel: string;
  locationName: string | null;
  holidayLabel: string | null;
  status: "open" | "notified" | "acknowledged";
  alreadyAcknowledged: boolean;
};

function buildSlotLabel(params: {
  weekStart: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  locationName: string | null;
}): string {
  const monday = parseDateOnly(params.weekStart);
  const offset = (params.dayOfWeek - monday.getDay() + 7) % 7;
  const day = addDays(monday, offset);
  const dateLabel = day.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeLabel = formatTimeRange(params.startTime, params.endTime);
  const location = params.locationName?.trim();
  return location
    ? `${dateLabel} ${timeLabel} at ${location}`
    : `${dateLabel} ${timeLabel}`;
}

export function formatConflictAlertBody(
  clientName: string,
  slotLabel: string,
  holidayLabel: string | null,
): string {
  const reason = holidayLabel?.trim()
    ? ` because of ${holidayLabel}`
    : " because of your trainer's time off";
  return `Recurring session clash with ${clientName}: ${slotLabel}${reason}.`;
}

export async function createTemplateConflictAlerts(
  conflicts: TemplateConflictInput[],
): Promise<string[]> {
  if (conflicts.length === 0) return [];

  const db = getDb();
  const createdAt = nowIso();
  const ids: string[] = [];

  await db.transaction(async (tx) => {
    for (const conflict of conflicts) {
      const id = nanoid();
      const slotLabel = buildSlotLabel(conflict);
      ids.push(id);
      await tx.insert(scheduleConflictAlerts).values({
        id,
        trainerId: conflict.trainerId,
        clientId: conflict.clientId,
        weekStart: conflict.weekStart,
        dayOfWeek: conflict.dayOfWeek,
        startTime: conflict.startTime,
        endTime: conflict.endTime,
        locationId: conflict.locationId,
        locationName: conflict.locationName,
        holidayId: conflict.holidayId,
        holidayLabel: conflict.holidayLabel,
        slotLabel,
        status: "open",
        acknowledgmentToken: nanoid(),
        createdAt,
      });
    }
  });

  return ids;
}

export async function listScheduleConflictAlerts(trainerId: string) {
  const db = getDb();
  return db
    .select({
      alert: scheduleConflictAlerts,
      clientName: clients.name,
    })
    .from(scheduleConflictAlerts)
    .innerJoin(clients, eq(scheduleConflictAlerts.clientId, clients.id))
    .where(eq(scheduleConflictAlerts.trainerId, trainerId))
    .orderBy(desc(scheduleConflictAlerts.createdAt));
}

async function getConflictAlertForTrainer(alertId: string, trainerId: string) {
  const db = getDb();
  const row = await db
    .select({
      alert: scheduleConflictAlerts,
      clientName: clients.name,
      clientPhone: clients.phone,
      trainerEmail: trainers.email,
    })
    .from(scheduleConflictAlerts)
    .innerJoin(clients, eq(scheduleConflictAlerts.clientId, clients.id))
    .innerJoin(trainers, eq(scheduleConflictAlerts.trainerId, trainers.id))
    .where(
      and(
        eq(scheduleConflictAlerts.id, alertId),
        eq(scheduleConflictAlerts.trainerId, trainerId),
      ),
    )
    .limit(1);

  return row[0] ?? null;
}

export async function notifyClientOfScheduleConflict(
  alertId: string,
  trainerId: string,
) {
  const row = await getConflictAlertForTrainer(alertId, trainerId);
  if (!row) throw new Error("Clash alert not found");
  if (row.alert.status === "acknowledged") {
    throw new Error("Client has already acknowledged this clash");
  }

  const link = conflictUrl(row.alert.acknowledgmentToken);
  const reason = row.alert.holidayLabel
    ? ` (${row.alert.holidayLabel})`
    : " (trainer time off)";
  const { renderTrainerMessageTemplate } = await import(
    "@/lib/services/message-templates"
  );
  const { body } = await renderTrainerMessageTemplate(
    trainerId,
    "template_conflict_whatsapp",
    {
      clientName: row.clientName,
      slotLabel: row.alert.slotLabel,
      reason,
      conflictUrl: link,
    },
  );

  assertWhatsAppPhone(row.clientPhone);

  const draft = await sendWhatsAppTemplateConflictToClient({
    trainerId,
    clientId: row.alert.clientId,
    phone: row.clientPhone,
    clientName: row.clientName,
    body,
  });

  const db = getDb();
  const notifiedAt = nowIso();
  await db
    .update(scheduleConflictAlerts)
    .set({
      status: row.alert.status === "open" ? "notified" : row.alert.status,
      notifiedAt: row.alert.notifiedAt ?? notifiedAt,
    })
    .where(eq(scheduleConflictAlerts.id, alertId));

  return { ok: true as const, whatsappUrl: draft.sendUrl };
}

export async function getScheduleConflictPreview(
  token: string,
): Promise<ScheduleConflictPreview | null> {
  const db = getDb();
  const row = await db
    .select({
      alert: scheduleConflictAlerts,
      clientName: clients.name,
      clientToken: clients.token,
    })
    .from(scheduleConflictAlerts)
    .innerJoin(clients, eq(scheduleConflictAlerts.clientId, clients.id))
    .where(eq(scheduleConflictAlerts.acknowledgmentToken, token))
    .limit(1);

  const match = row[0];
  if (!match) return null;

  return {
    clientName: match.clientName,
    clientToken: match.clientToken,
    slotLabel: match.alert.slotLabel,
    locationName: match.alert.locationName,
    holidayLabel: match.alert.holidayLabel,
    status: match.alert.status,
    alreadyAcknowledged: match.alert.status === "acknowledged",
  };
}

export async function acknowledgeScheduleConflict(token: string) {
  const db = getDb();
  const row = await db
    .select({
      alert: scheduleConflictAlerts,
      clientToken: clients.token,
    })
    .from(scheduleConflictAlerts)
    .innerJoin(clients, eq(scheduleConflictAlerts.clientId, clients.id))
    .where(eq(scheduleConflictAlerts.acknowledgmentToken, token))
    .limit(1);

  const match = row[0];
  if (!match) throw new Error("Clash link not found");
  if (match.alert.status === "acknowledged") {
    return {
      clientToken: match.clientToken,
      alreadyAcknowledged: true as const,
    };
  }

  const acknowledgedAt = nowIso();
  await db
    .update(scheduleConflictAlerts)
    .set({
      status: "acknowledged",
      acknowledgedAt,
    })
    .where(eq(scheduleConflictAlerts.id, match.alert.id));

  return {
    clientToken: match.clientToken,
    alreadyAcknowledged: false as const,
  };
}

export function conflictAlertTitle(clientName: string): string {
  return `Schedule clash with ${clientName}`;
}

export function slotStartAtForConflict(
  weekStart: string,
  dayOfWeek: number,
  startTime: string,
): string {
  const monday = parseDateOnly(weekStart);
  const offset = (dayOfWeek - monday.getDay() + 7) % 7;
  const day = addDays(monday, offset);
  return toLocalDateTimeString(parseTimeOnDate(formatDate(day), startTime));
}

export { dayOfWeekLabel };
