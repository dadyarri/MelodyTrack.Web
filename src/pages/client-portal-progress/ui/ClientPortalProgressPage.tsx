import { useQuery } from "@tanstack/react-query";
import { Card, Collapse, Result, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { clientPortalApi } from "@/api/crm";
import { queryKeys } from "@/api/queryKeys";
import type { CourseEnrollmentTheme, CourseThemeProgressState } from "@/api/types";
import styles from "./ClientPortalProgressPage.module.css";

export function ClientPortalProgressPage() {
  const query = useQuery({
    queryKey: queryKeys.portal.enrollments,
    queryFn: () => clientPortalApi.courseEnrollments(),
  });

  const enrollments = query.data ?? [];

  return (
    <Space vertical size={16} className={styles.stack}>
      <Typography.Title level={4}>Учебный прогресс</Typography.Title>

      {query.isLoading ? <Card loading /> : null}

      {query.isSuccess && enrollments.length === 0 ? (
        <Result
          status="info"
          title="Курсы еще не назначены"
        />
      ) : null}

      {enrollments.map((enrollment) => {
        const themeStats = buildThemeStats(enrollment.themes);

        return (
          <Card
            key={enrollment.id}
            className={styles.courseCard}
            title={enrollment.courseName}
            extra={enrollment.currentLevel ? <Tag color="gold">Уровень: {enrollment.currentLevel.title}</Tag> : null}
          >
            <Space vertical size={16} className="wide">
              <div className={styles.summary}>
                <Tag color="green">Опыт: {enrollment.earnedExperiencePoints}</Tag>
                {themeStats.map((item) => (
                  <Tag key={item.label} color={item.color}>
                    {item.label}: {item.count}
                  </Tag>
                ))}
              </div>

              <Collapse
                items={enrollment.themes.map((theme) => {
                  const stateMeta = getCourseThemeProgressStateMeta(theme.state);
                  return {
                    key: theme.id,
                    label: (
                      <Space wrap>
                        <Typography.Text strong>{theme.themeTitle}</Typography.Text>
                        <Tag color={stateMeta.color}>{stateMeta.label}</Tag>
                      </Space>
                    ),
                    children: <ThemeDetails theme={theme} />,
                  };
                })}
              />
            </Space>
          </Card>
        );
      })}
    </Space>
  );
}

function ThemeDetails({ theme }: { theme: CourseEnrollmentTheme }) {
  return (
    <Space vertical size={14} className="wide">
      {theme.themeDescription ? <Typography.Paragraph>{theme.themeDescription}</Typography.Paragraph> : null}

      <div className={styles.summary}>
        <Tag color="blue">Опыт за тему: {theme.experiencePointsReward}</Tag>
        {theme.completedAtUtc ? <Tag color="green">Завершено {dayjs(theme.completedAtUtc).format("D MMMM YYYY")}</Tag> : null}
      </div>

      {theme.lessonContent ? (
        <Card size="small" className={styles.themeCard} title="Материал урока">
          <Typography.Paragraph className={styles.themeText}>{theme.lessonContent}</Typography.Paragraph>
        </Card>
      ) : null}

      {theme.homeworkContent ? (
        <Card size="small" className={styles.themeCard} title="Домашняя работа">
          <Typography.Paragraph className={styles.themeText}>{theme.homeworkContent}</Typography.Paragraph>
        </Card>
      ) : null}

      {theme.recentAppointments.length > 0 ? (
        <Card size="small" className={styles.themeCard} title="Недавние занятия по теме">
          <div className={styles.historyList}>
            {theme.recentAppointments.map((appointment) => (
              <div key={appointment.id}>
                <Typography.Text strong>{dayjs(appointment.startDateUtc).format("D MMMM YYYY, HH:mm")}</Typography.Text>
                <Typography.Paragraph type="secondary">
                  {appointment.providerDisplayName ? `${appointment.providerDisplayName}. ` : ""}
                  {appointment.lessonNotes || "Заметки по занятию пока не добавлены."}
                </Typography.Paragraph>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </Space>
  );
}

function buildThemeStats(themes: CourseEnrollmentTheme[]) {
  const states: CourseThemeProgressState[] = [5, 4, 3, 2, 0];
  return states
    .map((state) => {
      const meta = getCourseThemeProgressStateMeta(state);
      return {
        ...meta,
        count: themes.filter((theme) => theme.state === state).length,
      };
    })
    .filter((item) => item.count > 0);
}

function getCourseThemeProgressStateMeta(state: CourseThemeProgressState) {
  switch (state) {
    case 0:
      return { label: "Заблокировано", color: "default" as const };
    case 1:
      return { label: "Можно открыть", color: "gold" as const };
    case 2:
      return { label: "Открыто", color: "blue" as const };
    case 3:
      return { label: "В процессе", color: "processing" as const };
    case 4:
      return { label: "Ждет ДЗ", color: "orange" as const };
    case 5:
      return { label: "Завершено", color: "green" as const };
  }
}
