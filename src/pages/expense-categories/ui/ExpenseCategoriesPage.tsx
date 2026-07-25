import { DeleteOutlined, PlusOutlined } from "@/shared/ui/icons";
import { Button } from "antd";
import { queryKeys } from "@/api/queryKeys";
import { expenseCategoriesApi } from "@/api/crm";
import { ReferenceBookCreateModal } from "@/components/ReferenceBookCreateModal";
import { useReferenceBookPageController } from "@/features/reference-books";
import { ListPageScaffold, ListTable, PageLayout, ShortcutButton } from "@/shared/ui";

export function ExpenseCategoriesPage() {
  const controller = useReferenceBookPageController({
    successMessages: {
      create: "Категория создана",
      delete: "Категория удалена",
    },
    staleConflict: {
      title: "Категория уже изменена",
      okText: "Удалить все равно",
      cancelText: "Обновить список",
    },
    createItem: (values) => expenseCategoriesApi.create(values),
    deleteItem: (id, options) => expenseCategoriesApi.remove(id, options),
    listQueryKey: queryKeys.expenses.categories,
    listQueryFn: () => expenseCategoriesApi.list(),
    invalidateQueryKeys: [queryKeys.expenses.all],
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
            controller.setCreateOpen(true);
          }}
        />
      }
    >
      <ListPageScaffold
        contentOnboardingId="expense-categories-page-content"
        table={
          <ListTable
            rowKey="id"
            loading={controller.query.isLoading}
            dataSource={controller.query.data}
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
                      controller.modal.confirm({
                        title: "Удалить категорию?",
                        content: "Связанные расходы сохранятся без категории.",
                        onOk: () => {
                          controller.onDelete(row.id, row.lastActivity?.id);
                        },
                      });
                    }}
                  />
                ),
              },
            ]}
          />
        }
      />
      <ReferenceBookCreateModal
        open={controller.isCreateOpen}
        title="Новая категория расхода"
        confirmLoading={controller.createMutation.isPending}
        onCancel={() => {
          controller.setCreateOpen(false);
        }}
        onSubmit={controller.onCreate}
      />
    </PageLayout>
  );
}
