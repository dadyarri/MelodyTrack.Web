import { InfoCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Card, DatePicker, Flex, Space, Table, Tag, Tooltip, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useState, type ReactNode } from "react";
import { dashboardApi } from "@/api/crm";
import type { ClientAnalytics, ClientRfmAnalytics, ClientSourceAnalytics, ClientsAnalyticsResponse } from "@/api/types";
import { STATS_CHART_COLORS, StatsDonutChart, StatsHorizontalBarChart } from "@/components/charts/StatsCharts";
import { SummaryCard } from "@/components/SummaryGrid";
import { PageLayout, ListFilters } from "@/shared/ui";
import { filterFieldClassName } from "@/shared/ui/filterFieldStyles";
import { DATE_FORMAT, formatDateTime } from "@/utils/date";
import { formatMoney } from "@/utils/money";

export function ClientsStatsPage() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf("month"), dayjs().endOf("month")]);
  const query = useQuery({
    queryKey: ["dashboard", "clients", timezone, dateRange[0].toISOString(), dateRange[1].toISOString()],
    queryFn: () =>
      dashboardApi.clients({
        timezone,
        start: dateRange[0].format("YYYY-MM-DD"),
        end: dateRange[1].format("YYYY-MM-DD"),
      }),
  });

  return (
    <PageLayout
      title="Клиенты"
      description="Показывает удержание, новых, потерянных и рисковых клиентов, LTV, сегменты и разрез по источникам на основе истории клиентов, записей, оплат и цен услуг."
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

      <div data-onboarding-id="clients-stats-summary">
        <StatsCardGrid>
        <SummaryCard title="Всего клиентов" value={query.data?.totalClientsCount ?? 0} />
        <SummaryCard
          title={titleWithInfo(
            "Активные сейчас",
            "Клиенты, у которых на конец выбранного периода была хотя бы одна оплата за последние 30 дней или хотя бы одна запись за последние 7 дней."
          )}
          value={query.data?.activeNowClientsCount ?? 0}
        />
        <SummaryCard title="Неактивные" value={query.data?.inactiveClientsCount ?? 0} />
        <SummaryCard
          title={titleWithInfo(
            "Удержание клиентов",
            "Какая доля клиентов из прошлого сопоставимого периода вернулась в текущем периоде."
          )}
          value={formatPercent(query.data?.retentionRate)}
        />
        <SummaryCard title="Новых клиентов" value={query.data?.newClientsCount ?? 0} />
        <SummaryCard
          title={titleWithInfo(
            "Вернувшиеся клиенты",
            "Клиенты, у которых есть минимум две записи за историю и хотя бы одна запись в выбранном периоде после самой первой записи."
          )}
          value={query.data?.returnedClientsCount ?? 0}
        />
        <SummaryCard
          title={titleWithInfo(
            "Доля вернувшихся",
            "Доля клиентов с повторным визитом среди клиентов, у которых в выбранном периоде была хотя бы одна запись."
          )}
          value={formatPercent(query.data?.returningClientsShare)}
        />
        <SummaryCard title="Потеряно клиентов" value={query.data?.lostClientsCount ?? 0} />
        <SummaryCard
          title={titleWithInfo(
            "Доля потерянных",
            "Потерянные клиенты / клиенты, у которых в истории была хотя бы одна запись."
          )}
          value={formatPercent(query.data?.lostShare)}
        />
        <SummaryCard
          title={titleWithInfo(
            "Под риском ухода",
            "Клиенты, которые еще не потеряны, но давно не записывались: дней с последней записи больше, чем их средний интервал между записями, умноженный на 1.5."
          )}
          value={query.data?.atRiskClientsCount ?? 0}
        />
        <SummaryCard
          title={titleWithInfo(
            "Средний LTV",
            "Средняя пожизненная выручка на клиента. Считается только по клиентам, у которых есть хотя бы одна проведенная или сгоревшая платная запись."
          )}
          value={formatMoney(query.data?.averageLifetimeValue)}
        />
        <SummaryCard title="Активны в периоде" value={query.data?.activeClientsCount ?? 0} />
        <SummaryCard title="Активны в прошлом периоде" value={query.data?.previousPeriodActiveClientsCount ?? 0} />
        <SummaryCard title="Вернулись из прошлого периода" value={query.data?.retainedClientsCount ?? 0} />
        <SummaryCard
          title={titleWithInfo(
            "Средний интервал",
            "Среднее число дней между соседними записями по всем клиентам, у которых есть хотя бы две записи."
          )}
          value={formatDays(query.data?.averageIntervalDays)}
        />
        <SummaryCard
          title={titleWithInfo(
            "Средняя длина жизни",
            "Среднее число дней между первой и последней записью клиента. Для клиентов с одной записью длина жизни равна 0 дней."
          )}
          value={formatDays(query.data?.averageClientLifetimeDays)}
        />
        <SummaryCard
          title={titleWithInfo(
            "VIP",
            "Клиенты из верхних 10% по LTV среди всех клиентов с ненулевой выручкой."
          )}
          value={query.data?.vipClientsCount ?? 0}
        />
        <SummaryCard
          title={titleWithInfo(
            "Регулярные",
            "Клиенты, у которых было не меньше 4 проведенных записей за последние 90 дней выбранного периода."
          )}
          value={query.data?.regularClientsCount ?? 0}
        />
        <SummaryCard
          title={titleWithInfo(
            "Разовые",
            "Клиенты, у которых за всю историю ровно одна проведенная запись. Сгоревшие записи сюда не входят."
          )}
          value={query.data?.singleTimeClientsCount ?? 0}
        />
        <SummaryCard
          title={titleWithInfo(
            "Должники",
            "Клиенты, у которых сумма проведенных и сгоревших записей больше суммы всех подтвержденных оплат."
          )}
          value={query.data?.debtorsCount ?? 0}
        />
        </StatsCardGrid>
      </div>

      <Space orientation="vertical" size={20} className="wide" data-onboarding-id="clients-stats-main-blocks">
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))" }}>
        <SectionCard title="Выручка по источникам">
          <StatsDonutChart
            items={query.data?.sources
              .filter((source) => source.revenue > 0)
              .map((source, index) => ({
                key: source.sourceName,
                label: source.sourceName,
                value: source.revenue,
                valueLabel: formatMoney(source.revenue),
                shareLabel: formatPercent(shareOf(query.data, source.revenue)),
                tooltip: `${source.sourceName}: ${formatMoney(source.revenue)}`,
                color: STATS_CHART_COLORS[index % STATS_CHART_COLORS.length],
              }))}
            totalLabel="LTV"
            totalValueLabel={formatMoney(query.data?.clients.reduce((sum, client) => sum + client.lifetimeValue, 0))}
          />
        </SectionCard>

        <SectionCard title="Топ клиентов по LTV">
          <StatsHorizontalBarChart
            items={query.data?.clients.slice(0, 8).map((client, index) => ({
              key: client.clientId,
              label: client.clientDisplayName,
              value: client.lifetimeValue,
              valueLabel: formatMoney(client.lifetimeValue),
              tooltip: `${client.clientDisplayName}: ${formatMoney(client.lifetimeValue)}`,
              color: STATS_CHART_COLORS[index % STATS_CHART_COLORS.length],
            }))}
          />
        </SectionCard>

        <SectionCard
          title={titleWithInfo(
            "Сегменты клиентов",
            <Flex vertical gap={8}>
              <Typography.Text>
                <b>Правила сегментации:</b>
              </Typography.Text>
              <ul>
                <li><b>VIP</b> — верхние 10% по LTV;</li>
                <li><b>Регулярные</b> — минимум 4 проведенные записи за последние 90 дней;</li>
                <li><b>Разовые</b> — ровно 1 проведенная запись за всю историю;</li>
                <li><b>Новые</b> — созданы в выбранном периоде;</li>
                <li><b>Под риском</b> — давно не приходили относительно своего среднего интервала;</li>
                <li><b>Потерянные</b> — не было записей последние 30 дней при наличии истории;</li>
                <li><b>Должники</b> — выручка больше оплат.</li>
              </ul>
            </Flex>
          )}
        >
          <StatsDonutChart
            items={buildSegmentChartItems(query.data)}
            totalLabel="Сегменты"
            totalValueLabel={String(totalSegmentMemberships(query.data))}
            emptyText="Нет клиентов для сегментации."
          />
          <Typography.Text type="secondary">
            Один клиент может входить сразу в несколько сегментов, поэтому сумма сегментов может быть больше числа уникальных клиентов.
          </Typography.Text>
        </SectionCard>

        <SectionCard
          title={titleWithInfo(
            "RFM сегменты",
            <Flex vertical gap={8}>
              <Typography.Text>
                <b>RFM анализ:</b>
              </Typography.Text>
              <ul>
                <li><b>Recency</b> — как давно клиент был в последний раз;</li>
                <li><b>Frequency</b> — сколько проведенных записей у клиента в выбранном периоде;</li>
                <li><b>Monetary</b> — сколько выручки клиент принес в выбранном периоде по проведенным и сгоревшим записям.</li>
                <li>Оценки считаются по шкале от 1 до 5: чем выше, тем лучше.</li>
              </ul>
            </Flex>
          )}
        >
          <StatsDonutChart
            items={buildRfmSegmentChartItems(query.data)}
            totalLabel="RFM"
            totalValueLabel={String(query.data?.rfmClients.length ?? 0)}
            emptyText="Нет данных для RFM."
          />
        </SectionCard>
        </div>

      <SectionCard title="По источникам">
        <Table<ClientSourceAnalytics>
          rowKey={(row) => row.sourceName}
          loading={query.isLoading}
          dataSource={query.data?.sources}
          pagination={false}
          scroll={{ x: "max-content" }}
          columns={[
            { title: "Источник", dataIndex: "sourceName" },
            { title: "Клиентов", dataIndex: "clientsCount" },
            { title: "Активны в периоде", dataIndex: "activeClientsCount" },
            { title: "Новые", dataIndex: "newClientsCount" },
            {
              title: titleWithInfo(
                "Доля новых",
                "Показывает долю новых клиентов внутри текущей аналитической выборки этого источника: новые клиенты источника / все клиенты источника, попавшие в эту статистику."
              ),
              dataIndex: "newClientsShare",
              render: formatPercent,
            },
            { title: "Удержание", dataIndex: "retentionRate", render: formatPercent },
            { title: "Вернулось", dataIndex: "retainedClientsCount" },
            { title: "Потеряно", dataIndex: "lostClientsCount" },
            { title: "Доля потерянных", dataIndex: "lostShare", render: formatPercent },
            { title: "LTV", dataIndex: "revenue", render: (value: number) => formatMoney(value) },
            { title: "Средний LTV", dataIndex: "averageLifetimeValue", render: (value?: number | null) => formatMoney(value) },
          ]}
        />
      </SectionCard>
      </Space>

      <SectionCard title="По клиентам">
        <Table<ClientAnalytics>
          rowKey={(row) => row.clientId}
          loading={query.isLoading}
          dataSource={query.data?.clients}
          pagination={{ pageSize: 10 }}
          scroll={{ x: "max-content" }}
          columns={[
            { title: "Клиент", dataIndex: "clientDisplayName" },
            { title: "Источник", dataIndex: "sourceName" },
            { title: "Создан", dataIndex: "createdAtUtc", render: formatUtcDateTime },
            { title: "LTV", dataIndex: "lifetimeValue", render: (value: number) => formatMoney(value) },
            { title: "Долг", dataIndex: "debt", render: (value: number) => <Tag color={value > 0 ? "red" : "default"}>{formatMoney(value)}</Tag> },
            { title: "Выруч. записей", dataIndex: "revenueCountedAppointmentsCount" },
            { title: "Проведено записей", dataIndex: "completedAppointmentsCount" },
            { title: "Средний интервал", dataIndex: "averageIntervalDays", render: formatDays },
            { title: "Дней с последней записи", dataIndex: "daysSinceLastAppointment", render: (value?: number | null) => (value == null ? "—" : `${String(value)} дн.`) },
            { title: "Первая запись", dataIndex: "firstAppointmentAtUtc", render: formatUtcDateTime },
            { title: "Последняя запись", dataIndex: "lastAppointmentAtUtc", render: formatUtcDateTime },
            { title: "Сегменты", render: (_, row) => <SegmentTags row={row} /> },
          ]}
        />
      </SectionCard>

      <SectionCard
        title={titleWithInfo(
          "RFM по клиентам",
          "Скоринг от 1 до 5 по давности последней записи, частоте визитов и выручке за выбранный период."
        )}
      >
        <Table<ClientRfmAnalytics>
          rowKey={(row) => row.clientId}
          loading={query.isLoading}
          dataSource={query.data?.rfmClients}
          pagination={{ pageSize: 10 }}
          scroll={{ x: "max-content" }}
          columns={[
            { title: "Клиент", dataIndex: "clientDisplayName" },
            { title: "Источник", dataIndex: "sourceName" },
            {
              title: titleWithInfo(
                "Recency",
                "Сколько дней прошло с последней записи клиента на конец выбранного периода. Чем меньше дней, тем лучше значение и тем выше оценка."
              ),
              dataIndex: "recencyDays",
              render: formatIntegerDays,
            },
            {
              title: titleWithInfo(
                "Frequency",
                "Количество записей клиента со статусом 'Проведена' внутри выбранного периода. Чем больше таких записей, тем выше оценка."
              ),
              dataIndex: "frequency",
            },
            {
              title: titleWithInfo(
                "Monetary",
                "Сумма выручки клиента внутри выбранного периода по записям со статусами 'Проведена' и 'Сгорела'. Чем больше сумма, тем выше оценка."
              ),
              dataIndex: "monetary",
              render: (value: number) => formatMoney(value),
            },
            { title: titleWithInfo("R", "Оценка Recency от 1 до 5. 5 получают самые недавние клиенты."), dataIndex: "recencyScore" },
            { title: titleWithInfo("F", "Оценка Frequency от 1 до 5. 5 получают клиенты с наибольшим числом проведенных записей за период."), dataIndex: "frequencyScore" },
            { title: titleWithInfo("M", "Оценка Monetary от 1 до 5. 5 получают клиенты с наибольшей выручкой за период."), dataIndex: "monetaryScore" },
            {
              title: titleWithInfo(
                "RFM",
                "Склеенный код из трех оценок: Recency, Frequency и Monetary. Например, 555 — один из лучших профилей."
              ),
              dataIndex: "rfmScore",
              render: (value: string) => <Tag color="geekblue">{value}</Tag>,
            },
            { title: "Сегмент", dataIndex: "segment", render: (value: string) => <RfmSegmentTag segment={value} /> },
          ]}
        />
      </SectionCard>
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

function StatsCardGrid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
      }}
    >
      {children}
    </div>
  );
}

function titleWithInfo(title: ReactNode, tooltip: ReactNode) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span>{title}</span>
      <Tooltip title={tooltip}>
        <InfoCircleOutlined style={{ color: "var(--text-main)" }} />
      </Tooltip>
    </span>
  );
}

function SegmentTags({ row }: { row: ClientAnalytics }) {
  const tags = [
    row.isVip ? <Tag key="vip" color="gold">VIP</Tag> : null,
    row.isRegular ? <Tag key="regular" color="blue">Регулярный</Tag> : null,
    row.isSingleTime ? <Tag key="single-time">Разовый</Tag> : null,
    row.isNew ? <Tag key="new" color="green">Новый</Tag> : null,
    row.isReturned ? <Tag key="returned" color="cyan">Вернувшийся</Tag> : null,
    row.isAtRisk ? <Tag key="risk" color="orange">Риск</Tag> : null,
    row.isLost ? <Tag key="lost" color="red">Потерян</Tag> : null,
    row.isDebtor ? <Tag key="debtor" color="volcano">Должник</Tag> : null,
  ].filter(Boolean);

  return <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{tags.length > 0 ? tags : "—"}</div>;
}

function RfmSegmentTag({ segment }: { segment: string }) {
  const colorBySegment: Record<string, string> = {
    "Лучшие": "gold",
    "Лояльные": "blue",
    "Перспективные": "green",
    "Под риском": "orange",
    "Потерянные": "red",
    "Низкая ценность": "default",
  };

  return <Tag color={colorBySegment[segment] ?? "default"}>{segment}</Tag>;
}

function formatPercent(value?: number | null) {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}

function formatDays(value?: number | null) {
  return value == null ? "—" : `${value.toFixed(1)} дн.`;
}

function formatUtcDateTime(value?: string | null) {
  return value ? formatDateTime(value) : "—";
}

function formatIntegerDays(value?: number | null) {
  return value == null ? "—" : `${String(value)} дн.`;
}

function shareOf(data: ClientsAnalyticsResponse | undefined, value: number) {
  if (!data) {
    return null;
  }

  const total = data.clients.reduce((sum, client) => sum + client.lifetimeValue, 0);
  return total === 0 ? null : (value / total) * 100;
}

function buildSegmentChartItems(data: ClientsAnalyticsResponse | undefined) {
  if (!data) {
    return [];
  }

  const segments = [
    { key: "vip", label: "VIP", value: data.vipClientsCount, color: STATS_CHART_COLORS[0] },
    { key: "regular", label: "Регулярные", value: data.regularClientsCount, color: STATS_CHART_COLORS[1] },
    { key: "single-time", label: "Разовые", value: data.singleTimeClientsCount, color: STATS_CHART_COLORS[2] },
    { key: "new", label: "Новые", value: data.newClientsCount, color: STATS_CHART_COLORS[3] },
    { key: "risk", label: "Под риском", value: data.atRiskClientsCount, color: STATS_CHART_COLORS[4] },
    { key: "lost", label: "Потерянные", value: data.lostClientsCount, color: STATS_CHART_COLORS[5] },
    { key: "debtors", label: "Должники", value: data.debtorsCount, color: STATS_CHART_COLORS[6] },
  ];

  return segments.map((segment) => ({
    key: segment.key,
    label: segment.label,
    value: segment.value,
    valueLabel: String(segment.value),
    tooltip: `${segment.label}: ${String(segment.value)}`,
    color: segment.color,
  }));
}

function totalSegmentMemberships(data: ClientsAnalyticsResponse | undefined) {
  if (!data) {
    return 0;
  }

  return (
    data.vipClientsCount +
    data.regularClientsCount +
    data.singleTimeClientsCount +
    data.newClientsCount +
    data.returnedClientsCount +
    data.atRiskClientsCount +
    data.lostClientsCount +
    data.debtorsCount
  );
}

function buildRfmSegmentChartItems(data: ClientsAnalyticsResponse | undefined) {
  if (!data) {
    return [];
  }

  const counts = new Map<string, number>();
  for (const row of data.rfmClients) {
    counts.set(row.segment, (counts.get(row.segment) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([segment, value], index) => ({
    key: segment,
    label: segment,
    value,
    valueLabel: String(value),
    tooltip: `${segment}: ${String(value)}`,
    color: STATS_CHART_COLORS[index % STATS_CHART_COLORS.length],
  }));
}
