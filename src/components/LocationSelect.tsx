type LocationOption = { id: string; name: string };

export function LocationSelect({
  locations,
  value,
  onChange,
  disabled,
  emptyMessage = "Add a location under Settings before opening slots.",
}: {
  locations: LocationOption[];
  value: string;
  onChange: (locationId: string) => void;
  disabled?: boolean;
  emptyMessage?: string;
}) {
  if (locations.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-600">Location</span>
      <select
        className="rounded-lg border border-slate-300 px-3 py-3 text-base sm:py-2 sm:text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required
      >
        <option value="">Select location…</option>
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
          </option>
        ))}
      </select>
    </label>
  );
}
