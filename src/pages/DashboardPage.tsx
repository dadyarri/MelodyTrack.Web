import { useQuery } from "@tanstack/react-query";
import { Col, Row, Statistic, Table, Tag } from "antd";
import { clientsApi, scheduleApi } from "../api/crm";
import { PageHeader } from "../components/PageHeader";
import dayjs from "dayjs";

export function DashboardPage() {
  const debtorsQuery = useQuery({ queryKey: ["clients", "debtors"], queryFn: clientsApi.debtors });
  const miniQuery = useQuery({ queryKey: ["schedule", "mini"], queryFn: () => scheduleApi.mini(Intl.DateTimeFormat().resolvedOptions().timeZone) });

  const todayAppointments = miniQuery.data?.[dayjs().format("YYYY-MM-DD")] ?? [];

  return (
    <>
      <PageHeader title="Обзор" />
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Statistic title="Должники" value={debtorsQuery.data?.length ?? 0} loading={debtorsQuery.isLoading} />
        </Col>
        <Col xs={24} md={8}>
          <Statistic title="Записи сегодня" value={todayAppointments.length} loading={miniQuery.isLoading} />
        </Col>
        <Col xs={24} md={8}>
          <Statistic title="API" value="v2" />
        </Col>
      </Row>
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
