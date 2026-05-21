import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Button } from "antd";
import { expenseCategoriesApi } from "@/api/crm";
import { ReferenceBookCreateModal } from "@/components/ReferenceBookCreateModal";
import { getApiErrorMessages } from "@/api/http";
import { ListTable, PageLayout, ShortcutButton } from "@/shared/ui";
import { useState } from "react";

export function ExpenseCategoriesPage() {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };

  const query = useQuery({
    queryKey: ["expense-categories"],
    queryFn: () => expenseCategoriesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (values: { name: string }) => expenseCategoriesApi.create(values),
    onSuccess: async () => {
      message.success("Категория создана");
      setCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
    },
    onError: showErrors,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseCategoriesApi.remove(id),
    onSuccess: async () => {
      message.success("Категория удалена");
      await queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: showErrors,
  });

  return (
    <PageLayout
      title="Статьи расходов"
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
                    title: "Удалить категорию?",
                    content: "Связанные расходы сохранятся без категории.",
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
        title="Новая категория расхода"
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
