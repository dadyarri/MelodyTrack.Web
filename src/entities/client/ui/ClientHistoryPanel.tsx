import { CalendarOutlined, CreditCardOutlined } from "@ant-design/icons";
import { Button, Card, Descriptions, Empty, List, Space, Tag, Typography } from "antd";
import type { ClientHistory } from "@/api/types";
import { getAppointmentStatusTagColor } from "@/features/schedule/appointmentStatus";
import { formatDateTime } from "@/utils/date";
import { formatMoney } from "@/utils/money";
import { renderClientHistoryAppointmentStatus, renderClientPhoneLink, renderClientSocialLink } from "../lib/client";
import styles from "./ClientHistoryPanel.module.css";

type ClientHistoryPanelProps = {
  data: ClientHistory;
  onCreateAppointment?: (client: ClientHistory["client"]) => void;
  onCreatePayment?: (client: ClientHistory["client"]) => void;
};

export function ClientHistoryPanel({ data, onCreateAppointment, onCreatePayment }: ClientHistoryPanelProps) {
  return (
    <Space orientation="vertical" size={16} className="wide">
      {onCreateAppointment || onCreatePayment ? (
        <Space>
          {onCreateAppointment ? (
            <Button
              icon={<CalendarOutlined />}
              onClick={() => {
                onCreateAppointment(data.client);
              }}
            >
              Записать
            </Button>
          ) : null}
          {onCreatePayment ? (
            <Button
              type="primary"
              icon={<CreditCardOutlined />}
              onClick={() => {
                onCreatePayment(data.client);
              }}
            >
              Добавить платеж
            </Button>
          ) : null}
        </Space>
      ) : null}
      <div className={styles.detailGrid}>
        <Card size="small">
          <Descriptions size="small" title="Контакты" column={1}>
            <Descriptions.Item label="Телефон">{renderClientPhoneLink(data.client.contacts?.phone) || "Не указан"}</Descriptions.Item>
            <Descriptions.Item label="Telegram">
              {renderClientSocialLink(data.client.contacts?.telegram, "telegram") || "Не указан"}
            </Descriptions.Item>
            <Descriptions.Item label="VK">{renderClientSocialLink(data.client.contacts?.vk, "vk") || "Не указан"}</Descriptions.Item>
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
                  <Space className={`wide ${styles.listJustify}`} wrap>
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
                  <Space className={`wide ${styles.listJustify}`} wrap>
                    <Typography.Text strong>{appointment.serviceName}</Typography.Text>
                    <Space wrap size={8}>
                      <Tag color={getAppointmentStatusTagColor(appointment.status)}>
                        {renderClientHistoryAppointmentStatus(appointment)}
                      </Tag>
                      <Typography.Text type="secondary">{formatDateTime(appointment.startDate)}</Typography.Text>
                    </Space>
                  </Space>
                  <Typography.Text type="secondary">
                    {appointment.providerDisplayName ? `Преподаватель: ${appointment.providerDisplayName}` : "Преподаватель не назначен"}
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

function formatOptionalDateTime(value?: string | null) {
  return value ? formatDateTime(value) : "Нет данных";
}
