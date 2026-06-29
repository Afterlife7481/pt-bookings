import { cn, formatSlotLines } from "@/lib/utils";

export function SessionWhen({
  startAt,
  endAt,
  variant = "default",
  className,
}: {
  startAt: string;
  endAt?: string | null;
  variant?: "default" | "header";
  className?: string;
}) {
  const { date, time } = formatSlotLines(startAt, endAt);

  if (variant === "header") {
    return (
      <h1
        className={cn(
          "flex flex-col gap-0.5 leading-tight",
          className,
        )}
      >
        <span className="text-xl font-bold sm:text-2xl">{date}</span>
        <span className="text-lg font-semibold text-slate-700 sm:text-xl">
          {time}
        </span>
      </h1>
    );
  }

  return (
    <div className={cn("flex flex-col gap-0.5 leading-snug", className)}>
      <span className="text-slate-900">{date}</span>
      <span className="text-slate-600">{time}</span>
    </div>
  );
}
