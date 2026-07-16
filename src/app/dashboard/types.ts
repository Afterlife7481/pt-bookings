import type { TemplateView } from "@/components/TemplateEditor";
import type { TrainerSettings } from "@/lib/services/settings";

export type { TrainerSettings };

export type DashboardClient = {
  id: string;
  token: string;
  name: string;
  email: string;
  phone: string;
  preferredNotifyChannel?: "email" | "whatsapp";
  lastMinuteOptIn: boolean;
  sessionPrice: number | null;
  enabledLocationIds: string[];
  recurringPreferences: {
    dayOfWeek: number;
    startTime: string;
    locationId: string | null;
  }[];
  lastSession: {
    startAt: string;
    endAt: string;
  } | null;
};

export type DashboardTemplate = TemplateView;

export type TrainerLocation = { id: string; name: string };

export type BookingRow = {
  booking: {
    id: string;
    token: string;
    status: string;
    isRecurring: boolean;
    sessionPaid: boolean;
    invoiceSentAt: string | null;
  };
  slot: { id: string; startAt: string; endAt: string; status: string };
  client: { id: string; name: string };
};

export const MENU_ITEMS = [
  { label: "Schedule", href: "/dashboard/schedule" },
  { label: "Activity Feed", href: "/dashboard/feed" },
  { label: "Clients", href: "/dashboard/clients" },
  { label: "Sessions", href: "/dashboard/sessions" },
  { label: "Install App on Phone", href: "/dashboard/settings/install" },
  { label: "Getting Started Guide", href: "/dashboard/settings/getting-started" },
  { label: "Feature Request", href: "/dashboard/feature-request" },
  { label: "Feedback", href: "/dashboard/feedback" },
  { label: "Invitations", href: "/dashboard/invitations" },
  { label: "Settings", href: "/dashboard/settings" },
  { label: "Account", href: "/dashboard/settings/account" },
] as const;

/** Hamburger menu sections, in display order (hrefs must match MENU_ITEMS). */
export const MENU_GROUPS = [
  [
    "/dashboard/schedule",
    "/dashboard/feed",
    "/dashboard/clients",
    "/dashboard/sessions",
  ],
  [
    "/dashboard/settings/install",
    "/dashboard/settings/getting-started",
    "/dashboard/feature-request",
    "/dashboard/feedback",
    "/dashboard/invitations",
  ],
  ["/dashboard/settings", "/dashboard/settings/account"],
] as const;

export type LocationRow = {
  id: string;
  name: string;
  address: string | null;
  createdAt: string;
};

export type HolidayRow = {
  id: string;
  startAt: string;
  endAt: string;
  label: string | null;
  createdAt: string;
};
