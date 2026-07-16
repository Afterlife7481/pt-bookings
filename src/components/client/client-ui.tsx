import {
  HubGroup,
  HubInset,
  HubPageLayout,
  HubRowLink,
} from "@/components/hub-ui";

export function ClientPageLayout({
  title,
  description,
  backHref,
  backLabel = "Home",
  children,
}: {
  title: string;
  description?: string;
  backHref: string;
  backLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <HubPageLayout
      title={title}
      description={description}
      backHref={backHref}
      backLabel={backLabel}
      className="pb-8"
    >
      {children}
    </HubPageLayout>
  );
}

export const ClientGroup = HubGroup;
export const ClientRowLink = HubRowLink;
export const ClientInset = HubInset;
