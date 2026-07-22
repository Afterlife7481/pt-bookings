import { describe, expect, it } from "vitest";
import {
  MESSAGE_TEMPLATE_DEFINITIONS,
  MESSAGE_TEMPLATE_GROUPS,
  renderMessageTemplate,
} from "@/lib/message-templates";

describe("message templates", () => {
  it("substitutes known placeholders and blanks unknown ones", () => {
    expect(
      renderMessageTemplate("Hi {{clientName}}, see {{bookingUrl}} {{missing}}", {
        clientName: "Sam",
        bookingUrl: "https://example.com/b",
      }),
    ).toBe("Hi Sam, see https://example.com/b ");
  });

  it("includes email and WhatsApp variants for core client messages", () => {
    const keys = MESSAGE_TEMPLATE_DEFINITIONS.map((d) => d.key);
    expect(keys).toContain("confirmation_email");
    expect(keys).toContain("confirmation_whatsapp");
    expect(keys).toContain("invoice_email");
    expect(keys).toContain("invoice_whatsapp");
    expect(keys).toContain("template_conflict_email");
    expect(keys).toContain("template_conflict_whatsapp");
    expect(keys).toContain("last_minute_prune_email");
  });

  it("groups templates by message type with email before WhatsApp", () => {
    const confirmation = MESSAGE_TEMPLATE_GROUPS.find(
      (g) => g.slug === "session-confirmation",
    );
    expect(confirmation?.keys).toEqual([
      "confirmation_email",
      "confirmation_whatsapp",
    ]);

    const allGroupedKeys = MESSAGE_TEMPLATE_GROUPS.flatMap((g) => [...g.keys]);
    const allDefinitionKeys = MESSAGE_TEMPLATE_DEFINITIONS.map((d) => d.key);
    expect(allGroupedKeys.sort()).toEqual([...allDefinitionKeys].sort());
  });
});
