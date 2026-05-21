import { DownloadOutlined, LinkOutlined, PhoneOutlined, SendOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Card, Empty, List, Space, Statistic, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { clientsApi, dashboardApi, scheduleApi } from "@/api/crm";
import type { Appointment, Client } from "@/api/types";
import { ClientHistoryDrawer } from "@/entities/client";
import { renderAppointmentStatusTag } from "@/features/schedule/appointmentStatus";
import { PageLayout, ShortcutButton } from "@/shared/ui";
import { formatDateTime, TIME_FORMAT } from "@/utils/date";
import { downloadBlob } from "@/utils/download";
import { formatMoney } from "@/utils/money";
import { isShortcutTarget, matchesPlainKey } from "@/utils/shortcuts";
import styles from "./DashboardPage.module.css";
import tableLinkButtonStyles from "@/shared/ui/TableLinkButton.module.css";

export function DashboardPage() {
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const navigate = useNavigate();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const statsQuery = useQuery({ queryKey: ["dashboard", "stats", timezone], queryFn: () => dashboardApi.stats(timezone) });
  const debtorsQuery = useQuery({ queryKey: ["clients", "debtors"], queryFn: () => clientsApi.debtors() });
  const miniQuery = useQuery({ queryKey: ["schedule", "mini", timezone], queryFn: () => scheduleApi.mini(timezone) });
  const historyQuery = useQuery({
    queryKey: ["clients", "history", historyClient?.id],
    queryFn: () => {
      const clientId = historyClient?.id;
      if (!clientId) {
        throw new Error("History client is not selected.");
      }
      return clientsApi.history(clientId);
    },
    enabled: Boolean(historyClient),
  });
  const debtorsExportMutation = useMutation({
    mutationFn: () => clientsApi.exportDebtors(),
    onSuccess: (blob) => {
      downloadBlob(blob, `debtors_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`);
    },
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isShortcutTarget(event.target)) {
        return;
      }

      if (matchesPlainKey(event, "x")) {
        event.preventDefault();
        debtorsExportMutation.mutate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [debtorsExportMutation]);

  const todayKey = dayjs().format("YYYY-MM-DD");
  const tomorrowKey = dayjs().add(1, "day").format("YYYY-MM-DD");
  const todayAppointments = miniQuery.data?.[todayKey] ?? [];
  const tomorrowAppointments = miniQuery.data?.[tomorrowKey] ?? [];
  const smallWidgetClassName = `${styles.widget} ${styles.widgetSmall}`;
  const largeWidgetClassName = `${styles.widget} ${styles.widgetLarge}`;

  return (
    <PageLayout title="Обзор">
      <div className={styles.grid}>
        <Card className={smallWidgetClassName}>
          <Statistic title="Должники" value={statsQuery.data?.debtorsCount ?? 0} loading={statsQuery.isLoading} />
        </Card>
        <Card className={smallWidgetClassName}>
          <Statistic title="Общий долг" value={formatMoney(statsQuery.data?.totalDebt)} loading={statsQuery.isLoading} />
        </Card>
        <Card className={smallWidgetClassName}>
          <Statistic title="Записи сегодня" value={statsQuery.data?.appointmentsToday ?? 0} loading={statsQuery.isLoading} />
        </Card>
        <Card className={smallWidgetClassName}>
          <Statistic title="Записи завтра" value={statsQuery.data?.appointmentsTomorrow ?? 0} loading={statsQuery.isLoading} />
        </Card>
        <Card className={smallWidgetClassName}>
          <Statistic title="Доход за месяц" value={formatMoney(statsQuery.data?.monthIncome)} loading={statsQuery.isLoading} />
        </Card>
        <Card className={smallWidgetClassName}>
          <Statistic title="Расход за месяц" value={formatMoney(statsQuery.data?.monthExpenses)} loading={statsQuery.isLoading} />
        </Card>
        <Card className={smallWidgetClassName}>
          <Statistic title="Итог за месяц" value={formatMoney(statsQuery.data?.monthNet)} loading={statsQuery.isLoading} />
        </Card>
        <Card className={smallWidgetClassName}>
          <Statistic title="Всего клиентов" value={statsQuery.data?.totalClients ?? 0} loading={statsQuery.isLoading} />
        </Card>

        <Card className={largeWidgetClassName} title={`Записи на сегодня, ${formatDateTitle(dayjs())}`} loading={miniQuery.isLoading}>
          <ReminderList appointments={todayAppointments} emptyDescription="На сегодня записей нет" showTimeOnly />
        </Card>

        <Card
          className={largeWidgetClassName}
          title={`Записи на завтра, ${formatDateTitle(dayjs().add(1, "day"))}`}
          loading={miniQuery.isLoading}
        >
          <ReminderList appointments={tomorrowAppointments} emptyDescription="На завтра записей нет" showTimeOnly />
        </Card>

        <Card
          className={largeWidgetClassName}
          title="Клиенты с отрицательным балансом"
          extra={
            <ShortcutButton
              shortcut="X"
              leadingIcon={<DownloadOutlined />}
              loading={debtorsExportMutation.isPending}
              label="Экспорт"
              onClick={() => {
                debtorsExportMutation.mutate();
              }}
            />
          }
        >
          <Table
            rowKey="id"
            loading={debtorsQuery.isLoading}
            dataSource={debtorsQuery.data}
            pagination={false}
            scroll={{ x: "max-content" }}
            columns={[
              {
                title: "Клиент",
                render: (_, row) => (
                  <Button
                    type="link"
                    className={tableLinkButtonStyles.button}
                    onClick={() => {
                      setHistoryClient(row);
                    }}
                  >
                    {`${row.lastName} ${row.firstName}`}
                  </Button>
                ),
              },
              { title: "Баланс", dataIndex: "balance", render: (value: number) => <Tag color="red">{formatMoney(value)}</Tag> },
            ]}
          />
        </Card>
      </div>
      <ClientHistoryDrawer
        client={historyClient}
        data={historyQuery.data}
        isLoading={historyQuery.isLoading}
        isError={historyQuery.isError}
        onClose={() => {
          setHistoryClient(null);
        }}
        onCreateAppointment={(client) => navigate("/schedule", { state: { openCreate: true, clientId: client.id } })}
        onCreatePayment={(client) => navigate("/payments", { state: { openCreate: true, clientId: client.id } })}
      />
    </PageLayout>
  );
}

function ReminderList({
  appointments,
  emptyDescription,
  showTimeOnly = false,
}: {
  appointments: Appointment[];
  emptyDescription: string;
  showTimeOnly?: boolean;
}) {
  if (appointments.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} />;
  }

  return (
    <List dataSource={appointments} renderItem={(appointment) => <ScheduleItem appointment={appointment} showTimeOnly={showTimeOnly} />} />
  );
}

function ScheduleItem({ appointment, showTimeOnly = false }: { appointment: Appointment; showTimeOnly?: boolean }) {
  const start = dayjs(appointment.startDate);
  const status = renderAppointmentStatusTag(appointment.status);

  return (
    <List.Item>
      <Space orientation="vertical" size={2} className="wide">
        <Space wrap align="start" className="wide" style={{ justifyContent: "space-between" }}>
          <Space wrap>
            <Typography.Text strong>{showTimeOnly ? start.format(TIME_FORMAT) : formatDateTime(start)}</Typography.Text>
            {status}
          </Space>
          <Space size={4}>
            {appointment.client.contacts?.phone ? (
              <Button
                shape="circle"
                size="small"
                icon={<PhoneOutlined />}
                href={`tel:${appointment.client.contacts.phone}`}
                title={appointment.client.contacts.phone}
              />
            ) : null}
            {appointment.client.contacts?.telegram ? (
              <Button
                shape="circle"
                size="small"
                icon={<SendOutlined />}
                href={appointment.client.contacts.telegram}
                target="_blank"
                rel="noreferrer"
                title="Telegram"
              />
            ) : null}
            {appointment.client.contacts?.vk ? (
              <Button
                shape="circle"
                size="small"
                icon={<LinkOutlined />}
                href={appointment.client.contacts.vk}
                target="_blank"
                rel="noreferrer"
                title="VK"
              />
            ) : null}
          </Space>
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

function formatDateTitle(value: dayjs.Dayjs) {
  return `${value.format("DD.MM.YYYY")} (${value.format("dd").toUpperCase()})`;
}
