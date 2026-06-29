export type ScheduleLastMinuteOffer = {
  id: string;
  clientId: string;
  clientName: string;
  status: string;
  expiresAt: string | null;
};

export type ScheduleEligibleClient = {
  id: string;
  name: string;
  phone: string;
  isHeld: boolean;
  latestOffer: {
    status: string;
    expiresAt: string | null;
    createdAt: string;
  } | null;
};

export type ScheduleLastMinuteInfo = {
  eligibleCount: number;
  heldForClientId: string | null;
  heldClientName: string | null;
  holdExpiresAt: string | null;
  offers: ScheduleLastMinuteOffer[];
  /** Prefetched when the schedule loads so the open-slot modal opens instantly. */
  eligibleClients?: ScheduleEligibleClient[];
};

export type ScheduleEntry = {
  slotId: string;
  startAt: string;
  endAt: string;
  status: "available" | "booked" | "pending_change";
  location: { id: string; name: string } | null;
  booking: {
    id: string;
    token: string;
    status: string;
    isRecurring: boolean;
    clientName: string;
  } | null;
  lastMinute: ScheduleLastMinuteInfo | null;
};

export function hasActiveLastMinuteOffer(
  lastMinute: ScheduleLastMinuteInfo | null,
): boolean {
  if (!lastMinute) return false;
  if (lastMinute.heldForClientId) return true;
  return lastMinute.offers.some((offer) => offer.status === "offered");
}
