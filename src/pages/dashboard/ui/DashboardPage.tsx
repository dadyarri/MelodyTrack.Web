import { DownloadOutlined, LinkOutlined, PhoneOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Card, Empty, List, Space, Statistic, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { Appointment } from "@/api/types";
import { ClientHistoryDrawer, getPhoneUri } from "@/entities/client";
import { type DashboardReminderListProps, useDashboardPageController } from "@/features/dashboard/useDashboardPageController";
import { renderAppointmentStatusTag } from "@/features/schedule/appointmentStatus";
import { PageLayout, ShortcutButton } from "@/shared/ui";
import { formatDateTime, TIME_FORMAT } from "@/utils/date";
import { formatMoney } from "@/utils/money";
import tableLinkButtonStyles from "@/shared/ui/TableLinkButton.module.css";
import styles from "./DashboardPage.module.css";

export function DashboardPage() {
  const controller = useDashboardPageController();
  const smallWidgetClassName = `${styles.widget} ${styles.widgetSmall}`;
  const largeWidgetClassName = `${styles.widget} ${styles.widgetLarge}`;

  return (
    <PageLayout title="Обзор">
      <div className={styles.grid} data-onboarding-id="dashboard-content">
        {controller.canSeeFinancialOverview ? (
          <>
            <Card className={smallWidgetClassName}>
              <Statistic
                title="Записи сегодня"
                value={controller.statsQuery.data?.appointmentsToday ?? 0}
                loading={controller.statsQuery.isLoading}
              />
            </Card>
            <Card className={smallWidgetClassName}>
              <Statistic
                title="Записи завтра"
                value={controller.statsQuery.data?.appointmentsTomorrow ?? 0}
                loading={controller.statsQuery.isLoading}
              />
            </Card>
            <Card className={smallWidgetClassName}>
              <Statistic
                title="Всего клиентов"
                value={controller.statsQuery.data?.totalClients ?? 0}
                loading={controller.statsQuery.isLoading}
              />
            </Card>
            <Card className={smallWidgetClassName}>
              <Statistic title="Должники" value={controller.statsQuery.data?.debtorsCount ?? 0} loading={controller.statsQuery.isLoading} />
            </Card>
            <Card className={smallWidgetClassName}>
              <Statistic
                title="Общий долг"
                value={formatMoney(controller.statsQuery.data?.totalDebt)}
                loading={controller.statsQuery.isLoading}
              />
            </Card>
            <Card className={smallWidgetClassName}>
              <Statistic
                title="Доход за месяц"
                value={formatMoney(controller.statsQuery.data?.monthIncome)}
                loading={controller.statsQuery.isLoading}
              />
            </Card>
            <Card className={smallWidgetClassName}>
              <Statistic
                title="Расход за месяц"
                value={formatMoney(controller.statsQuery.data?.monthExpenses)}
                loading={controller.statsQuery.isLoading}
              />
            </Card>
            <Card className={smallWidgetClassName}>
              <Statistic
                title="Итог за месяц"
                value={formatMoney(controller.statsQuery.data?.monthNet)}
                loading={controller.statsQuery.isLoading}
              />
            </Card>
          </>
        ) : null}

        <Card
          className={largeWidgetClassName}
          title={`Записи на сегодня, ${formatDateTitle(controller.today)}`}
          loading={controller.miniQuery.isLoading}
        >
          <ReminderList appointments={controller.todayAppointments} emptyDescription="На сегодня записей нет" showTimeOnly />
        </Card>

        <Card
          className={largeWidgetClassName}
          title={`Записи на завтра, ${formatDateTitle(controller.tomorrow)}`}
          loading={controller.miniQuery.isLoading}
        >
          <ReminderList appointments={controller.tomorrowAppointments} emptyDescription="На завтра записей нет" showTimeOnly />
        </Card>

        {controller.canSeeFinancialOverview ? (
          <Card
            data-onboarding-id="dashboard-debtors"
            className={largeWidgetClassName}
            title="Клиенты с отрицательным балансом"
            extra={
              <ShortcutButton
                shortcut="X"
                leadingIcon={<DownloadOutlined />}
                loading={controller.debtorsExportMutation.isPending}
                label="Экспорт"
                onClick={() => {
                  controller.debtorsExportMutation.mutate();
                }}
              />
            }
          >
            <Table
              rowKey="id"
              loading={controller.debtorsQuery.isLoading}
              dataSource={controller.debtorsQuery.data}
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
                        controller.setHistoryClient(row);
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
        ) : null}
      </div>
      <ClientHistoryDrawer
        client={controller.historyClient}
        data={controller.historyQuery.data}
        isLoading={controller.historyQuery.isLoading}
        isError={controller.historyQuery.isError}
        onClose={() => {
          controller.setHistoryClient(null);
        }}
        onCreateAppointment={controller.clientHistoryActions.onCreateAppointment}
        onCreatePayment={controller.clientHistoryActions.onCreatePayment}
      />
    </PageLayout>
  );
}

function ReminderList({ appointments, emptyDescription, showTimeOnly = false }: DashboardReminderListProps) {
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
                href={getPhoneUri(appointment.client.contacts.phone)}
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
