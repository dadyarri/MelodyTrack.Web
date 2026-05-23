import { Card, DatePicker, Space, Table, Tag, Typography } from "antd";
import type { ReactNode } from "react";
import { queryKeys } from "@/api/queryKeys";
import { dashboardApi } from "@/api/crm";
import { StatsDonutChart, StatsHorizontalBarChart } from "@/components/charts/StatsCharts";
import { STATS_CHART_COLORS } from "@/components/charts/chartColors";
import { InfoLabel } from "@/components/InfoLabel";
import { SummaryCard, SummaryGrid } from "@/components/SummaryGrid";
import { useDashboardDateRangeQuery } from "@/features/stats/useDashboardStatsQuery";
import { PageLayout, ListFilters } from "@/shared/ui";
import { filterFieldClassName } from "@/shared/ui/filterFieldStyles";
import { DATE_FORMAT } from "@/utils/date";
import { formatMoney } from "@/utils/money";

export function PaymentsStatsPage() {
  const controller = useDashboardDateRangeQuery({
    getQueryKey: ({ timezone, dateRange }) => queryKeys.dashboard.payments(timezone, dateRange[0], dateRange[1]),
    queryFn: ({ timezone, dateRange }) =>
      dashboardApi.payments({
        timezone,
        start: dateRange[0].format("YYYY-MM-DD"),
        end: dateRange[1].format("YYYY-MM-DD"),
      }),
  });
  const dateRange = controller.dateRange;
  const query = controller.query;

  return (
    <PageLayout
      title="Платежная аналитика"
      description="Показывает долги, неоплаченные записи, клиентские балансы и задержки оплат на основе детерминированного FIFO-распределения платежей."
    >
      <ListFilters>
        <div className={filterFieldClassName}>
          <Typography.Text type="secondary">Период анализа задержек</Typography.Text>
          <DatePicker.RangePicker value={dateRange} format={DATE_FORMAT} onChange={controller.onDateRangeChange} />
        </div>
      </ListFilters>

      <div data-onboarding-id="payments-stats-summary">
        <SummaryGrid>
          <SummaryCard
            title={
              <InfoLabel
                label="Неоплаченных записей"
                tooltip="Количество проведенных и сгоревших записей, которые еще не покрыты оплатами по FIFO-распределению."
              />
            }
            value={query.data?.unpaidAppointmentsCount ?? 0}
          />
          <SummaryCard
            title={
              <InfoLabel
                label="Должников"
                tooltip="Количество клиентов, у которых выручка по проведенным и сгоревшим записям больше суммы оплат."
              />
            }
            value={query.data?.debtorsCount ?? 0}
          />
          <SummaryCard
            title={<InfoLabel label="Общий долг" tooltip="Суммарная непокрытая оплатами стоимость проведенных и сгоревших записей." />}
            value={formatMoney(query.data?.totalDebt)}
          />
          <SummaryCard
            title={
              <InfoLabel
                label="Средняя задержка"
                tooltip="Среднее число дней между датой записи и датой оплаты. Предоплата считается как 0 дней задержки."
              />
            }
            value={formatDelay(query.data?.averagePaymentDelayDays)}
          />
          <SummaryCard
            title={
              <InfoLabel
                label="Медианная задержка"
                tooltip="Центральное значение задержки оплаты: половина оплат быстрее, половина медленнее."
              />
            }
            value={formatDelay(query.data?.medianPaymentDelayDays)}
          />
          <SummaryCard
            title={
              <InfoLabel label="Максимальная задержка" tooltip="Самая длинная задержка оплаты среди попавших в выбранный период оплат." />
            }
            value={formatDelay(query.data?.maxPaymentDelayDays)}
          />
        </SummaryGrid>
      </div>

      <Space orientation="vertical" size={20} className="wide" data-onboarding-id="payments-stats-main-blocks">
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
              {
                title: (
                  <InfoLabel
                    label="Неоплаченных записей"
                    tooltip="Проведенные и сгоревшие записи клиента, которые еще не покрыты оплатами."
                  />
                ),
                dataIndex: "unpaidAppointmentsCount",
              },
              {
                title: <InfoLabel label="Средняя задержка" tooltip="Среднее число дней от даты записи до даты оплаты." />,
                dataIndex: "averagePaymentDelayDays",
                render: formatDelay,
              },
              {
                title: <InfoLabel label="Медиана" tooltip="Центральное значение задержки оплаты." />,
                dataIndex: "medianPaymentDelayDays",
                render: formatDelay,
              },
              {
                title: <InfoLabel label="Максимум" tooltip="Наибольшая задержка оплаты." />,
                dataIndex: "maxPaymentDelayDays",
                render: formatDelay,
              },
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
        {
          title: <InfoLabel label="Неопл. записей" tooltip="Записи в этом срезе, которые еще не покрыты оплатами." />,
          render: (_, row) => getUnpaid(row),
        },
        {
          title: <InfoLabel label="Средняя задержка" tooltip="Среднее число дней от записи до оплаты в этом срезе." />,
          render: (_, row) => formatDelay(getAverageDelay(row)),
        },
        {
          title: <InfoLabel label="Медиана" tooltip="Центральное значение задержки оплаты в этом срезе." />,
          render: (_, row) => formatDelay(getMedianDelay(row)),
        },
        {
          title: <InfoLabel label="Макс. задержка" tooltip="Самая длинная задержка оплаты в этом срезе." />,
          render: (_, row) => formatDelay(getMaxDelay(row)),
        },
      ]}
    />
  );
}

function formatDelay(value?: number | null) {
  return value == null ? "—" : `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)} дн.`;
}
