import {
  HubGroup,
  HubInset,
  HubPageLayout,
  HubRowButton,
  HubRowLink,
} from "@/components/hub-ui";

export function SettingsPageLayout({
  title,
  description,
  backHref = "/dashboard/settings",
  backLabel = "Settings",
  showBackLink = true,
  children,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  showBackLink?: boolean;
  children: React.ReactNode;
}) {
  return (
    <HubPageLayout
      title={title}
      description={description}
      backHref={backHref}
      backLabel={backLabel}
      showBackLink={showBackLink}
    >
      {children}
    </HubPageLayout>
  );
}

export const SettingsGroup = HubGroup;
export const SettingsRowLink = HubRowLink;
export const SettingsRowButton = HubRowButton;
export const SettingsInset = HubInset;
