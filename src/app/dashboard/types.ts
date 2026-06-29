import type { TemplateView } from "@/components/TemplateEditor";

export type DashboardClient = {
  id: string;
  token: string;
  name: string;
  email: string;
  phone: string;
  lastMinuteOptIn: boolean;
  sessionPrice: number | null;
  recurringPreferences: {
    dayOfWeek: number;
    startTime: string;
    locationId: string | null;
  }[];
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

export type WhatsAppRow = {
  id: string;
  phone: string;
  messageType: string;
  body: string;
  createdAt: string;
};

export const NAV_ITEMS = [
  { label: "Schedule", href: "/dashboard/schedule" },
  { label: "Clients", href: "/dashboard/clients" },
  { label: "Sessions", href: "/dashboard/sessions" },
  { label: "WhatsApp", href: "/dashboard/whatsapp" },
] as const;

export type TrainerSettings = {
  scheduleStartTime: string;
  scheduleEndTime: string;
  scheduleDefaultView: "day" | "week";
  cancelDeadlineHours: number;
  lastMinuteOfferLockHours: number;
  clientBookingWindowWeeks: number;
  timezone: string;
  name: string;
  email: string;
  bankAccountNumber: string | null;
  bankSortCode: string | null;
  bankName: string | null;
  paymentPayeeName: string | null;
};

export type LocationRow = {
  id: string;
  name: string;
  address: string | null;
  createdAt: string;
};
