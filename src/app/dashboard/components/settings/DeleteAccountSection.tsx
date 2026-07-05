"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, InlineNotice } from "@/components/ui";
import { SheetModal } from "@/components/SheetModal";
import { ApiError, fetchJson } from "@/lib/api/fetch-json";
import { isProtectedTrainerEmail } from "@/lib/constants";
import type { TrainerSettings } from "../../types";

export function DeleteAccountSection({
  settings,
}: {
  settings: TrainerSettings | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountEmail = settings?.email ?? "";
  const isProtected = accountEmail ? isProtectedTrainerEmail(accountEmail) : false;
  const emailMatches =
    confirmEmail.trim().toLowerCase() === accountEmail.toLowerCase().trim();

  useEffect(() => {
    if (!open) {
      setConfirmEmail("");
      setError(null);
    }
  }, [open]);

  async function deleteAccount() {
    if (!emailMatches) return;

    setDeleting(true);
    setError(null);
    try {
      await fetchJson("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: confirmEmail.trim() }),
      });
      router.replace("/login");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  }

  if (!settings || isProtected) {
    return null;
  }

  return (
    <>
      <section className="mt-10 border-t border-slate-200 pt-8">
        <h2 className="text-base font-semibold text-slate-900">Delete account</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Permanently remove your account and all associated data — clients, sessions,
          schedule, templates, and messages. This cannot be undone.
        </p>
        <Button
          type="button"
          variant="danger"
          className="mt-4"
          onClick={() => setOpen(true)}
        >
          Delete account
        </Button>
      </section>

      {open ? (
        <SheetModal
          title="Delete your account?"
          subtitle="This permanently deletes your account and every client, session, booking, and setting linked to it."
          onClose={() => !deleting && setOpen(false)}
          footer={
            <>
              <Button
                variant="danger"
                className="w-full"
                disabled={!emailMatches || deleting}
                onClick={deleteAccount}
              >
                {deleting ? "Deleting…" : "Delete my account permanently"}
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                disabled={deleting}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </>
          }
        >
          <div className="mt-4 space-y-4">
            <InlineNotice tone="warning">
              You will lose all data immediately. There is no way to recover your
              account after deletion.
            </InlineNotice>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">
                Type your email to confirm
              </span>
              <span className="text-xs text-slate-500">{accountEmail}</span>
              <input
                type="email"
                autoComplete="off"
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={accountEmail}
                disabled={deleting}
              />
            </label>
            {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
          </div>
        </SheetModal>
      ) : null}
    </>
  );
}
