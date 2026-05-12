export type Ulid = string;

export interface PagedInfo {
  page: number;
  pageSize: number;
  total: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  info: PagedInfo;
}

export interface MoneyListSummary {
  totalAmount: number;
  itemsCount: number;
  firstPaymentAtUtc?: string | null;
  lastPaymentAtUtc?: string | null;
  firstExpenseAtUtc?: string | null;
  lastExpenseAtUtc?: string | null;
}

export interface PaginatedParams {
  page?: number;
  page_size?: number;
}

export interface CreateEntityResponse {
  id: Ulid;
}

export interface ClientContacts {
  id?: Ulid;
  telegram?: string | null;
  vk?: string | null;
  phone?: string | null;
}

export interface Client {
  id: Ulid;
  firstName: string;
  lastName: string;
  patronymic?: string | null;
  contacts?: ClientContacts | null;
  balance: number;
}

export interface ClientWithBalance extends Client {
  balance: number;
}

export interface ClientHistorySummary {
  totalPayments: number;
  paymentsCount: number;
  completedAppointmentsCount: number;
  upcomingAppointmentsCount: number;
  lastPaymentAtUtc?: string | null;
  lastVisitAtUtc?: string | null;
  nextAppointmentAtUtc?: string | null;
}

export interface ClientHistoryPayment {
  id: Ulid;
  amount: number;
  date: string;
  description: string;
  serviceName?: string | null;
}

export interface ClientHistoryAppointment {
  id: Ulid;
  startDate: string;
  endDate: string;
  serviceName: string;
  providerDisplayName?: string | null;
  isCompleted: boolean;
  isCanceled: boolean;
}

export interface ClientHistory {
  client: Client;
  summary: ClientHistorySummary;
  recentPayments: ClientHistoryPayment[];
  recentAppointments: ClientHistoryAppointment[];
}

export interface LookupClient {
  id: Ulid;
  firstName: string;
  lastName: string;
  patronymic?: string | null;
  contacts?: ClientContacts | null;
}

export interface Service {
  id: Ulid;
  name: string;
  description?: string | null;
  price: number;
}

export interface LookupService {
  id: Ulid;
  name: string;
}

export interface User {
  id: Ulid;
  firstName: string;
  lastName: string;
  roleDisplayName: string;
}

export interface Role {
  id: Ulid;
  displayName: string;
}

export interface AppointmentRecurrenceRule {
  id: Ulid;
  startDate: string;
  endDate?: string | null;
  key: "daily" | "weekly" | "monthly";
  recurrencePattern?: number | null;
}

export interface RecurrenceType {
  id: Ulid;
  key: "daily" | "weekly" | "monthly";
  displayName: string;
}

export interface Appointment {
  id: Ulid;
  client: LookupClient;
  service: LookupService;
  provider?: User | null;
  startDate: string;
  endDate: string;
  isCompleted: boolean;
  isCanceled: boolean;
  recurringRule?: AppointmentRecurrenceRule | null;
}

export interface PaymentClient {
  firstName: string;
  lastName: string;
  patronymic?: string | null;
}

export interface PaymentService {
  name: string;
}

export interface Payment {
  id: Ulid;
  client: PaymentClient;
  service?: PaymentService | null;
  amount: number;
  date: string;
  description: string;
}

export interface PaymentsResponse extends PaginatedResponse<Payment> {
  summary: {
    totalAmount: number;
    itemsCount: number;
    firstPaymentAtUtc?: string | null;
    lastPaymentAtUtc?: string | null;
  };
}

export interface Expense {
  id: Ulid;
  description: string;
  amount: number;
  date: string;
}

export interface ExpensesResponse extends PaginatedResponse<Expense> {
  summary: {
    totalAmount: number;
    itemsCount: number;
    firstExpenseAtUtc?: string | null;
    lastExpenseAtUtc?: string | null;
  };
}

export interface DashboardStats {
  totalClients: number;
  debtorsCount: number;
  totalDebt: number;
  appointmentsToday: number;
  appointmentsTomorrow: number;
  monthIncome: number;
  monthExpenses: number;
  monthNet: number;
}

export interface AuditLog {
  id: Ulid;
  createdAtUtc: string;
  category: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  actorEmail?: string | null;
  actorDisplayName?: string | null;
  details?: string | null;
}
