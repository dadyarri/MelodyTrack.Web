import { http } from "@/shared/api";

import type {
  AppointmentsAnalytics,
  ClientsAnalyticsResponse,
  DashboardStats,
  ExpensesAnalytics,
  PaymentsAnalytics,
  PriceChangeAnalytics,
  RevenueAnalytics,
} from "../model/types";

interface AnalyticsRange {
  timezone: string;
  start: string;
  end: string;
}

export const dashboardApi = {
  stats(timezone: string) {
    return http.get<DashboardStats>("/dashboard/stats", { params: { timezone } }).then((response) => response.data);
  },
  revenue(params: AnalyticsRange & { groupBy?: "day" | "week" | "month" | "year" }) {
    return http.get<RevenueAnalytics>("/dashboard/revenue", { params }).then((response) => response.data);
  },
  priceChanges(params: AnalyticsRange & { windowDays: number }) {
    return http.get<PriceChangeAnalytics>("/dashboard/price-changes", { params }).then((response) => response.data);
  },
  payments(params: AnalyticsRange) {
    return http.get<PaymentsAnalytics>("/dashboard/payments", { params }).then((response) => response.data);
  },
  appointments(params: AnalyticsRange) {
    return http.get<AppointmentsAnalytics>("/dashboard/appointments", { params }).then((response) => response.data);
  },
  clients(params: AnalyticsRange) {
    return http.get<ClientsAnalyticsResponse>("/dashboard/clients", { params }).then((response) => response.data);
  },
  expenses(params: AnalyticsRange & { groupBy?: "day" | "week" | "month" | "year" }) {
    return http.get<ExpensesAnalytics>("/dashboard/expenses", { params }).then((response) => response.data);
  },
};
