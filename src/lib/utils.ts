export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatSlot(startAt: string) {
  const [datePart, timePart] = startAt.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const time = timePart?.slice(0, 5) ?? "";
  return `${date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} ${time}`;
}

export function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Format an ISO timestamp for display (en-GB date + time). */
export function formatDateTime(iso: string): string {
  const [datePart, timePart] = iso.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  const time = timePart?.slice(0, 5) ?? "";
  const dateLabel = date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return time ? `${dateLabel}, ${time}` : dateLabel;
}

/** Format an ISO timestamp's calendar date in en-GB without UTC timezone shift. */
export function formatCreatedDate(iso: string): string {
  const dateKey = iso.slice(0, 10);
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB");
}

export function formatTimeOnly(startAt: string): string {
  return startAt.split("T")[1]?.slice(0, 5) ?? "";
}

/** Format pence as GBP, or em dash when unset. */
export function formatSessionPrice(pence: number | null | undefined): string {
  if (pence == null) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

/** Parse a pounds input (e.g. "50" or "49.50") to pence, or null if empty. */
export function parseSessionPriceInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const pounds = Number(trimmed);
  if (!Number.isFinite(pounds) || pounds < 0) {
    throw new Error("Session price must be zero or greater");
  }
  return Math.round(pounds * 100);
}

/** Pence to a pounds string suitable for number inputs. */
export function sessionPriceToInput(pence: number | null | undefined): string {
  if (pence == null) return "";
  return (pence / 100).toFixed(2).replace(/\.00$/, "");
}

export function groupSlotsByDay<T extends { startAt: string }>(slots: T[]) {
  const map = new Map<string, T[]>();

  for (const slot of slots) {
    const dateKey = slot.startAt.split("T")[0] ?? "";
    const daySlots = map.get(dateKey) ?? [];
    daySlots.push(slot);
    map.set(dateKey, daySlots);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, daySlots]) => ({
      dateKey,
      label: formatDayLabel(dateKey),
      slots: daySlots,
    }));
}
