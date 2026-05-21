import { useQuery } from "@tanstack/react-query";
import { Card, DatePicker, InputNumber, Table, Tag, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useState } from "react";
import { dashboardApi } from "@/api/crm";
import type { PriceChangeAnalyticsItem } from "@/api/types";
import { SummaryCard, SummaryGrid } from "@/components/SummaryGrid";
import { PageLayout, ListFilters } from "@/shared/ui";
import { filterFieldClassName } from "@/shared/ui/filterFieldStyles";
import { DATE_FORMAT } from "@/utils/date";
import { formatMoney } from "@/utils/money";

export function PriceChangesPage() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf("year"), dayjs().endOf("month")]);
  const [windowDays, setWindowDays] = useState(30);
  const query = useQuery({
    queryKey: ["dashboard", "price-changes", timezone, dateRange[0].toISOString(), dateRange[1].toISOString(), windowDays],
    queryFn: () =>
      dashboardApi.priceChanges({
        timezone,
        start: dateRange[0].format("YYYY-MM-DD"),
        end: dateRange[1].format("YYYY-MM-DD"),
        windowDays,
      }),
  });

  return (
    <PageLayout
      title="Изменения цен"
      description="Сравнивает выручку, спрос и прибыль до и после изменения цены услуги"
    >
      <ListFilters>
        <div className={filterFieldClassName}>
          <Typography.Text type="secondary">Период изменений</Typography.Text>
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
          <Typography.Text type="secondary">Окно сравнения, дней</Typography.Text>
          <InputNumber min={1} max={365} value={windowDays} onChange={(value) => setWindowDays(typeof value === "number" ? value : 30)} />
        </div>
      </ListFilters>

      <SummaryGrid>
        <SummaryCard title="Изменений найдено" value={query.data?.totalChanges ?? 0} />
        <SummaryCard title="Повышений цены" value={query.data?.priceIncreasesCount ?? 0} />
        <SummaryCard title="С ростом выручки" value={query.data?.positiveRevenueImpactCount ?? 0} />
        <SummaryCard title="С потерей спроса" value={query.data?.negativeDemandImpactCount ?? 0} />
      </SummaryGrid>

      <Table<PriceChangeAnalyticsItem>
        rowKey={(row) => `${row.serviceId}-${row.effectiveDate}`}
        loading={query.isLoading}
        dataSource={query.data?.changes}
        pagination={{ pageSize: 10 }}
        expandable={{
          expandedRowRender: (row) => (
            <PriceChangeDetails row={row} />
          ),
          rowExpandable: (row) => row.teachers.length > 0,
        }}
        columns={[
          { title: "Услуга", dataIndex: "serviceName" },
          { title: "Дата", dataIndex: "effectiveDate", render: (value: string) => dayjs(value).format("DD.MM.YYYY") },
          {
            title: "Цена",
            render: (_, row) => `${formatMoney(row.oldPrice)} -> ${formatMoney(row.newPrice)}`,
          },
          {
            title: "Изменение цены",
            render: (_, row) => (
              <MetricTag value={row.priceChange} suffix={row.priceChangePercent == null ? undefined : `${row.priceChangePercent.toFixed(1)}%`} money />
            ),
          },
          {
            title: "Выручка",
            render: (_, row) => (
              <CompactDelta
                before={formatMoney(row.revenueBefore)}
                after={formatMoney(row.revenueAfter)}
                delta={<MetricTag value={row.revenueChange} suffix={row.revenueChangePercent == null ? undefined : `${row.revenueChangePercent.toFixed(1)}%`} money />}
              />
            ),
          },
          {
            title: "Спрос",
            render: (_, row) => (
              <CompactDelta
                before={String(row.appointmentsBefore)}
                after={String(row.appointmentsAfter)}
                delta={<MetricTag value={row.appointmentChange} suffix={formatPercent(row.appointmentChangePercent)} />}
              />
            ),
          },
          {
            title: "Кратко",
            render: (_, row) => (
              <>
                <Tag color="blue">Затронуто: {row.affectedAppointmentsCount}</Tag>
                <Tag color="green">Средний чек: {formatMoney(row.averageReceiptAfter)}</Tag>
                <Tag color={row.profitImpact > 0 ? "green" : row.profitImpact < 0 ? "red" : "default"}>
                  Прибыль: {formatSignedMoney(row.profitImpact)}
                </Tag>
              </>
            ),
          },
        ]}
      />
    </PageLayout>
  );
}

function PriceChangeDetails({ row }: { row: PriceChangeAnalyticsItem }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <SummaryGrid>
        <SummaryCard title="Выручка" value={`${formatMoney(row.revenueBefore)} -> ${formatMoney(row.revenueAfter)}`} caption={<MetricTag value={row.revenueChange} suffix={formatPercent(row.revenueChangePercent)} money />} />
        <SummaryCard title="Спрос" value={`${row.appointmentsBefore} -> ${row.appointmentsAfter}`} caption={<MetricTag value={row.appointmentChange} suffix={formatPercent(row.appointmentChangePercent)} />} />
        <SummaryCard title="Средний чек" value={`${formatMoney(row.averageReceiptBefore)} -> ${formatMoney(row.averageReceiptAfter)}`} />
        <SummaryCard title="Чистая прибыль" value={`${formatMoney(row.netProfitBefore)} -> ${formatMoney(row.netProfitAfter)}`} caption={<MetricTag value={row.profitImpact} money />} />
      </SummaryGrid>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <Card size="small" title="Статусы">
          <div style={{ display: "grid", gap: 8 }}>
            <Tag color="green">Проведено: {row.completedAppointmentsBefore} {"->"} {row.completedAppointmentsAfter}</Tag>
            <Tag color="volcano">Отмена: {formatPercent(row.cancellationShareBefore)} {"->"} {formatPercent(row.cancellationShareAfter)}</Tag>
            <Tag color="gold">Сгорело: {formatPercent(row.burnedShareBefore)} {"->"} {formatPercent(row.burnedShareAfter)}</Tag>
          </div>
        </Card>

        <Card size="small" title="Финансовый эффект">
          <div style={{ display: "grid", gap: 8 }}>
            <Tag color="blue">Затронуто записей: {row.affectedAppointmentsCount}</Tag>
            <Tag color="default">Расходы: {formatMoney(row.expensesBefore)} {"->"} {formatMoney(row.expensesAfter)}</Tag>
            <Tag color={row.additionalRevenue != null && row.additionalRevenue > 0 ? "green" : row.additionalRevenue != null && row.additionalRevenue < 0 ? "red" : "default"}>
              Доп. выручка: {row.additionalRevenue == null ? "—" : formatSignedMoney(row.additionalRevenue)}
            </Tag>
            <Tag color="default">Эластичность: {row.priceElasticity == null ? "—" : row.priceElasticity.toFixed(2)}</Tag>
          </div>
        </Card>
      </div>

      <Table
        rowKey={(teacher) => teacher.teacherId ?? teacher.teacherDisplayName}
        dataSource={row.teachers}
        pagination={false}
        size="small"
        scroll={{ x: "max-content" }}
        columns={[
          { title: "Преподаватель", dataIndex: "teacherDisplayName" },
          {
            title: "Выручка",
            render: (_, teacher) => (
              <CompactDelta
                before={formatMoney(teacher.revenueBefore)}
                after={formatMoney(teacher.revenueAfter)}
                delta={undefined}
              />
            ),
          },
          {
            title: "Записи",
            render: (_, teacher) => (
              <CompactDelta
                before={String(teacher.appointmentsBefore)}
                after={String(teacher.appointmentsAfter)}
                delta={undefined}
              />
            ),
          },
          {
            title: "Средний чек",
            render: (_, teacher) => `${formatMoney(teacher.averageReceiptBefore)} -> ${formatMoney(teacher.averageReceiptAfter)}`,
          },
          {
            title: "Статусы",
            render: (_, teacher) => (
              <>
                <Tag color="volcano">Отмена: {formatPercent(teacher.cancellationShareBefore)} {"->"} {formatPercent(teacher.cancellationShareAfter)}</Tag>
                <Tag color="gold">Сгорело: {formatPercent(teacher.burnedShareBefore)} {"->"} {formatPercent(teacher.burnedShareAfter)}</Tag>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}

function CompactDelta({ before, after, delta }: { before: string; after: string; delta?: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <Typography.Text>{before} {"->"} {after}</Typography.Text>
      {delta}
    </div>
  );
}

function MetricTag({
  value,
  suffix,
  prefix,
  money = false,
  neutralWhenZero = false,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  money?: boolean;
  neutralWhenZero?: boolean;
}) {
  const color = value > 0 ? "green" : value < 0 ? "red" : neutralWhenZero ? "default" : "blue";
  const formattedValue = money ? formatSignedMoney(value) : formatSignedNumber(value);
  const parts = [prefix, formattedValue, suffix].filter((part): part is string => Boolean(part));

  return (
    <Tag color={color}>{parts.join(" ")}</Tag>
  );
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
    return `+${value.toFixed(1).replace(/\\.0$/, "")}`;
  }

  if (value < 0) {
    return value.toFixed(1).replace(/\\.0$/, "");
  }

  return "0";
}

function formatPercent(value?: number | null) {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}
