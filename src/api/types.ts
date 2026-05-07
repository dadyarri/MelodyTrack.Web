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

export interface LookupClient {
  id: Ulid;
  firstName: string;
  lastName: string;
  patronymic?: string | null;
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
}

export interface AppointmentRecurrenceRule {
  id: Ulid;
  startDate: string;
  endDate?: string | null;
  recurrencePattern?: number | null;
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

export interface Expense {
  id: Ulid;
  description: string;
  amount: number;
  date: string;
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
