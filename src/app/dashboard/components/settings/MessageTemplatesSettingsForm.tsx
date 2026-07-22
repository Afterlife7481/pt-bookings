"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, InlineNotice } from "@/components/ui";
import { ApiError, fetchJson } from "@/lib/api/fetch-json";
import type { MessageTemplateKey } from "@/lib/message-templates";

type TemplateItem = {
  key: MessageTemplateKey;
  label: string;
  channel: "email" | "whatsapp";
  description: string;
  hasSubject: boolean;
  subject: string | null;
  body: string;
  defaultSubject: string | null;
  defaultBody: string;
  isCustomized: boolean;
  placeholders: Array<{ name: string; description: string }>;
};

function channelLabel(channel: "email" | "whatsapp"): string {
  return channel === "email" ? "Email" : "WhatsApp";
}

export function MessageTemplatesSettingsForm() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<MessageTemplateKey | null>(null);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<MessageTemplateKey | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await fetchJson<{ templates: TemplateItem[] }>(
        "/api/settings/message-templates",
      );
      setTemplates(data.templates);
    } catch (e) {
      setLoadError(
        e instanceof ApiError ? e.message : "Failed to load templates",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(template: TemplateItem) {
    setEditingKey(template.key);
    setDraftSubject(template.subject ?? "");
    setDraftBody(template.body);
    setError(null);
    setSavedKey(null);
  }

  function cancelEdit() {
    setEditingKey(null);
    setError(null);
  }

  async function save(key: MessageTemplateKey, hasSubject: boolean) {
    setSaving(true);
    setError(null);
    setSavedKey(null);
    try {
      const data = await fetchJson<{ template: TemplateItem }>(
        "/api/settings/message-templates",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key,
            subject: hasSubject ? draftSubject : null,
            body: draftBody,
          }),
        },
      );
      setTemplates((prev) =>
        prev.map((t) => (t.key === key ? data.template : t)),
      );
      setEditingKey(null);
      setSavedKey(key);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function reset(key: MessageTemplateKey) {
    setResetting(true);
    setError(null);
    setSavedKey(null);
    try {
      const data = await fetchJson<{ template: TemplateItem }>(
        `/api/settings/message-templates?key=${encodeURIComponent(key)}`,
        { method: "DELETE" },
      );
      setTemplates((prev) =>
        prev.map((t) => (t.key === key ? data.template : t)),
      );
      setEditingKey(null);
      setSavedKey(key);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to reset");
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading templates…</p>;
  }

  if (loadError) {
    return <InlineNotice tone="error">{loadError}</InlineNotice>;
  }

  const emailTemplates = templates.filter((t) => t.channel === "email");
  const whatsappTemplates = templates.filter((t) => t.channel === "whatsapp");

  function renderGroup(title: string, items: TemplateItem[]) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {items.map((template) => {
            const isEditing = editingKey === template.key;
            return (
              <li key={template.key} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-slate-900">
                        {template.label}
                      </h3>
                      {template.isCustomized ? (
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Customized
                        </span>
                      ) : (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {template.description}
                    </p>
                  </div>
                  {!isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => startEdit(template)}
                      >
                        Edit
                      </Button>
                      {template.isCustomized ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => void reset(template.key)}
                          disabled={resetting}
                        >
                          {resetting ? "Resetting…" : "Reset to default"}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {!isEditing ? (
                  <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    {template.hasSubject && template.subject ? (
                      <p>
                        <span className="font-medium text-slate-500">
                          Subject:{" "}
                        </span>
                        {template.subject}
                      </p>
                    ) : null}
                    <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                      {template.body}
                    </pre>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {template.hasSubject ? (
                      <label className="block space-y-1">
                        <span className="text-sm font-medium text-slate-700">
                          Subject
                        </span>
                        <input
                          type="text"
                          value={draftSubject}
                          onChange={(e) => setDraftSubject(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                      </label>
                    ) : null}
                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-slate-700">
                        Message
                      </span>
                      <textarea
                        value={draftBody}
                        onChange={(e) => setDraftBody(e.target.value)}
                        rows={6}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                    </label>
                    <p className="text-xs text-slate-500">
                      Placeholders:{" "}
                      {template.placeholders
                        .map((p) => `{{${p.name}}}`)
                        .join(", ")}
                    </p>
                    {error && editingKey === template.key ? (
                      <InlineNotice tone="error">{error}</InlineNotice>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() =>
                          void save(template.key, template.hasSubject)
                        }
                        disabled={saving || resetting}
                      >
                        {saving ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={cancelEdit}
                        disabled={saving || resetting}
                      >
                        Cancel
                      </Button>
                      {template.isCustomized ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => void reset(template.key)}
                          disabled={saving || resetting}
                        >
                          {resetting ? "Resetting…" : "Reset to default"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )}

                {savedKey === template.key && !isEditing ? (
                  <p className="mt-2 text-sm text-emerald-700">Saved</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-600">
        These messages are sent to clients by {channelLabel("email").toLowerCase()}{" "}
        or WhatsApp. Use placeholders like{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
          {"{{clientName}}"}
        </code>{" "}
        — they are filled in when the message is sent.
      </p>
      {renderGroup("Email", emailTemplates)}
      {renderGroup("WhatsApp", whatsappTemplates)}
    </div>
  );
}
