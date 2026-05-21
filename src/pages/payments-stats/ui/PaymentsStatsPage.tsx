import { useQuery } from "@tanstack/react-query";
import { Card, DatePicker, Table, Tag, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useState } from "react";
import { dashboardApi } from "@/api/crm";
import type { PaymentsAnalytics } from "@/api/types";
import { STATS_CHART_COLORS, StatsDonutChart, StatsHorizontalBarChart } from "@/components/charts/StatsCharts";
import { SummaryCard, SummaryGrid } from "@/components/SummaryGrid";
import { PageLayout, ListFilters } from "@/shared/ui";
import { filterFieldClassName } from "@/shared/ui/filterFieldStyles";
import { DATE_FORMAT } from "@/utils/date";
import { formatMoney } from "@/utils/money";

export function PaymentsStatsPage() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf("month"), dayjs().endOf("month")]);
  const query = useQuery({
    queryKey: ["dashboard", "payments", timezone, dateRange[0].toISOString(), dateRange[1].toISOString()],
    queryFn: () =>
      dashboardApi.payments({
        timezone,
        start: dateRange[0].format("YYYY-MM-DD"),
        end: dateRange[1].format("YYYY-MM-DD"),
      }),
  });

  return (
    <PageLayout title="Платежная аналитика" description="Показывает долги, неоплаченные записи, клиентские балансы и задержки оплат на основе детерминированного FIFO-распределения платежей.">
      <ListFilters>
        <div className={filterFieldClassName}>
          <Typography.Text type="secondary">Период анализа задержек</Typography.Text>
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

      <SummaryGrid>
        <SummaryCard title="Неоплаченных записей" value={query.data?.unpaidAppointmentsCount ?? 0} />
        <SummaryCard title="Должников" value={query.data?.debtorsCount ?? 0} />
        <SummaryCard title="Общий долг" value={formatMoney(query.data?.totalDebt)} />
      </SummaryGrid>

      <div className="profile-grid">
        <DelayMetricCard title="Средняя задержка" value={formatDelay(query.data?.averagePaymentDelayDays)} />
        <DelayMetricCard title="Медианная задержка" value={formatDelay(query.data?.medianPaymentDelayDays)} />
        <DelayMetricCard title="Максимальная задержка" value={formatDelay(query.data?.maxPaymentDelayDays)} />
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))" }}>
        <SectionCard title="Структура долга по услугам">
          <StatsDonutChart
            items={query.data?.services
              .filter((service) => service.outstandingDebt > 0)
              .map((service, index) => ({
                key: service.serviceId,
                label: service.serviceName,
                value: service.outstandingDebt,
                valueLabel: formatMoney(service.outstandingDebt),
                tooltip: `${service.serviceName}: ${formatMoney(service.outstandingDebt)}`,
                color: STATS_CHART_COLORS[index % STATS_CHART_COLORS.length],
              }))}
            totalLabel="Долг"
            totalValueLabel={formatMoney(query.data?.totalDebt)}
          />
        </SectionCard>

        <SectionCard title="Крупнейшие должники">
          <StatsHorizontalBarChart
            items={query.data?.clients
              .filter((client) => client.debt > 0)
              .slice(0, 8)
              .map((client, index) => ({
                key: client.clientId,
                label: client.clientDisplayName,
                value: client.debt,
                valueLabel: formatMoney(client.debt),
                tooltip: `${client.clientDisplayName}: ${formatMoney(client.debt)}`,
                color: STATS_CHART_COLORS[index % STATS_CHART_COLORS.length],
              }))}
          />
        </SectionCard>
      </div>

      <SectionCard title="Баланс по клиентам">
        <Table
          rowKey={(row) => row.clientId}
          loading={query.isLoading}
          dataSource={query.data?.clients}
          pagination={{ pageSize: 10 }}
          scroll={{ x: "max-content" }}
          columns={[
            { title: "Клиент", dataIndex: "clientDisplayName" },
            { title: "Выручка", dataIndex: "totalRevenue", render: (value: number) => formatMoney(value) },
            { title: "Платежи", dataIndex: "totalPayments", render: (value: number) => formatMoney(value) },
            {
              title: "Баланс",
              dataIndex: "balance",
              render: (value: number) => <Tag color={value < 0 ? "red" : value > 0 ? "green" : "default"}>{formatMoney(value)}</Tag>,
            },
            {
              title: "Долг",
              dataIndex: "debt",
              render: (value: number) => <Tag color={value > 0 ? "red" : "default"}>{formatMoney(value)}</Tag>,
            },
            { title: "Неоплаченных записей", dataIndex: "unpaidAppointmentsCount" },
            { title: "Средняя задержка", dataIndex: "averagePaymentDelayDays", render: formatDelay },
            { title: "Медиана", dataIndex: "medianPaymentDelayDays", render: formatDelay },
            { title: "Максимум", dataIndex: "maxPaymentDelayDays", render: formatDelay },
          ]}
        />
      </SectionCard>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))" }}>
        <SectionCard title="Долг по преподавателям">
          <PaymentsSliceTable
            loading={query.isLoading}
            data={query.data?.teachers}
            getName={(row) => row.teacherDisplayName}
            getDebt={(row) => row.outstandingDebt}
            getRevenue={(row) => row.totalRevenue}
            getUnpaid={(row) => row.unpaidAppointmentsCount}
            getAverageDelay={(row) => row.averagePaymentDelayDays}
            getMedianDelay={(row) => row.medianPaymentDelayDays}
            getMaxDelay={(row) => row.maxPaymentDelayDays}
          />
        </SectionCard>

        <SectionCard title="Долг по услугам">
          <PaymentsSliceTable
            loading={query.isLoading}
            data={query.data?.services}
            getName={(row) => row.serviceName}
            getDebt={(row) => row.outstandingDebt}
            getRevenue={(row) => row.totalRevenue}
            getUnpaid={(row) => row.unpaidAppointmentsCount}
            getAverageDelay={(row) => row.averagePaymentDelayDays}
            getMedianDelay={(row) => row.medianPaymentDelayDays}
            getMaxDelay={(row) => row.maxPaymentDelayDays}
          />
        </SectionCard>
      </div>
    </PageLayout>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card size="small" title={title}>
      {children}
    </Card>
  );
}

function DelayMetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <Typography.Text type="secondary">{title}</Typography.Text>
      <Typography.Title level={4}>{value}</Typography.Title>
    </div>
  );
}

function PaymentsSliceTable<T>({
  loading,
  data,
  getName,
  getDebt,
  getRevenue,
  getUnpaid,
  getAverageDelay,
  getMedianDelay,
  getMaxDelay,
}: {
  loading: boolean;
  data?: T[];
  getName: (row: T) => string;
  getDebt: (row: T) => number;
  getRevenue: (row: T) => number;
  getUnpaid: (row: T) => number;
  getAverageDelay: (row: T) => number | null | undefined;
  getMedianDelay: (row: T) => number | null | undefined;
  getMaxDelay: (row: T) => number | null | undefined;
}) {
  return (
    <Table
      rowKey={(row) => getName(row)}
      loading={loading}
      dataSource={data}
      pagination={{ pageSize: 8 }}
      size="small"
      scroll={{ x: "max-content" }}
      columns={[
        { title: "Срез", render: (_, row) => getName(row) },
        { title: "Выручка", render: (_, row) => formatMoney(getRevenue(row)) },
        { title: "Долг", render: (_, row) => <Tag color={getDebt(row) > 0 ? "red" : "default"}>{formatMoney(getDebt(row))}</Tag> },
        { title: "Неопл. записей", render: (_, row) => getUnpaid(row) },
        { title: "Средняя задержка", render: (_, row) => formatDelay(getAverageDelay(row)) },
        { title: "Медиана", render: (_, row) => formatDelay(getMedianDelay(row)) },
        { title: "Макс. задержка", render: (_, row) => formatDelay(getMaxDelay(row)) },
      ]}
    />
  );
}

function formatDelay(value?: number | null) {
  return value == null ? "—" : `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)} дн.`;
}
