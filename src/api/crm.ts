import { http } from "./http";
import type {
  Appointment,
  AuditLog,
  Client,
  ClientHistory,
  ClientWithBalance,
  CreateEntityResponse,
  DashboardStats,
  ExpensesResponse,
  LookupClient,
  LookupService,
  PaginatedParams,
  PaginatedResponse,
  PaymentsResponse,
  RecurrenceType,
  Role,
  Service,
  Ulid,
  User,
} from "./types";

export const clientsApi = {
  list(params: PaginatedParams & Partial<Client> & { search?: string }) {
    return http.get<PaginatedResponse<Client>>("/clients", { params }).then((response) => response.data);
  },
  get(id: Ulid) {
    return http.get<Client>(`/clients/${id}`).then((response) => response.data);
  },
  history(id: Ulid) {
    return http.get<ClientHistory>(`/clients/${id}/history`).then((response) => response.data);
  },
  lookup(search?: string) {
    return http
      .get<{ clients: LookupClient[] }>("/clients/lookup", { params: search ? { search } : undefined })
      .then((response) => response.data.clients);
  },
  create(
    input: { firstName: string; lastName: string; patronymic?: string | null; telegram?: string; vk?: string; phone?: string },
    options?: { replayKey?: string },
  ) {
    return http.post<CreateEntityResponse>("/clients", input, buildReplayConfig(options?.replayKey)).then((response) => response.data);
  },
  update(id: Ulid, input: Partial<Client> & { telegram?: string; vk?: string; phone?: string }, options?: { expectedActivityId?: Ulid }) {
    return http.put(`/clients/${id}`, { ...input, expectedActivityId: options?.expectedActivityId }).then((response) => response.data);
  },
  remove(id: Ulid, options?: { expectedActivityId?: Ulid }) {
    return http
      .delete(`/clients/${id}`, { params: options?.expectedActivityId ? { expectedActivityId: options.expectedActivityId } : undefined })
      .then((response) => response.data);
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
};

export const auditApi = {
  list(params: PaginatedParams & { search?: string }) {
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
      .get<{ services: LookupService[] }>("/services/lookup", { params: name ? { name } : undefined })
      .then((response) => response.data.services);
  },
  create(input: { name: string; description?: string; price: number }, options?: { replayKey?: string }) {
    return http.post<CreateEntityResponse>("/services", input, buildReplayConfig(options?.replayKey)).then((response) => response.data);
  },
  updatePrice(id: Ulid, price: number) {
    return http.patch(`/services/${id}/price`, { price }).then((response) => response.data);
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
    input: { clientId: Ulid; serviceId?: Ulid; amount: number; date: string; description?: string },
    options?: { replayKey?: string },
  ) {
    return http.post<CreateEntityResponse>("/payments", input, buildReplayConfig(options?.replayKey)).then((response) => response.data);
  },
  remove(id: Ulid, options?: { expectedActivityId?: Ulid }) {
    return http
      .delete(`/payments/${id}`, { params: options?.expectedActivityId ? { expectedActivityId: options.expectedActivityId } : undefined })
      .then((response) => response.data);
  },
};

export const expensesApi = {
  list(params: PaginatedParams & { start?: string; end?: string; search?: string }) {
    return http.get<ExpensesResponse>("/expenses", { params }).then((response) => response.data);
  },
  export(params: { start?: string; end?: string; search?: string }) {
    return http.get<Blob>("/expenses/export", { params, responseType: "blob" }).then((response) => response.data);
  },
  create(input: { description: string; amount: number }, options?: { replayKey?: string }) {
    return http.post<CreateEntityResponse>("/expenses", input, buildReplayConfig(options?.replayKey)).then((response) => response.data);
  },
  remove(id: Ulid) {
    return http.delete(`/expenses/${id}`).then((response) => response.data);
  },
};

export const scheduleApi = {
  list(params: { timezone: string; startDate: string; endDate: string }) {
    return http.get<{ appointments: Appointment[] }>("/appointments", { params }).then((response) => response.data.appointments);
  },
  mini(timezone: string) {
    return http
      .get<{ appointments: Record<string, Appointment[]> }>("/appointments/mini", { params: { timezone } })
      .then((response) => response.data.appointments);
  },
  recurrenceTypes() {
    return http
      .get<{ recurrenceTypes: RecurrenceType[] }>("/appointments/recurrenceTypes")
      .then((response) => response.data.recurrenceTypes);
  },
  create(
    input: {
      clientId: Ulid;
      serviceId: Ulid;
      providerId?: Ulid;
      recurrenceTypeId?: Ulid;
      startDate: string;
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
      isCompleted: boolean;
      isCanceled: boolean;
      expectedActivityId: Ulid;
    }>,
  ) {
    return http.patch(`/appointments/${id}`, input).then((response) => response.data);
  },
  remove(id: Ulid, scope?: "single" | "this-and-following" | "all", options?: { expectedActivityId?: Ulid }) {
    return http
      .delete(`/appointments/${id}`, {
        params: {
          ...(scope ? { scope } : {}),
          ...(options?.expectedActivityId ? { expectedActivityId: options.expectedActivityId } : {}),
        },
      })
      .then((response) => response.data);
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
};

export const rolesApi = {
  lookup() {
    return http.get<{ roles: Role[] }>("/roles/lookup").then((response) => response.data.roles);
  },
};
