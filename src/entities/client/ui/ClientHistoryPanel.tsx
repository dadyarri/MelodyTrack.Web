import { CalendarOutlined, CreditCardOutlined } from "@/components/icons";
import { Button, Card, Descriptions, Empty, List, Pagination, Space, Tag, Typography } from "antd";
import type { ClientHistory } from "@/api/types";
import { getAppointmentStatusTagColor } from "@/features/schedule/appointmentStatus";
import { formatDate, formatDateTime } from "@/utils/date";
import { formatMoney } from "@/utils/money";
import { getClientContactValue, renderClientHistoryAppointmentStatus, renderClientPhoneLink, renderClientSocialLink } from "../lib/client";
import styles from "./ClientHistoryPanel.module.css";

type ClientHistoryPanelProps = {
  data: ClientHistory;
  onCreateAppointment?: (client: ClientHistory["client"]) => void;
  onCreatePayment?: (client: ClientHistory["client"]) => void;
  onEventsPageChange?: (page: number) => void;
  onEditVacations?: (client: ClientHistory["client"]) => void;
};

export function ClientHistoryPanel({
  data,
  onCreateAppointment,
  onCreatePayment,
  onEventsPageChange,
  onEditVacations,
}: ClientHistoryPanelProps) {
  return (
    <Space orientation="vertical" size={16} className="wide">
      {onCreateAppointment || onCreatePayment || onEditVacations ? (
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
          {onEditVacations ? (
            <Button
              icon={<CalendarOutlined />}
              onClick={() => {
                onEditVacations(data.client);
              }}
            >
              Отпуск
            </Button>
          ) : null}
        </Space>
      ) : null}
      <div className={styles.detailGrid}>
        <Card size="small">
          <Descriptions size="small" title="Контакты" column={1}>
            <Descriptions.Item label="Телефон">
              {renderClientPhoneLink(getClientContactValue(data.client, "phone")) || "Не указан"}
            </Descriptions.Item>
            <Descriptions.Item label="Telegram">
              {renderClientSocialLink(getClientContactValue(data.client, "telegram"), "telegram") || "Не указан"}
            </Descriptions.Item>
            <Descriptions.Item label="VK">
              {renderClientSocialLink(getClientContactValue(data.client, "vk"), "vk") || "Не указан"}
            </Descriptions.Item>
            <Descriptions.Item label="Источник">{data.client.sourceName || "Не указан"}</Descriptions.Item>
            <Descriptions.Item label="Дата рождения">
              {data.client.dateOfBirth ? formatDate(data.client.dateOfBirth) : "Не указана"}
            </Descriptions.Item>
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

      <Card size="small" title="Финансовая история">
        {data.events.data.length > 0 ? (
          <Space orientation="vertical" size={16} className="wide">
            <List
              dataSource={data.events.data}
              renderItem={(event) => (
                <List.Item>
                  <div className="wide">
                    <Space className={`wide ${styles.listJustify}`} wrap>
                      <Typography.Text strong>{event.type === "top_up" ? "Пополнение" : event.serviceName}</Typography.Text>
                      <Space wrap size={8}>
                        {event.appointmentStatus ? (
                          <Tag color={getAppointmentStatusTagColor(event.appointmentStatus)}>
                            {renderClientHistoryAppointmentStatus(event.appointmentStatus)}
                          </Tag>
                        ) : null}
                        <Typography.Text strong type={event.amount < 0 ? "danger" : "success"}>
                          {event.amount > 0 ? "+" : ""}
                          {formatMoney(event.amount)}
                        </Typography.Text>
                        <Typography.Text type="secondary">{formatDateTime(event.date)}</Typography.Text>
                      </Space>
                    </Space>
                    {event.type === "top_up" ? (
                      <Typography.Text>{event.description?.trim() || "Без описания"}</Typography.Text>
                    ) : (
                      <Typography.Text type="secondary">
                        {event.providerDisplayName ? `Преподаватель: ${event.providerDisplayName}` : "Преподаватель не назначен"}
                      </Typography.Text>
                    )}
                  </div>
                </List.Item>
              )}
            />
            {data.events.info.total > data.events.info.pageSize ? (
              <Pagination
                align="end"
                current={data.events.info.page}
                pageSize={data.events.info.pageSize}
                total={data.events.info.total}
                onChange={onEventsPageChange}
                showSizeChanger={false}
              />
            ) : null}
          </Space>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Финансовых событий пока нет" />
        )}
      </Card>
    </Space>
  );
}

function formatOptionalDateTime(value?: string | null) {
  return value ? formatDateTime(value) : "Нет данных";
}
