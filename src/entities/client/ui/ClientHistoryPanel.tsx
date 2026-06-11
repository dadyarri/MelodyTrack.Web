import { BookOutlined, CalendarOutlined, CreditCardOutlined, DeleteOutlined, PlusOutlined } from "@/components/icons";
import { Button, Card, Descriptions, Empty, List, Pagination, Progress, Space, Tag, Typography } from "antd";
import type { ClientHistory, CourseEnrollment, CourseEnrollmentTheme, CourseThemeProgressState } from "@/api/types";
import { getAppointmentStatusTagColor } from "@/features/schedule/appointmentStatus";
import { formatDate, formatDateTime } from "@/utils/date";
import { formatMoney } from "@/utils/money";
import { getClientContactValue, renderClientHistoryAppointmentStatus, renderClientPhoneLink, renderClientSocialLink } from "../lib/client";
import styles from "./ClientHistoryPanel.module.css";

type ClientHistoryPanelProps = {
  data: ClientHistory;
  courseEnrollments?: CourseEnrollment[];
  isCourseEnrollmentsLoading?: boolean;
  isCourseEnrollmentsError?: boolean;
  onCreateAppointment?: (client: ClientHistory["client"]) => void;
  onCreatePayment?: (client: ClientHistory["client"]) => void;
  onCreateCourseEnrollment?: () => void;
  onDeleteCourseEnrollment?: (enrollmentId: string) => void;
  onAppointmentsPageChange?: (page: number) => void;
};

export function ClientHistoryPanel({
  data,
  courseEnrollments,
  isCourseEnrollmentsLoading = false,
  isCourseEnrollmentsError = false,
  onCreateAppointment,
  onCreatePayment,
  onCreateCourseEnrollment,
  onDeleteCourseEnrollment,
  onAppointmentsPageChange,
}: ClientHistoryPanelProps) {
  return (
    <Space orientation="vertical" size={16} className="wide">
      {onCreateAppointment || onCreatePayment || onCreateCourseEnrollment ? (
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
          {onCreateCourseEnrollment ? (
            <Button icon={<PlusOutlined />} onClick={onCreateCourseEnrollment}>
              Назначить курс
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
                  <Typography.Text>{payment.description?.trim() || "Без описания"}</Typography.Text>
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

      <Card
        size="small"
        title={
          <Space size={8}>
            <BookOutlined />
            <span>Курсы и прогресс</span>
          </Space>
        }
      >
        {isCourseEnrollmentsLoading ? <Typography.Text type="secondary">Загрузка прогресса...</Typography.Text> : null}
        {isCourseEnrollmentsError ? <Typography.Text type="danger">Не удалось загрузить прогресс по курсам.</Typography.Text> : null}
        {!isCourseEnrollmentsLoading && !isCourseEnrollmentsError && (courseEnrollments?.length ?? 0) === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Курсы пока не назначены" />
        ) : null}
        {!isCourseEnrollmentsLoading && !isCourseEnrollmentsError && (courseEnrollments?.length ?? 0) > 0 ? (
          <Space orientation="vertical" size={12} className="wide">
            {courseEnrollments?.map((enrollment) => {
              const completionPercent =
                enrollment.themes.length === 0
                  ? 0
                  : Math.round((countThemesByState(enrollment.themes, 5) / enrollment.themes.length) * 100);

              return (
                <Card
                  key={enrollment.id}
                  size="small"
                  className={styles.enrollmentCard}
                  title={enrollment.courseName}
                  extra={
                    <Space size={8} wrap>
                      <Typography.Text type="secondary">Назначен {formatDateTime(enrollment.createdAtUtc)}</Typography.Text>
                      {onDeleteCourseEnrollment ? (
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            onDeleteCourseEnrollment(enrollment.id);
                          }}
                        >
                          Снять
                        </Button>
                      ) : null}
                    </Space>
                  }
                >
                  <Space orientation="vertical" size={12} className="wide">
                    <div className={styles.enrollmentHeader}>
                      <div className={styles.enrollmentProgress}>
                        <Typography.Text strong>{completionPercent}% завершено</Typography.Text>
                        <Progress percent={completionPercent} size="small" />
                      </div>
                      <Space wrap>
                        <Tag color="cyan">Эволюция +{enrollment.earnedEvolutionPoints}</Tag>
                        <Tag color="gold">Потрачено {enrollment.spentEvolutionPoints}</Tag>
                        <Tag color="purple">Опыт +{enrollment.earnedExperiencePoints}</Tag>
                      </Space>
                    </div>
                    <Space wrap>
                      {buildStateSummaryTags(enrollment.themes).map((item) => (
                        <Tag key={item.label} color={item.color}>
                          {item.label}: {item.count}
                        </Tag>
                      ))}
                    </Space>
                    <List
                      size="small"
                      dataSource={enrollment.themes}
                      renderItem={(theme) => {
                        const stateMeta = getCourseThemeProgressStateMeta(theme.state);

                        return (
                          <List.Item>
                            <div className={`wide ${styles.themeItem}`}>
                              <div className={styles.listJustify}>
                                <Typography.Text>{theme.themeTitle}</Typography.Text>
                                <Tag color={stateMeta.color}>{stateMeta.label}</Tag>
                              </div>
                              {theme.themeDescription ? <Typography.Text type="secondary">{theme.themeDescription}</Typography.Text> : null}
                              {theme.homeworkContent ? (
                                <div>
                                  <Typography.Text strong>Домашнее задание</Typography.Text>
                                  <Typography.Paragraph className={styles.themeContent}>{theme.homeworkContent}</Typography.Paragraph>
                                </div>
                              ) : null}
                              {theme.recentAppointments.length > 0 ? (
                                <div className={styles.themeHistory}>
                                  <Typography.Text strong>Недавние занятия по теме</Typography.Text>
                                  <List
                                    size="small"
                                    dataSource={theme.recentAppointments}
                                    renderItem={(lesson) => (
                                      <List.Item>
                                        <div className="wide">
                                          <Space className={`wide ${styles.listJustify}`} wrap>
                                            <Typography.Text>{formatDateTime(lesson.startDateUtc)}</Typography.Text>
                                            <Tag color={getAppointmentStatusTagColor(lesson.status)}>
                                              {renderClientHistoryAppointmentStatus({
                                                status: lesson.status,
                                              } as ClientHistory["appointments"]["data"][number])}
                                            </Tag>
                                          </Space>
                                          <Typography.Text type="secondary">
                                            {lesson.providerDisplayName
                                              ? `Преподаватель: ${lesson.providerDisplayName}`
                                              : "Преподаватель не назначен"}
                                          </Typography.Text>
                                          {lesson.lessonNotes ? (
                                            <Typography.Paragraph className={styles.themeContent}>
                                              {lesson.lessonNotes}
                                            </Typography.Paragraph>
                                          ) : null}
                                        </div>
                                      </List.Item>
                                    )}
                                  />
                                </div>
                              ) : null}
                            </div>
                          </List.Item>
                        );
                      }}
                    />
                  </Space>
                </Card>
              );
            })}
          </Space>
        ) : null}
      </Card>

      <Card size="small" title="История записей">
        {data.appointments.data.length > 0 ? (
          <Space orientation="vertical" size={16} className="wide">
            <List
              dataSource={data.appointments.data}
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
                    {appointment.courseThemeTitle ? (
                      <div>
                        <Typography.Text type="secondary">Тема: {appointment.courseThemeTitle}</Typography.Text>
                      </div>
                    ) : null}
                    {appointment.lessonNotes ? (
                      <Typography.Paragraph className={styles.themeContent}>{appointment.lessonNotes}</Typography.Paragraph>
                    ) : null}
                  </div>
                </List.Item>
              )}
            />
            {data.appointments.info.total > data.appointments.info.pageSize ? (
              <Pagination
                align="end"
                current={data.appointments.info.page}
                pageSize={data.appointments.info.pageSize}
                total={data.appointments.info.total}
                onChange={onAppointmentsPageChange}
                showSizeChanger={false}
              />
            ) : null}
          </Space>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Записей пока нет" />
        )}
      </Card>
    </Space>
  );
}

function buildStateSummaryTags(themes: CourseEnrollmentTheme[]) {
  return [0, 1, 2, 3, 4, 5]
    .map((state) => {
      const count = countThemesByState(themes, state as CourseThemeProgressState);
      if (count === 0) {
        return null;
      }

      const meta = getCourseThemeProgressStateMeta(state as CourseThemeProgressState);
      return {
        count,
        color: meta.color,
        label: meta.label,
      };
    })
    .filter((item): item is { count: number; color: string; label: string } => item !== null);
}

function countThemesByState(themes: CourseEnrollmentTheme[], state: CourseThemeProgressState) {
  return themes.filter((theme) => theme.state === state).length;
}

function getCourseThemeProgressStateMeta(state: CourseThemeProgressState) {
  switch (state) {
    case 0:
      return { label: "Заблокировано", color: "default" };
    case 1:
      return { label: "Можно открыть", color: "gold" };
    case 2:
      return { label: "Открыто", color: "blue" };
    case 3:
      return { label: "В процессе", color: "processing" };
    case 4:
      return { label: "Ждет ДЗ", color: "orange" };
    case 5:
      return { label: "Завершено", color: "green" };
  }
}

function formatOptionalDateTime(value?: string | null) {
  return value ? formatDateTime(value) : "Нет данных";
}
