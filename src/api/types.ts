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
  firstItemAtUtc?: string | null;
  lastItemAtUtc?: string | null;
}

export interface PaginatedParams {
  page?: number;
  page_size?: number;
}

export interface CreateEntityResponse {
  id: Ulid;
}

export interface ReferenceBookItem {
  id: Ulid;
  name: string;
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
  sourceId?: Ulid | null;
  sourceName?: string | null;
  balance: number;
  lastAppointmentAtUtc?: string | null;
  nextAppointmentAtUtc?: string | null;
  lastActivity?: RecordActivity | null;
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

export interface RecordActivity {
  id: Ulid;
  createdAtUtc: string;
  category: string;
  action: string;
  actorEmail?: string | null;
  actorDisplayName?: string | null;
  sourceIpAddress?: string | null;
  details?: string | null;
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
  sourceId?: Ulid | null;
  sourceName?: string | null;
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
  price?: number;
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
  lastActivity?: RecordActivity | null;
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
  lastActivity?: RecordActivity | null;
}

export interface PaymentsResponse extends PaginatedResponse<Payment> {
  summary: MoneyListSummary;
}

export interface Expense {
  id: Ulid;
  description: string;
  amount: number;
  date: string;
  categoryId?: Ulid | null;
  categoryName?: string | null;
}

export interface ExpensesResponse extends PaginatedResponse<Expense> {
  summary: MoneyListSummary;
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
  sourceIpAddress?: string | null;
  details?: string | null;
}

export interface StaleEntityConflict {
  entityType: string;
  entityId: string;
  message: string;
  currentActivity?: RecordActivity | null;
}
