import { Card, DatePicker, Select, Space, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { queryKeys } from "@/api/queryKeys";
import { dashboardApi } from "@/api/crm";
import type { ExpenseDynamicsBucket, ExpensesAnalytics } from "@/api/types";
import { StatsDonutChart, StatsTrendChart } from "@/shared/ui/charts";
import { STATS_CHART_COLORS } from "@/shared/ui/charts";
import { InfoLabel } from "@/shared/ui";
import { SummaryCard, SummaryGrid } from "@/shared/ui";
import { useDashboardDateRangeGroupByQuery } from "@/features/stats/useDashboardStatsQuery";
import { PageLayout, ListFilters } from "@/shared/ui";
import { filterFieldClassName } from "@/shared/ui/filterFieldStyles";
import { DATE_FORMAT } from "@/shared/lib";
import { formatMoney } from "@/shared/lib";

type ExpenseGroupBy = "day" | "week" | "month" | "year";

const groupByOptions: Array<{ label: string; value: ExpenseGroupBy }> = [
  { label: "День", value: "day" },
  { label: "Неделя", value: "week" },
  { label: "Месяц", value: "month" },
  { label: "Год", value: "year" },
];

export function ExpensesStatsPage() {
  const controller = useDashboardDateRangeGroupByQuery<ExpensesAnalytics, ExpenseGroupBy>({
    initialGroupBy: "month",
    getQueryKey: ({ timezone, dateRange, groupBy }) => queryKeys.dashboard.expenses(timezone, dateRange[0], dateRange[1], groupBy),
    queryFn: ({ timezone, dateRange, groupBy }) =>
      dashboardApi.expenses({
        timezone,
        start: dateRange[0].format("YYYY-MM-DD"),
        end: dateRange[1].format("YYYY-MM-DD"),
        groupBy,
      }),
  });
  const dateRange = controller.dateRange;
  const groupBy = controller.groupBy;
  const query = controller.query;

  return (
    <PageLayout
      title="Расходы"
      description="Показывает общую сумму расходов, динамику по периодам, структуру по категориям и долю расходов относительно выручки."
    >
      <ListFilters>
        <div className={filterFieldClassName}>
          <Typography.Text type="secondary">Период</Typography.Text>
          <DatePicker.RangePicker value={dateRange} format={DATE_FORMAT} onChange={controller.onDateRangeChange} />
        </div>

        <div className={filterFieldClassName}>
          <Typography.Text type="secondary">Группировка</Typography.Text>
          <Select className="wide" value={groupBy} options={groupByOptions} onChange={controller.setGroupBy} />
        </div>
      </ListFilters>

      <div data-onboarding-id="expenses-stats-summary">
        <SummaryGrid>
          <SummaryCard title="Всего расходов" value={formatMoney(query.data?.totalExpenses)} />
          <SummaryCard
            title={<InfoLabel label="Доля от выручки" tooltip="Какой процент выручки за тот же период составили расходы." />}
            value={formatPercent(query.data?.expenseToRevenueRatio)}
          />
          <SummaryCard title="Операций расходов" value={query.data?.expensesCount ?? 0} />
          <SummaryCard title="Категорий" value={query.data?.categories.length ?? 0} />
          <SummaryCard title="Выручка за период" value={formatMoney(query.data?.totalRevenue)} />
          <SummaryCard
            title={<InfoLabel label="Средний расход" tooltip="Средняя сумма одной расходной операции за выбранный период." />}
            value={formatAverageExpense(query.data)}
          />
          <SummaryCard
            title="Крупнейшая категория"
            value={
              query.data?.categories[0] ? `${query.data.categories[0].categoryName}: ${formatMoney(query.data.categories[0].amount)}` : "—"
            }
          />
        </SummaryGrid>
      </div>

      <Space orientation="vertical" size={20} className="wide" data-onboarding-id="expenses-stats-main-blocks">
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))" }}>
          <SectionCard title="График расходов">
            <StatsTrendChart
              data={query.data?.dynamics.map((item) => ({
                key: `${item.startDate}-${item.endDate}`,
                label: formatCompactBucket(item, query.data.groupBy),
                tooltip: (
                  <div>
                    <div>{formatBucket(item, query.data)}</div>
                    <div>{formatMoney(item.expenses)}</div>
                    <div>
                      {item.changePercentFromPrevious == null ? "Без сравнения" : `Изм.: ${formatPercent(item.changePercentFromPrevious)}`}
                    </div>
                  </div>
                ),
                values: { expenses: item.expenses },
              }))}
              series={[{ key: "expenses", label: "Расходы", color: STATS_CHART_COLORS[1] }]}
            />
          </SectionCard>

          <SectionCard title="Структура расходов">
            <StatsDonutChart
              items={query.data?.categories.map((category, index) => ({
                key: category.categoryId ?? category.categoryName,
                label: category.categoryName,
                value: category.amount,
                valueLabel: formatMoney(category.amount),
                shareLabel: formatPercent(category.share),
                tooltip: `${category.categoryName}: ${formatMoney(category.amount)}${category.share == null ? "" : ` (${formatPercent(category.share)})`}`,
                color: STATS_CHART_COLORS[index % STATS_CHART_COLORS.length],
              }))}
              totalLabel="Всего"
              totalValueLabel={formatMoney(query.data?.totalExpenses)}
            />
          </SectionCard>
        </div>

        <SectionCard title="Динамика расходов">
          <Table<ExpenseDynamicsBucket>
            rowKey={(row) => `${row.startDate}-${row.endDate}`}
            loading={query.isLoading}
            dataSource={query.data?.dynamics}
            pagination={false}
            scroll={{ x: "max-content" }}
            columns={[
              { title: "Период", render: (_, row) => formatBucket(row, query.data) },
              { title: "Расходы", dataIndex: "expenses", render: (value: number) => formatMoney(value) },
              {
                title: (
                  <InfoLabel label="Изм. к прошлому" tooltip="Разница в сумме расходов относительно предыдущего периода той же длины." />
                ),
                dataIndex: "changeFromPrevious",
                render: (value?: number | null) => (value == null ? "—" : <ExpenseChangeTag value={value} money />),
              },
              {
                title: (
                  <InfoLabel label="% к прошлому" tooltip="Процентное изменение расходов относительно предыдущего периода той же длины." />
                ),
                dataIndex: "changePercentFromPrevious",
                render: formatPercent,
              },
            ]}
          />
        </SectionCard>

        <SectionCard title="По категориям">
          <Table
            rowKey={(row) => row.categoryId ?? row.categoryName}
            loading={query.isLoading}
            dataSource={query.data?.categories}
            pagination={false}
            scroll={{ x: "max-content" }}
            columns={[
              { title: "Категория", dataIndex: "categoryName" },
              { title: "Сумма", dataIndex: "amount", render: (value: number) => formatMoney(value) },
              { title: "Доля", dataIndex: "share", render: formatPercent },
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

function ExpenseChangeTag({ value, money = false }: { value: number; money?: boolean }) {
  const color = value > 0 ? "red" : value < 0 ? "green" : "default";
  return <Tag color={color}>{money ? formatSignedMoney(value) : formatSignedNumber(value)}</Tag>;
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

function formatSignedNumber(value: number) {
  if (value > 0) {
    return `+${value.toFixed(1)}`;
  }

  if (value < 0) {
    return `-${Math.abs(value).toFixed(1)}`;
  }

  return value.toFixed(1);
}

function formatBucket(row: ExpenseDynamicsBucket, data?: Pick<ExpensesAnalytics, "groupBy">) {
  const start = dayjs(row.startDate);
  const end = dayjs(row.endDate);
  switch (data?.groupBy) {
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

function formatAverageExpense(data?: ExpensesAnalytics) {
  if (!data || data.expensesCount === 0) {
    return "—";
  }

  return formatMoney(data.totalExpenses / data.expensesCount);
}

function formatCompactBucket(row: ExpenseDynamicsBucket, groupBy?: ExpensesAnalytics["groupBy"]) {
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
