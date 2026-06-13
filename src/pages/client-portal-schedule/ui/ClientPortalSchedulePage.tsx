import { useQuery } from "@tanstack/react-query";
import { Card, Result, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { clientPortalApi } from "@/api/crm";
import { queryKeys } from "@/api/queryKeys";
import { getAppointmentStatusLabel, getAppointmentStatusTagColor } from "@/features/schedule/appointmentStatus";
import styles from "./ClientPortalSchedulePage.module.css";

export function ClientPortalSchedulePage() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const startDate = dayjs().startOf("day").toISOString();
  const endDate = dayjs().add(45, "day").endOf("day").toISOString();

  const query = useQuery({
    queryKey: queryKeys.portal.schedule(startDate, endDate, timezone),
    queryFn: () => clientPortalApi.schedule({ timezone, startDate, endDate }),
  });

  const appointments = query.data ?? [];

  return (
    <Space vertical size={16} className={styles.stack}>
      <Typography.Title level={4}>Ближайшее занятие</Typography.Title>

      {query.isLoading ? <Card loading /> : null}

      {query.isSuccess && appointments.length === 0 ? (
        <Result
          status="info"
          title="Пока нет запланированных занятий"
          subTitle="Когда преподаватель добавит следующее занятие, оно появится здесь автоматически."
        />
      ) : null}

      <div className={styles.list}>
        {appointments.map((appointment) => (
          <Card key={appointment.id} className={styles.appointmentCard}>
            <Space vertical size={10}>
              <div className={styles.appointmentMeta}>
                <Typography.Text strong>{formatDateRange(appointment.startDate, appointment.endDate)}</Typography.Text>
              </div>

              <Space wrap>
                <Tag color={getAppointmentStatusTagColor(appointment.status)}>{getAppointmentStatusLabel(appointment.status)}</Tag>
                {appointment.courseTheme ? <Tag color="blue">Тема: {appointment.courseTheme.title}</Tag> : null}
              </Space>
            </Space>
          </Card>
        ))}
      </div>
    </Space>
  );
}

function formatDateRange(startDate: string, endDate: string) {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  return `${start.format("D MMMM, dddd · HH:mm")} - ${end.format("HH:mm")}`;
}
