import { Button } from "antd";

import { expenseQueryKeys } from "@/entities/expense";
import { expenseCategoriesApi, referenceBookQueryKeys } from "@/entities/reference-book";
import { useReferenceBookPageController } from "@/features/manage-reference-book";
import { ReferenceBookCreateModal } from "@/shared/ui";
import { ListPageScaffold, ListTable, PageLayout, ShortcutButton } from "@/shared/ui";
import { DeleteOutlined, PlusOutlined } from "@/shared/ui/icons";

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
    listQueryKey: referenceBookQueryKeys.expenseCategories,
    listQueryFn: () => expenseCategoriesApi.list(),
    invalidateQueryKeys: [expenseQueryKeys.all],
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
            queryStatus={{
              isError: controller.query.isError,
              isFetching: controller.query.isFetching,
              onRetry: () => {
                void controller.query.refetch();
              },
            }}
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
