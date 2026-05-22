import { useQuery } from "@tanstack/react-query";
import { Card, DatePicker, Select, Table, Tag, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useState, type ReactNode } from "react";
import { dashboardApi } from "@/api/crm";
import type { NetProfitBucket, RevenueAnalytics } from "@/api/types";
import { STATS_CHART_COLORS, StatsDonutChart, StatsTrendChart } from "@/components/charts/StatsCharts";
import { InfoLabel } from "@/components/InfoLabel";
import { MoneyListSummaryCards } from "@/components/MoneyListSummaryCards";
import { SummaryCard, SummaryGrid } from "@/components/SummaryGrid";
import { PageLayout, ListFilters } from "@/shared/ui";
import { filterFieldClassName } from "@/shared/ui/filterFieldStyles";
import { DATE_FORMAT } from "@/utils/date";
import { formatMoney } from "@/utils/money";

type RevenueGroupBy = "day" | "week" | "month" | "year";

const groupByOptions: Array<{ label: string; value: RevenueGroupBy }> = [
  { label: "День", value: "day" },
  { label: "Неделя", value: "week" },
  { label: "Месяц", value: "month" },
  { label: "Год", value: "year" },
];

export function RevenuePage() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf("month"), dayjs().endOf("month")]);
  const [groupBy, setGroupBy] = useState<RevenueGroupBy>("week");
  const query = useQuery({
    queryKey: ["dashboard", "revenue", timezone, dateRange[0].toISOString(), dateRange[1].toISOString(), groupBy],
    queryFn: () =>
      dashboardApi.revenue({
        timezone,
        start: dateRange[0].format("YYYY-MM-DD"),
        end: dateRange[1].format("YYYY-MM-DD"),
        groupBy,
      }),
  });

  return (
    <PageLayout title="Выручка" description="Фактическая и плановая выручка за выбранный период, расходы, разбивка по преподавателям, клиентам, услугам и динамика чистой прибыли.">
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

        <div className={filterFieldClassName}>
          <Typography.Text type="secondary">Группировка прибыли</Typography.Text>
          <Select className="wide" value={groupBy} options={groupByOptions} onChange={setGroupBy} />
        </div>
      </ListFilters>

      <MoneyListSummaryCards
        totalAmount={query.data?.totalRevenue}
        itemsCount={query.data?.revenueCountedAppointmentsCount}
        itemsTitle="Платных записей"
        lastItemTitle={<InfoLabel label="Плановая выручка" tooltip="Ожидаемая выручка по запланированным записям в выбранном периоде. В фактическую выручку не входит." />}
        lastItemAtLabel={formatMoney(query.data?.plannedRevenue)}
      />

      <SummaryGrid>
        <SummaryCard title="Расходы" value={formatMoney(query.data?.totalExpenses)} />
        <SummaryCard title={<InfoLabel label="Чистая прибыль" tooltip="Фактическая выручка минус расходы за выбранный период." />} value={formatMoney(query.data?.netProfit)} />
        <SummaryCard title={<InfoLabel label="Средний чек" tooltip="Средняя выручка на одну проведенную или сгоревшую платную запись." />} value={formatMoney(query.data?.averageReceipt)} />
        <SummaryCard title={<InfoLabel label="Запланированных записей" tooltip="Количество будущих или запланированных записей в выбранном периоде. Они не входят в фактическую выручку." />} value={query.data?.plannedAppointmentsCount ?? 0} />
      </SummaryGrid>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))" }}>
        <SectionCard title="Тренд выручки и прибыли">
          <StatsTrendChart
            data={query.data?.netProfitDynamics.map((item) => ({
              key: `${item.startDate}-${item.endDate}`,
              label: formatCompactBucket(item, query.data?.groupBy),
              tooltip: (
                <div>
                  <div>{formatBucket(item, query.data)}</div>
                  <div>Выручка: {formatMoney(item.revenue)}</div>
                  <div>Расходы: {formatMoney(item.expenses)}</div>
                  <div>Чистая прибыль: {formatMoney(item.netProfit)}</div>
                </div>
              ),
              values: {
                revenue: item.revenue,
                expenses: item.expenses,
                netProfit: item.netProfit,
              },
            }))}
            series={[
              { key: "revenue", label: "Выручка", color: STATS_CHART_COLORS[0] },
              { key: "expenses", label: "Расходы", color: STATS_CHART_COLORS[1] },
              { key: "netProfit", label: "Чистая прибыль", color: STATS_CHART_COLORS[2] },
            ]}
          />
        </SectionCard>

        <SectionCard title="Структура выручки по услугам">
          <StatsDonutChart
            items={query.data?.services.map((service, index) => ({
              key: service.serviceId,
              label: service.serviceName,
              value: service.revenue,
              valueLabel: formatMoney(service.revenue),
              shareLabel: formatPercent(service.revenueShare),
              tooltip: `${service.serviceName}: ${formatMoney(service.revenue)}${service.revenueShare == null ? "" : ` (${formatPercent(service.revenueShare)})`}`,
              color: STATS_CHART_COLORS[index % STATS_CHART_COLORS.length],
            }))}
            totalLabel="Выручка"
            totalValueLabel={formatMoney(query.data?.totalRevenue)}
          />
        </SectionCard>
      </div>

      <SectionCard title="По преподавателям">
        <Table
          rowKey={(row) => row.teacherId ?? row.teacherDisplayName}
          loading={query.isLoading}
          dataSource={query.data?.teachers}
          pagination={false}
          scroll={{ x: "max-content" }}
          columns={[
            { title: "Преподаватель", dataIndex: "teacherDisplayName" },
            { title: "Выручка", dataIndex: "revenue", render: (value: number) => formatMoney(value) },
            {
              title: <InfoLabel label="Доля" tooltip="Доля этого преподавателя в общей выручке выбранного периода." />,
              dataIndex: "revenueShare",
              render: formatPercent,
            },
            {
              title: <InfoLabel label="Средний чек" tooltip="Средняя выручка на одну платную запись в этом срезе." />,
              dataIndex: "averageReceipt",
              render: (value?: number | null) => (value == null ? "—" : formatMoney(value)),
            },
            { title: "Платных записей", dataIndex: "revenueCountedAppointmentsCount" },
            {
              title: "Статусы",
              render: (_, row) => (
                <>
                  <Tag color="green">Проведено: {row.completedAppointmentsCount}</Tag>
                  <Tag color="orange">Сгорело: {row.burnedAppointmentsCount}</Tag>
                </>
              ),
            },
            { title: "Оказано услуг", dataIndex: "servicesProvidedCount" },
          ]}
        />
      </SectionCard>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
        <SectionCard title="По клиентам">
          <Table
            rowKey={(row) => row.clientId}
            loading={query.isLoading}
            dataSource={query.data?.clients}
            pagination={{ pageSize: 8 }}
            size="small"
            columns={[
              { title: "Клиент", dataIndex: "clientDisplayName" },
              { title: "Выручка", dataIndex: "revenue", render: (value: number) => formatMoney(value) },
              { title: <InfoLabel label="Средний чек" tooltip="Средняя выручка на одну платную запись клиента." />, dataIndex: "averageReceipt", render: (value?: number | null) => (value == null ? "—" : formatMoney(value)) },
              { title: "Платных записей", dataIndex: "revenueCountedAppointmentsCount" },
            ]}
          />
        </SectionCard>

        <SectionCard title="По услугам">
          <Table
            rowKey={(row) => row.serviceId}
            loading={query.isLoading}
            dataSource={query.data?.services}
            pagination={{ pageSize: 8 }}
            size="small"
            columns={[
              { title: "Услуга", dataIndex: "serviceName" },
              { title: "Выручка", dataIndex: "revenue", render: (value: number) => formatMoney(value) },
              { title: <InfoLabel label="Доля" tooltip="Доля услуги в общей выручке выбранного периода." />, dataIndex: "revenueShare", render: formatPercent },
              { title: <InfoLabel label="Средний чек" tooltip="Средняя выручка на одну платную запись по этой услуге." />, dataIndex: "averageReceipt", render: (value?: number | null) => (value == null ? "—" : formatMoney(value)) },
              {
                title: "Статусы",
                render: (_, row) => (
                  <>
                    <Tag color="green">Проведено: {row.completedAppointmentsCount}</Tag>
                    <Tag color="orange">Сгорело: {row.burnedAppointmentsCount}</Tag>
                  </>
                ),
              },
            ]}
          />
        </SectionCard>
      </div>

      <SectionCard title="Динамика чистой прибыли">
        <Table<NetProfitBucket>
          rowKey={(row) => `${row.startDate}-${row.endDate}`}
          loading={query.isLoading}
          dataSource={query.data?.netProfitDynamics}
          pagination={false}
          scroll={{ x: "max-content" }}
          columns={[
            { title: "Период", render: (_, row) => formatBucket(row, query.data) },
            { title: "Выручка", dataIndex: "revenue", render: (value: number) => formatMoney(value) },
            { title: "Расходы", dataIndex: "expenses", render: (value: number) => formatMoney(value) },
            { title: "Чистая прибыль", dataIndex: "netProfit", render: (value: number) => <ProfitTag value={value} /> },
            { title: <InfoLabel label="Изм. к прошлому" tooltip="Разница по чистой прибыли относительно предыдущего периода той же длины." />, dataIndex: "changeFromPrevious", render: (value?: number | null) => (value == null ? "—" : <ProfitTag value={value} />) },
            { title: <InfoLabel label="% к прошлому" tooltip="Процентное изменение чистой прибыли относительно предыдущего периода той же длины." />, dataIndex: "changePercentFromPrevious", render: formatPercent },
          ]}
        />
      </SectionCard>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
        <SectionCard title="Самые прибыльные периоды">
          <BucketSummaryTable data={query.data?.mostProfitablePeriods} loading={query.isLoading} groupBy={query.data?.groupBy} />
        </SectionCard>

        <SectionCard title="Убыточные периоды">
          <Table<NetProfitBucket>
            rowKey={(row) => `${row.startDate}-${row.endDate}`}
            loading={query.isLoading}
            dataSource={query.data?.unprofitablePeriods}
            pagination={false}
            size="small"
            columns={[
              { title: "Период", render: (_, row) => formatBucket(row, query.data) },
              { title: "Выручка", dataIndex: "revenue", render: (value: number) => formatMoney(value) },
              { title: "Расходы", dataIndex: "expenses", render: (value: number) => formatMoney(value) },
              { title: "Убыток", dataIndex: "netProfit", render: (value: number) => <ProfitTag value={value} /> },
              { title: "% от выручки", dataIndex: "lossPercentageRelativeToRevenue", render: formatPercent },
            ]}
          />
        </SectionCard>
      </div>
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

function BucketSummaryTable({
  data,
  loading,
  groupBy,
}: {
  data?: NetProfitBucket[];
  loading: boolean;
  groupBy?: RevenueAnalytics["groupBy"];
}) {
  return (
    <Table<NetProfitBucket>
      rowKey={(row) => `${row.startDate}-${row.endDate}`}
      loading={loading}
      dataSource={data}
      pagination={false}
      size="small"
      columns={[
        { title: "Период", render: (_, row) => formatBucket(row, groupBy ? { groupBy } : undefined) },
        { title: "Чистая прибыль", dataIndex: "netProfit", render: (value: number) => <ProfitTag value={value} /> },
        { title: "Выручка", dataIndex: "revenue", render: (value: number) => formatMoney(value) },
        { title: "Расходы", dataIndex: "expenses", render: (value: number) => formatMoney(value) },
      ]}
    />
  );
}

function ProfitTag({ value }: { value: number }) {
  return <Tag color={value > 0 ? "green" : value < 0 ? "red" : "default"}>{formatSignedMoney(value)}</Tag>;
}

function formatPercent(value?: number | null) {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}

function formatSignedMoney(value: number) {
  if (value > 0) {
    return `+${formatMoney(value)}`;
  }

  if (value < 0) {
    return `-${formatMoney(Math.abs(value))}`;
  }

  return formatMoney(value);
}

function formatBucket(row: NetProfitBucket, revenue?: Pick<RevenueAnalytics, "groupBy">) {
  const start = dayjs(row.startDate);
  const end = dayjs(row.endDate);
  switch (revenue?.groupBy) {
    case "day":
      return start.format(DATE_FORMAT);
    case "week":
      return `${start.format(DATE_FORMAT)} - ${end.format(DATE_FORMAT)}`;
    case "year":
      return start.format("YYYY");
    default:
      return start.format("MMMM YYYY");
  }
}

function formatCompactBucket(row: NetProfitBucket, groupBy?: RevenueAnalytics["groupBy"]) {
  const start = dayjs(row.startDate);
  switch (groupBy) {
    case "day":
      return start.format("DD.MM");
    case "week":
      return start.format("DD.MM");
    case "year":
      return start.format("YYYY");
    default:
      return start.format("MMM");
  }
}
