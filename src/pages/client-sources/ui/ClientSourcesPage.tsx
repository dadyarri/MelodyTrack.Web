import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Button } from "antd";
import { useState } from "react";
import { clientSourcesApi } from "@/api/crm";
import { ReferenceBookCreateModal } from "@/components/ReferenceBookCreateModal";
import { getApiErrorMessages } from "@/api/http";
import { ListTable, PageLayout, ShortcutButton } from "@/shared/ui";

export function ClientSourcesPage() {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };

  const query = useQuery({
    queryKey: ["client-sources"],
    queryFn: () => clientSourcesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (values: { name: string }) => clientSourcesApi.create(values),
    onSuccess: async () => {
      message.success("Источник создан");
      setCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["client-sources"] });
    },
    onError: showErrors,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientSourcesApi.remove(id),
    onSuccess: async () => {
      message.success("Источник удален");
      await queryClient.invalidateQueries({ queryKey: ["client-sources"] });
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: showErrors,
  });

  return (
    <PageLayout
      title="Источники клиентов"
      actions={
        <ShortcutButton
          shortcut="A"
          type="primary"
          leadingIcon={<PlusOutlined />}
          label="Добавить"
          onClick={() => {
            setCreateOpen(true);
          }}
        />
      }
    >
      <ListTable
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data}
        pagination={false}
        columns={[
          { title: "Название", dataIndex: "name" },
          {
            title: "",
            width: 72,
            render: (_, row) => (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  modal.confirm({
                    title: "Удалить источник?",
                    content: "Связанные клиенты сохранятся без источника.",
                    onOk: () => {
                      deleteMutation.mutate(row.id);
                    },
                  });
                }}
              />
            ),
          },
        ]}
      />
      <ReferenceBookCreateModal
        open={isCreateOpen}
        title="Новый источник клиента"
        confirmLoading={createMutation.isPending}
        onCancel={() => {
          setCreateOpen(false);
        }}
        onSubmit={(values) => {
          createMutation.mutate(values);
        }}
      />
    </PageLayout>
  );
}
