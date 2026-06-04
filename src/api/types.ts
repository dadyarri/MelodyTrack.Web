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
  lastActivity?: RecordActivity | null;
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
  dateOfBirth?: string | null;
  contacts?: ClientContacts | null;
  telegram?: string | null;
  vk?: string | null;
  phone?: string | null;
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
  appointments: PaginatedResponse<ClientHistoryAppointment>;
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
  lastActivity?: RecordActivity | null;
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
  telegram?: string | null;
  vk?: string | null;
  phone?: string | null;
  lastActivity?: RecordActivity | null;
}

export type RecurringTaskType =
  | "appointment-reminder"
  | "birthday-greeting"
  | "trial-follow-up"
  | "inactive-client-reminder"
  | "teacher-daily-schedule";

export type RecurringTaskListStatus = "open" | "completed" | "skipped";

export interface RecurringTask {
  ruleId: Ulid;
  type: RecurringTaskType;
  recipientType: "client" | "teacher";
  deduplicationKey: string;
  clientId?: Ulid | null;
  teacherId?: Ulid | null;
  appointmentId?: Ulid | null;
  title: string;
  relatedPersonDisplayName: string;
  relevantAtUtc?: string | null;
  businessDate: string;
  phone?: string | null;
  telegram?: string | null;
  vk?: string | null;
  preparedMessage: string;
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
  lastActivity?: RecordActivity | null;
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
  lastActivity?: RecordActivity | null;
}

export interface ExpensesResponse extends PaginatedResponse<Expense> {
  summary: MoneyListSummary;
}

export interface DashboardStats {
  totalClients: number;
  debtorsCount: number;
  totalDebt: number;
  totalPositiveBalance: number;
  appointmentsToday: number;
  appointmentsTomorrow: number;
  monthIncome: number;
  monthExpenses: number;
  monthNet: number;
}

export interface ClientSourceAnalytics {
  sourceName: string;
  clientsCount: number;
  activeClientsCount: number;
  previousPeriodActiveClientsCount: number;
  retainedClientsCount: number;
  retentionRate?: number | null;
  newClientsCount: number;
  newClientsShare?: number | null;
  lostClientsCount: number;
  lostShare?: number | null;
  revenue: number;
  averageLifetimeValue?: number | null;
}

export interface ClientAnalytics {
  clientId: Ulid;
  clientDisplayName: string;
  sourceName: string;
  lifetimeValue: number;
  revenueCountedAppointmentsCount: number;
  completedAppointmentsCount: number;
  averageIntervalDays?: number | null;
  lifetimeDays?: number | null;
  daysSinceLastAppointment?: number | null;
  createdAtUtc: string;
  firstAppointmentAtUtc?: string | null;
  lastAppointmentAtUtc?: string | null;
  debt: number;
  isLost: boolean;
  isAtRisk: boolean;
  isVip: boolean;
  isRegular: boolean;
  isSingleTime: boolean;
  isDebtor: boolean;
  isNew: boolean;
  isReturned: boolean;
}

export interface ClientRfmAnalytics {
  clientId: Ulid;
  clientDisplayName: string;
  sourceName: string;
  recencyDays?: number | null;
  frequency: number;
  monetary: number;
  recencyScore: number;
  frequencyScore: number;
  monetaryScore: number;
  rfmScore: string;
  segment: string;
}

export interface ClientsAnalyticsResponse {
  startDate: string;
  endDate: string;
  previousPeriodStartDate: string;
  previousPeriodEndDate: string;
  totalClientsCount: number;
  activeNowClientsCount: number;
  inactiveClientsCount: number;
  activeClientsCount: number;
  previousPeriodActiveClientsCount: number;
  retainedClientsCount: number;
  retentionRate?: number | null;
  newClientsCount: number;
  returnedClientsCount: number;
  returningClientsShare?: number | null;
  lostClientsCount: number;
  lostShare?: number | null;
  atRiskClientsCount: number;
  averageIntervalDays?: number | null;
  averageLifetimeValue?: number | null;
  averageClientLifetimeDays?: number | null;
  vipClientsCount: number;
  regularClientsCount: number;
  singleTimeClientsCount: number;
  debtorsCount: number;
  sources: ClientSourceAnalytics[];
  clients: ClientAnalytics[];
  rfmClients: ClientRfmAnalytics[];
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

export interface AppointmentsAnalytics {
  startDate: string;
  endDate: string;
  totalAppointmentsCount: number;
  plannedAppointmentsCount: number;
  completedAppointmentsCount: number;
  cancelledAppointmentsCount: number;
  burnedAppointmentsCount: number;
  burnedShare?: number | null;
  cancellationShare?: number | null;
  totalRevenue: number;
  takenHours: number;
  workedHours: number;
  availableHours: number;
  freeHours: number;
  loadPercentage?: number | null;
  activeTeachersCount: number;
  averageCompletedAppointmentsPerTeacher?: number | null;
  averageGapBetweenServicesHours?: number | null;
  statuses: AppointmentStatusCount[];
  dailyLoad: AppointmentLoadByDay[];
  hours: AppointmentHourAnalytics[];
  teachers: TeacherAppointmentsAnalytics[];
  burnedClients: BurnedClientAnalytics[];
}

export interface AppointmentStatusCount {
  status: AppointmentStatus;
  count: number;
  share?: number | null;
}

export interface AppointmentLoadByDay {
  date: string;
  appointmentsCount: number;
  servicesProvidedCount: number;
  completedAppointmentsCount: number;
  cancelledAppointmentsCount: number;
  burnedAppointmentsCount: number;
  uniqueClientsCount: number;
  completedUniqueClientsCount: number;
  revenue: number;
  takenHours: number;
  availableHours: number;
  freeHours: number;
  loadPercentage?: number | null;
  burnedShare?: number | null;
  cancellationShare?: number | null;
}

export interface AppointmentHourAnalytics {
  hour: number;
  appointmentsCount: number;
  plannedAppointmentsCount: number;
  completedAppointmentsCount: number;
  cancelledAppointmentsCount: number;
  burnedAppointmentsCount: number;
  uniqueClientsCount: number;
  revenue: number;
  takenHours: number;
  availableHours: number;
  freeHours: number;
  loadPercentage?: number | null;
  cancellationRate?: number | null;
  burnedShare?: number | null;
}

export interface TeacherAppointmentsAnalytics {
  teacherId?: Ulid | null;
  teacherDisplayName: string;
  totalAppointmentsCount: number;
  plannedAppointmentsCount: number;
  completedAppointmentsCount: number;
  cancelledAppointmentsCount: number;
  burnedAppointmentsCount: number;
  uniqueClientsCount: number;
  workingDaysCount: number;
  revenue: number;
  workedHours: number;
  occupiedHours: number;
  availableHours: number;
  freeHours: number;
  loadPercentage?: number | null;
  downtimeShare?: number | null;
  cancellationShare?: number | null;
  burnedShare?: number | null;
  revenuePerWorkedHour?: number | null;
  revenuePerOccupiedHour?: number | null;
  averageCompletedAppointmentsPerWorkingDay?: number | null;
  averageGapBetweenServicesHours?: number | null;
  topServices: TeacherServiceAnalytics[];
}

export interface TeacherServiceAnalytics {
  serviceId: Ulid;
  serviceName: string;
  completedAppointmentsCount: number;
  revenueCountedAppointmentsCount: number;
  revenue: number;
  completedShare?: number | null;
}

export interface BurnedClientAnalytics {
  clientId: Ulid;
  clientDisplayName: string;
  totalAppointmentsCount: number;
  burnedAppointmentsCount: number;
  burnedShare?: number | null;
}

export interface ExpensesAnalytics {
  startDate: string;
  endDate: string;
  groupBy: "day" | "week" | "month" | "year";
  totalExpenses: number;
  totalRevenue: number;
  expenseToRevenueRatio?: number | null;
  expensesCount: number;
  categories: ExpenseCategoryAnalytics[];
  dynamics: ExpenseDynamicsBucket[];
}

export interface ExpenseCategoryAnalytics {
  categoryId?: Ulid | null;
  categoryName: string;
  amount: number;
  share?: number | null;
}

export interface ExpenseDynamicsBucket {
  startDate: string;
  endDate: string;
  expenses: number;
  changeFromPrevious?: number | null;
  changePercentFromPrevious?: number | null;
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
