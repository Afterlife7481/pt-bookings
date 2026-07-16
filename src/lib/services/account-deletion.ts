import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  appliedWeeks,
  bookings,
  changeRequests,
  clientLastMinutePreferences,
  clientNotes,
  clients,
  lastMinuteInterests,
  locations,
  trainerPaymentMethods,
  recurringPreferences,
  slots,
  trainerMagicLinks,
  trainerSessions,
  trainers,
  weeklyTemplates,
  whatsappMessages,
} from "@/lib/db/schema";
import { isProtectedTrainerEmail, normalizeTrainerEmail } from "@/lib/constants";
import { getTrainerById } from "@/lib/services/trainers";

export { isProtectedTrainerEmail } from "@/lib/constants";

export async function deleteTrainerAccount(
  trainerId: string,
  confirmationEmail: string,
): Promise<void> {
  const trainer = await getTrainerById(trainerId);
  if (!trainer) {
    throw new Error("Account not found.");
  }

  if (isProtectedTrainerEmail(trainer.email)) {
    throw new Error("This account cannot be deleted.");
  }

  const confirmed = normalizeTrainerEmail(confirmationEmail);
  if (confirmed !== trainer.email) {
    throw new Error("Email address does not match your account.");
  }

  const db = getDb();

  await db.transaction(async (tx) => {
    await tx
      .delete(whatsappMessages)
      .where(eq(whatsappMessages.trainerId, trainerId));
    await tx
      .delete(lastMinuteInterests)
      .where(eq(lastMinuteInterests.trainerId, trainerId));
    await tx
      .delete(clientLastMinutePreferences)
      .where(eq(clientLastMinutePreferences.trainerId, trainerId));
    await tx
      .delete(changeRequests)
      .where(eq(changeRequests.trainerId, trainerId));
    await tx.delete(bookings).where(eq(bookings.trainerId, trainerId));
    await tx.delete(slots).where(eq(slots.trainerId, trainerId));
    await tx
      .delete(recurringPreferences)
      .where(eq(recurringPreferences.trainerId, trainerId));
    await tx
      .delete(appliedWeeks)
      .where(eq(appliedWeeks.trainerId, trainerId));
    await tx
      .delete(weeklyTemplates)
      .where(eq(weeklyTemplates.trainerId, trainerId));
    await tx.delete(clientNotes).where(eq(clientNotes.trainerId, trainerId));
    await tx.delete(clients).where(eq(clients.trainerId, trainerId));
    await tx.delete(locations).where(eq(locations.trainerId, trainerId));
    await tx
      .delete(trainerPaymentMethods)
      .where(eq(trainerPaymentMethods.trainerId, trainerId));
    await tx
      .delete(trainerSessions)
      .where(eq(trainerSessions.trainerId, trainerId));
    await tx
      .delete(trainerMagicLinks)
      .where(eq(trainerMagicLinks.email, trainer.email));
    await tx.delete(trainers).where(eq(trainers.id, trainerId));
  });
}
