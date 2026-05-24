import type { Dayjs } from "dayjs";

function formatDateKey(value?: string | number | null) {
  return value ?? null;
}

function formatDayjsKey(value?: Dayjs | null) {
  return value?.toISOString() ?? null;
}

export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
    sessions: ["auth", "sessions"] as const,
    invite: (code?: string | null) => ["auth", "invite", formatDateKey(code)] as const,
  },
  onboarding: {
    state: ["onboarding", "state"] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    stats: (timezone: string) => ["dashboard", "stats", timezone] as const,
    revenue: (timezone: string, startDate?: Dayjs | null, endDate?: Dayjs | null, groupBy?: string | null) =>
      ["dashboard", "revenue", timezone, formatDayjsKey(startDate), formatDayjsKey(endDate), formatDateKey(groupBy)] as const,
    priceChanges: (timezone: string, startDate?: Dayjs | null, endDate?: Dayjs | null, windowDays?: number | null) =>
      ["dashboard", "price-changes", timezone, formatDayjsKey(startDate), formatDayjsKey(endDate), formatDateKey(windowDays)] as const,
    payments: (timezone: string, startDate?: Dayjs | null, endDate?: Dayjs | null) =>
      ["dashboard", "payments", timezone, formatDayjsKey(startDate), formatDayjsKey(endDate)] as const,
    appointments: (timezone: string, startDate?: Dayjs | null, endDate?: Dayjs | null) =>
      ["dashboard", "appointments", timezone, formatDayjsKey(startDate), formatDayjsKey(endDate)] as const,
    clients: (timezone: string, startDate?: Dayjs | null, endDate?: Dayjs | null) =>
      ["dashboard", "clients", timezone, formatDayjsKey(startDate), formatDayjsKey(endDate)] as const,
    expenses: (timezone: string, startDate?: Dayjs | null, endDate?: Dayjs | null, groupBy?: string | null) =>
      ["dashboard", "expenses", timezone, formatDayjsKey(startDate), formatDayjsKey(endDate), formatDateKey(groupBy)] as const,
  },
  audit: {
    all: ["audit"] as const,
    list: (page: number, search: string, timezone: string) => ["audit", "list", page, search, timezone] as const,
  },
  clients: {
    all: ["clients"] as const,
    list: (page: number, search: string) => ["clients", "list", page, search] as const,
    history: (clientId?: string | null) => ["clients", "history", formatDateKey(clientId)] as const,
    debtors: ["clients", "debtors"] as const,
    lookup: (search: string) => ["clients", "lookup", search] as const,
    selected: (clientId?: string) => ["clients", "selected", formatDateKey(clientId)] as const,
    sources: ["client-sources"] as const,
  },
  services: {
    all: ["services"] as const,
    list: (page: number) => ["services", "list", page] as const,
    lookup: (search: string) => ["services", "lookup", search] as const,
    selected: (serviceId?: string) => ["services", "selected", formatDateKey(serviceId)] as const,
  },
  payments: {
    all: ["payments"] as const,
    list: (page: number, search: string, clientId?: string, serviceId?: string, startDate?: Dayjs | null, endDate?: Dayjs | null) =>
      [
        "payments",
        "list",
        page,
        search,
        formatDateKey(clientId),
        formatDateKey(serviceId),
        formatDayjsKey(startDate),
        formatDayjsKey(endDate),
      ] as const,
  },
  expenses: {
    all: ["expenses"] as const,
    list: (page: number, search: string, startDate?: Dayjs | null, endDate?: Dayjs | null) =>
      ["expenses", "list", page, search, formatDayjsKey(startDate), formatDayjsKey(endDate)] as const,
    categories: ["expense-categories"] as const,
  },
  users: {
    all: ["users"] as const,
    availability: (userId?: string) => ["users", "availability", formatDateKey(userId)] as const,
    availabilities: ["users", "availability", "all"] as const,
    roles: ["roles", "lookup"] as const,
  },
  schedule: {
    all: ["schedule"] as const,
    appointmentsAll: ["schedule", "appointments"] as const,
    appointments: (startDateIso: string, endDateIso: string) => ["schedule", "appointments", startDateIso, endDateIso] as const,
    recurrenceTypes: ["schedule", "recurrenceTypes"] as const,
    availability: (userId?: string) => ["schedule", "availability", formatDateKey(userId)] as const,
    mini: (timezone: string) => ["schedule", "mini", timezone] as const,
  },
};
