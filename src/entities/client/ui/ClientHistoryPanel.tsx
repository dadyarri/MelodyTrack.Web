import {
  BookOutlined,
  CalendarOutlined,
  CheckOutlined,
  DownOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  HourglassOutlined,
  LinkOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  UpOutlined,
} from "@/components/icons";
import { Button, Card, Descriptions, Empty, List, Pagination, Progress, Space, Tag, Typography } from "antd";
import { useState } from "react";
import type {
  ClientHistory,
  CourseEnrollment,
  CourseEnrollmentTheme,
  CourseEnrollmentThemeProgressAction,
  CourseThemeProgressState,
} from "@/api/types";
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
  onCreatePortalLink?: () => void;
  isCreatingPortalLink?: boolean;
  onResetPortalPin?: () => void;
  isResettingPortalPin?: boolean;
  onDeleteCourseEnrollment?: (enrollmentId: string) => void;
  onOpenCourseProgress?: (enrollmentId?: string) => void;
  onUpdateThemeProgress?: (themeId: string, action: CourseEnrollmentThemeProgressAction) => void;
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
  onCreatePortalLink,
  isCreatingPortalLink = false,
  onResetPortalPin,
  isResettingPortalPin = false,
  onDeleteCourseEnrollment,
  onOpenCourseProgress,
  onUpdateThemeProgress,
  onAppointmentsPageChange,
}: ClientHistoryPanelProps) {
  const [expandedEnrollmentIds, setExpandedEnrollmentIds] = useState<string[]>([]);

  return (
    <Space orientation="vertical" size={16} className="wide">
      {onCreateAppointment || onCreatePayment || onCreateCourseEnrollment || onCreatePortalLink || onResetPortalPin ? (
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
          {onCreatePortalLink ? (
            <Button icon={<LinkOutlined />} loading={isCreatingPortalLink} onClick={onCreatePortalLink}>
              Ссылка в кабинет
            </Button>
          ) : null}
          {onResetPortalPin ? (
            <Button icon={<ReloadOutlined />} loading={isResettingPortalPin} onClick={onResetPortalPin}>
              Сбросить PIN
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
              const actionableThemes = getActionableThemes(enrollment.themes);
              const isExpanded = expandedEnrollmentIds.includes(enrollment.id);

              return (
                <Card
                  key={enrollment.id}
                  size="small"
                  className={styles.enrollmentCard}
                  title={enrollment.courseName}
                  extra={
                    <Space size={8} wrap>
                      <Typography.Text type="secondary">Назначен {formatDateTime(enrollment.createdAtUtc)}</Typography.Text>
                      {onOpenCourseProgress ? (
                        <Button
                          size="small"
                          onClick={() => {
                            onOpenCourseProgress(enrollment.id);
                          }}
                        >
                          Прогресс
                        </Button>
                      ) : null}
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
                        <div className={styles.enrollmentXpSummary}>
                          <div className={styles.enrollmentXpLine}>
                            <Typography.Text strong>{enrollment.earnedExperiencePoints} XP</Typography.Text>
                            <Typography.Text type="secondary">
                              {actionableThemes.length > 0 ? `${actionableThemes.length} тем с действиями` : "Нет срочных действий"}
                            </Typography.Text>
                          </div>
                        </div>
                      </div>
                      <Space wrap>
                        <Tag color="gold">{enrollment.currentLevel ? `Уровень: ${enrollment.currentLevel.title}` : "Уровень не задан"}</Tag>
                        <Tag color="purple">Опыт +{enrollment.earnedExperiencePoints}</Tag>
                        <Tag color={actionableThemes.length > 0 ? "processing" : "default"}>
                          {actionableThemes.length > 0 ? `Действий сейчас: ${actionableThemes.length}` : "Все тихо"}
                        </Tag>
                      </Space>
                    </div>
                    <Space wrap>
                      {buildStateSummaryTags(enrollment.themes).map((item) => (
                        <Tag key={item.label} color={item.color}>
                          {item.label}: {item.count}
                        </Tag>
                      ))}
                    </Space>
                    <EnrollmentActionSummary themes={actionableThemes} onUpdateThemeProgress={onUpdateThemeProgress} />
                    <Button
                      size="small"
                      icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                      onClick={() => {
                        setExpandedEnrollmentIds((current) =>
                          current.includes(enrollment.id) ? current.filter((item) => item !== enrollment.id) : [...current, enrollment.id],
                        );
                      }}
                    >
                      {isExpanded ? "Скрыть темы" : `Показать все темы (${enrollment.themes.length})`}
                    </Button>
                    {isExpanded ? (
                      <List
                        size="small"
                        dataSource={enrollment.themes}
                        renderItem={(theme) => (
                          <List.Item>
                            <EnrollmentThemeDetails theme={theme} />
                          </List.Item>
                        )}
                      />
                    ) : null}
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

function EnrollmentActionSummary({
  themes,
  onUpdateThemeProgress,
}: {
  themes: CourseEnrollmentTheme[];
  onUpdateThemeProgress?: (themeId: string, action: CourseEnrollmentThemeProgressAction) => void;
}) {
  if (themes.length === 0) {
    return (
      <div className={styles.actionSummary}>
        <Typography.Text type="secondary">Сейчас нет тем, по которым нужно действие.</Typography.Text>
      </div>
    );
  }

  return (
    <div className={styles.actionSummary}>
      <Typography.Text strong>Сейчас доступны действия</Typography.Text>
      <div className={styles.actionThemeList}>
        {themes.map((theme) => {
          const stateMeta = getCourseThemeProgressStateMeta(theme.state);
          return (
            <div key={theme.id} className={styles.actionThemeRow}>
              <div className={styles.actionThemeInfo}>
                <Typography.Text>{theme.themeTitle}</Typography.Text>
                <Space wrap size={[8, 8]}>
                  <Tag color={stateMeta.color}>{stateMeta.label}</Tag>
                  <Tag color="purple">Опыт: +{theme.experiencePointsReward}</Tag>
                </Space>
              </div>
              {onUpdateThemeProgress ? <Space wrap size={[8, 8]}>{buildThemeActionButtons(theme, onUpdateThemeProgress)}</Space> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EnrollmentThemeDetails({ theme }: { theme: CourseEnrollmentTheme }) {
  const stateMeta = getCourseThemeProgressStateMeta(theme.state);

  return (
    <div className={`wide ${styles.themeItem}`}>
      <div className={styles.listJustify}>
        <Typography.Text>{theme.themeTitle}</Typography.Text>
        <Tag color={stateMeta.color}>{stateMeta.label}</Tag>
      </div>
      <Space wrap size={[8, 8]} className={styles.themeMeta}>
        <Tag color="purple">Опыт: +{theme.experiencePointsReward}</Tag>
      </Space>
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
                    {lesson.providerDisplayName ? `Преподаватель: ${lesson.providerDisplayName}` : "Преподаватель не назначен"}
                  </Typography.Text>
                  {lesson.lessonNotes ? <Typography.Paragraph className={styles.themeContent}>{lesson.lessonNotes}</Typography.Paragraph> : null}
                </div>
              </List.Item>
            )}
          />
        </div>
      ) : null}
    </div>
  );
}

function buildThemeActionButtons(
  theme: CourseEnrollmentTheme,
  onUpdateThemeProgress: (themeId: string, action: CourseEnrollmentThemeProgressAction) => void,
) {
  switch (theme.state) {
    case 1:
      return [
        <Button
          key="unlock"
          size="small"
          icon={<LockOutlined />}
          onClick={() => {
            onUpdateThemeProgress(theme.id, "unlock");
          }}
        >
          Открыть
        </Button>,
      ];
    case 2:
      return [
        <Button
          key="start"
          size="small"
          onClick={() => {
            onUpdateThemeProgress(theme.id, "start");
          }}
        >
          В работу
        </Button>,
        <Button
          key="homework"
          size="small"
          icon={<HourglassOutlined />}
          onClick={() => {
            onUpdateThemeProgress(theme.id, "send-to-homework");
          }}
        >
          На ДЗ
        </Button>,
      ];
    case 3:
      return [
        <Button
          key="homework"
          size="small"
          icon={<HourglassOutlined />}
          onClick={() => {
            onUpdateThemeProgress(theme.id, "send-to-homework");
          }}
        >
          На ДЗ
        </Button>,
      ];
    case 4:
      return [
        <Button
          key="retry"
          size="small"
          icon={<ReloadOutlined />}
          onClick={() => {
            onUpdateThemeProgress(theme.id, "return-to-progress");
          }}
        >
          Вернуть
        </Button>,
        <Button
          key="pass"
          type="primary"
          size="small"
          icon={<CheckOutlined />}
          onClick={() => {
            onUpdateThemeProgress(theme.id, "pass-homework");
          }}
        >
          Принять ДЗ
        </Button>,
      ];
    default:
      return [];
  }
}

function getActionableThemes(themes: CourseEnrollmentTheme[]) {
  return themes.filter((theme) => theme.state === 2 || theme.state === 3 || theme.state === 4);
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
