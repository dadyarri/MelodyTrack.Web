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

export type AppointmentStatus = "planned" | "completed" | "cancelled" | "burned";

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
  status: AppointmentStatus;
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

export type WeekdayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface UserWorkingHoursDay {
  dayOfWeek: WeekdayKey;
  isWorkingDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
}

export interface UserVacation {
  id: Ulid;
  startDate: string;
  endDate: string;
}

export interface UserAvailability {
  userId: Ulid;
  workingHours: UserWorkingHoursDay[];
  vacations: UserVacation[];
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
  status: AppointmentStatus;
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

export interface TeacherRevenueAnalytics {
  teacherId?: Ulid | null;
  teacherDisplayName: string;
  revenue: number;
  revenueShare?: number | null;
  averageReceipt?: number | null;
  revenueCountedAppointmentsCount: number;
  completedAppointmentsCount: number;
  burnedAppointmentsCount: number;
  servicesProvidedCount: number;
}

export interface RevenueAnalytics {
  startDate: string;
  endDate: string;
  groupBy: "day" | "week" | "month" | "year";
  totalRevenue: number;
  plannedRevenue: number;
  totalExpenses: number;
  netProfit: number;
  averageReceipt?: number | null;
  revenueCountedAppointmentsCount: number;
  plannedAppointmentsCount: number;
  teachers: TeacherRevenueAnalytics[];
  clients: ClientRevenueAnalytics[];
  services: ServiceRevenueAnalytics[];
  netProfitDynamics: NetProfitBucket[];
  mostProfitablePeriods: NetProfitBucket[];
  unprofitablePeriods: NetProfitBucket[];
}

export interface ClientRevenueAnalytics {
  clientId: Ulid;
  clientDisplayName: string;
  revenue: number;
  revenueShare?: number | null;
  averageReceipt?: number | null;
  revenueCountedAppointmentsCount: number;
}

export interface ServiceRevenueAnalytics {
  serviceId: Ulid;
  serviceName: string;
  revenue: number;
  revenueShare?: number | null;
  averageReceipt?: number | null;
  revenueCountedAppointmentsCount: number;
  completedAppointmentsCount: number;
  burnedAppointmentsCount: number;
}

export interface NetProfitBucket {
  startDate: string;
  endDate: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  changeFromPrevious?: number | null;
  changePercentFromPrevious?: number | null;
  lossPercentageRelativeToRevenue?: number | null;
}

export interface PriceChangeTeacherImpact {
  teacherId?: Ulid | null;
  teacherDisplayName: string;
  revenueBefore: number;
  revenueAfter: number;
  appointmentsBefore: number;
  appointmentsAfter: number;
  averageReceiptBefore?: number | null;
  averageReceiptAfter?: number | null;
  cancellationShareBefore?: number | null;
  cancellationShareAfter?: number | null;
  burnedShareBefore?: number | null;
  burnedShareAfter?: number | null;
}

export interface PriceChangeAnalyticsItem {
  serviceId: Ulid;
  serviceName: string;
  effectiveDate: string;
  oldPrice: number;
  newPrice: number;
  priceChange: number;
  priceChangePercent?: number | null;
  affectedAppointmentsCount: number;
  revenueBefore: number;
  revenueAfter: number;
  revenueChange: number;
  revenueChangePercent?: number | null;
  appointmentsBefore: number;
  appointmentsAfter: number;
  appointmentChange: number;
  appointmentChangePercent?: number | null;
  completedAppointmentsBefore: number;
  completedAppointmentsAfter: number;
  cancellationShareBefore?: number | null;
  cancellationShareAfter?: number | null;
  burnedShareBefore?: number | null;
  burnedShareAfter?: number | null;
  averageReceiptBefore?: number | null;
  averageReceiptAfter?: number | null;
  expensesBefore: number;
  expensesAfter: number;
  netProfitBefore: number;
  netProfitAfter: number;
  profitImpact: number;
  priceElasticity?: number | null;
  additionalRevenue?: number | null;
  activeClientsBeforeCount: number;
  continuedClientsCount: number;
  stoppedClientsCount: number;
  reducedFrequencyClientsCount: number;
  increasedFrequencyClientsCount: number;
  churnShare?: number | null;
  teachers: PriceChangeTeacherImpact[];
  clients: PriceChangeClientImpact[];
}

export interface PriceChangeAnalytics {
  startDate: string;
  endDate: string;
  windowDays: number;
  totalChanges: number;
  priceIncreasesCount: number;
  priceDecreasesCount: number;
  positiveRevenueImpactCount: number;
  negativeDemandImpactCount: number;
  changes: PriceChangeAnalyticsItem[];
  strongestPositiveImpacts: PriceChangeRanking[];
  negativeImpacts: PriceChangeRanking[];
}

export interface PriceChangeClientImpact {
  clientId: Ulid;
  clientDisplayName: string;
  sourceName?: string | null;
  appointmentsBefore: number;
  appointmentsAfter: number;
  revenueBefore: number;
  revenueAfter: number;
  averageIntervalBeforeDays?: number | null;
  averageIntervalAfterDays?: number | null;
  continuedAfterPriceIncrease: boolean;
  stoppedAfterPriceIncrease: boolean;
  reducedAppointmentFrequency: boolean;
  increasedAppointmentFrequency: boolean;
}

export interface PriceChangeRanking {
  serviceId: Ulid;
  serviceName: string;
  effectiveDate: string;
  revenueChange: number;
  revenueChangePercent?: number | null;
  profitImpact: number;
  appointmentChange: number;
  appointmentChangePercent?: number | null;
  additionalRevenue?: number | null;
  churnShare?: number | null;
  cancellationShareBefore?: number | null;
  cancellationShareAfter?: number | null;
  burnedShareBefore?: number | null;
  burnedShareAfter?: number | null;
}

export interface PaymentsAnalytics {
  startDate: string;
  endDate: string;
  unpaidAppointmentsCount: number;
  debtorsCount: number;
  totalDebt: number;
  averagePaymentDelayDays?: number | null;
  medianPaymentDelayDays?: number | null;
  maxPaymentDelayDays?: number | null;
  clients: ClientPaymentsAnalytics[];
  teachers: TeacherPaymentsAnalytics[];
  services: ServicePaymentsAnalytics[];
}

export interface ClientPaymentsAnalytics {
  clientId: Ulid;
  clientDisplayName: string;
  totalRevenue: number;
  totalPayments: number;
  balance: number;
  debt: number;
  unpaidAppointmentsCount: number;
  averagePaymentDelayDays?: number | null;
  medianPaymentDelayDays?: number | null;
  maxPaymentDelayDays?: number | null;
}

export interface TeacherPaymentsAnalytics {
  teacherId?: Ulid | null;
  teacherDisplayName: string;
  totalRevenue: number;
  outstandingDebt: number;
  unpaidAppointmentsCount: number;
  averagePaymentDelayDays?: number | null;
  medianPaymentDelayDays?: number | null;
  maxPaymentDelayDays?: number | null;
}

export interface ServicePaymentsAnalytics {
  serviceId: Ulid;
  serviceName: string;
  totalRevenue: number;
  outstandingDebt: number;
  unpaidAppointmentsCount: number;
  averagePaymentDelayDays?: number | null;
  medianPaymentDelayDays?: number | null;
  maxPaymentDelayDays?: number | null;
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
