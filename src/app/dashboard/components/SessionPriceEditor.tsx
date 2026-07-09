"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import {
  formatSessionPrice,
  parseSessionPriceInput,
  sessionPriceToInput,
} from "@/lib/utils";

export function SessionPriceEditor({
  sessionPrice,
  clientDefaultPrice,
  disabled = false,
  onSave,
}: {
  sessionPrice: number | null;
  clientDefaultPrice: number | null;
  disabled?: boolean;
  onSave: (pricePence: number | null) => Promise<void>;
}) {
  const [value, setValue] = useState(sessionPriceToInput(sessionPrice));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(sessionPriceToInput(sessionPrice));
    setError(null);
  }, [sessionPrice]);

  const normalizedInput = value.trim();
  let parsedInput: number | null = null;
  let parseError: string | null = null;
  if (normalizedInput) {
    try {
      parsedInput = parseSessionPriceInput(normalizedInput);
    } catch (e) {
      parseError = e instanceof Error ? e.message : "Invalid price";
    }
  }

  const dirty =
    !parseError &&
    (normalizedInput
      ? parsedInput !== sessionPrice
      : sessionPrice != null);

  async function save(pricePence: number | null = normalizedInput ? parseSessionPriceInput(normalizedInput) : null) {
    setError(null);
    try {
      setSaving(true);
      await onSave(pricePence);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save price");
    } finally {
      setSaving(false);
    }
  }

  async function resetToClientDefault() {
    if (clientDefaultPrice == null) return;
    setValue(sessionPriceToInput(clientDefaultPrice));
    await save(clientDefaultPrice);
  }

  return (
    <div className="space-y-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-900">Session price</span>
        <span className="text-xs text-slate-500">
          Copied from the client profile when booked. Change here to override this
          session only.
        </span>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-slate-500">£</span>
          <input
            type="text"
            inputMode="decimal"
            disabled={disabled || saving}
            className="w-28 rounded-lg border border-slate-300 px-3 py-2"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.00"
          />
          {dirty ? (
            <Button
              type="button"
              variant="secondary"
              disabled={disabled || saving || !!parseError}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save price"}
            </Button>
          ) : null}
        </div>
      </label>
      {parseError ? <p className="text-sm text-red-600">{parseError}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {clientDefaultPrice != null &&
      sessionPrice != null &&
      sessionPrice !== clientDefaultPrice ? (
        <p className="text-xs text-slate-500">
          <button
            type="button"
            disabled={disabled || saving}
            onClick={() => void resetToClientDefault()}
            className="text-blue-600 hover:underline disabled:opacity-60"
          >
            Client default: {formatSessionPrice(clientDefaultPrice)}
          </button>
        </p>
      ) : null}
      {sessionPrice == null && clientDefaultPrice != null ? (
        <p className="text-xs text-slate-500">
          Using client default: {formatSessionPrice(clientDefaultPrice)}
        </p>
      ) : null}
    </div>
  );
}
