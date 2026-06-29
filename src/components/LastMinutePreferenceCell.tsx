import { cn } from "@/lib/utils";

export function LastMinutePreferenceCell({
  locationName,
  selected,
  disabled,
  onToggle,
  title,
}: {
  locationName: string;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={title}
      disabled={disabled}
      className={cn(
        "flex h-full min-h-0 w-full flex-col items-center justify-center rounded border px-1 py-0 text-center transition",
        selected
          ? "border-blue-200 bg-blue-50 active:border-blue-300 active:bg-blue-100"
          : "border-green-200 bg-green-50 active:border-green-300 active:bg-green-100",
        disabled && "opacity-70",
      )}
    >
      <span
        className={cn(
          "w-full truncate text-[9px] font-medium leading-none sm:text-[10px]",
          selected ? "text-blue-800" : "text-green-800",
        )}
      >
        {locationName}
      </span>
    </button>
  );
}
