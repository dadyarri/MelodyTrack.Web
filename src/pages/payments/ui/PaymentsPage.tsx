import { DeleteOutlined, DownloadOutlined, PlusOutlined } from "@ant-design/icons";
import { App as AntdApp, Button, DatePicker, Input, Space, Typography } from "antd";
import { ClientQuickCreateModal } from "@/components/ClientQuickCreateModal";
import { MoneyListSummaryCards } from "@/components/MoneyListSummaryCards";
import { ClientSelect, ServiceSelect } from "@/components/RemoteSelect";
import { PaymentCreateModal } from "@/features/payments/PaymentCreateModal";
import { formatOptionalDateTime, usePaymentsPageController } from "@/features/payments/usePaymentsPageController";
import { ListFilters, ListPageScaffold, ListTable, PageLayout, ShortcutButton } from "@/shared/ui";
import { filterFieldClassName, filterFieldServiceClassName, filterFieldWideClassName } from "@/shared/ui/filterFieldStyles";
import { DATE_FORMAT, formatDateTime } from "@/utils/date";
import { formatMoney } from "@/utils/money";

export function PaymentsPage() {
  const controller = usePaymentsPageController();
  const { modal } = AntdApp.useApp();

  return (
    <PageLayout
      title="Платежи"
      actions={
        <Space data-onboarding-id="payments-actions">
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
            onClick={controller.openCreateModal}
          />
        </Space>
      }
    >
      <ListPageScaffold
        contentOnboardingId="payments-page-content"
        filtersOnboardingId="payments-filters"
        summaryOnboardingId="payments-summary"
        filters={
          <ListFilters>
            <div className={filterFieldWideClassName}>
              <Typography.Text type="secondary">Поиск по клиенту, услуге или описанию</Typography.Text>
              <Input.Search
                allowClear
                placeholder="Введите имя клиента, услугу или текст описания"
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
              <Typography.Text type="secondary">Клиент</Typography.Text>
              <ClientSelect
                value={controller.clientId}
                onChange={(value) => {
                  controller.setClientId(value);
                  controller.setPage(1);
                }}
              />
            </div>
            <div className={filterFieldServiceClassName}>
              <Typography.Text type="secondary">Услуга</Typography.Text>
              <ServiceSelect
                showPrice
                value={controller.serviceId}
                onChange={(value) => {
                  controller.setServiceId(value);
                  controller.setPage(1);
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
            itemsTitle="Платежей найдено"
            lastItemTitle="Последний платеж"
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
              { title: "Клиент", render: (_, row) => `${row.client.lastName} ${row.client.firstName}` },
              { title: "Услуга", render: (_, row) => row.service?.name },
              { title: "Сумма", dataIndex: "amount", render: (value: number) => formatMoney(value) },
              { title: "Описание", dataIndex: "description" },
              {
                title: "",
                width: 72,
                render: (_, row) => (
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      modal.confirm({
                        title: "Удалить платеж?",
                        onOk: () => {
                          controller.deleteMutation.mutate({ id: row.id, expectedActivityId: row.lastActivity?.id });
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
      <PaymentCreateModal
        open={controller.isCreateModalOpen}
        draftRestored={controller.hasCreateDraft && controller.isCreateModalOpen}
        form={controller.form}
        createPending={controller.createMutation.isPending}
        createdClientOptions={controller.createdClientOptions}
        draftHydrationRef={controller.draftHydrationRef}
        selectedCreateServiceId={controller.selectedCreateServiceId}
        selectedServicePrice={controller.selectedServicePrice}
        onCancel={controller.closeCreateModal}
        onClearDraft={controller.handleClearCreateDraft}
        onSubmit={(values) => {
          controller.createMutation.mutate(values);
        }}
        onValuesChange={controller.onCreateValuesChange}
        onCreateClient={() => {
          controller.setQuickClientCreateOpen(true);
        }}
        onClientLabelChange={controller.setCreateClientLabel}
        onServiceLabelChange={controller.setCreateServiceLabel}
        onServicePriceChange={controller.setSelectedServicePrice}
      />
      <ClientQuickCreateModal
        open={controller.isQuickClientCreateOpen}
        onCancel={() => {
          controller.setQuickClientCreateOpen(false);
        }}
        onCreated={controller.onQuickClientCreated}
      />
    </PageLayout>
  );
}
