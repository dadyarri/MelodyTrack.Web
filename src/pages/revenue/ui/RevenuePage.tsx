import { DatePicker, Table, Tag, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import { useState } from "react";
import { dashboardApi } from "@/api/crm";
import { MoneyListSummaryCards } from "@/components/MoneyListSummaryCards";
import { PageLayout, ListFilters } from "@/shared/ui";
import { filterFieldClassName } from "@/shared/ui/filterFieldStyles";
import { DATE_FORMAT } from "@/utils/date";
import { formatMoney } from "@/utils/money";

export function RevenuePage() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf("month"), dayjs().endOf("month")]);
  const query = useQuery({
    queryKey: ["dashboard", "revenue", timezone, dateRange[0].toISOString(), dateRange[1].toISOString()],
    queryFn: () =>
      dashboardApi.revenue({
        timezone,
        start: dateRange[0].format("YYYY-MM-DD"),
        end: dateRange[1].format("YYYY-MM-DD"),
      }),
  });

  return (
    <PageLayout title="Выручка" description="Фактическая и плановая выручка за выбранный период, расходы и вклад преподавателей.">
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
            render: (value?: number | null) => (value == null ? "—" : `${value.toFixed(1)}%`),
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
    </PageLayout>
  );
}

function MoneyMetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <Typography.Text type="secondary">{title}</Typography.Text>
      <Typography.Title level={4}>{value}</Typography.Title>
    </div>
  );
}
