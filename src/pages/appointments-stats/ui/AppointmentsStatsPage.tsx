import { useQuery } from "@tanstack/react-query";
import { Card, DatePicker, Space, Table, Tag, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useState, type ReactNode } from "react";
import { dashboardApi } from "@/api/crm";
import type { AppointmentHourAnalytics, AppointmentLoadByDay, AppointmentStatus, BurnedClientAnalytics, TeacherAppointmentsAnalytics } from "@/api/types";
import { STATS_CHART_COLORS, StatsDonutChart, StatsTrendChart } from "@/components/charts/StatsCharts";
import { InfoLabel } from "@/components/InfoLabel";
import { SummaryCard, SummaryGrid } from "@/components/SummaryGrid";
import { PageLayout, ListFilters } from "@/shared/ui";
import { filterFieldClassName } from "@/shared/ui/filterFieldStyles";
import { DATE_FORMAT } from "@/utils/date";
import { formatMoney } from "@/utils/money";

const statusLabels: Record<AppointmentStatus, string> = {
  planned: "Запланировано",
  completed: "Проведено",
  cancelled: "Отменено",
  burned: "Сгорело",
};

export function AppointmentsStatsPage() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf("month"), dayjs().endOf("month")]);
  const query = useQuery({
    queryKey: ["dashboard", "appointments", timezone, dateRange[0].toISOString(), dateRange[1].toISOString()],
    queryFn: () =>
      dashboardApi.appointments({
        timezone,
        start: dateRange[0].format("YYYY-MM-DD"),
        end: dateRange[1].format("YYYY-MM-DD"),
      }),
  });

  return (
    <PageLayout
      title="Записи"
      description="Статусы записей, занятость преподавателей, загрузка по дням и часам, а также эффективность преподавателей по проведенным и сгоревшим занятиям."
    >
      <ListFilters>
        <div className={filterFieldClassName}>
          <Typography.Text type="secondary">Период</Typography.Text>
          <DatePicker.RangePicker
            value={dateRange}
            format={DATE_FORMAT}
            onChange={(value) => {
              if (value?.[0] && value[1]) {
                setDateRange([value[0], value[1]]);
              }
            }}
          />
        </div>
      </ListFilters>

      <div data-onboarding-id="appointments-stats-summary">
        <SummaryGrid>
          <SummaryCard title="Всего записей" value={query.data?.totalAppointmentsCount ?? 0} />
          <SummaryCard title="Активных преподавателей" value={query.data?.activeTeachersCount ?? 0} />
          <SummaryCard title={<InfoLabel label="Занято часов" tooltip="Сумма длительностей запланированных, проведенных и сгоревших записей." />} value={formatHours(query.data?.takenHours)} />
          <SummaryCard title={<InfoLabel label="Доступно часов" tooltip="Сумма рабочих часов преподавателей по настроенному графику и отпускам." />} value={formatHours(query.data?.availableHours)} />
          <SummaryCard title={<InfoLabel label="Загрузка" tooltip="Доля занятого времени от доступного рабочего времени преподавателей." />} value={formatPercent(query.data?.loadPercentage)} />
          <SummaryCard title={<InfoLabel label="Проведено часов" tooltip="Сумма длительностей только проведенных записей." />} value={formatHours(query.data?.workedHours)} />
          <SummaryCard title="Свободно часов" value={formatHours(query.data?.freeHours)} />
          <SummaryCard title={<InfoLabel label="Средне проведено на преподавателя" tooltip="Среднее число проведенных записей на одного активного преподавателя за выбранный период." />} value={formatDecimal(query.data?.averageCompletedAppointmentsPerTeacher)} />
          <SummaryCard title={<InfoLabel label="Средний интервал между занятиями" tooltip="Средний положительный интервал между соседними проведенными занятиями одного преподавателя." />} value={formatHours(query.data?.averageGapBetweenServicesHours)} />
          <SummaryCard title={<InfoLabel label="Выручка" tooltip="Выручка по проведенным и сгоревшим записям в выбранном периоде." />} value={formatMoney(query.data?.totalRevenue)} />
          <SummaryCard title="Проведено" value={query.data?.completedAppointmentsCount ?? 0} />
          <SummaryCard title="Запланировано" value={query.data?.plannedAppointmentsCount ?? 0} />
          <SummaryCard title={<InfoLabel label="Отменено" tooltip="Отмененные записи не входят в фактическую выручку и по умолчанию не занимают слот в загрузке." />} value={query.data?.cancelledAppointmentsCount ?? 0} />
          <SummaryCard title={<InfoLabel label="Сгорело" tooltip="Сгоревшие записи считаются в выручке и в занятом времени, но не в отработанных часах." />} value={query.data?.burnedAppointmentsCount ?? 0} />
          <SummaryCard title="Доля отмен" value={formatPercent(query.data?.cancellationShare)} />
          <SummaryCard title="Доля сгоревших" value={formatPercent(query.data?.burnedShare)} />
        </SummaryGrid>
      </div>

      <Space orientation="vertical" size={20} className="wide" data-onboarding-id="appointments-stats-main-blocks">
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))" }}>
          <SectionCard title="Структура статусов">
            <StatsDonutChart
              items={query.data?.statuses.map((item, index) => ({
                key: item.status,
                label: statusLabels[item.status],
                value: item.count,
                valueLabel: String(item.count),
                shareLabel: formatPercent(item.share),
                tooltip: `${statusLabels[item.status]}: ${item.count}${item.share == null ? "" : ` (${formatPercent(item.share)})`}`,
                color: STATS_CHART_COLORS[index % STATS_CHART_COLORS.length],
              }))}
              totalLabel="Записи"
              totalValueLabel={String(query.data?.totalAppointmentsCount ?? 0)}
            />
          </SectionCard>

          <SectionCard title="Загрузка по дням">
            <StatsTrendChart
              data={query.data?.dailyLoad.map((item) => ({
                key: item.date,
                label: dayjs(item.date).format("DD.MM"),
                tooltip: (
                  <div>
                    <div>{dayjs(item.date).format(DATE_FORMAT)}</div>
                    <div>Записей: {item.appointmentsCount}</div>
                    <div>Загрузка: {formatPercent(item.loadPercentage)}</div>
                    <div>Занято: {formatHours(item.takenHours)}</div>
                    <div>Доступно: {formatHours(item.availableHours)}</div>
                  </div>
                ),
                values: {
                  load: item.loadPercentage ?? 0,
                  appointments: item.appointmentsCount,
                },
              }))}
              series={[
                { key: "load", label: "Загрузка, %", color: STATS_CHART_COLORS[0] },
                { key: "appointments", label: "Записи", color: STATS_CHART_COLORS[1] },
              ]}
            />
          </SectionCard>
        </div>

      <SectionCard title="По преподавателям">
        <Table<TeacherAppointmentsAnalytics>
          rowKey={(row) => row.teacherId ?? row.teacherDisplayName}
          loading={query.isLoading}
          dataSource={query.data?.teachers}
          pagination={false}
          scroll={{ x: "max-content" }}
          columns={[
            { title: "Преподаватель", dataIndex: "teacherDisplayName" },
            {
              title: "Статусы",
              render: (_, row) => (
                <>
                  <Tag color="green">Проведено: {row.completedAppointmentsCount}</Tag>
                  <Tag color="blue">План: {row.plannedAppointmentsCount}</Tag>
                  <Tag color="red">Отменено: {row.cancelledAppointmentsCount}</Tag>
                  <Tag color="orange">Сгорело: {row.burnedAppointmentsCount}</Tag>
                </>
              ),
            },
            { title: "Уникальных клиентов", dataIndex: "uniqueClientsCount" },
            { title: <InfoLabel label="Рабочих дней" tooltip="Дни с доступными рабочими часами по графику преподавателя в выбранном периоде." />, dataIndex: "workingDaysCount" },
            { title: "Выручка", dataIndex: "revenue", render: (value: number) => formatMoney(value) },
            { title: "Отработано", dataIndex: "workedHours", render: formatHours },
            { title: <InfoLabel label="Занято" tooltip="Часы преподавателя, занятые запланированными, проведенными и сгоревшими записями." />, dataIndex: "occupiedHours", render: formatHours },
            { title: "Доступно", dataIndex: "availableHours", render: formatHours },
            { title: "Свободно", dataIndex: "freeHours", render: formatHours },
            { title: "Загрузка", dataIndex: "loadPercentage", render: formatPercent },
            { title: <InfoLabel label="Простой" tooltip="Доля доступного времени преподавателя, которая не была занята записями." />, dataIndex: "downtimeShare", render: formatPercent },
            { title: "Отмены", dataIndex: "cancellationShare", render: formatPercent },
            { title: "Сгорания", dataIndex: "burnedShare", render: formatPercent },
            { title: <InfoLabel label="Выручка / отработанный час" tooltip="Выручка, деленная на часы по проведенным записям." />, dataIndex: "revenuePerWorkedHour", render: (value?: number | null) => (value == null ? "—" : formatMoney(value)) },
            { title: <InfoLabel label="Выручка / занятый час" tooltip="Выручка, деленная на все занятые часы по запланированным, проведенным и сгоревшим записям." />, dataIndex: "revenuePerOccupiedHour", render: (value?: number | null) => (value == null ? "—" : formatMoney(value)) },
            { title: <InfoLabel label="Проведено в день" tooltip="Среднее количество проведенных записей на один рабочий день преподавателя." />, dataIndex: "averageCompletedAppointmentsPerWorkingDay", render: formatDecimal },
            { title: <InfoLabel label="Средний интервал" tooltip="Средний положительный интервал между соседними проведенными занятиями преподавателя." />, dataIndex: "averageGapBetweenServicesHours", render: formatHours },
            {
              title: <InfoLabel label="Топ услуг" tooltip="Пять самых частых услуг преподавателя по количеству проведенных записей. Доля считается от всех проведенных записей преподавателя." />,
              render: (_, row) => (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxWidth: 360 }}>
                  {row.topServices.length === 0
                    ? "—"
                    : row.topServices.map((service) => (
                        <Tag key={`${row.teacherId ?? row.teacherDisplayName}-${service.serviceId}`} color="default">
                          {service.serviceName}: {service.completedAppointmentsCount}
                          {service.completedShare == null ? "" : ` (${formatPercent(service.completedShare)})`}
                        </Tag>
                      ))}
                </div>
              ),
            },
          ]}
        />
      </SectionCard>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
        <SectionCard title="Часы пик">
          <HoursTable
            loading={query.isLoading}
            data={query.data?.hours
              .filter((item) => item.appointmentsCount > 0)
              .sort((a, b) => b.appointmentsCount - a.appointmentsCount || b.loadPercentage! - a.loadPercentage!)
              .slice(0, 8)}
          />
        </SectionCard>

        <SectionCard title="Самые свободные часы">
          <HoursTable
            loading={query.isLoading}
            data={query.data?.hours
              .filter((item) => item.availableHours > 0)
              .sort((a, b) => b.freeHours - a.freeHours || a.hour - b.hour)
              .slice(0, 8)}
          />
        </SectionCard>
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
        <SectionCard title="Самые прибыльные часы">
          <Table<AppointmentHourAnalytics>
            rowKey={(row) => row.hour}
            loading={query.isLoading}
            dataSource={query.data?.hours.filter((item) => item.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 8)}
            pagination={false}
            size="small"
            columns={hourColumns}
          />
        </SectionCard>

        <SectionCard title="Проблемные часы по отменам">
          <Table<AppointmentHourAnalytics>
            rowKey={(row) => row.hour}
            loading={query.isLoading}
            dataSource={query.data?.hours
              .filter((item) => item.cancelledAppointmentsCount > 0 && (item.cancellationRate ?? 0) > 0)
              .sort((a, b) => (b.cancellationRate ?? 0) - (a.cancellationRate ?? 0))
              .slice(0, 8)}
            pagination={false}
            size="small"
            columns={hourColumns}
          />
        </SectionCard>
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
        <SectionCard title="Клиенты по сгоревшим записям">
          <Table<BurnedClientAnalytics>
            rowKey={(row) => row.clientId}
            loading={query.isLoading}
            dataSource={query.data?.burnedClients}
            pagination={{ pageSize: 8 }}
            size="small"
            columns={[
              { title: "Клиент", dataIndex: "clientDisplayName" },
              { title: "Сгорело", dataIndex: "burnedAppointmentsCount" },
              { title: "Всего записей", dataIndex: "totalAppointmentsCount" },
              { title: "Доля сгораний", dataIndex: "burnedShare", render: formatPercent },
            ]}
          />
        </SectionCard>
        </div>

      <SectionCard title="Загрузка по дням">
        <Table<AppointmentLoadByDay>
          rowKey={(row) => row.date}
          loading={query.isLoading}
          dataSource={query.data?.dailyLoad}
          pagination={false}
          scroll={{ x: "max-content" }}
          columns={[
            { title: "Дата", dataIndex: "date", render: (value: string) => dayjs(value).format(DATE_FORMAT) },
            { title: "Записей", dataIndex: "appointmentsCount" },
            { title: <InfoLabel label="Оказано услуг" tooltip="Количество проведенных записей за день." />, dataIndex: "servicesProvidedCount" },
            {
              title: "Статусы",
              render: (_, row) => (
                <>
                  <Tag color="green">Проведено: {row.completedAppointmentsCount}</Tag>
                  <Tag color="red">Отменено: {row.cancelledAppointmentsCount}</Tag>
                  <Tag color="orange">Сгорело: {row.burnedAppointmentsCount}</Tag>
                </>
              ),
            },
            { title: "Клиентов", dataIndex: "uniqueClientsCount" },
            { title: <InfoLabel label="Клиентов по проведенным" tooltip="Количество уникальных клиентов, у которых в этот день была хотя бы одна проведенная запись." />, dataIndex: "completedUniqueClientsCount" },
            { title: "Выручка", dataIndex: "revenue", render: (value: number) => formatMoney(value) },
            { title: "Занято", dataIndex: "takenHours", render: formatHours },
            { title: "Доступно", dataIndex: "availableHours", render: formatHours },
            { title: "Свободно", dataIndex: "freeHours", render: formatHours },
            { title: "Загрузка", dataIndex: "loadPercentage", render: formatPercent },
            { title: "Отмены", dataIndex: "cancellationShare", render: formatPercent },
            { title: "Сгорания", dataIndex: "burnedShare", render: formatPercent },
          ]}
        />
      </SectionCard>
      </Space>
    </PageLayout>
  );
}

function SectionCard({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <Card size="small" title={title}>
      {children}
    </Card>
  );
}

function HoursTable({ loading, data }: { loading: boolean; data?: AppointmentHourAnalytics[] }) {
  return <Table<AppointmentHourAnalytics> rowKey={(row) => row.hour} loading={loading} dataSource={data} pagination={false} size="small" columns={hourColumns} />;
}

const hourColumns = [
  {
    title: "Час",
    dataIndex: "hour",
    render: (value: number) => `${value.toString().padStart(2, "0")}:00`,
  },
  { title: "Записей", dataIndex: "appointmentsCount" },
  { title: "Выручка", dataIndex: "revenue", render: (value: number) => formatMoney(value) },
  { title: "Загрузка", dataIndex: "loadPercentage", render: formatPercent },
  { title: "Свободно", dataIndex: "freeHours", render: formatHours },
  { title: "Отмены", dataIndex: "cancellationRate", render: formatPercent },
  { title: "Сгорания", dataIndex: "burnedShare", render: formatPercent },
] satisfies Array<{ title: ReactNode; dataIndex?: keyof AppointmentHourAnalytics; render?: (value: never, row: AppointmentHourAnalytics) => ReactNode }>;

function formatPercent(value?: number | null) {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}

function formatHours(value?: number | null) {
  return value == null ? "—" : `${value.toFixed(1)} ч`;
}

function formatDecimal(value?: number | null) {
  return value == null ? "—" : value.toFixed(1);
}
