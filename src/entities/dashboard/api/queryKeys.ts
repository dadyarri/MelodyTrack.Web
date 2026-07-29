import type { Dayjs } from "dayjs";

function dayjsKey(value?: Dayjs | null) {
  return value?.toISOString() ?? null;
}

export const analyticsQueryKeys = {
  all: ["dashboard"] as const,
  stats: (timezone: string) => ["dashboard", "stats", timezone] as const,
  revenue: (timezone: string, startDate?: Dayjs | null, endDate?: Dayjs | null, groupBy?: string | null) =>
    ["dashboard", "revenue", timezone, dayjsKey(startDate), dayjsKey(endDate), groupBy ?? null] as const,
  priceChanges: (timezone: string, startDate?: Dayjs | null, endDate?: Dayjs | null, windowDays?: number | null) =>
    ["dashboard", "price-changes", timezone, dayjsKey(startDate), dayjsKey(endDate), windowDays ?? null] as const,
  payments: (timezone: string, startDate?: Dayjs | null, endDate?: Dayjs | null) =>
    ["dashboard", "payments", timezone, dayjsKey(startDate), dayjsKey(endDate)] as const,
  appointments: (timezone: string, startDate?: Dayjs | null, endDate?: Dayjs | null) =>
    ["dashboard", "appointments", timezone, dayjsKey(startDate), dayjsKey(endDate)] as const,
  clients: (timezone: string, startDate?: Dayjs | null, endDate?: Dayjs | null) =>
    ["dashboard", "clients", timezone, dayjsKey(startDate), dayjsKey(endDate)] as const,
  expenses: (timezone: string, startDate?: Dayjs | null, endDate?: Dayjs | null, groupBy?: string | null) =>
    ["dashboard", "expenses", timezone, dayjsKey(startDate), dayjsKey(endDate), groupBy ?? null] as const,
};
