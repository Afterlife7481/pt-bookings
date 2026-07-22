import { notFound } from "next/navigation";
import { MessageTemplateGroupEditor } from "../../../components/settings/MessageTemplatesSettingsForm";
import {
  SettingsInset,
  SettingsPageLayout,
} from "../../../components/settings/settings-ui";
import {
  getMessageTemplateGroup,
  isMessageTemplateGroupSlug,
} from "@/lib/message-templates";

export default async function MessageTemplateGroupPage({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const { group: slug } = await params;

  if (!isMessageTemplateGroupSlug(slug)) {
    notFound();
  }

  const group = getMessageTemplateGroup(slug);

  return (
    <SettingsPageLayout
      title={group.label}
      description={group.description}
      backHref="/dashboard/settings/message-templates"
      backLabel="Message templates"
    >
      <SettingsInset>
        <MessageTemplateGroupEditor groupSlug={slug} />
      </SettingsInset>
    </SettingsPageLayout>
  );
}
