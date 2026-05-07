import { useQuery } from "@tanstack/react-query";
import { Card, Empty, List, Space, Statistic, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { clientsApi, dashboardApi, scheduleApi } from "../api/crm";
import { Appointment } from "../api/types";
import { PageHeader } from "../components/PageHeader";
import { formatMoney } from "../utils/money";

export function DashboardPage() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const statsQuery = useQuery({ queryKey: ["dashboard", "stats", timezone], queryFn: () => dashboardApi.stats(timezone) });
  const debtorsQuery = useQuery({ queryKey: ["clients", "debtors"], queryFn: clientsApi.debtors });
  const miniQuery = useQuery({ queryKey: ["schedule", "mini", timezone], queryFn: () => scheduleApi.mini(timezone) });

  const todayKey = dayjs().format("YYYY-MM-DD");
  const tomorrowKey = dayjs().add(1, "day").format("YYYY-MM-DD");
  const todayAppointments = miniQuery.data?.[todayKey] ?? [];
  const tomorrowAppointments = miniQuery.data?.[tomorrowKey] ?? [];
  const upcomingAppointments = [...todayAppointments, ...tomorrowAppointments];

  return (
    <>
      <PageHeader title="Обзор" />

      <div className="dashboard-grid">
        <Card className="dashboard-widget dashboard-widget-small">
          <Statistic title="Должники" value={statsQuery.data?.debtorsCount ?? 0} loading={statsQuery.isLoading} />
        </Card>
        <Card className="dashboard-widget dashboard-widget-small">
          <Statistic title="Общий долг" value={formatMoney(statsQuery.data?.totalDebt)} loading={statsQuery.isLoading} />
        </Card>
        <Card className="dashboard-widget dashboard-widget-small">
          <Statistic title="Записи сегодня" value={statsQuery.data?.appointmentsToday ?? 0} loading={statsQuery.isLoading} />
        </Card>
        <Card className="dashboard-widget dashboard-widget-small">
          <Statistic title="Записи завтра" value={statsQuery.data?.appointmentsTomorrow ?? 0} loading={statsQuery.isLoading} />
        </Card>
        <Card className="dashboard-widget dashboard-widget-small">
          <Statistic title="Доход за месяц" value={formatMoney(statsQuery.data?.monthIncome)} loading={statsQuery.isLoading} />
        </Card>
        <Card className="dashboard-widget dashboard-widget-small">
          <Statistic title="Расход за месяц" value={formatMoney(statsQuery.data?.monthExpenses)} loading={statsQuery.isLoading} />
        </Card>
        <Card className="dashboard-widget dashboard-widget-small">
          <Statistic title="Итог за месяц" value={formatMoney(statsQuery.data?.monthNet)} loading={statsQuery.isLoading} />
        </Card>
        <Card className="dashboard-widget dashboard-widget-small">
          <Statistic title="Всего клиентов" value={statsQuery.data?.totalClients ?? 0} loading={statsQuery.isLoading} />
        </Card>

        <Card className="dashboard-widget dashboard-widget-large" title="Ближайшее расписание" loading={miniQuery.isLoading}>
          {upcomingAppointments.length > 0 ? (
            <List
              dataSource={upcomingAppointments}
              renderItem={(appointment) => <ScheduleItem appointment={appointment} />}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет записей на сегодня и завтра" />
          )}
        </Card>

        <Card className="dashboard-widget dashboard-widget-large" title="Клиенты с отрицательным балансом">
          <Table
            rowKey="id"
            loading={debtorsQuery.isLoading}
            dataSource={debtorsQuery.data}
            pagination={false}
            columns={[
              { title: "Клиент", render: (_, row) => `${row.lastName} ${row.firstName}` },
              { title: "Баланс", dataIndex: "balance", render: (value: number) => <Tag color="red">{formatMoney(value)}</Tag> },
            ]}
          />
        </Card>
      </div>
    </>
  );
}

function ScheduleItem({ appointment }: { appointment: Appointment }) {
  const start = dayjs(appointment.startDate);
  const status = appointment.isCanceled ? (
    <Tag color="red">Отменена</Tag>
  ) : appointment.isCompleted ? (
    <Tag color="green">Завершена</Tag>
  ) : (
    <Tag color="gold">Запланирована</Tag>
  );

  return (
    <List.Item>
      <Space direction="vertical" size={2} className="wide">
        <Space wrap>
          <Typography.Text strong>{start.format("DD.MM HH:mm")}</Typography.Text>
          {status}
        </Space>
        <Typography.Text>
          {appointment.client.lastName} {appointment.client.firstName} - {appointment.service.name}
        </Typography.Text>
        {appointment.provider ? (
          <Typography.Text type="secondary">
            {appointment.provider.lastName} {appointment.provider.firstName}
          </Typography.Text>
        ) : null}
      </Space>
    </List.Item>
  );
}
