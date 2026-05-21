import { useQuery } from "@tanstack/react-query";
import { Card, DatePicker, Select, Table, Tag, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useState } from "react";
import { dashboardApi } from "@/api/crm";
import type { NetProfitBucket, RevenueAnalytics } from "@/api/types";
import { MoneyListSummaryCards } from "@/components/MoneyListSummaryCards";
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
        lastItemTitle="Плановая выручка"
        lastItemAtLabel={formatMoney(query.data?.plannedRevenue)}
      />

      <div className="profile-grid">
        <MoneyMetricCard title="Расходы" value={formatMoney(query.data?.totalExpenses)} />
        <MoneyMetricCard title="Чистая прибыль" value={formatMoney(query.data?.netProfit)} />
        <MoneyMetricCard title="Средний чек" value={formatMoney(query.data?.averageReceipt)} />
        <MoneyMetricCard title="Запланированных записей" value={String(query.data?.plannedAppointmentsCount ?? 0)} />
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
              title: "Доля",
              dataIndex: "revenueShare",
              render: formatPercent,
            },
            {
              title: "Средний чек",
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
              { title: "Средний чек", dataIndex: "averageReceipt", render: (value?: number | null) => (value == null ? "—" : formatMoney(value)) },
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
              { title: "Доля", dataIndex: "revenueShare", render: formatPercent },
              { title: "Средний чек", dataIndex: "averageReceipt", render: (value?: number | null) => (value == null ? "—" : formatMoney(value)) },
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
            { title: "Изм. к прошлому", dataIndex: "changeFromPrevious", render: (value?: number | null) => (value == null ? "—" : <ProfitTag value={value} />) },
            { title: "% к прошлому", dataIndex: "changePercentFromPrevious", render: formatPercent },
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
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

function MoneyMetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <Typography.Text type="secondary">{title}</Typography.Text>
      <Typography.Title level={4}>{value}</Typography.Title>
    </div>
  );
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
