import { useQuery } from "@tanstack/react-query";
import { Card, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { clientPortalApi } from "@/api/crm";
import { queryKeys } from "@/api/queryKeys";
import { useAuth } from "@/features/auth/useAuth";
import { getAppointmentStatusLabel, getAppointmentStatusTagColor } from "@/features/schedule/appointmentStatus";
import { formatMoney } from "@/utils/money";
import styles from "./ClientPortalSchedulePage.module.css";

export function ClientPortalSchedulePage() {
  const auth = useAuth();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const startDate = dayjs().startOf("day").toISOString();
  const endDate = dayjs().add(45, "day").endOf("day").toISOString();
  const linkedClientId = auth.user?.linkedClientId ?? null;

  const query = useQuery({
    queryKey: queryKeys.portal.schedule(linkedClientId, startDate, endDate, timezone),
    queryFn: () => clientPortalApi.schedule({ timezone, startDate, endDate }),
    enabled: Boolean(linkedClientId),
  });

  const appointments = query.data ?? [];
  const nextAppointment = appointments[0] ?? null;
  const balance = auth.user?.balance ?? 0;
  const balanceToneClassName = balance < 0 ? styles.balanceNegative : balance > 0 ? styles.balancePositive : styles.balanceNeutral;

  return (
    <Space vertical size={16} className={styles.stack}>
      <div className={styles.summaryGrid}>
        <Card loading={query.isLoading} className={styles.heroCard}>
          <Space vertical size={10} className={styles.heroCardContent}>
            <Typography.Text type="secondary">Ближайшее занятие</Typography.Text>

            {nextAppointment ? (
              <>
                <Typography.Text strong>{formatDateRange(nextAppointment.startDate, nextAppointment.endDate)}</Typography.Text>
                <Space wrap>
                  <Tag color={getAppointmentStatusTagColor(nextAppointment.status)}>
                    {getAppointmentStatusLabel(nextAppointment.status)}
                  </Tag>
                  {nextAppointment.courseTheme ? <Tag color="blue">Тема: {nextAppointment.courseTheme.title}</Tag> : null}
                </Space>
              </>
            ) : (
              <Typography.Text type="secondary">Пока нет запланированных занятий.</Typography.Text>
            )}
          </Space>
        </Card>

        <Card className={styles.heroCard}>
          <Space vertical size={10} className={styles.heroCardContent}>
            <Typography.Text type="secondary">Баланс</Typography.Text>
            <Typography.Title level={3} className={balanceToneClassName}>
              {formatMoney(balance)}
            </Typography.Title>
            {/* <Typography.Text type="secondary">
              {balance < 0
                ? "Отрицательный баланс означает задолженность."
                : balance > 0
                  ? "Положительный баланс можно использовать для будущих занятий."
                  : "Баланс сейчас закрыт."}
            </Typography.Text> */}
          </Space>
        </Card>
      </div>
    </Space>
  );
}

function formatDateRange(startDate: string, endDate: string) {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  return `${start.format("D MMMM, dddd · HH:mm")} - ${end.format("HH:mm")}`;
}
