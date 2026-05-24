import { DeleteOutlined, DownloadOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, DatePicker, Form, Input, InputNumber, Space, Typography } from "antd";
import { ExpenseCategorySelect } from "@/components/RemoteSelect";
import { ReferenceBookCreateModal } from "@/components/ReferenceBookCreateModal";
import { useExpensesPageController } from "@/features/expenses/useExpensesPageController";
import { DraftFormModal, ListFilters, ListPageScaffold, ListTable, PageLayout, ShortcutButton } from "@/shared/ui";
import { MoneyListSummaryCards } from "@/components/MoneyListSummaryCards";
import { filterFieldClassName, filterFieldWideClassName } from "@/shared/ui/filterFieldStyles";
import { DATE_FORMAT, formatDateTime } from "@/utils/date";
import { formatMoney } from "@/utils/money";

export function ExpensesPage() {
  const controller = useExpensesPageController();

  return (
    <PageLayout
      title="Расходы"
      actions={
        <Space data-onboarding-id="expenses-actions">
          <ShortcutButton
            shortcut="X"
            leadingIcon={<DownloadOutlined />}
            loading={controller.exportMutation.isPending}
            label="Экспорт"
            onClick={() => {
              controller.exportMutation.mutate();
            }}
          />
          <ShortcutButton
            shortcut="A"
            type="primary"
            leadingIcon={<PlusOutlined />}
            label="Добавить"
            onClick={() => {
              controller.setOpen(true);
            }}
          />
        </Space>
      }
    >
      <ListPageScaffold
        contentOnboardingId="expenses-page-content"
        filtersOnboardingId="expenses-filters"
        summaryOnboardingId="expenses-summary"
        filters={
          <ListFilters>
            <div className={filterFieldWideClassName}>
              <Typography.Text type="secondary">Поиск по описанию расхода</Typography.Text>
              <Input.Search
                allowClear
                placeholder="Введите часть описания или название статьи"
                onSearch={(value) => {
                  controller.setSearch(value);
                  controller.setPage(1);
                }}
                onChange={(event) => {
                  if (!event.target.value) {
                    controller.setSearch("");
                    controller.setPage(1);
                  }
                }}
              />
            </div>
            <div className={filterFieldClassName}>
              <Typography.Text type="secondary">Период</Typography.Text>
              <DatePicker.RangePicker
                value={controller.dateRange}
                format={DATE_FORMAT}
                onChange={(value) => {
                  controller.setDateRange(value);
                  controller.setPage(1);
                }}
              />
            </div>
            <div className={filterFieldClassName}>
              <Typography.Text type="secondary">Действия</Typography.Text>
              <Button onClick={controller.resetFilters}>Сбросить</Button>
            </div>
          </ListFilters>
        }
        summary={
          <MoneyListSummaryCards
            totalAmount={controller.query.data?.summary.totalAmount}
            itemsCount={controller.query.data?.summary.itemsCount}
            lastItemAtLabel={formatOptionalDateTime(controller.query.data?.summary.lastItemAtUtc)}
            itemsTitle="Расходов найдено"
            lastItemTitle="Последний расход"
          />
        }
        table={
          <ListTable
            rowKey="id"
            loading={controller.query.isLoading}
            dataSource={controller.query.data?.data}
            pagination={{ current: controller.page, pageSize: 10, total: controller.query.data?.info.total, onChange: controller.setPage }}
            columns={[
              { title: "Дата", dataIndex: "date", render: (value: string) => formatDateTime(value) },
              { title: "Описание", dataIndex: "description" },
              { title: "Категория", dataIndex: "categoryName", render: (value?: string | null) => value || "Без категории" },
              { title: "Сумма", dataIndex: "amount", render: (value: number) => formatMoney(value) },
              {
                title: "",
                width: 72,
                render: (_, row) => (
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      controller.modal.confirm({
                        title: "Удалить расход?",
                        onOk: () => {
                          controller.deleteMutation.mutate({ id: row.id, expectedActivityId: row.lastActivity?.id });
                        },
                      })
                    }
                  />
                ),
              },
            ]}
          />
        }
      />
      <DraftFormModal
        open={controller.isOpen}
        title="Новый расход"
        restored={controller.hasCreateDraft && controller.isOpen}
        onClearDraft={controller.handleClearCreateDraft}
        onCancel={() => {
          controller.setOpen(false);
        }}
        onOk={() => {
          controller.form.submit();
        }}
        confirmLoading={controller.createMutation.isPending}
      >
        <Form
          form={controller.form}
          layout="vertical"
          requiredMark={false}
          onFinish={controller.onCreateSubmit}
          onValuesChange={controller.onCreateValuesChange}
        >
          <Form.Item label="Категория">
            <Space.Compact className="wide">
              <Form.Item name="categoryId" noStyle>
                <ExpenseCategorySelect extraOptions={controller.createdCategoryOptions} />
              </Form.Item>
              <Button
                onClick={() => {
                  controller.setCategoryCreateOpen(true);
                }}
              >
                Новая категория
              </Button>
            </Space.Compact>
          </Form.Item>
          <Form.Item name="description" label="Описание" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="amount" label="Сумма" rules={[{ required: true }]}>
            <InputNumber min={0} className="wide" />
          </Form.Item>
        </Form>
      </DraftFormModal>
      <ReferenceBookCreateModal
        open={controller.isCategoryCreateOpen}
        title="Новая категория расхода"
        confirmLoading={controller.createCategoryMutation.isPending}
        onCancel={() => {
          controller.setCategoryCreateOpen(false);
        }}
        onSubmit={controller.onCreateCategory}
      />
    </PageLayout>
  );
}

function formatOptionalDateTime(value?: string | null) {
  return value ? formatDateTime(value) : "Нет данных";
}
