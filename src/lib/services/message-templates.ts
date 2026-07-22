import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { messageTemplates } from "@/lib/db/schema";
import { nowIso } from "@/lib/constants";
import {
  MESSAGE_TEMPLATE_DEFINITIONS,
  assertValidMessageTemplateContent,
  getMessageTemplateDefinition,
  isMessageTemplateKey,
  renderMessageTemplate,
  type MessageTemplateKey,
} from "@/lib/message-templates";

export type ResolvedMessageTemplate = {
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

export async function listMessageTemplatesForTrainer(
  trainerId: string,
): Promise<ResolvedMessageTemplate[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.trainerId, trainerId));

  const byKey = new Map(
    rows
      .filter((row) => isMessageTemplateKey(row.templateKey))
      .map((row) => [row.templateKey as MessageTemplateKey, row]),
  );

  return MESSAGE_TEMPLATE_DEFINITIONS.map((def) => {
    const override = byKey.get(def.key);
    return {
      key: def.key,
      label: def.label,
      channel: def.channel,
      description: def.description,
      hasSubject: def.hasSubject,
      subject: override?.subject ?? def.defaultSubject,
      body: override?.body ?? def.defaultBody,
      defaultSubject: def.defaultSubject,
      defaultBody: def.defaultBody,
      isCustomized: Boolean(override),
      placeholders: def.placeholders,
    };
  });
}

export async function resolveMessageTemplate(
  trainerId: string,
  key: MessageTemplateKey,
): Promise<{ subject: string | null; body: string }> {
  const def = getMessageTemplateDefinition(key);
  const db = getDb();
  const rows = await db
    .select()
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.trainerId, trainerId),
        eq(messageTemplates.templateKey, key),
      ),
    )
    .limit(1);

  const override = rows[0];
  return {
    subject: override?.subject ?? def.defaultSubject,
    body: override?.body ?? def.defaultBody,
  };
}

/** Resolve template then substitute placeholders. */
export async function renderTrainerMessageTemplate(
  trainerId: string,
  key: MessageTemplateKey,
  vars: Record<string, string>,
): Promise<{ subject: string | null; body: string }> {
  const resolved = await resolveMessageTemplate(trainerId, key);
  return {
    subject: resolved.subject
      ? renderMessageTemplate(resolved.subject, vars)
      : null,
    body: renderMessageTemplate(resolved.body, vars),
  };
}

export async function upsertMessageTemplate(
  trainerId: string,
  key: MessageTemplateKey,
  content: { subject?: string | null; body: string },
): Promise<ResolvedMessageTemplate> {
  const def = getMessageTemplateDefinition(key);
  const body = content.body.trim();
  const subject = def.hasSubject
    ? (content.subject ?? "").trim()
    : null;

  assertValidMessageTemplateContent({ key, subject, body });

  const db = getDb();
  const existing = await db
    .select()
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.trainerId, trainerId),
        eq(messageTemplates.templateKey, key),
      ),
    )
    .limit(1);

  const updatedAt = nowIso();
  if (existing[0]) {
    await db
      .update(messageTemplates)
      .set({ subject, body, updatedAt })
      .where(eq(messageTemplates.id, existing[0].id));
  } else {
    await db.insert(messageTemplates).values({
      id: nanoid(),
      trainerId,
      templateKey: key,
      subject,
      body,
      updatedAt,
    });
  }

  const list = await listMessageTemplatesForTrainer(trainerId);
  const item = list.find((t) => t.key === key);
  if (!item) throw new Error("Template not found after save");
  return item;
}

export async function resetMessageTemplate(
  trainerId: string,
  key: MessageTemplateKey,
): Promise<ResolvedMessageTemplate> {
  if (!isMessageTemplateKey(key)) {
    throw new Error("Unknown message template");
  }

  const db = getDb();
  await db
    .delete(messageTemplates)
    .where(
      and(
        eq(messageTemplates.trainerId, trainerId),
        eq(messageTemplates.templateKey, key),
      ),
    );

  const list = await listMessageTemplatesForTrainer(trainerId);
  const item = list.find((t) => t.key === key);
  if (!item) throw new Error("Template not found after reset");
  return item;
}
