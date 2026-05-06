import { useQuery } from "@tanstack/react-query";
import { Card, Col, Empty, List, Row, Space, Statistic, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { clientsApi, scheduleApi } from "../api/crm";
import { Appointment } from "../api/types";
import { PageHeader } from "../components/PageHeader";

export function DashboardPage() {
  const debtorsQuery = useQuery({ queryKey: ["clients", "debtors"], queryFn: clientsApi.debtors });
  const miniQuery = useQuery({ queryKey: ["schedule", "mini"], queryFn: () => scheduleApi.mini(Intl.DateTimeFormat().resolvedOptions().timeZone) });

  const todayKey = dayjs().format("YYYY-MM-DD");
  const tomorrowKey = dayjs().add(1, "day").format("YYYY-MM-DD");
  const todayAppointments = miniQuery.data?.[todayKey] ?? [];
  const tomorrowAppointments = miniQuery.data?.[tomorrowKey] ?? [];
  const upcomingAppointments = [...todayAppointments, ...tomorrowAppointments];

  return (
    <>
      <PageHeader title="Обзор" />
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Должники" value={debtorsQuery.data?.length ?? 0} loading={debtorsQuery.isLoading} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Записи сегодня" value={todayAppointments.length} loading={miniQuery.isLoading} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Записи завтра" value={tomorrowAppointments.length} loading={miniQuery.isLoading} />
          </Card>
        </Col>
      </Row>
      <Card title="Ближайшее расписание" loading={miniQuery.isLoading}>
        {upcomingAppointments.length > 0 ? (
          <List
            dataSource={upcomingAppointments}
            renderItem={(appointment) => <ScheduleItem appointment={appointment} />}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет записей на сегодня и завтра" />
        )}
      </Card>
      <Table
        rowKey="id"
        title={() => "Клиенты с отрицательным балансом"}
        loading={debtorsQuery.isLoading}
        dataSource={debtorsQuery.data}
        pagination={false}
        columns={[
          { title: "Клиент", render: (_, row) => `${row.lastName} ${row.firstName}` },
          { title: "Баланс", dataIndex: "balance", render: (value: number) => <Tag color="red">{value}</Tag> },
        ]}
      />
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
