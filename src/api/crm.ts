import { Appointment, Client, ClientWithBalance, CreateEntityResponse, DashboardStats, Expense, LookupClient, LookupService, PaginatedParams, PaginatedResponse, Payment, Role, Service, Ulid, User } from "./types";
import { http } from "./http";

export const clientsApi = {
  list(params: PaginatedParams & Partial<Client> & { search?: string }) {
    return http.get<PaginatedResponse<Client>>("/clients", { params }).then((response) => response.data);
  },
  get(id: Ulid) {
    return http.get<Client>(`/clients/${id}`).then((response) => response.data);
  },
  lookup(search?: string) {
    return http
      .get<{ clients: LookupClient[] }>("/clients/lookup", { params: search ? { search } : undefined })
      .then((response) => response.data.clients);
  },
  create(input: { firstName: string; lastName: string; patronymic?: string | null; telegram?: string; vk?: string; phone?: string }) {
    return http.post<CreateEntityResponse>("/clients", input).then((response) => response.data);
  },
  update(id: Ulid, input: Partial<Client> & { telegram?: string; vk?: string; phone?: string }) {
    return http.put(`/clients/${id}`, input).then((response) => response.data);
  },
  remove(id: Ulid) {
    return http.delete(`/clients/${id}`).then((response) => response.data);
  },
  debtors() {
    return http
      .get<{ debtors: ClientWithBalance[] }>("/clients/inDebt")
      .then((response) => response.data.debtors);
  },
};

export const dashboardApi = {
  stats(timezone: string) {
    return http.get<DashboardStats>("/dashboard/stats", { params: { timezone } }).then((response) => response.data);
  },
};

export const servicesApi = {
  list(params: PaginatedParams & { name?: string }) {
    return http.get<PaginatedResponse<Service>>("/services", { params }).then((response) => response.data);
  },
  lookup(name?: string) {
    return http
      .get<{ services: LookupService[] }>("/services/lookup", { params: name ? { name } : undefined })
      .then((response) => response.data.services);
  },
  create(input: { name: string; description?: string; price: number }) {
    return http.post<CreateEntityResponse>("/services", input).then((response) => response.data);
  },
  updatePrice(id: Ulid, price: number) {
    return http.patch(`/services/${id}/price`, { price }).then((response) => response.data);
  },
};

export const paymentsApi = {
  list(params: PaginatedParams & { firstName?: string; lastName?: string }) {
    return http.get<PaginatedResponse<Payment>>("/payments", { params }).then((response) => response.data);
  },
  create(input: { clientId: Ulid; serviceId?: Ulid; amount: number; date: string; description?: string }) {
    return http.post<CreateEntityResponse>("/payments", input).then((response) => response.data);
  },
  remove(id: Ulid) {
    return http.delete(`/payments/${id}`).then((response) => response.data);
  },
};

export const expensesApi = {
  list(params: PaginatedParams & { start?: string; end?: string }) {
    return http.get<PaginatedResponse<Expense>>("/expenses", { params }).then((response) => response.data);
  },
  create(input: { description: string; amount: number }) {
    return http.post<CreateEntityResponse>("/expenses", input).then((response) => response.data);
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
    return http.get<{ appointments: Record<string, Appointment[]> }>("/appointments/mini", { params: { timezone } }).then((response) => response.data.appointments);
  },
  create(input: {
    clientId: Ulid;
    serviceId: Ulid;
    providerId?: Ulid;
    recurrenceTypeId?: Ulid;
    startDate: string;
    patternEndDate?: string;
    recurrencePattern?: number;
  }) {
    return http.post<CreateEntityResponse>("/appointments", input).then((response) => response.data);
  },
  update(id: Ulid, input: Partial<{ clientId: Ulid; serviceId: Ulid; providerId: Ulid; startDate: string; isCompleted: boolean; isCanceled: boolean }>) {
    return http.patch(`/appointments/${id}`, input).then((response) => response.data);
  },
  remove(id: Ulid) {
    return http.delete(`/appointments/${id}`).then((response) => response.data);
  },
};

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
