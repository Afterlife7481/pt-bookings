import { MESSAGE_TEMPLATE_GROUPS } from "@/lib/message-templates";
import {
  SettingsGroup,
  SettingsInset,
  SettingsPageLayout,
  SettingsRowLink,
} from "../../components/settings/settings-ui";

export default function MessageTemplatesSettingsPage() {
  return (
    <SettingsPageLayout
      title="Message templates"
      description="Edit the email and WhatsApp messages sent to your clients, or reset them to the defaults."
    >
      <SettingsInset>
        <SettingsGroup>
          {MESSAGE_TEMPLATE_GROUPS.map((group) => (
            <SettingsRowLink
              key={group.slug}
              href={`/dashboard/settings/message-templates/${group.slug}`}
              title={group.label}
              subtitle={group.description}
            />
          ))}
        </SettingsGroup>
      </SettingsInset>
    </SettingsPageLayout>
  );
}
