export type ClientBooking = {
  id: string;
  token: string;
  status: string;
  isRecurring: boolean;
  sessionStartAt: string;
  slotStartAt: string;
  slotEndAt: string | null;
};

export type ClientLocationOption = {
  id: string;
  name: string;
  enabled: boolean;
};

export type ClientDetail = {
  id: string;
  token: string;
  portalUrl: string;
  name: string;
  email: string;
  phone: string;
  preferredNotifyChannel: "email" | "whatsapp";
  lastMinuteOptIn: boolean;
  sessionPrice: number | null;
  createdAt: string;
  recurringPreferences: {
    dayOfWeek: number;
    startTime: string;
    locationId: string | null;
  }[];
  locations: ClientLocationOption[];
  bookings: ClientBooking[];
};
