import { useQuery } from "@tanstack/react-query";
import { Alert, Input, Table, Typography } from "antd";
import { useState } from "react";
import { auditApi } from "../api/crm";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../features/auth/useAuth";
import { formatDateTime } from "../utils/date";

const tableScrollY = 520;

export function AuditPage() {
  const auth = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["audit-logs", page, search],
    queryFn: () => auditApi.list({ page, page_size: 20, search: search.trim() || undefined }),
  });

  if (!auth.user?.isAdmin) {
    return <Alert type="error" showIcon message="Доступ к журналу действий есть только у администраторов." />;
  }

  return (
    <>
      <PageHeader
        title="Аудит действий"
        description="Журналирует ключевые изменения в системе и действия пользователей."
      />
      <div className="filters-stack">
        <div className="filter-field filter-field-wide">
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
      </div>
      <Table
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data?.data}
        pagination={{ current: page, pageSize: 20, total: query.data?.info.total, onChange: setPage }}
        scroll={{ x: "max-content", y: tableScrollY }}
        columns={[
          { title: "Когда", dataIndex: "createdAtUtc", width: 170, render: (value: string) => formatDateTime(value) },
          {
            title: "Кто",
            width: 260,
            render: (_, row) => row.actorDisplayName || row.actorEmail || "Система",
          },
          { title: "Категория", dataIndex: "category", width: 120 },
          { title: "Действие", dataIndex: "action", width: 220 },
          {
            title: "Объект",
            width: 220,
            render: (_, row) => `${row.entityType}${row.entityId ? ` #${row.entityId}` : ""}`,
          },
          { title: "Детали", dataIndex: "details" },
        ]}
      />
    </>
  );
}
