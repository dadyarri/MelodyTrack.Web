import type { AppointmentRescheduleScope } from "@/features/schedule/ScheduleModals";
import { http } from "./http";
import type {
  Appointment,
  AppointmentsAnalytics,
  AuditLog,
  Client,
  ClientHistory,
  ClientWithBalance,
  CreateEntityResponse,
  CreateCustomTaskInput,
  DashboardStats,
  ExpensesResponse,
  ReferenceBookItem,
  LookupClient,
  LookupService,
  PaginatedParams,
  PaginatedResponse,
  PaymentsResponse,
  PaymentsAnalytics,
  ExpensesAnalytics,
  ClientsAnalyticsResponse,
  PriceChangeAnalytics,
  RecurrenceType,
  RevenueAnalytics,
  Role,
  RecurringTask,
  RecurringTaskListStatus,
  RecurringTaskRule,
  RecurringTaskType,
  Service,
  Ulid,
  UserAvailability,
  UserWorkingHoursDay,
  User,
} from "./types";

export const clientsApi = {
  list(params: PaginatedParams & Partial<Client> & { search?: string }) {
    return http.get<PaginatedResponse<Client>>("/clients", { params }).then((response) => response.data);
  },
  get(id: Ulid) {
    return http.get<Client>(`/clients/${id}`).then((response) => response.data);
  },
  history(id: Ulid, params?: PaginatedParams) {
    return http.get<ClientHistory>(`/clients/${id}/history`, { params }).then((response) => response.data);
  },
  lookup(search?: string) {
    return http
      .get<{
        clients: LookupClient[];
      }>("/clients/lookup", { params: search ? { search } : undefined })
      .then((response) => response.data.clients);
  },
  create(
    input: {
      firstName: string;
      lastName: string;
      patronymic?: string | null;
      dateOfBirth?: string | null;
      telegram?: string;
      vk?: string;
      phone?: string;
      sourceId?: Ulid;
    },
    options?: { replayKey?: string },
  ) {
    return http.post<CreateEntityResponse>("/clients", input, buildReplayConfig(options?.replayKey)).then((response) => response.data);
  },
  update(
    id: Ulid,
    input: {
      firstName?: string;
      lastName?: string;
      patronymic?: string | null;
      dateOfBirth?: string | null;
      telegram?: string;
      vk?: string;
      phone?: string;
      sourceId?: Ulid | null;
      vacations?: Array<{ startDate: string; endDate: string }>;
    },
    options?: { expectedActivityId?: Ulid },
  ) {
    return http
      .put<unknown>(`/clients/${id}`, {
        ...input,
        expectedActivityId: options?.expectedActivityId,
      })
      .then(() => undefined);
  },
  remove(id: Ulid, options?: { expectedActivityId?: Ulid }) {
    return http
      .delete<unknown>(`/clients/${id}`, {
        params: options?.expectedActivityId ? { expectedActivityId: options.expectedActivityId } : undefined,
      })
      .then(() => undefined);
  },
  debtors() {
    return http.get<{ debtors: ClientWithBalance[] }>("/clients/inDebt").then((response) => response.data.debtors);
  },
  exportDebtors() {
    return http.get<Blob>("/clients/inDebt/export", { responseType: "blob" }).then((response) => response.data);
  },
};

export const dashboardApi = {
  stats(timezone: string) {
    return http.get<DashboardStats>("/dashboard/stats", { params: { timezone } }).then((response) => response.data);
  },
  revenue(params: { timezone: string; start: string; end: string; groupBy?: "day" | "week" | "month" | "year" }) {
    return http.get<RevenueAnalytics>("/dashboard/revenue", { params }).then((response) => response.data);
  },
  priceChanges(params: { timezone: string; start: string; end: string; windowDays: number }) {
    return http.get<PriceChangeAnalytics>("/dashboard/price-changes", { params }).then((response) => response.data);
  },
  payments(params: { timezone: string; start: string; end: string }) {
    return http.get<PaymentsAnalytics>("/dashboard/payments", { params }).then((response) => response.data);
  },
  appointments(params: { timezone: string; start: string; end: string }) {
    return http.get<AppointmentsAnalytics>("/dashboard/appointments", { params }).then((response) => response.data);
  },
  clients(params: { timezone: string; start: string; end: string }) {
    return http.get<ClientsAnalyticsResponse>("/dashboard/clients", { params }).then((response) => response.data);
  },
  expenses(params: { timezone: string; start: string; end: string; groupBy?: "day" | "week" | "month" | "year" }) {
    return http.get<ExpensesAnalytics>("/dashboard/expenses", { params }).then((response) => response.data);
  },
};

export const auditApi = {
  list(params: PaginatedParams & { search?: string; timezone?: string }) {
    return http.get<PaginatedResponse<AuditLog>>("/audit-logs", { params }).then((response) => response.data);
  },
};

export const servicesApi = {
  list(params: PaginatedParams & { name?: string }) {
    return http.get<PaginatedResponse<Service>>("/services", { params }).then((response) => response.data);
  },
  get(id: Ulid) {
    return http.get<Service>(`/services/${id}`).then((response) => response.data);
  },
  lookup(name?: string) {
    return http
      .get<{
        services: LookupService[];
      }>("/services/lookup", { params: name ? { name } : undefined })
      .then((response) => response.data.services);
  },
  create(input: { name: string; description?: string; price: number }, options?: { replayKey?: string }) {
    return http.post<CreateEntityResponse>("/services", input, buildReplayConfig(options?.replayKey)).then((response) => response.data);
  },
  update(id: Ulid, input: { name: string; description?: string }, options?: { expectedActivityId?: Ulid }) {
    return http
      .put<unknown>(`/services/${id}`, {
        id,
        ...input,
        expectedActivityId: options?.expectedActivityId,
      })
      .then(() => undefined);
  },
  updatePrice(id: Ulid, price: number, options?: { expectedActivityId?: Ulid }) {
    return http
      .patch<unknown>(`/services/${id}/price`, {
        price,
        expectedActivityId: options?.expectedActivityId,
      })
      .then(() => undefined);
  },
  remove(id: Ulid, options?: { expectedActivityId?: Ulid }) {
    return http
      .delete<unknown>(`/services/${id}`, {
        params: options?.expectedActivityId ? { expectedActivityId: options.expectedActivityId } : undefined,
      })
      .then(() => undefined);
  },
};

export const tasksApi = {
  due(params: { timezone: string; status?: RecurringTaskListStatus; type?: RecurringTaskType | "all" }) {
    return http
      .get<{ tasks: RecurringTask[] }>("/tasks/due", {
        params: {
          timezone: params.timezone,
          status: params.status,
          type: params.type && params.type !== "all" ? params.type : undefined,
        },
      })
      .then((response) => response.data.tasks);
  },
  complete(input: {
    timezone: string;
    ruleId: Ulid;
    type: RecurringTaskType;
    deduplicationKey: string;
    clientId?: Ulid | null;
    teacherId?: Ulid | null;
    appointmentId?: Ulid | null;
    preparedMessage?: string | null;
  }) {
    return http.post<unknown>("/tasks/complete", input).then(() => undefined);
  },
  cancel(input: {
    timezone: string;
    ruleId: Ulid;
    type: RecurringTaskType;
    deduplicationKey: string;
    clientId?: Ulid | null;
    teacherId?: Ulid | null;
    appointmentId?: Ulid | null;
  }) {
    return http.post<unknown>("/tasks/cancel", input).then(() => undefined);
  },
  delay(input: {
    timezone: string;
    ruleId: Ulid;
    type: RecurringTaskType;
    deduplicationKey: string;
    delayUntilUtc: string;
    clientId?: Ulid | null;
    teacherId?: Ulid | null;
    appointmentId?: Ulid | null;
  }) {
    return http.post<unknown>("/tasks/delay", input).then(() => undefined);
  },
  teacherScheduleImage(params: { teacherId: Ulid; date: string; timezone: string }) {
    return http.get<Blob>("/tasks/teacher-schedule-image", { params, responseType: "blob" }).then((response) => response.data);
  },
  rules() {
    return http.get<{ rules: RecurringTaskRule[] }>("/tasks/rules").then((response) => response.data.rules);
  },
  updateRule(
    id: Ulid,
    input: {
      isEnabled: boolean;
      messageTemplate: string;
      offsetMinutes?: number | null;
      cooldownDays?: number | null;
    },
    options?: { expectedActivityId?: Ulid },
  ) {
    return http
      .put<unknown>(`/tasks/rules/${id}`, {
        ...input,
        expectedActivityId: options?.expectedActivityId,
      })
      .then(() => undefined);
  },
  createCustom(input: CreateCustomTaskInput) {
    return http.post<CreateEntityResponse>("/tasks/custom", input).then((response) => response.data);
  },
};

export const paymentsApi = {
  list(
    params: PaginatedParams & {
      firstName?: string;
      lastName?: string;
      search?: string;
      clientId?: string;
      serviceId?: string;
      start?: string;
      end?: string;
    },
  ) {
    return http.get<PaymentsResponse>("/payments", { params }).then((response) => response.data);
  },
  export(params: { search?: string; clientId?: string; serviceId?: string; start?: string; end?: string }) {
    return http.get<Blob>("/payments/export", { params, responseType: "blob" }).then((response) => response.data);
  },
  create(
    input: {
      clientId: Ulid;
      serviceId?: Ulid;
      amount: number;
      date: string;
      description?: string;
    },
    options?: { replayKey?: string },
  ) {
    return http.post<CreateEntityResponse>("/payments", input, buildReplayConfig(options?.replayKey)).then((response) => response.data);
  },
  update(
    id: Ulid,
    input: {
      clientId: Ulid;
      serviceId?: Ulid;
      amount: number;
      date: string;
      description?: string;
    },
    options?: { expectedActivityId?: Ulid },
  ) {
    return http
      .put<unknown>(`/payments/${id}`, {
        ...input,
        expectedActivityId: options?.expectedActivityId,
      })
      .then(() => undefined);
  },
  remove(id: Ulid, options?: { expectedActivityId?: Ulid }) {
    return http
      .delete<unknown>(`/payments/${id}`, {
        params: options?.expectedActivityId ? { expectedActivityId: options.expectedActivityId } : undefined,
      })
      .then(() => undefined);
  },
};

export const expenseCategoriesApi = {
  list() {
    return http.get<{ categories: ReferenceBookItem[] }>("/expense-categories").then((response) => response.data.categories);
  },
  create(input: { name: string }, options?: { replayKey?: string }) {
    return http
      .post<CreateEntityResponse>("/expense-categories", input, buildReplayConfig(options?.replayKey))
      .then((response) => response.data);
  },
  remove(id: Ulid, options?: { expectedActivityId?: Ulid }) {
    return http
      .delete<unknown>(`/expense-categories/${id}`, {
        params: options?.expectedActivityId ? { expectedActivityId: options.expectedActivityId } : undefined,
      })
      .then(() => undefined);
  },
};

export const clientSourcesApi = {
  list() {
    return http.get<{ sources: ReferenceBookItem[] }>("/client-sources").then((response) => response.data.sources);
  },
  create(input: { name: string }, options?: { replayKey?: string }) {
    return http
      .post<CreateEntityResponse>("/client-sources", input, buildReplayConfig(options?.replayKey))
      .then((response) => response.data);
  },
  remove(id: Ulid, options?: { expectedActivityId?: Ulid }) {
    return http
      .delete<unknown>(`/client-sources/${id}`, {
        params: options?.expectedActivityId ? { expectedActivityId: options.expectedActivityId } : undefined,
      })
      .then(() => undefined);
  },
};

export const expensesApi = {
  list(params: PaginatedParams & { start?: string; end?: string; search?: string }) {
    return http.get<ExpensesResponse>("/expenses", { params }).then((response) => response.data);
  },
  export(params: { start?: string; end?: string; search?: string }) {
    return http.get<Blob>("/expenses/export", { params, responseType: "blob" }).then((response) => response.data);
  },
  create(input: { description: string; amount: number; date: string; categoryId?: Ulid }, options?: { replayKey?: string }) {
    return http.post<CreateEntityResponse>("/expenses", input, buildReplayConfig(options?.replayKey)).then((response) => response.data);
  },
  update(
    id: Ulid,
    input: { description: string; amount: number; date: string; categoryId?: Ulid },
    options?: { expectedActivityId?: Ulid },
  ) {
    return http.put<unknown>(`/expenses/${id}`, { id, ...input, expectedActivityId: options?.expectedActivityId }).then(() => undefined);
  },
  remove(id: Ulid, options?: { expectedActivityId?: Ulid }) {
    return http
      .delete<unknown>(`/expenses/${id}`, {
        params: options?.expectedActivityId ? { expectedActivityId: options.expectedActivityId } : undefined,
      })
      .then(() => undefined);
  },
};

export const scheduleApi = {
  list(params: { timezone: string; startDate: string; endDate: string }) {
    return http.get<{ appointments: Appointment[] }>("/appointments", { params }).then((response) => response.data.appointments);
  },
  mini(timezone: string) {
    return http
      .get<{
        appointments: Record<string, Appointment[]>;
      }>("/appointments/mini", { params: { timezone } })
      .then((response) => response.data.appointments);
  },
  recurrenceTypes() {
    return http
      .get<{
        recurrenceTypes: RecurrenceType[];
      }>("/appointments/recurrenceTypes")
      .then((response) => response.data.recurrenceTypes);
  },
  create(
    input: {
      clientId: Ulid;
      serviceId: Ulid;
      providerId?: Ulid;
      recurrenceTypeId?: Ulid;
      startDate: string;
      timezone: string;
      patternEndDate?: string;
      recurrencePattern?: number;
    },
    options?: { replayKey?: string },
  ) {
    return http.post<CreateEntityResponse>("/appointments", input, buildReplayConfig(options?.replayKey)).then((response) => response.data);
  },
  update(
    id: Ulid,
    input: Partial<{
      clientId: Ulid;
      serviceId: Ulid;
      providerId: Ulid;
      startDate: string;
      timezone: string;
      status: "planned" | "completed" | "cancelled" | "burned";
      scope: AppointmentRescheduleScope;
      expectedActivityId: Ulid;
    }>,
  ) {
    return http.patch<unknown>(`/appointments/${id}`, input).then(() => undefined);
  },
  remove(
    id: Ulid,
    scope?: "single" | "this-and-following" | "all" | "weekday-this-and-following" | "weekday-all",
    options?: { expectedActivityId?: Ulid },
  ) {
    return http
      .delete<unknown>(`/appointments/${id}`, {
        params: {
          ...(scope ? { scope } : {}),
          ...(options?.expectedActivityId ? { expectedActivityId: options.expectedActivityId } : {}),
        },
      })
      .then(() => undefined);
  },
};

function buildReplayConfig(replayKey?: string) {
  return replayKey
    ? {
        headers: {
          "Idempotency-Key": replayKey,
        },
      }
    : undefined;
}

export const usersApi = {
  list() {
    return http.get<{ users: User[] }>("/users").then((response) => response.data.users);
  },
  update(
    id: Ulid,
    input: {
      firstName: string;
      lastName: string;
      phone?: string;
      telegram?: string;
      vk?: string;
    },
    options?: { expectedActivityId?: Ulid },
  ) {
    return http
      .put<unknown>(`/users/${id}`, {
        ...input,
        expectedActivityId: options?.expectedActivityId,
      })
      .then(() => undefined);
  },
  listAvailabilities() {
    return http.get<{ availabilities: UserAvailability[] }>("/users/availability").then((response) => response.data.availabilities);
  },
  getAvailability(id: Ulid) {
    return http.get<UserAvailability>(`/users/${id}/availability`).then((response) => response.data);
  },
  updateAvailability(
    id: Ulid,
    input: {
      workingHours: UserWorkingHoursDay[];
      vacations: Array<{ startDate: string; endDate: string }>;
    },
    options?: { expectedActivityId?: Ulid },
  ) {
    return http
      .put<unknown>(`/users/${id}/availability`, {
        ...input,
        expectedActivityId: options?.expectedActivityId,
      })
      .then(() => undefined);
  },
};

export const rolesApi = {
  lookup() {
    return http.get<{ roles: Role[] }>("/roles/lookup").then((response) => response.data.roles);
  },
};
