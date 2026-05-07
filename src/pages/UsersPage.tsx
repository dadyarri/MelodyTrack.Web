import { useQuery } from "@tanstack/react-query";
import { Table } from "antd";
import { usersApi } from "../api/crm";
import { PageHeader } from "../components/PageHeader";

export function UsersPage() {
  const query = useQuery({ queryKey: ["users"], queryFn: usersApi.list });

  return (
    <>
      <PageHeader title="Пользователи" />
      <Table
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data}
        pagination={false}
        scroll={{ x: "max-content" }}
        columns={[
          { title: "Фамилия", dataIndex: "lastName" },
          { title: "Имя", dataIndex: "firstName" },
        ]}
      />
    </>
  );
}
