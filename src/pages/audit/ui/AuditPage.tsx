import { useQuery } from "@tanstack/react-query";
import { Input, Typography } from "antd";
import { useState } from "react";
import { auditApi } from "@/api/crm";
import { useAuth } from "@/features/auth/useAuth";
import { AccessDeniedNotice, ListFilters, ListTable, PageLayout } from "@/shared/ui";
import { filterFieldWideClassName } from "@/shared/ui/filterFieldStyles";
import { formatDateTime } from "@/utils/date";
import styles from "./AuditPage.module.css";

const categoryLabels: Record<string, string> = {
  auth: "Авторизация",
  clients: "Клиенты",
  services: "Услуги",
  payments: "Платежи",
  expenses: "Расходы",
  schedule: "Расписание",
};

const actionLabels: Record<string, string> = {
  invite_created: "Создано приглашение",
  user_registered: "Пользователь зарегистрирован",
  login_succeeded: "Вход выполнен",
  logout_succeeded: "Выход из сессии",
  logout_all_succeeded: "Выход из всех сессий",
  session_revoked: "Сессия завершена",
  password_changed: "Пароль изменен",
  password_reset_requested: "Запрошено восстановление пароля",
  password_reset_completed: "Пароль восстановлен",
  two_factor_removed: "2FA отключена",
  recovery_codes_regenerated: "Коды восстановления обновлены",
  client_created: "Клиент создан",
  client_updated: "Клиент обновлен",
  client_deleted: "Клиент удален",
  service_created: "Услуга создана",
  service_price_updated: "Цена услуги изменена",
  payment_created: "Платеж создан",
  payment_deleted: "Платеж удален",
  expense_created: "Расход создан",
  expense_deleted: "Расход удален",
  appointment_created: "Встреча создана",
  recurring_appointment_created: "Повторяющаяся встреча создана",
  appointment_updated: "Встреча обновлена",
  recurring_appointment_detached_and_updated: "Повторяющаяся встреча изменена отдельно",
  appointment_deleted: "Встреча удалена",
  appointments_deleted_this_and_following: "Удалены эта и следующие встречи",
  appointments_deleted_all: "Удалена вся серия",
};

function formatAuditLabel(value: string, labels: Record<string, string>) {
  return labels[value] ?? value;
}

function formatActorLabel(displayName?: string | null, email?: string | null) {
  if (displayName?.trim()) {
    return displayName.trim().split(/\s+/).slice(0, 2).join(" ");
  }

  if (email?.trim()) {
    return email.trim();
  }

  return "Система";
}

export function AuditPage() {
  const auth = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["audit-logs", page, search],
    queryFn: () => auditApi.list({ page, page_size: 20, search: search.trim() || undefined }),
  });

  if (!auth.user?.isSuperuser) {
    return <AccessDeniedNotice message="Доступ к журналу действий есть только у суперпользователя." />;
  }

  return (
    <PageLayout title="Аудит действий" description="Журналирует ключевые изменения в системе и действия пользователей.">
      <ListFilters>
        <div className={filterFieldWideClassName}>
          <Typography.Text type="secondary">Поиск по пользователю, действию, объекту или деталям</Typography.Text>
          <Input.Search
            allowClear
            placeholder="Например: платеж, Иванова, вход, встреча"
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
            onChange={(event) => {
              if (!event.target.value) {
                setSearch("");
                setPage(1);
              }
            }}
          />
        </div>
      </ListFilters>
      <ListTable
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data?.data}
        pagination={{ current: page, pageSize: 20, total: query.data?.info.total, onChange: setPage }}
        columns={[
          { title: "Когда", dataIndex: "createdAtUtc", width: 170, render: (value: string) => formatDateTime(value) },
          {
            title: "Кто",
            width: 180,
            render: (_, row) => (
              <div className={styles.activityCell}>
                <Typography.Text strong>{formatActorLabel(row.actorDisplayName, row.actorEmail)}</Typography.Text>
              </div>
            ),
          },
          { title: "Категория", dataIndex: "category", width: 160, render: (value: string) => formatAuditLabel(value, categoryLabels) },
          { title: "Действие", dataIndex: "action", width: 260, render: (value: string) => formatAuditLabel(value, actionLabels) },
          {
            title: "Объект",
            width: 220,
            render: (_, row) => `${row.entityType}${row.entityId ? ` #${row.entityId}` : ""}`,
          },
          {
            title: "Детали",
            dataIndex: "details",
            width: 260,
            render: (value?: string | null) =>
              value ? (
                <div className={styles.activityDetails}>{value}</div>
              ) : (
                <Typography.Text type="secondary">Нет данных</Typography.Text>
              ),
          },
        ]}
      />
    </PageLayout>
  );
}
