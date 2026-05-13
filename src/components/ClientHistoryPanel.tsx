import { CalendarOutlined, CreditCardOutlined } from "@ant-design/icons";
import { Button, Card, Descriptions, Empty, List, Space, Tag, Typography } from "antd";
import { ClientHistory } from "../api/types";
import { formatDateTime } from "../utils/date";
import { formatMoney } from "../utils/money";

type ClientHistoryPanelProps = {
  data: ClientHistory;
  onCreateAppointment: (client: ClientHistory["client"]) => void;
  onCreatePayment: (client: ClientHistory["client"]) => void;
};

export function ClientHistoryPanel({ data, onCreateAppointment, onCreatePayment }: ClientHistoryPanelProps) {
  return (
    <Space direction="vertical" size={16} className="wide">
      <Space>
        <Button icon={<CalendarOutlined />} onClick={() => onCreateAppointment(data.client)}>
          Записать
        </Button>
        <Button type="primary" icon={<CreditCardOutlined />} onClick={() => onCreatePayment(data.client)}>
          Добавить платеж
        </Button>
      </Space>
      <div className="detail-grid">
        <Card size="small">
          <Descriptions size="small" title="Контакты" column={1}>
            <Descriptions.Item label="Телефон">{renderPhoneLink(data.client.contacts?.phone) || "Не указан"}</Descriptions.Item>
            <Descriptions.Item label="Telegram">{renderSocialLink(data.client.contacts?.telegram, "telegram") || "Не указан"}</Descriptions.Item>
            <Descriptions.Item label="VK">{renderSocialLink(data.client.contacts?.vk, "vk") || "Не указан"}</Descriptions.Item>
          </Descriptions>
        </Card>
        <Card size="small">
          <Descriptions size="small" title="Сводка" column={1}>
            <Descriptions.Item label="Баланс">
              <Tag color={data.client.balance < 0 ? "red" : "green"}>{formatMoney(data.client.balance)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Платежей">{data.summary.paymentsCount}</Descriptions.Item>
            <Descriptions.Item label="Всего оплачено">{formatMoney(data.summary.totalPayments)}</Descriptions.Item>
            <Descriptions.Item label="Завершенных визитов">{data.summary.completedAppointmentsCount}</Descriptions.Item>
            <Descriptions.Item label="Будущих записей">{data.summary.upcomingAppointmentsCount}</Descriptions.Item>
            <Descriptions.Item label="Последний платеж">{formatOptionalDateTime(data.summary.lastPaymentAtUtc)}</Descriptions.Item>
            <Descriptions.Item label="Последний визит">{formatOptionalDateTime(data.summary.lastVisitAtUtc)}</Descriptions.Item>
            <Descriptions.Item label="Следующая запись">{formatOptionalDateTime(data.summary.nextAppointmentAtUtc)}</Descriptions.Item>
          </Descriptions>
        </Card>
      </div>

      <Card size="small" title="Последние платежи">
        {data.recentPayments.length > 0 ? (
          <List
            dataSource={data.recentPayments}
            renderItem={(payment) => (
              <List.Item>
                <div className="wide">
                  <Space className="wide list-justify" wrap>
                    <Typography.Text strong>{formatMoney(payment.amount)}</Typography.Text>
                    <Typography.Text type="secondary">{formatDateTime(payment.date)}</Typography.Text>
                  </Space>
                  <Typography.Text>{payment.description}</Typography.Text>
                  {payment.serviceName ? (
                    <div>
                      <Typography.Text type="secondary">Услуга: {payment.serviceName}</Typography.Text>
                    </div>
                  ) : null}
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Платежей пока нет" />
        )}
      </Card>

      <Card size="small" title="Последние записи">
        {data.recentAppointments.length > 0 ? (
          <List
            dataSource={data.recentAppointments}
            renderItem={(appointment) => (
              <List.Item>
                <div className="wide">
                  <Space className="wide list-justify" wrap>
                    <Typography.Text strong>{appointment.serviceName}</Typography.Text>
                    <Space wrap size={8}>
                      {renderAppointmentStatus(appointment)}
                      <Typography.Text type="secondary">{formatDateTime(appointment.startDate)}</Typography.Text>
                    </Space>
                  </Space>
                  <Typography.Text type="secondary">
                    {appointment.providerDisplayName ? `Мастер: ${appointment.providerDisplayName}` : "Мастер не назначен"}
                  </Typography.Text>
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Записей пока нет" />
        )}
      </Card>
    </Space>
  );
}

function renderPhoneLink(value?: string | null) {
  if (!value) {
    return null;
  }

  return <a href={`tel:${value}`}>{value}</a>;
}

function renderSocialLink(value: string | null | undefined, type: "telegram" | "vk") {
  if (!value) {
    return null;
  }

  return (
    <a href={value} target="_blank" rel="noreferrer">
      @{getSocialHandle(value, type)}
    </a>
  );
}

function renderAppointmentStatus(appointment: ClientHistory["recentAppointments"][number]) {
  if (appointment.isCanceled) {
    return <Tag color="default">Отменена</Tag>;
  }

  if (appointment.isCompleted) {
    return <Tag color="green">Завершена</Tag>;
  }

  return <Tag color="blue">Запланирована</Tag>;
}

function formatOptionalDateTime(value?: string | null) {
  return value ? formatDateTime(value) : "Нет данных";
}

function getSocialHandle(value: string, type: "telegram" | "vk") {
  const host = type === "telegram" ? /^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\//i : /^(?:https?:\/\/)?(?:www\.)?(?:vk\.com|vk\.ru)\//i;
  return value.replace(host, "").split(/[/?#]/)[0] ?? "";
}
