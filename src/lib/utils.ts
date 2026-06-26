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

export const DAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

export function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatTimeOnly(startAt: string): string {
  return startAt.split("T")[1]?.slice(0, 5) ?? "";
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
